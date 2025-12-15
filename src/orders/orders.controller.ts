import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService, Order, SellerStats } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Req() req: Request,
        @Body() body: {
            product_id: string;
            seller_id: string;
            amount: number;
            shipping_cost?: number;
            shipping_address?: string;
            notes?: string;
        }
    ): Promise<Order> {
        const user = req.user as { id: string };
        return this.ordersService.create({
            ...body,
            buyer_id: user.id,
        });
    }

    @Get('sales')
    @UseGuards(JwtAuthGuard)
    async getMySales(
        @Req() req: Request,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ): Promise<Order[]> {
        const user = req.user as { id: string };
        return this.ordersService.getSellerSales(
            user.id,
            limit ? parseInt(limit) : 20,
            offset ? parseInt(offset) : 0
        );
    }

    @Get('purchases')
    @UseGuards(JwtAuthGuard)
    async getMyPurchases(
        @Req() req: Request,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ): Promise<Order[]> {
        const user = req.user as { id: string };
        return this.ordersService.getBuyerPurchases(
            user.id,
            limit ? parseInt(limit) : 20,
            offset ? parseInt(offset) : 0
        );
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getMyStats(@Req() req: Request): Promise<SellerStats> {
        const user = req.user as { id: string };
        return this.ordersService.getSellerStats(user.id);
    }

    @Get('recent')
    @UseGuards(JwtAuthGuard)
    async getRecentSales(
        @Req() req: Request,
        @Query('limit') limit?: string
    ): Promise<Order[]> {
        const user = req.user as { id: string };
        return this.ordersService.getRecentSales(user.id, limit ? parseInt(limit) : 5);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getById(@Param('id') id: string): Promise<Order> {
        return this.ordersService.getById(id);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateStatus(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: { status: string; tracking_number?: string }
    ): Promise<Order> {
        const user = req.user as { id: string };
        return this.ordersService.updateStatus(id, user.id, body.status, body.tracking_number);
    }
}
