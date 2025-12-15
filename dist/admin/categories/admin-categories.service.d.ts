import { Pool } from 'pg';
import { Category, CategoryAttribute } from '../../types/category.interface';
export declare class AdminCategoriesService {
    private pool;
    constructor(pool: Pool);
    private ensureSchema;
    createCategory(data: {
        name: string;
        slug: string;
        icon?: string;
        is_published?: boolean;
    }): Promise<Category>;
    updateCategory(id: number, data: {
        name?: string;
        slug?: string;
        icon?: string;
        is_published?: boolean;
    }): Promise<Category>;
    deleteCategory(id: number): Promise<void>;
    getCategoryById(id: number): Promise<Category>;
    getAttributes(categoryId: number): Promise<CategoryAttribute[]>;
    createAttribute(categoryId: number, data: Omit<CategoryAttribute, 'id' | 'category_id'>): Promise<CategoryAttribute>;
    updateAttribute(id: number, data: Partial<CategoryAttribute>): Promise<CategoryAttribute>;
    deleteAttribute(id: number): Promise<void>;
    reorderAttributes(updates: {
        id: number;
        display_order: number;
    }[]): Promise<void>;
    cloneCategory(sourceId: number, newName: string, newSlug: string): Promise<Category>;
    private mapAttribute;
}
