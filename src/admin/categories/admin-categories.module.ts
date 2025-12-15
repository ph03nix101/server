import { Module } from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [AdminCategoriesService],
    controllers: [AdminCategoriesController],
    exports: [AdminCategoriesService],
})
export class AdminCategoriesModule { }
