import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Product } from '../types/product.interface';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async create(dto: CreateProductDto): Promise<Product> {
        // Generate slug from title
        const slug = this.generateSlug(dto.title);

        const { rows } = await this.pool.query(
            `INSERT INTO products 
       (seller_id, category_id, title, slug, price, description, condition, specs, cpu_ref_id, gpu_ref_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [
                dto.seller_id,
                dto.category_id,
                dto.title,
                slug,
                dto.price,
                dto.description,
                dto.condition,
                JSON.stringify(dto.specs),
                dto.cpu_ref_id,
                dto.gpu_ref_id,
            ]
        );

        return rows[0];
    }

    async findAll(filters?: {
        q?: string;              // Text search
        category_id?: number;
        minPrice?: number;
        maxPrice?: number;
        condition?: string[];    // Multiple conditions
        specs?: Record<string, string[]>;  // Dynamic spec filters
        sort?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';
        page?: number;
        limit?: number;
    }): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
        // Updated to include 'Auction' status and join with auctions table
        let query = `
            SELECT p.*, 
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
            FROM products p
            LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
            WHERE p.status IN ($1, $2)
        `;
        let countQuery = `SELECT COUNT(*) FROM products p WHERE p.status IN ($1, $2)`;
        const params: any[] = ['Active', 'Auction'];
        const countParams: any[] = ['Active', 'Auction'];
        let paramIndex = 3;

        // Text search (title, description, and specs values)
        if (filters?.q && filters.q.trim()) {
            const searchTerm = `%${filters.q.trim().toLowerCase()}%`;
            // Search in title, description, and specs (cast JSONB to text for full-text search)
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

        // Category filter
        if (filters?.category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            countQuery += ` AND p.category_id = $${paramIndex}`;
            params.push(filters.category_id);
            countParams.push(filters.category_id);
            paramIndex++;
        }

        // Price range
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

        // Condition filter (multiple values)
        if (filters?.condition && filters.condition.length > 0) {
            const placeholders = filters.condition.map(() => `$${paramIndex++}`).join(', ');
            query += ` AND p.condition IN (${placeholders})`;
            countQuery += ` AND p.condition IN (${placeholders})`;
            params.push(...filters.condition);
            countParams.push(...filters.condition);
        }

        // Dynamic spec filters
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

        // Sorting
        const sortMap: Record<string, string> = {
            price_asc: 'p.price ASC',
            price_desc: 'p.price DESC',
            date_desc: 'p.created_at DESC',
            date_asc: 'p.created_at ASC',
        };
        const sortClause = sortMap[filters?.sort || 'date_desc'] || 'p.created_at DESC';
        query += ` ORDER BY ${sortClause}`;

        // Pagination
        const limit = Math.min(filters?.limit || 20, 100);
        const page = Math.max(filters?.page || 1, 1);
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        // Execute queries
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

    async findById(id: string): Promise<Product> {
        const { rows } = await this.pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return rows[0];
    }

    async findBySeller(sellerId: string): Promise<Product[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM products 
             WHERE seller_id = $1 AND status != 'Removed'
             ORDER BY created_at DESC`,
            [sellerId]
        );
        return rows;
    }

    async updateStatus(id: string, status: string): Promise<Product> {
        const validStatuses = ['Active', 'Sold', 'Paused', 'Draft'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status} `);
        }

        const { rows } = await this.pool.query(
            `UPDATE products SET status = $1, updated_at = NOW()
             WHERE id = $2
            RETURNING * `,
            [status, id]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return rows[0];
    }

    async update(id: string, updates: Partial<CreateProductDto>): Promise<Product> {
        const existing = await this.findById(id);

        const { rows } = await this.pool.query(
            `UPDATE products SET
            title = COALESCE($1, title),
                price = COALESCE($2, price),
                description = COALESCE($3, description),
                condition = COALESCE($4, condition),
                specs = COALESCE($5, specs),
                updated_at = NOW()
       WHERE id = $6
            RETURNING * `,
            [
                updates.title,
                updates.price,
                updates.description,
                updates.condition,
                updates.specs ? JSON.stringify(updates.specs) : null,
                id,
            ]
        );

        return rows[0];
    }

    async delete(id: string): Promise<void> {
        await this.pool.query(
            `UPDATE products SET status = 'Removed' WHERE id = $1`,
            [id]
        );
    }

    async findSimilar(productId: string, limit: number = 4): Promise<Product[]> {
        // First, get the current product's details
        const currentProduct = await this.findById(productId);
        if (!currentProduct) {
            return [];
        }

        // Find products in the same category, excluding the current product
        // Order by: same condition first, then by similar price
        const { rows } = await this.pool.query(
            `SELECT p.*, 
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
            FROM products p
            LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
            WHERE p.id != $1 
               AND p.category_id = $2 
               AND p.status IN ('Active', 'Auction')
             ORDER BY 
               CASE WHEN p.condition = $3 THEN 0 ELSE 1 END,
               ABS(CAST(p.price AS NUMERIC) - CAST($4 AS NUMERIC))
             LIMIT $5`,
            [productId, currentProduct.category_id, currentProduct.condition, currentProduct.price, limit]
        );

        return rows;
    }

    async getTrending(limit: number = 4): Promise<Product[]> {
        // Trending = recently listed products in good condition
        const { rows } = await this.pool.query(
            `SELECT p.*,
            CASE WHEN a.id IS NOT NULL THEN row_to_json(a) ELSE NULL END as auction
             FROM products p
             LEFT JOIN auctions a ON p.id = a.product_id AND a.status = 'active'
             WHERE p.status IN ('Active', 'Auction')
               AND p.condition IN ('New', 'Like New', 'Good')
             ORDER BY p.created_at DESC
             LIMIT $1`,
            [limit]
        );
        return rows;
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            + '-' + Date.now().toString(36);
    }
}
