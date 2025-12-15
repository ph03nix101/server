import { AdminCategoriesService } from './admin-categories.service';
import { Category, CategoryAttribute } from '../../types/category.interface';
export declare class AdminCategoriesController {
    private readonly adminCategoriesService;
    constructor(adminCategoriesService: AdminCategoriesService);
    createCategory(body: {
        name: string;
        slug: string;
        icon?: string;
        is_published?: boolean;
    }): Promise<Category>;
    updateCategory(id: string, body: {
        name?: string;
        slug?: string;
        icon?: string;
        is_published?: boolean;
    }): Promise<Category>;
    deleteCategory(id: string): Promise<void>;
    cloneCategory(body: {
        sourceId: number;
        newName: string;
        newSlug: string;
    }): Promise<Category>;
    getAttributes(id: string): Promise<CategoryAttribute[]>;
    createAttribute(id: string, body: Omit<CategoryAttribute, 'id' | 'category_id'>): Promise<CategoryAttribute>;
    updateAttribute(id: string, body: Partial<CategoryAttribute>): Promise<CategoryAttribute>;
    deleteAttribute(id: string): Promise<void>;
    reorderAttributes(body: {
        updates: {
            id: number;
            display_order: number;
        }[];
    }): Promise<void>;
}
