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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let ProductsService = class ProductsService {
    pool;
    constructor(pool) {
        this.pool = pool;
        this.ensureSchema();
    }
    async ensureSchema() {
        await this.pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'original_price') THEN 
                    ALTER TABLE products ADD COLUMN original_price DECIMAL(10,2); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'condition_description') THEN 
                    ALTER TABLE products ADD COLUMN condition_description TEXT; 
                END IF;
            END $$;
        `);
    }
    async create(dto) {
        const slug = this.generateSlug(dto.title);
        const { rows } = await this.pool.query(`INSERT INTO products 
       (seller_id, category_id, title, slug, price, original_price, description, condition, condition_description, specs, cpu_ref_id, gpu_ref_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`, [
            dto.seller_id,
            dto.category_id,
            dto.title,
            slug,
            dto.price,
            dto.original_price,
            dto.description,
            dto.condition,
            dto.condition_description,
            JSON.stringify(dto.specs),
            dto.cpu_ref_id,
            dto.gpu_ref_id,
        ]);
        return rows[0];
    }
    async findAll(filters) {
        let query = `
            SELECT p.*, 
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
            FROM products p
            LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
            WHERE p.status IN ($1, $2)
        `;
        let countQuery = `SELECT COUNT(*) FROM products p WHERE p.status IN ($1, $2)`;
        const params = ['Active', 'Auction'];
        const countParams = ['Active', 'Auction'];
        let paramIndex = 3;
        if (filters?.q && filters.q.trim()) {
            const searchTerm = `%${filters.q.trim().toLowerCase()}%`;
            query += ` AND (
                LOWER(p.title) LIKE $${paramIndex} 
                OR LOWER(COALESCE(p.description, '')) LIKE $${paramIndex}
                OR LOWER(p.specs::text) LIKE $${paramIndex}
            )`;
            countQuery += ` AND (
                LOWER(p.title) LIKE $${paramIndex} 
                OR LOWER(COALESCE(p.description, '')) LIKE $${paramIndex}
                OR LOWER(p.specs::text) LIKE $${paramIndex}
            )`;
            params.push(searchTerm);
            countParams.push(searchTerm);
            paramIndex++;
        }
        if (filters?.category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            countQuery += ` AND p.category_id = $${paramIndex}`;
            params.push(filters.category_id);
            countParams.push(filters.category_id);
            paramIndex++;
        }
        if (filters?.minPrice !== undefined) {
            query += ` AND p.price >= $${paramIndex}`;
            countQuery += ` AND p.price >= $${paramIndex}`;
            params.push(filters.minPrice);
            countParams.push(filters.minPrice);
            paramIndex++;
        }
        if (filters?.maxPrice !== undefined) {
            query += ` AND p.price <= $${paramIndex}`;
            countQuery += ` AND p.price <= $${paramIndex}`;
            params.push(filters.maxPrice);
            countParams.push(filters.maxPrice);
            paramIndex++;
        }
        if (filters?.condition && filters.condition.length > 0) {
            const placeholders = filters.condition.map(() => `$${paramIndex++}`).join(', ');
            query += ` AND p.condition IN (${placeholders})`;
            countQuery += ` AND p.condition IN (${placeholders})`;
            params.push(...filters.condition);
            countParams.push(...filters.condition);
        }
        if (filters?.specs) {
            for (const [key, values] of Object.entries(filters.specs)) {
                if (values && values.length > 0) {
                    const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
                    query += ` AND p.specs->>'${key}' IN (${placeholders})`;
                    countQuery += ` AND p.specs->>'${key}' IN (${placeholders})`;
                    params.push(...values);
                    countParams.push(...values);
                }
            }
        }
        const sortMap = {
            price_asc: 'p.price ASC',
            price_desc: 'p.price DESC',
            date_desc: 'p.created_at DESC',
            date_asc: 'p.created_at ASC',
        };
        const sortClause = sortMap[filters?.sort || 'date_desc'] || 'p.created_at DESC';
        query += ` ORDER BY ${sortClause}`;
        const limit = Math.min(filters?.limit || 20, 100);
        const page = Math.max(filters?.page || 1, 1);
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        const [productsResult, countResult] = await Promise.all([
            this.pool.query(query, params),
            this.pool.query(countQuery, countParams),
        ]);
        const total = parseInt(countResult.rows[0]?.count || '0', 10);
        const totalPages = Math.ceil(total / limit);
        return {
            products: productsResult.rows,
            total,
            page,
            totalPages,
        };
    }
    async findById(id) {
        const { rows } = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return rows[0];
    }
    async findBySeller(sellerId) {
        const { rows } = await this.pool.query(`SELECT * FROM products 
             WHERE seller_id = $1 AND status != 'Removed'
             ORDER BY created_at DESC`, [sellerId]);
        return rows;
    }
    async updateStatus(id, status) {
        const validStatuses = ['Active', 'Sold', 'Paused', 'Draft'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status} `);
        }
        const { rows } = await this.pool.query(`UPDATE products SET status = $1, updated_at = NOW()
             WHERE id = $2
            RETURNING * `, [status, id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return rows[0];
    }
    async update(id, updates) {
        const existing = await this.findById(id);
        const { rows } = await this.pool.query(`UPDATE products SET
            title = COALESCE($1, title),
                price = COALESCE($2, price),
                description = COALESCE($3, description),
                condition = COALESCE($4, condition),
                specs = COALESCE($5, specs),
                original_price = COALESCE($6, original_price),
                condition_description = COALESCE($7, condition_description),
                updated_at = NOW()
       WHERE id = $8
            RETURNING * `, [
            updates.title,
            updates.price,
            updates.description,
            updates.condition,
            updates.specs ? JSON.stringify(updates.specs) : null,
            updates.original_price,
            updates.condition_description,
            id,
        ]);
        return rows[0];
    }
    async delete(id) {
        await this.pool.query(`UPDATE products SET status = 'Removed' WHERE id = $1`, [id]);
    }
    async findSimilar(productId, limit = 4) {
        const currentProduct = await this.findById(productId);
        if (!currentProduct) {
            return [];
        }
        const { rows } = await this.pool.query(`SELECT p.*, 
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
            FROM products p
            LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
            WHERE p.id != $1 
               AND p.category_id = $2 
               AND p.status IN ('Active', 'Auction')
             ORDER BY 
               CASE WHEN p.condition = $3 THEN 0 ELSE 1 END,
               ABS(CAST(p.price AS NUMERIC) - CAST($4 AS NUMERIC))
             LIMIT $5`, [productId, currentProduct.category_id, currentProduct.condition, currentProduct.price, limit]);
        return rows;
    }
    async getTrending(limit = 4) {
        const { rows } = await this.pool.query(`SELECT p.*,
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
             FROM products p
             LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
             WHERE p.status IN ('Active', 'Auction')
               AND p.condition IN ('New', 'Like New', 'Good')
             ORDER BY p.created_at DESC
             LIMIT $1`, [limit]);
        return rows;
    }
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            + '-' + Date.now().toString(36);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], ProductsService);
//# sourceMappingURL=products.service.js.map