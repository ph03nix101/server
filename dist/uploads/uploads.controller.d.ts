import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadSingle(productId: string, file: Express.Multer.File): Promise<import("./uploads.service").ProductImage>;
    uploadMultiple(productId: string, files: Express.Multer.File[]): Promise<import("./uploads.service").ProductImage[]>;
    getProductImages(productId: string): Promise<import("./uploads.service").ProductImage[]>;
    setPrimary(imageId: string, productId: string): Promise<{
        success: boolean;
    }>;
    deleteImage(imageId: string): Promise<{
        success: boolean;
    }>;
}
