export interface Product {
    id: string;
    seller_id: string;
    category_id: number;
    title: string;
    slug?: string;
    price: number;
    description?: string;
    condition: 'New' | 'Open Box' | 'Used - Like New' | 'Used - Good' | 'Used - Fair' | 'For Parts';
    specs: Record<string, any>;
    cpu_ref_id?: number;
    gpu_ref_id?: number;
    status: 'Active' | 'Sold' | 'Draft' | 'Removed';
    created_at: Date;
    updated_at: Date;
    auction?: any;
}

export interface ProductImage {
    id: number;
    product_id: string;
    url: string;
    display_order: number;
    is_primary: boolean;
}
