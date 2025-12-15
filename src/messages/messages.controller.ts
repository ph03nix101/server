import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private messagesService: MessagesService) { }

    @Get('conversations')
    async getConversations(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.messagesService.getConversations(user.id);
    }

    @Get('conversations/:id')
    async getConversation(@Req() req: Request, @Param('id') id: string) {
        const user = req.user as { id: string };
        return this.messagesService.getConversation(id, user.id);
    }

    @Post('conversations')
    async startConversation(
        @Req() req: Request,
        @Body() body: { product_id: string; message: string }
    ) {
        const user = req.user as { id: string };
        return this.messagesService.startConversation(user.id, body.product_id, body.message);
    }

    @Post('conversations/:id')
    async sendMessage(
        @Req() req: Request,
        @Param('id') conversationId: string,
        @Body() body: { content: string }
    ) {
        const user = req.user as { id: string };
        return this.messagesService.sendMessage(conversationId, user.id, body.content);
    }

    @Patch('conversations/:id/read')
    async markAsRead(@Req() req: Request, @Param('id') conversationId: string) {
        const user = req.user as { id: string };
        await this.messagesService.markAsRead(conversationId, user.id);
        return { success: true };
    }

    @Get('unread-count')
    async getUnreadCount(@Req() req: Request) {
        const user = req.user as { id: string };
        const count = await this.messagesService.getUnreadCount(user.id);
        return { count };
    }
}
