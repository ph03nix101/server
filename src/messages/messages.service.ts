import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { MailService } from '../mail/mail.service';

export interface Conversation {
    id: string;
    product_id: string;
    buyer_id: string;
    seller_id: string;
    last_message_at: Date;
    created_at: Date;
    // Joined fields
    product_title?: string;
    other_user_name?: string;
    other_user_avatar?: string;
    other_user_id?: string;
    last_message?: string;
    unread_count?: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: Date;
    sender_name?: string;
    sender_avatar?: string;
}

@Injectable()
export class MessagesService {
    constructor(
        @Inject('DATABASE_CONNECTION') private pool: Pool,
        private mailService: MailService,
    ) { }

    async getConversations(userId: string): Promise<Conversation[]> {
        const { rows } = await this.pool.query(
            `SELECT 
                c.*,
                p.title as product_title,
                CASE WHEN c.buyer_id = $1 THEN u_seller.full_name ELSE u_buyer.full_name END as other_user_name,
                CASE WHEN c.buyer_id = $1 THEN u_seller.avatar_url ELSE u_buyer.avatar_url END as other_user_avatar,
                CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END as other_user_id,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = FALSE) as unread_count
            FROM conversations c
            JOIN products p ON c.product_id = p.id
            JOIN users u_buyer ON c.buyer_id = u_buyer.id
            JOIN users u_seller ON c.seller_id = u_seller.id
            WHERE c.buyer_id = $1 OR c.seller_id = $1
            ORDER BY c.last_message_at DESC`,
            [userId]
        );
        return rows;
    }

    async getConversation(conversationId: string, userId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
        // Get conversation and verify user is part of it
        const { rows: convRows } = await this.pool.query(
            `SELECT 
                c.*,
                p.title as product_title,
                CASE WHEN c.buyer_id = $2 THEN u_seller.full_name ELSE u_buyer.full_name END as other_user_name,
                CASE WHEN c.buyer_id = $2 THEN u_seller.avatar_url ELSE u_buyer.avatar_url END as other_user_avatar,
                CASE WHEN c.buyer_id = $2 THEN c.seller_id ELSE c.buyer_id END as other_user_id
            FROM conversations c
            JOIN products p ON c.product_id = p.id
            JOIN users u_buyer ON c.buyer_id = u_buyer.id
            JOIN users u_seller ON c.seller_id = u_seller.id
            WHERE c.id = $1`,
            [conversationId, userId]
        );

        if (convRows.length === 0) {
            throw new NotFoundException('Conversation not found');
        }

        const conversation = convRows[0];

        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            throw new ForbiddenException('You are not part of this conversation');
        }

        // Get messages
        const { rows: messages } = await this.pool.query(
            `SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC`,
            [conversationId]
        );

        return { conversation, messages };
    }

    async startConversation(buyerId: string, productId: string, initialMessage: string): Promise<Conversation> {
        // Get product to find seller
        const { rows: products } = await this.pool.query(
            'SELECT seller_id, title FROM products WHERE id = $1',
            [productId]
        );

        if (products.length === 0) {
            throw new NotFoundException('Product not found');
        }

        const sellerId = products[0].seller_id;
        const productTitle = products[0].title;

        if (sellerId === buyerId) {
            throw new ForbiddenException('Cannot message yourself');
        }

        // Check if conversation already exists
        const { rows: existing } = await this.pool.query(
            'SELECT id FROM conversations WHERE product_id = $1 AND buyer_id = $2',
            [productId, buyerId]
        );

        let conversationId: string;

        if (existing.length > 0) {
            conversationId = existing[0].id;
        } else {
            // Create new conversation
            const { rows: newConv } = await this.pool.query(
                `INSERT INTO conversations (product_id, buyer_id, seller_id)
                VALUES ($1, $2, $3)
                RETURNING id`,
                [productId, buyerId, sellerId]
            );
            conversationId = newConv[0].id;
        }

        // Add the initial message
        await this.pool.query(
            `INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)`,
            [conversationId, buyerId, initialMessage]
        );

        // Update last_message_at
        await this.pool.query(
            'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        );

        // Send email notification to seller
        const { rows: seller } = await this.pool.query('SELECT email, full_name FROM users WHERE id = $1', [sellerId]);
        const { rows: buyer } = await this.pool.query('SELECT full_name FROM users WHERE id = $1', [buyerId]);

        if (seller.length > 0 && buyer.length > 0) {
            this.mailService.sendNewMessageNotification(
                seller[0].email,
                buyer[0].full_name,
                productTitle,
                initialMessage
            ).catch(err => console.error('Failed to send email notification:', err));
        }

        // Return the conversation
        const { rows } = await this.pool.query(
            `SELECT c.*, p.title as product_title
            FROM conversations c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = $1`,
            [conversationId]
        );

        return rows[0];
    }

    async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
        // Verify user is part of conversation
        const { rows: convRows } = await this.pool.query(
            `SELECT c.buyer_id, c.seller_id, p.title as product_title
             FROM conversations c
             JOIN products p ON c.product_id = p.id
             WHERE c.id = $1`,
            [conversationId]
        );

        if (convRows.length === 0) {
            throw new NotFoundException('Conversation not found');
        }

        const conv = convRows[0];
        if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
            throw new ForbiddenException('You are not part of this conversation');
        }

        // Insert message
        const { rows } = await this.pool.query(
            `INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [conversationId, senderId, content]
        );

        // Update last_message_at
        await this.pool.query(
            'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        );

        // Send Email Notification
        const recipientId = conv.buyer_id === senderId ? conv.seller_id : conv.buyer_id;
        const { rows: recipient } = await this.pool.query('SELECT email, full_name FROM users WHERE id = $1', [recipientId]);
        const { rows: sender } = await this.pool.query('SELECT full_name FROM users WHERE id = $1', [senderId]);

        if (recipient.length > 0 && sender.length > 0) {
            this.mailService.sendNewMessageNotification(
                recipient[0].email, // Send to recipient
                sender[0].full_name, // From sender
                conv.product_title,
                content
            ).catch(err => console.error('Failed to send email notification:', err));
        }

        return rows[0];
    }

    async markAsRead(conversationId: string, userId: string): Promise<void> {
        await this.pool.query(
            `UPDATE messages 
            SET is_read = TRUE 
            WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
            [conversationId, userId]
        );
    }

    async getUnreadCount(userId: string): Promise<number> {
        const { rows } = await this.pool.query(
            `SELECT COUNT(*) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.buyer_id = $1 OR c.seller_id = $1)
            AND m.sender_id != $1
            AND m.is_read = FALSE`,
            [userId]
        );
        return parseInt(rows[0].count, 10);
    }
}
