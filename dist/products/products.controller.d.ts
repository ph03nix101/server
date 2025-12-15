import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto): Promise<import("../types/product.interface").Product>;
    findAll(q?: string, categoryId?: string, minPrice?: string, maxPrice?: string, condition?: string, sort?: string, page?: string, limit?: string, allParams?: Record<string, string>): Promise<{
        products: import("../types/product.interface").Product[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    findBySeller(sellerId: string): Promise<import("../types/product.interface").Product[]>;
    getTrending(limit?: string): Promise<import("../types/product.interface").Product[]>;
    findSimilar(id: string, limit?: string): Promise<import("../types/product.interface").Product[]>;
    findById(id: string): Promise<import("../types/product.interface").Product>;
    update(id: string, updates: Partial<CreateProductDto>): Promise<import("../types/product.interface").Product>;
    updateStatus(id: string, status: string): Promise<import("../types/product.interface").Product>;
    delete(id: string): Promise<void>;
}
