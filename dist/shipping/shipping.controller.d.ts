import type { Request } from 'express';
import { ShippingService, ShippingOption, ProductShipping } from './shipping.service';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    createTemplate(req: Request, body: {
        name: string;
        price: number;
        estimated_days_min?: number;
        estimated_days_max?: number;
        coverage_area?: string;
        is_collection?: boolean;
        collection_address?: string;
        is_default?: boolean;
    }): Promise<ShippingOption>;
    getMyTemplates(req: Request): Promise<ShippingOption[]>;
    getSellerTemplates(sellerId: string): Promise<ShippingOption[]>;
    getTemplateById(id: string): Promise<ShippingOption>;
    updateTemplate(req: Request, id: string, body: Partial<{
        name: string;
        price: number;
        estimated_days_min: number;
        estimated_days_max: number;
        coverage_area: string;
        is_collection: boolean;
        collection_address: string;
        is_default: boolean;
    }>): Promise<ShippingOption>;
    deleteTemplate(req: Request, id: string): Promise<{
        message: string;
    }>;
    getProductShipping(productId: string): Promise<ProductShipping[]>;
    assignShipping(req: Request, productId: string, body: {
        shipping_option_id?: string;
        custom_price?: number;
        custom_estimated_days_min?: number;
        custom_estimated_days_max?: number;
        custom_coverage_area?: string;
        display_order?: number;
    }): Promise<ProductShipping>;
    assignDefaultShipping(req: Request, productId: string): Promise<{
        message: string;
    }>;
    removeShipping(req: Request, id: string): Promise<{
        message: string;
    }>;
}
