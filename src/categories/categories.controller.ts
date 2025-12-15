import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('api/categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    getAllCategories() {
        return this.categoriesService.getAllCategories();
    }

    @Get('with-counts')
    getCategoriesWithCounts() {
        return this.categoriesService.getCategoriesWithCounts();
    }

    @Get(':slug')
    getCategoryBySlug(@Param('slug') slug: string) {
        return this.categoriesService.getCategoryBySlug(slug);
    }

    @Get(':slug/attributes')
    getAttributes(@Param('slug') slug: string) {
        return this.categoriesService.getAttributes(slug);
    }
}
