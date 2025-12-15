import { Pool } from 'pg';
import { Category, CategoryAttribute } from '../types/category.interface';
export declare class CategoriesService {
    private pool;
    constructor(pool: Pool);
    getAllCategories(): Promise<Category[]>;
    getCategoriesWithCounts(): Promise<(Category & {
        product_count: number;
    })[]>;
    getCategoryBySlug(slug: string): Promise<Category | null>;
    getAttributes(slug: string): Promise<CategoryAttribute[]>;
}
