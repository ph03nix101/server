import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Category, CategoryAttribute } from '../../types/category.interface';

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminCategoriesController {
    constructor(private readonly adminCategoriesService: AdminCategoriesService) { }

    // Categories
    @Post('categories')
    async createCategory(@Body() body: { name: string; slug: string; icon?: string; is_published?: boolean }) {
        return this.adminCategoriesService.createCategory(body);
    }

    @Patch('categories/:id')
    async updateCategory(
        @Param('id') id: string,
        @Body() body: { name?: string; slug?: string; icon?: string; is_published?: boolean }
    ) {
        return this.adminCategoriesService.updateCategory(parseInt(id), body);
    }

    @Delete('categories/:id')
    async deleteCategory(@Param('id') id: string) {
        return this.adminCategoriesService.deleteCategory(parseInt(id));
    }

    @Post('categories/clone')
    async cloneCategory(@Body() body: { sourceId: number; newName: string; newSlug: string }) {
        return this.adminCategoriesService.cloneCategory(body.sourceId, body.newName, body.newSlug);
    }

    // Attributes
    @Get('categories/:id/attributes')
    async getAttributes(@Param('id') id: string) {
        return this.adminCategoriesService.getAttributes(parseInt(id));
    }

    @Post('categories/:id/attributes')
    async createAttribute(
        @Param('id') id: string,
        @Body() body: Omit<CategoryAttribute, 'id' | 'category_id'>
    ) {
        return this.adminCategoriesService.createAttribute(parseInt(id), body);
    }

    @Patch('attributes/:id')
    async updateAttribute(
        @Param('id') id: string,
        @Body() body: Partial<CategoryAttribute>
    ) {
        return this.adminCategoriesService.updateAttribute(parseInt(id), body);
    }

    @Delete('attributes/:id')
    async deleteAttribute(@Param('id') id: string) {
        return this.adminCategoriesService.deleteAttribute(parseInt(id));
    }

    @Post('attributes/reorder')
    async reorderAttributes(@Body() body: { updates: { id: number; display_order: number }[] }) {
        if (!Array.isArray(body.updates)) throw new BadRequestException('Updates must be an array');
        return this.adminCategoriesService.reorderAttributes(body.updates);
    }
}
