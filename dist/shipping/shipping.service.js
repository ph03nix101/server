"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let ShippingService = class ShippingService {
    pool;
    constructor(pool) {
        this.pool = pool;
        this.ensureTables();
    }
    async ensureTables() {
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
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_shipping_options_seller ON shipping_options(seller_id);
            CREATE INDEX IF NOT EXISTS idx_product_shipping_product ON product_shipping(product_id);
        `);
    }
    async createTemplate(sellerId, data) {
        if (data.is_default) {
            await this.pool.query('UPDATE shipping_options SET is_default = false WHERE seller_id = $1', [sellerId]);
        }
        const { rows } = await this.pool.query(`INSERT INTO shipping_options 
             (seller_id, name, price, estimated_days_min, estimated_days_max, coverage_area, is_collection, collection_address, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`, [
            sellerId,
            data.name,
            data.price,
            data.estimated_days_min || null,
            data.estimated_days_max || null,
            data.coverage_area || null,
            data.is_collection || false,
            data.collection_address || null,
            data.is_default || false,
        ]);
        return this.mapShippingOption(rows[0]);
    }
    async getSellerTemplates(sellerId) {
        const { rows } = await this.pool.query('SELECT * FROM shipping_options WHERE seller_id = $1 AND is_active = true ORDER BY is_default DESC, created_at ASC', [sellerId]);
        return rows.map(this.mapShippingOption);
    }
    async getTemplateById(id) {
        const { rows } = await this.pool.query('SELECT * FROM shipping_options WHERE id = $1', [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Shipping option not found');
        }
        return this.mapShippingOption(rows[0]);
    }
    async updateTemplate(id, sellerId, data) {
        const existing = await this.getTemplateById(id);
        if (existing.seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only update your own shipping options');
        }
        if (data.is_default) {
            await this.pool.query('UPDATE shipping_options SET is_default = false WHERE seller_id = $1 AND id != $2', [sellerId, id]);
        }
        const { rows } = await this.pool.query(`UPDATE shipping_options SET
                name = COALESCE($1, name),
                price = COALESCE($2, price),
                estimated_days_min = COALESCE($3, estimated_days_min),
                estimated_days_max = COALESCE($4, estimated_days_max),
                coverage_area = COALESCE($5, coverage_area),
                is_collection = COALESCE($6, is_collection),
                collection_address = COALESCE($7, collection_address),
                is_default = COALESCE($8, is_default)
             WHERE id = $9
             RETURNING *`, [
            data.name,
            data.price,
            data.estimated_days_min,
            data.estimated_days_max,
            data.coverage_area,
            data.is_collection,
            data.collection_address,
            data.is_default,
            id,
        ]);
        return this.mapShippingOption(rows[0]);
    }
    async deleteTemplate(id, sellerId) {
        const existing = await this.getTemplateById(id);
        if (existing.seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only delete your own shipping options');
        }
        await this.pool.query('UPDATE shipping_options SET is_active = false WHERE id = $1', [id]);
    }
    async getProductShipping(productId) {
        const { rows } = await this.pool.query(`SELECT ps.*, 
                    so.name, so.price, so.estimated_days_min, so.estimated_days_max,
                    so.coverage_area, so.is_collection, so.collection_address
             FROM product_shipping ps
             LEFT JOIN shipping_options so ON ps.shipping_option_id = so.id
             WHERE ps.product_id = $1 AND ps.is_active = true
             ORDER BY ps.display_order ASC`, [productId]);
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
            name: row.name,
            price: row.custom_price ? parseFloat(row.custom_price) : (row.price ? parseFloat(row.price) : 0),
            estimated_days_min: row.custom_estimated_days_min || row.estimated_days_min,
            estimated_days_max: row.custom_estimated_days_max || row.estimated_days_max,
            coverage_area: row.custom_coverage_area || row.coverage_area,
            is_collection: row.is_collection,
            collection_address: row.collection_address,
        }));
    }
    async assignShippingToProduct(productId, sellerId, data) {
        const { rows: productRows } = await this.pool.query('SELECT seller_id FROM products WHERE id = $1', [productId]);
        if (productRows.length === 0) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (productRows[0].seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only manage shipping for your own products');
        }
        if (data.shipping_option_id) {
            const template = await this.getTemplateById(data.shipping_option_id);
            if (template.seller_id !== sellerId) {
                throw new common_1.ForbiddenException('You can only use your own shipping templates');
            }
        }
        const { rows } = await this.pool.query(`INSERT INTO product_shipping 
             (product_id, shipping_option_id, custom_price, custom_estimated_days_min, custom_estimated_days_max, custom_coverage_area, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`, [
            productId,
            data.shipping_option_id || null,
            data.custom_price || null,
            data.custom_estimated_days_min || null,
            data.custom_estimated_days_max || null,
            data.custom_coverage_area || null,
            data.display_order || 0,
        ]);
        return rows[0];
    }
    async removeShippingFromProduct(productShippingId, sellerId) {
        const { rows } = await this.pool.query(`SELECT ps.*, p.seller_id 
             FROM product_shipping ps
             JOIN products p ON ps.product_id = p.id
             WHERE ps.id = $1`, [productShippingId]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Product shipping not found');
        }
        if (rows[0].seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only manage shipping for your own products');
        }
        await this.pool.query('UPDATE product_shipping SET is_active = false WHERE id = $1', [productShippingId]);
    }
    async assignDefaultShipping(productId, sellerId) {
        const { rows: defaults } = await this.pool.query('SELECT id FROM shipping_options WHERE seller_id = $1 AND is_default = true AND is_active = true', [sellerId]);
        for (const option of defaults) {
            await this.assignShippingToProduct(productId, sellerId, {
                shipping_option_id: option.id,
            });
        }
    }
    mapShippingOption(row) {
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
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map