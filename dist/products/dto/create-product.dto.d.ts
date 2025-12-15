export declare class CreateProductDto {
    seller_id: string;
    category_id: number;
    title: string;
    price: number;
    description?: string;
    condition: string;
    specs: Record<string, any>;
    cpu_ref_id?: number;
    gpu_ref_id?: number;
}
