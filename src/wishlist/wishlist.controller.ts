import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
    constructor(private wishlistService: WishlistService) { }

    @Get()
    async getWishlist(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.wishlistService.getWishlist(user.id);
    }

    @Get('check/:productId')
    async checkWishlist(@Req() req: Request, @Param('productId') productId: string) {
        const user = req.user as { id: string };
        const isInWishlist = await this.wishlistService.isInWishlist(user.id, productId);
        return { isInWishlist };
    }

    @Post(':productId')
    async addToWishlist(@Req() req: Request, @Param('productId') productId: string) {
        const user = req.user as { id: string };
        return this.wishlistService.addToWishlist(user.id, productId);
    }

    @Delete(':productId')
    async removeFromWishlist(@Req() req: Request, @Param('productId') productId: string) {
        const user = req.user as { id: string };
        await this.wishlistService.removeFromWishlist(user.id, productId);
        return { success: true };
    }

    @Post(':productId/toggle')
    async toggleWishlist(@Req() req: Request, @Param('productId') productId: string) {
        const user = req.user as { id: string };
        return this.wishlistService.toggleWishlist(user.id, productId);
    }

    @Get('count')
    async getWishlistCount(@Req() req: Request) {
        const user = req.user as { id: string };
        const count = await this.wishlistService.getWishlistCount(user.id);
        return { count };
    }
}
