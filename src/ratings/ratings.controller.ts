import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RatingsService, SellerRating, SellerStats } from './ratings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/ratings')
export class RatingsController {
    constructor(private readonly ratingsService: RatingsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Req() req: Request,
        @Body() body: { seller_id: string; rating: number; review?: string; product_id?: string }
    ): Promise<SellerRating> {
        const user = req.user as { id: string };
        return this.ratingsService.create(
            body.seller_id,
            user.id,
            body.rating,
            body.review,
            body.product_id
        );
    }

    @Get('seller/:sellerId')
    async getSellerRatings(
        @Param('sellerId') sellerId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ): Promise<SellerRating[]> {
        return this.ratingsService.getSellerRatings(
            sellerId,
            limit ? parseInt(limit) : 10,
            offset ? parseInt(offset) : 0
        );
    }

    @Get('seller/:sellerId/stats')
    async getSellerStats(@Param('sellerId') sellerId: string): Promise<SellerStats> {
        return this.ratingsService.getSellerStats(sellerId);
    }

    @Get('seller/:sellerId/can-rate')
    @UseGuards(JwtAuthGuard)
    async canRate(
        @Req() req: Request,
        @Param('sellerId') sellerId: string
    ): Promise<{ canRate: boolean }> {
        const user = req.user as { id: string };
        const canRate = await this.ratingsService.canRate(user.id, sellerId);
        return { canRate };
    }

    @Get('seller/:sellerId/my-rating')
    @UseGuards(JwtAuthGuard)
    async getMyRating(
        @Req() req: Request,
        @Param('sellerId') sellerId: string,
        @Query('product_id') productId?: string
    ): Promise<{ rating: SellerRating | null }> {
        const user = req.user as { id: string };
        const rating = await this.ratingsService.getMyRatingForSeller(user.id, sellerId, productId);
        return { rating };
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<SellerRating> {
        return this.ratingsService.findById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async update(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: { rating: number; review?: string }
    ): Promise<SellerRating> {
        const user = req.user as { id: string };
        return this.ratingsService.update(id, user.id, body.rating, body.review);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async delete(
        @Req() req: Request,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        const user = req.user as { id: string };
        await this.ratingsService.delete(id, user.id);
        return { message: 'Rating deleted successfully' };
    }
}
