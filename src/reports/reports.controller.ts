import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('api/reports')
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly usersService: UsersService
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createReport(
        @Req() req: Request,
        @Body() body: { product_id: string; reason: string; description?: string }
    ) {
        const user = req.user as { id: string };
        return this.reportsService.createReport(
            body.product_id,
            user.id,
            body.reason,
            body.description
        );
    }

    // Admin endpoints
    @Get()
    @UseGuards(JwtAuthGuard)
    async getReports(
        @Req() req: Request,
        @Query('status') status?: string
    ) {
        const user = req.user as { id: string };
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.reportsService.getReports(status);
    }

    @Get('pending-count')
    @UseGuards(JwtAuthGuard)
    async getPendingCount(@Req() req: Request) {
        const user = req.user as { id: string };
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return { count: await this.reportsService.getPendingCount() };
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getReport(@Req() req: Request, @Param('id') id: string) {
        const user = req.user as { id: string };
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.reportsService.getReportById(id);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateStatus(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: { status: string; admin_notes?: string }
    ) {
        const user = req.user as { id: string };
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.reportsService.updateReportStatus(id, body.status, user.id, body.admin_notes);
    }
}
