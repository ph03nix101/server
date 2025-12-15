import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AuctionsService, CreateAuctionDto } from './auctions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/auctions')
export class AuctionsController {
    constructor(private readonly auctionsService: AuctionsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateAuctionDto, @Req() req: Request) {
        const user = req.user as { id: string };
        return this.auctionsService.create(dto, user.id);
    }

    @Post(':id/bid')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    placeBid(
        @Param('id') id: string,
        @Body() body: { amount: number },
        @Req() req: Request
    ) {
        const user = req.user as { id: string };
        return this.auctionsService.placeBid(id, user.id, body.amount);
    }

    @Get()
    getActiveAuctions(
        @Query('limit') limit?: string,
        @Query('category_id') categoryId?: string
    ) {
        return this.auctionsService.getActiveAuctions(
            limit ? parseInt(limit) : 10,
            categoryId ? parseInt(categoryId) : undefined
        );
    }

    @Get('my-bids')
    @UseGuards(JwtAuthGuard)
    getMyBids(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.auctionsService.getUserBids(user.id);
    }

    @Get('product/:productId')
    getByProductId(@Param('productId') productId: string) {
        return this.auctionsService.getByProductId(productId);
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.auctionsService.getById(id);
    }

    @Get(':id/bids')
    getBidHistory(@Param('id') id: string) {
        return this.auctionsService.getBidHistory(id);
    }

    @Patch(':id/cancel')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    cancelAuction(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as { id: string };
        return this.auctionsService.cancelAuction(id, user.id);
    }
}
