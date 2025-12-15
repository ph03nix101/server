import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { RatingsService, SellerRating, SellerStats } from './ratings.service';

// Simple auth guard that checks for user in request
class AuthGuard {
    canActivate(context: any): boolean {
        const request = context.switchToHttp().getRequest();
        return !!request.user;
    }
}

interface AuthenticatedRequest {
    user: { id: string };
}

@Controller('ratings')
export class RatingsController {
    constructor(private readonly ratingsService: RatingsService) { }

    @Post()
    @UseGuards(AuthGuard)
    async create(
        @Req() req: AuthenticatedRequest,
        @Body() body: { seller_id: string; rating: number; review?: string; product_id?: string }
    ): Promise<SellerRating> {
        return this.ratingsService.create(
            body.seller_id,
            req.user.id,
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
    @UseGuards(AuthGuard)
    async canRate(
        @Req() req: AuthenticatedRequest,
        @Param('sellerId') sellerId: string
    ): Promise<{ canRate: boolean }> {
        const canRate = await this.ratingsService.canRate(req.user.id, sellerId);
        return { canRate };
    }

    @Get('seller/:sellerId/my-rating')
    @UseGuards(AuthGuard)
    async getMyRating(
        @Req() req: AuthenticatedRequest,
        @Param('sellerId') sellerId: string,
        @Query('product_id') productId?: string
    ): Promise<{ rating: SellerRating | null }> {
        const rating = await this.ratingsService.getMyRatingForSeller(req.user.id, sellerId, productId);
        return { rating };
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<SellerRating> {
        return this.ratingsService.findById(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    async update(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { rating: number; review?: string }
    ): Promise<SellerRating> {
        return this.ratingsService.update(id, req.user.id, body.rating, body.review);
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async delete(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        await this.ratingsService.delete(id, req.user.id);
        return { message: 'Rating deleted successfully' };
    }
}
