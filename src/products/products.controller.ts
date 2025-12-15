import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('api/products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Get()
    findAll(
        @Query('q') q?: string,
        @Query('category_id') categoryId?: string,
        @Query('minPrice') minPrice?: string,
        @Query('maxPrice') maxPrice?: string,
        @Query('condition') condition?: string,
        @Query('sort') sort?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        // Spec filters come as specs.ram_size, specs.gpu_type, etc.
        @Query() allParams?: Record<string, string>,
    ) {
        // Parse spec filters (keys starting with "specs.")
        const specs: Record<string, string[]> = {};
        if (allParams) {
            for (const [key, value] of Object.entries(allParams)) {
                if (key.startsWith('specs.') && value) {
                    const specKey = key.replace('specs.', '');
                    specs[specKey] = value.split(',');
                }
            }
        }

        return this.productsService.findAll({
            q,
            category_id: categoryId ? parseInt(categoryId) : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            condition: condition ? condition.split(',') : undefined,
            specs: Object.keys(specs).length > 0 ? specs : undefined,
            sort: sort as 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | undefined,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get('seller/:sellerId')
    findBySeller(@Param('sellerId') sellerId: string) {
        return this.productsService.findBySeller(sellerId);
    }

    @Get('trending')
    getTrending(@Query('limit') limit?: string) {
        return this.productsService.getTrending(limit ? parseInt(limit) : 4);
    }

    @Get(':id/similar')
    findSimilar(@Param('id') id: string, @Query('limit') limit?: string) {
        return this.productsService.findSimilar(id, limit ? parseInt(limit) : 4);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.productsService.findById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updates: Partial<CreateProductDto>) {
        return this.productsService.update(id, updates);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.productsService.updateStatus(id, status);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.productsService.delete(id);
    }
}

