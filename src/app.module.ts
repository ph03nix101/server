import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { CategoriesModule } from './categories/categories.module';
import { ComponentsModule } from './components/components.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';
import { MessagesModule } from './messages/messages.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReportsModule } from './reports/reports.module';
import { AuctionsModule } from './auctions/auctions.module';
import { RatingsModule } from './ratings/ratings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    CategoriesModule,
    ComponentsModule,
    ProductsModule,
    UploadsModule,
    UsersModule,
    AuthModule,
    VerificationModule,
    MessagesModule,
    WishlistModule,
    ReportsModule,
    AuctionsModule,
    RatingsModule,
  ],
})
export class AppModule { }

