import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    BadRequestException,
    Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const multerOptions = {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req: any, file: any, cb: any) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    },
};

@Controller('api/uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    // Upload a single image for a product
    @Post('product/:productId')
    @UseInterceptors(FileInterceptor('image', multerOptions))
    async uploadSingle(
        @Param('productId') productId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const { filename, url } = await this.uploadsService.saveFile(file);
        const image = await this.uploadsService.createProductImage(productId, url, filename);

        return image;
    }

    // Upload multiple images for a product
    @Post('product/:productId/multiple')
    @UseInterceptors(FilesInterceptor('images', 6, multerOptions))
    async uploadMultiple(
        @Param('productId') productId: string,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }

        const images: Awaited<ReturnType<typeof this.uploadsService.createProductImage>>[] = [];
        for (let i = 0; i < files.length; i++) {
            const { filename, url } = await this.uploadsService.saveFile(files[i]);
            const image = await this.uploadsService.createProductImage(
                productId,
                url,
                filename,
                i === 0, // First image is primary if no existing images
                i,
            );
            images.push(image);
        }

        return images;
    }

    // Get all images for a product
    @Get('product/:productId')
    async getProductImages(@Param('productId') productId: string) {
        return this.uploadsService.getProductImages(productId);
    }

    // Set an image as primary
    @Post(':imageId/primary')
    async setPrimary(
        @Param('imageId') imageId: string,
        @Body('productId') productId: string,
    ) {
        await this.uploadsService.setPrimaryImage(parseInt(imageId), productId);
        return { success: true };
    }

    // Delete an image
    @Delete(':imageId')
    async deleteImage(@Param('imageId') imageId: string) {
        await this.uploadsService.deleteProductImage(parseInt(imageId));
        return { success: true };
    }
}
