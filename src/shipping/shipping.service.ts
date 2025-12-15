import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    // Joined fields from shipping_options
    name?: string;
    price?: number;
    estimated_days_min?: number | null;
    estimated_days_max?: number | null;
    coverage_area?: string | null;
    is_collection?: boolean;
    collection_address?: string | null;
}

@Injectable()
export class ShippingService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) {
        this.ensureTables();
    }

    private async ensureTables() {
        // Create shipping_options table
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS shipping_options (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0,
                estimated_days_min INT,
                estimated_days_max INT,
                coverage_area VARCHAR(100),
                is_collection BOOLEAN DEFAULT false,
                collection_address TEXT,
                is_default BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create product_shipping table
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS product_shipping (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                shipping_option_id UUID REFERENCES shipping_options(id) ON DELETE SET NULL,
                custom_price DECIMAL(10,2),
                custom_estimated_days_min INT,
                custom_estimated_days_max INT,
                custom_coverage_area VARCHAR(100),
                is_active BOOLEAN DEFAULT true,
                display_order INT DEFAULT 0
            )
        `);

        // Create indexes
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_shipping_options_seller ON shipping_options(seller_id);
            CREATE INDEX IF NOT EXISTS idx_product_shipping_product ON product_shipping(product_id);
        `);
    }

    // ==================== SHIPPING TEMPLATES ====================

    async createTemplate(
        sellerId: string,
        data: {
            name: string;
            price: number;
            estimated_days_min?: number;
            estimated_days_max?: number;
            coverage_area?: string;
            is_collection?: boolean;
            collection_address?: string;
            is_default?: boolean;
        }
    ): Promise<ShippingOption> {
        // If this is default, unset other defaults first
        if (data.is_default) {
            await this.pool.query(
                'UPDATE shipping_options SET is_default = false WHERE seller_id = $1',
                [sellerId]
            );
        }

        const { rows } = await this.pool.query(
            `INSERT INTO shipping_options 
             (seller_id, name, price, estimated_days_min, estimated_days_max, coverage_area, is_collection, collection_address, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                sellerId,
                data.name,
                data.price,
                data.estimated_days_min || null,
                data.estimated_days_max || null,
                data.coverage_area || null,
                data.is_collection || false,
                data.collection_address || null,
                data.is_default || false,
            ]
        );

        return this.mapShippingOption(rows[0]);
    }

    async getSellerTemplates(sellerId: string): Promise<ShippingOption[]> {
        const { rows } = await this.pool.query(
            'SELECT * FROM shipping_options WHERE seller_id = $1 AND is_active = true ORDER BY is_default DESC, created_at ASC',
            [sellerId]
        );
        return rows.map(this.mapShippingOption);
    }

    async getTemplateById(id: string): Promise<ShippingOption> {
        const { rows } = await this.pool.query(
            'SELECT * FROM shipping_options WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            throw new NotFoundException('Shipping option not found');
        }

        return this.mapShippingOption(rows[0]);
    }

    async updateTemplate(
        id: string,
        sellerId: string,
        data: Partial<{
            name: string;
            price: number;
            estimated_days_min: number;
            estimated_days_max: number;
            coverage_area: string;
            is_collection: boolean;
            collection_address: string;
            is_default: boolean;
        }>
    ): Promise<ShippingOption> {
        // Check ownership
        const existing = await this.getTemplateById(id);
        if (existing.seller_id !== sellerId) {
            throw new ForbiddenException('You can only update your own shipping options');
        }

        // If setting as default, unset others first
        if (data.is_default) {
            await this.pool.query(
                'UPDATE shipping_options SET is_default = false WHERE seller_id = $1 AND id != $2',
                [sellerId, id]
            );
        }

        const { rows } = await this.pool.query(
            `UPDATE shipping_options SET
                name = COALESCE($1, name),
                price = COALESCE($2, price),
                estimated_days_min = COALESCE($3, estimated_days_min),
                estimated_days_max = COALESCE($4, estimated_days_max),
                coverage_area = COALESCE($5, coverage_area),
                is_collection = COALESCE($6, is_collection),
                collection_address = COALESCE($7, collection_address),
                is_default = COALESCE($8, is_default)
             WHERE id = $9
             RETURNING *`,
            [
                data.name,
                data.price,
                data.estimated_days_min,
                data.estimated_days_max,
                data.coverage_area,
                data.is_collection,
                data.collection_address,
                data.is_default,
                id,
            ]
        );

        return this.mapShippingOption(rows[0]);
    }

    async deleteTemplate(id: string, sellerId: string): Promise<void> {
        // Check ownership
        const existing = await this.getTemplateById(id);
        if (existing.seller_id !== sellerId) {
            throw new ForbiddenException('You can only delete your own shipping options');
        }

        // Soft delete by marking inactive
        await this.pool.query(
            'UPDATE shipping_options SET is_active = false WHERE id = $1',
            [id]
        );
    }

    // ==================== PRODUCT SHIPPING ====================

    async getProductShipping(productId: string): Promise<ProductShipping[]> {
        const { rows } = await this.pool.query(
            `SELECT ps.*, 
                    so.name, so.price, so.estimated_days_min, so.estimated_days_max,
                    so.coverage_area, so.is_collection, so.collection_address
             FROM product_shipping ps
             LEFT JOIN shipping_options so ON ps.shipping_option_id = so.id
             WHERE ps.product_id = $1 AND ps.is_active = true
             ORDER BY ps.display_order ASC`,
            [productId]
        );

        return rows.map((row) => ({
            id: row.id,
            product_id: row.product_id,
            shipping_option_id: row.shipping_option_id,
            custom_price: row.custom_price ? parseFloat(row.custom_price) : null,
            custom_estimated_days_min: row.custom_estimated_days_min,
            custom_estimated_days_max: row.custom_estimated_days_max,
            custom_coverage_area: row.custom_coverage_area,
            is_active: row.is_active,
            display_order: row.display_order,
            // Use custom values if available, otherwise use template values
            name: row.name,
            price: row.custom_price ? parseFloat(row.custom_price) : (row.price ? parseFloat(row.price) : 0),
            estimated_days_min: row.custom_estimated_days_min || row.estimated_days_min,
            estimated_days_max: row.custom_estimated_days_max || row.estimated_days_max,
            coverage_area: row.custom_coverage_area || row.coverage_area,
            is_collection: row.is_collection,
            collection_address: row.collection_address,
        }));
    }

    async assignShippingToProduct(
        productId: string,
        sellerId: string,
        data: {
            shipping_option_id?: string;
            custom_price?: number;
            custom_estimated_days_min?: number;
            custom_estimated_days_max?: number;
            custom_coverage_area?: string;
            display_order?: number;
        }
    ): Promise<ProductShipping> {
        // Verify product ownership
        const { rows: productRows } = await this.pool.query(
            'SELECT seller_id FROM products WHERE id = $1',
            [productId]
        );

        if (productRows.length === 0) {
            throw new NotFoundException('Product not found');
        }

        if (productRows[0].seller_id !== sellerId) {
            throw new ForbiddenException('You can only manage shipping for your own products');
        }

        // If using a template, verify it belongs to this seller
        if (data.shipping_option_id) {
            const template = await this.getTemplateById(data.shipping_option_id);
            if (template.seller_id !== sellerId) {
                throw new ForbiddenException('You can only use your own shipping templates');
            }
        }

        const { rows } = await this.pool.query(
            `INSERT INTO product_shipping 
             (product_id, shipping_option_id, custom_price, custom_estimated_days_min, custom_estimated_days_max, custom_coverage_area, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                productId,
                data.shipping_option_id || null,
                data.custom_price || null,
                data.custom_estimated_days_min || null,
                data.custom_estimated_days_max || null,
                data.custom_coverage_area || null,
                data.display_order || 0,
            ]
        );

        return rows[0];
    }

    async removeShippingFromProduct(productShippingId: string, sellerId: string): Promise<void> {
        // Get the product shipping record and verify ownership
        const { rows } = await this.pool.query(
            `SELECT ps.*, p.seller_id 
             FROM product_shipping ps
             JOIN products p ON ps.product_id = p.id
             WHERE ps.id = $1`,
            [productShippingId]
        );

        if (rows.length === 0) {
            throw new NotFoundException('Product shipping not found');
        }

        if (rows[0].seller_id !== sellerId) {
            throw new ForbiddenException('You can only manage shipping for your own products');
        }

        await this.pool.query(
            'UPDATE product_shipping SET is_active = false WHERE id = $1',
            [productShippingId]
        );
    }

    async assignDefaultShipping(productId: string, sellerId: string): Promise<void> {
        // Get seller's default shipping options
        const { rows: defaults } = await this.pool.query(
            'SELECT id FROM shipping_options WHERE seller_id = $1 AND is_default = true AND is_active = true',
            [sellerId]
        );

        // Assign each default to the product
        for (const option of defaults) {
            await this.assignShippingToProduct(productId, sellerId, {
                shipping_option_id: option.id,
            });
        }
    }

    private mapShippingOption(row: any): ShippingOption {
        return {
            id: row.id,
            seller_id: row.seller_id,
            name: row.name,
            price: parseFloat(row.price),
            estimated_days_min: row.estimated_days_min,
            estimated_days_max: row.estimated_days_max,
            coverage_area: row.coverage_area,
            is_collection: row.is_collection,
            collection_address: row.collection_address,
            is_default: row.is_default,
            is_active: row.is_active,
            created_at: row.created_at,
        };
    }
}
