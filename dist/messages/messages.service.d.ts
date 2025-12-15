import { Pool } from 'pg';
export interface Conversation {
    id: string;
    product_id: string;
    buyer_id: string;
    seller_id: string;
    last_message_at: Date;
    created_at: Date;
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
export declare class MessagesService {
    private pool;
    constructor(pool: Pool);
    getConversations(userId: string): Promise<Conversation[]>;
    getConversation(conversationId: string, userId: string): Promise<{
        conversation: Conversation;
        messages: Message[];
    }>;
    startConversation(buyerId: string, productId: string, initialMessage: string): Promise<Conversation>;
    sendMessage(conversationId: string, senderId: string, content: string): Promise<Message>;
    markAsRead(conversationId: string, userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
}
