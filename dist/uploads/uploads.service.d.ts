import { Pool } from 'pg';
export interface ProductImage {
    id: number;
    product_id: string;
    url: string;
    filename: string;
    is_primary: boolean;
    display_order: number;
    created_at: Date;
}
export declare class UploadsService {
    private pool;
    private uploadDir;
    constructor(pool: Pool);
    saveFile(file: Express.Multer.File): Promise<{
        filename: string;
        url: string;
    }>;
    deleteFile(filename: string): Promise<void>;
    createProductImage(productId: string, url: string, filename: string, isPrimary?: boolean, displayOrder?: number): Promise<ProductImage>;
    getProductImages(productId: string): Promise<ProductImage[]>;
    getPrimaryImage(productId: string): Promise<ProductImage | null>;
    setPrimaryImage(imageId: number, productId: string): Promise<void>;
    deleteProductImage(imageId: number): Promise<void>;
    deleteAllProductImages(productId: string): Promise<void>;
}
