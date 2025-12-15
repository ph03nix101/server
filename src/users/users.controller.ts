import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req, Res, ForbiddenException, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updates: {
            full_name?: string;
            phone?: string;
            location?: string;
            bio?: string;
            avatar_url?: string;
        }
    ) {
        return this.usersService.update(id, updates);
    }

    // Admin endpoints
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: Request) {
        const user = req.user as { id: string };
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.usersService.findAll();
    }

    @Patch(':id/admin')
    @UseGuards(JwtAuthGuard)
    async setAdmin(
        @Req() req: Request,
        @Param('id') userId: string,
        @Body('is_admin') isAdmin: boolean
    ) {
        const user = req.user as { id: string };
        const isUserAdmin = await this.usersService.isAdmin(user.id);
        if (!isUserAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.usersService.setAdmin(userId, isAdmin);
    }

    @Patch(':id/verified')
    @UseGuards(JwtAuthGuard)
    async setVerified(
        @Req() req: Request,
        @Param('id') userId: string,
        @Body('is_verified') isVerified: boolean
    ) {
        const user = req.user as { id: string };
        const isUserAdmin = await this.usersService.isAdmin(user.id);
        if (!isUserAdmin) {
            throw new ForbiddenException('Admin access required');
        }
        return this.usersService.setVerified(userId, isVerified);
    }

    @Delete('me')
    @UseGuards(JwtAuthGuard)
    async deleteMyAccount(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body('password') password: string
    ) {
        const user = req.user as { id: string };

        if (!password) {
            throw new BadRequestException('Password is required to delete account');
        }

        try {
            const result = await this.usersService.deleteAccount(user.id, password);
            // Clear the auth cookie
            res.clearCookie('access_token');
            return result;
        } catch (error: any) {
            if (error.message === 'Incorrect password') {
                throw new BadRequestException('Incorrect password');
            }
            throw error;
        }
    }
}
