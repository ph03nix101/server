import { Controller, Get, Param, Query } from '@nestjs/common';
import { ComponentsService } from './components.service';

@Controller('api/components')
export class ComponentsController {
    constructor(private readonly componentsService: ComponentsService) { }

    @Get('search')
    search(
        @Query('q') query: string,
        @Query('type') type: 'CPU' | 'GPU',
        @Query('category') category: 'Laptop' | 'Desktop',
    ) {
        return this.componentsService.search(query, type, category);
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.componentsService.getById(parseInt(id));
    }
}
