import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ShippingService, ShippingOption, ProductShipping } from './shipping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    // ==================== SHIPPING TEMPLATES ====================

    @Post('templates')
    @UseGuards(JwtAuthGuard)
    async createTemplate(
        @Req() req: Request,
        @Body() body: {
            name: string;
            price: number;
            estimated_days_min?: number;
            estimated_days_max?: number;
            coverage_area?: string;
            is_collection?: boolean;
            collection_address?: string;
            is_default?: boolean;
        }
    ): Promise<ShippingOption> {
        const user = req.user as { id: string };
        return this.shippingService.createTemplate(user.id, body);
    }

    @Get('templates')
    @UseGuards(JwtAuthGuard)
    async getMyTemplates(@Req() req: Request): Promise<ShippingOption[]> {
        const user = req.user as { id: string };
        return this.shippingService.getSellerTemplates(user.id);
    }

    @Get('templates/seller/:sellerId')
    async getSellerTemplates(@Param('sellerId') sellerId: string): Promise<ShippingOption[]> {
        return this.shippingService.getSellerTemplates(sellerId);
    }

    @Get('templates/:id')
    async getTemplateById(@Param('id') id: string): Promise<ShippingOption> {
        return this.shippingService.getTemplateById(id);
    }

    @Patch('templates/:id')
    @UseGuards(JwtAuthGuard)
    async updateTemplate(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: Partial<{
            name: string;
            price: number;
            estimated_days_min: number;
            estimated_days_max: number;
            coverage_area: string;
            is_collection: boolean;
            collection_address: string;
            is_default: boolean;
        }>
    ): Promise<ShippingOption> {
        const user = req.user as { id: string };
        return this.shippingService.updateTemplate(id, user.id, body);
    }

    @Delete('templates/:id')
    @UseGuards(JwtAuthGuard)
    async deleteTemplate(
        @Req() req: Request,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        const user = req.user as { id: string };
        await this.shippingService.deleteTemplate(id, user.id);
        return { message: 'Shipping option deleted successfully' };
    }

    // ==================== PRODUCT SHIPPING ====================

    @Get('product/:productId')
    async getProductShipping(@Param('productId') productId: string): Promise<ProductShipping[]> {
        return this.shippingService.getProductShipping(productId);
    }

    @Post('product/:productId')
    @UseGuards(JwtAuthGuard)
    async assignShipping(
        @Req() req: Request,
        @Param('productId') productId: string,
        @Body() body: {
            shipping_option_id?: string;
            custom_price?: number;
            custom_estimated_days_min?: number;
            custom_estimated_days_max?: number;
            custom_coverage_area?: string;
            display_order?: number;
        }
    ): Promise<ProductShipping> {
        const user = req.user as { id: string };
        return this.shippingService.assignShippingToProduct(productId, user.id, body);
    }

    @Post('product/:productId/defaults')
    @UseGuards(JwtAuthGuard)
    async assignDefaultShipping(
        @Req() req: Request,
        @Param('productId') productId: string
    ): Promise<{ message: string }> {
        const user = req.user as { id: string };
        await this.shippingService.assignDefaultShipping(productId, user.id);
        return { message: 'Default shipping options assigned' };
    }

    @Delete('product-shipping/:id')
    @UseGuards(JwtAuthGuard)
    async removeShipping(
        @Req() req: Request,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        const user = req.user as { id: string };
        await this.shippingService.removeShippingFromProduct(id, user.id);
        return { message: 'Shipping option removed from product' };
    }
}
