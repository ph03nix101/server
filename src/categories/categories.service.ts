import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Category, CategoryAttribute } from '../types/category.interface';

@Injectable()
export class CategoriesService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async getAllCategories(): Promise<Category[]> {
        const { rows } = await this.pool.query(
            'SELECT * FROM categories ORDER BY id'
        );
        return rows;
    }

    async getCategoriesWithCounts(): Promise<(Category & { product_count: number })[]> {
        const { rows } = await this.pool.query(
            `SELECT c.*, COALESCE(COUNT(p.id), 0)::int as product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.status = 'Active'
             GROUP BY c.id
             ORDER BY product_count DESC, c.id`
        );
        return rows;
    }

    async getCategoryBySlug(slug: string): Promise<Category | null> {
        const { rows } = await this.pool.query(
            'SELECT * FROM categories WHERE slug = $1',
            [slug]
        );
        return rows[0] || null;
    }

    async getAttributes(slug: string): Promise<CategoryAttribute[]> {
        const category = await this.getCategoryBySlug(slug);

        if (!category) {
            throw new NotFoundException(`Category "${slug}" not found`);
        }

        const { rows } = await this.pool.query(
            `SELECT * FROM category_attributes 
       WHERE category_id = $1 
       ORDER BY display_order ASC`,
            [category.id]
        );

        // NOTE: pg driver auto-parses JSONB columns - do NOT use JSON.parse()
        return rows.map(row => ({
            ...row,
            options: row.options,          // Already parsed by pg driver
            filter_context: row.filter_context,  // Already parsed by pg driver
        }));
    }
}
