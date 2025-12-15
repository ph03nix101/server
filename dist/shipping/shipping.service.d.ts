import { Pool } from 'pg';
export interface ShippingOption {
    id: string;
    seller_id: string;
    name: string;
    price: number;
    estimated_days_min: number | null;
    estimated_days_max: number | null;
    coverage_area: string | null;
    is_collection: boolean;
    collection_address: string | null;
    is_default: boolean;
    is_active: boolean;
    created_at: Date;
}
export interface ProductShipping {
    id: string;
    product_id: string;
    shipping_option_id: string | null;
    custom_price: number | null;
    custom_estimated_days_min: number | null;
    custom_estimated_days_max: number | null;
    custom_coverage_area: string | null;
    is_active: boolean;
    display_order: number;
    name?: string;
    price?: number;
    estimated_days_min?: number | null;
    estimated_days_max?: number | null;
    coverage_area?: string | null;
    is_collection?: boolean;
    collection_address?: string | null;
}
export declare class ShippingService {
    private pool;
    constructor(pool: Pool);
    private ensureTables;
    createTemplate(sellerId: string, data: {
        name: string;
        price: number;
        estimated_days_min?: number;
        estimated_days_max?: number;
        coverage_area?: string;
        is_collection?: boolean;
        collection_address?: string;
        is_default?: boolean;
    }): Promise<ShippingOption>;
    getSellerTemplates(sellerId: string): Promise<ShippingOption[]>;
    getTemplateById(id: string): Promise<ShippingOption>;
    updateTemplate(id: string, sellerId: string, data: Partial<{
        name: string;
        price: number;
        estimated_days_min: number;
        estimated_days_max: number;
        coverage_area: string;
        is_collection: boolean;
        collection_address: string;
        is_default: boolean;
    }>): Promise<ShippingOption>;
    deleteTemplate(id: string, sellerId: string): Promise<void>;
    getProductShipping(productId: string): Promise<ProductShipping[]>;
    assignShippingToProduct(productId: string, sellerId: string, data: {
        shipping_option_id?: string;
        custom_price?: number;
        custom_estimated_days_min?: number;
        custom_estimated_days_max?: number;
        custom_coverage_area?: string;
        display_order?: number;
    }): Promise<ProductShipping>;
    removeShippingFromProduct(productShippingId: string, sellerId: string): Promise<void>;
    assignDefaultShipping(productId: string, sellerId: string): Promise<void>;
    private mapShippingOption;
}
