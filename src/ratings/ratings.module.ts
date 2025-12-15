import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [RatingsService],
    controllers: [RatingsController],
    exports: [RatingsService],
})
export class RatingsModule { }
