import type { Request } from 'express';
import { MessagesService } from './messages.service';
export declare class MessagesController {
    private messagesService;
    constructor(messagesService: MessagesService);
    getConversations(req: Request): Promise<import("./messages.service").Conversation[]>;
    getConversation(req: Request, id: string): Promise<{
        conversation: import("./messages.service").Conversation;
        messages: import("./messages.service").Message[];
    }>;
    startConversation(req: Request, body: {
        product_id: string;
        message: string;
    }): Promise<import("./messages.service").Conversation>;
    sendMessage(req: Request, conversationId: string, body: {
        content: string;
    }): Promise<import("./messages.service").Message>;
    markAsRead(req: Request, conversationId: string): Promise<{
        success: boolean;
    }>;
    getUnreadCount(req: Request): Promise<{
        count: number;
    }>;
}
