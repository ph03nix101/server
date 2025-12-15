import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    getAllCategories(): Promise<import("../types/category.interface").Category[]>;
    getCategoriesWithCounts(): Promise<(import("../types/category.interface").Category & {
        product_count: number;
    })[]>;
    getCategoryBySlug(slug: string): Promise<import("../types/category.interface").Category | null>;
    getAttributes(slug: string): Promise<import("../types/category.interface").CategoryAttribute[]>;
}
