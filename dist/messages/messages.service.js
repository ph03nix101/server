"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let MessagesService = class MessagesService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getConversations(userId) {
        const { rows } = await this.pool.query(`SELECT 
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
            ORDER BY c.last_message_at DESC`, [userId]);
        return rows;
    }
    async getConversation(conversationId, userId) {
        const { rows: convRows } = await this.pool.query(`SELECT 
                c.*,
                p.title as product_title,
                CASE WHEN c.buyer_id = $2 THEN u_seller.full_name ELSE u_buyer.full_name END as other_user_name,
                CASE WHEN c.buyer_id = $2 THEN u_seller.avatar_url ELSE u_buyer.avatar_url END as other_user_avatar,
                CASE WHEN c.buyer_id = $2 THEN c.seller_id ELSE c.buyer_id END as other_user_id
            FROM conversations c
            JOIN products p ON c.product_id = p.id
            JOIN users u_buyer ON c.buyer_id = u_buyer.id
            JOIN users u_seller ON c.seller_id = u_seller.id
            WHERE c.id = $1`, [conversationId, userId]);
        if (convRows.length === 0) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const conversation = convRows[0];
        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        const { rows: messages } = await this.pool.query(`SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC`, [conversationId]);
        return { conversation, messages };
    }
    async startConversation(buyerId, productId, initialMessage) {
        const { rows: products } = await this.pool.query('SELECT seller_id FROM products WHERE id = $1', [productId]);
        if (products.length === 0) {
            throw new common_1.NotFoundException('Product not found');
        }
        const sellerId = products[0].seller_id;
        if (sellerId === buyerId) {
            throw new common_1.ForbiddenException('Cannot message yourself');
        }
        const { rows: existing } = await this.pool.query('SELECT id FROM conversations WHERE product_id = $1 AND buyer_id = $2', [productId, buyerId]);
        let conversationId;
        if (existing.length > 0) {
            conversationId = existing[0].id;
        }
        else {
            const { rows: newConv } = await this.pool.query(`INSERT INTO conversations (product_id, buyer_id, seller_id)
                VALUES ($1, $2, $3)
                RETURNING id`, [productId, buyerId, sellerId]);
            conversationId = newConv[0].id;
        }
        await this.pool.query(`INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)`, [conversationId, buyerId, initialMessage]);
        await this.pool.query('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
        const { rows } = await this.pool.query(`SELECT c.*, p.title as product_title
            FROM conversations c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = $1`, [conversationId]);
        return rows[0];
    }
    async sendMessage(conversationId, senderId, content) {
        const { rows: convRows } = await this.pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id = $1', [conversationId]);
        if (convRows.length === 0) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const conv = convRows[0];
        if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        const { rows } = await this.pool.query(`INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *`, [conversationId, senderId, content]);
        await this.pool.query('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
        return rows[0];
    }
    async markAsRead(conversationId, userId) {
        await this.pool.query(`UPDATE messages 
            SET is_read = TRUE 
            WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`, [conversationId, userId]);
    }
    async getUnreadCount(userId) {
        const { rows } = await this.pool.query(`SELECT COUNT(*) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.buyer_id = $1 OR c.seller_id = $1)
            AND m.sender_id != $1
            AND m.is_read = FALSE`, [userId]);
        return parseInt(rows[0].count, 10);
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], MessagesService);
//# sourceMappingURL=messages.service.js.map