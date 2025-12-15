import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ProductImage {
    id: number;
    product_id: string;
    url: string;
    filename: string;
    is_primary: boolean;
    display_order: number;
    created_at: Date;
}

@Injectable()
export class UploadsService {
    private uploadDir = path.join(process.cwd(), 'uploads');

    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) {
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(file: Express.Multer.File): Promise<{ filename: string; url: string }> {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uuidv4()}${ext}`;
        const filepath = path.join(this.uploadDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        return {
            filename,
            url: `/uploads/${filename}`,
        };
    }

    async deleteFile(filename: string): Promise<void> {
        const filepath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }

    async createProductImage(
        productId: string,
        url: string,
        filename: string,
        isPrimary: boolean = false,
        displayOrder: number = 0,
    ): Promise<ProductImage> {
        // If this is the first image, make it primary
        const existingImages = await this.getProductImages(productId);
        if (existingImages.length === 0) {
            isPrimary = true;
        }

        const result = await this.pool.query(
            `INSERT INTO product_images (product_id, url, filename, is_primary, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [productId, url, filename, isPrimary, displayOrder],
        );
        return result.rows[0];
    }

    async getProductImages(productId: string): Promise<ProductImage[]> {
        const result = await this.pool.query(
            `SELECT * FROM product_images 
             WHERE product_id = $1 
             ORDER BY is_primary DESC, display_order ASC`,
            [productId],
        );
        return result.rows;
    }

    async getPrimaryImage(productId: string): Promise<ProductImage | null> {
        const result = await this.pool.query(
            `SELECT * FROM product_images 
             WHERE product_id = $1 AND is_primary = true`,
            [productId],
        );
        return result.rows[0] || null;
    }

    async setPrimaryImage(imageId: number, productId: string): Promise<void> {
        // Remove primary from all images for this product
        await this.pool.query(
            `UPDATE product_images SET is_primary = false WHERE product_id = $1`,
            [productId],
        );
        // Set new primary
        await this.pool.query(
            `UPDATE product_images SET is_primary = true WHERE id = $1`,
            [imageId],
        );
    }

    async deleteProductImage(imageId: number): Promise<void> {
        // Get image info first
        const result = await this.pool.query(
            `SELECT * FROM product_images WHERE id = $1`,
            [imageId],
        );

        if (result.rows[0]) {
            const image = result.rows[0];
            // Delete file from disk
            await this.deleteFile(image.filename);
            // Delete from database
            await this.pool.query(`DELETE FROM product_images WHERE id = $1`, [imageId]);

            // If this was primary, set another image as primary
            if (image.is_primary) {
                const remaining = await this.getProductImages(image.product_id);
                if (remaining.length > 0) {
                    await this.setPrimaryImage(remaining[0].id, image.product_id);
                }
            }
        }
    }

    async deleteAllProductImages(productId: string): Promise<void> {
        const images = await this.getProductImages(productId);
        for (const image of images) {
            await this.deleteFile(image.filename);
        }
        await this.pool.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
    }
}
