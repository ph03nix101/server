import { Pool } from 'pg';
import { Product } from '../types/product.interface';
import { CreateProductDto } from './dto/create-product.dto';
export declare class ProductsService {
    private pool;
    constructor(pool: Pool);
    private ensureSchema;
    create(dto: CreateProductDto & {
        original_price?: number;
    }): Promise<Product>;
    findAll(filters?: {
        q?: string;
        category_id?: number;
        minPrice?: number;
        maxPrice?: number;
        condition?: string[];
        specs?: Record<string, string[]>;
        sort?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';
        page?: number;
        limit?: number;
    }): Promise<{
        products: Product[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<Product>;
    findBySeller(sellerId: string): Promise<Product[]>;
    updateStatus(id: string, status: string): Promise<Product>;
    update(id: string, updates: Partial<CreateProductDto> & {
        original_price?: number;
    }): Promise<Product>;
    delete(id: string): Promise<void>;
    findSimilar(productId: string, limit?: number): Promise<Product[]>;
    getTrending(limit?: number): Promise<Product[]>;
    private generateSlug;
}
