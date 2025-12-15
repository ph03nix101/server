import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { VerificationService } from './verification.service';
import type { CreateVerificationRequest } from './verification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/verification')
export class VerificationController {
    constructor(private verificationService: VerificationService) { }

    @Post('apply')
    @UseGuards(JwtAuthGuard)
    async apply(@Req() req: Request, @Body() data: CreateVerificationRequest) {
        const user = req.user as { id: string };
        return this.verificationService.apply(user.id, data);
    }

    @Get('my-status')
    @UseGuards(JwtAuthGuard)
    async getMyStatus(@Req() req: Request) {
        const user = req.user as { id: string };
        const status = await this.verificationService.getMyStatus(user.id);
        return { request: status };
    }

    @Get('admin/pending')
    @UseGuards(JwtAuthGuard)
    async getPendingRequests(@Req() req: Request) {
        const user = req.user as { id: string };
        const isAdmin = await this.verificationService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.verificationService.getAllPending();
    }

    @Patch('admin/:id')
    @UseGuards(JwtAuthGuard)
    async reviewRequest(
        @Req() req: Request,
        @Param('id') requestId: string,
        @Body() body: { action: 'approve' | 'reject'; notes?: string }
    ) {
        const user = req.user as { id: string };
        const isAdmin = await this.verificationService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.verificationService.review(requestId, user.id, body.action, body.notes);
    }
}
