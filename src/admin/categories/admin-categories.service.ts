import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { Category, CategoryAttribute } from '../../types/category.interface';

@Injectable()
export class AdminCategoriesService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) {
        this.ensureSchema();
    }

    private async ensureSchema() {
        // Add is_published to categories if not exists
        await this.pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_published') THEN 
                    ALTER TABLE categories ADD COLUMN is_published BOOLEAN DEFAULT false; 
                END IF;
            END $$;
        `);
    }

    async createCategory(data: { name: string; slug: string; icon?: string; is_published?: boolean }): Promise<Category> {
        const { rows } = await this.pool.query(
            `INSERT INTO categories (name, slug, icon, is_published) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [data.name, data.slug, data.icon, data.is_published || false]
        );
        return rows[0];
    }

    async updateCategory(id: number, data: { name?: string; slug?: string; icon?: string; is_published?: boolean }): Promise<Category> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.slug !== undefined) {
            updates.push(`slug = $${paramIndex++}`);
            values.push(data.slug);
        }
        if (data.icon !== undefined) {
            updates.push(`icon = $${paramIndex++}`);
            values.push(data.icon);
        }
        if (data.is_published !== undefined) {
            updates.push(`is_published = $${paramIndex++}`);
            values.push(data.is_published);
        }

        if (updates.length === 0) return this.getCategoryById(id);

        values.push(id);
        const { rows } = await this.pool.query(
            `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (rows.length === 0) throw new NotFoundException('Category not found');
        return rows[0];
    }

    async deleteCategory(id: number): Promise<void> {
        // First delete attributes
        await this.pool.query('DELETE FROM category_attributes WHERE category_id = $1', [id]);

        // Then delete category
        const { rowCount } = await this.pool.query('DELETE FROM categories WHERE id = $1', [id]);
        if (rowCount === 0) throw new NotFoundException('Category not found');
    }

    async getCategoryById(id: number): Promise<Category> {
        const { rows } = await this.pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        if (rows.length === 0) throw new NotFoundException('Category not found');
        return rows[0];
    }

    async getAttributes(categoryId: number): Promise<CategoryAttribute[]> {
        const { rows } = await this.pool.query(
            'SELECT * FROM category_attributes WHERE category_id = $1 ORDER BY display_order ASC',
            [categoryId]
        );
        return rows.map(this.mapAttribute);
    }

    async createAttribute(categoryId: number, data: Omit<CategoryAttribute, 'id' | 'category_id'>): Promise<CategoryAttribute> {
        const { rows } = await this.pool.query(
            `INSERT INTO category_attributes 
            (category_id, key_name, label, input_type, options, data_source, filter_context, unit, is_required, display_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                categoryId, data.key_name, data.label, data.input_type,
                JSON.stringify(data.options || []),
                data.data_source,
                JSON.stringify(data.filter_context || {}),
                data.unit, data.is_required, data.display_order
            ]
        );
        return this.mapAttribute(rows[0]);
    }

    async updateAttribute(id: number, data: Partial<CategoryAttribute>): Promise<CategoryAttribute> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const fields = ['key_name', 'label', 'input_type', 'unit', 'is_required', 'display_order', 'data_source'];
        fields.forEach(field => {
            if (data[field as keyof CategoryAttribute] !== undefined) {
                updates.push(`${field} = $${paramIndex++}`);
                values.push(data[field as keyof CategoryAttribute]);
            }
        });

        if (data.options !== undefined) {
            updates.push(`options = $${paramIndex++}`);
            values.push(JSON.stringify(data.options));
        }

        if (data.filter_context !== undefined) {
            updates.push(`filter_context = $${paramIndex++}`);
            values.push(JSON.stringify(data.filter_context));
        }

        if (updates.length === 0) throw new BadRequestException('No updates provided');

        values.push(id);
        const { rows } = await this.pool.query(
            `UPDATE category_attributes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (rows.length === 0) throw new NotFoundException('Attribute not found');
        return this.mapAttribute(rows[0]);
    }

    async deleteAttribute(id: number): Promise<void> {
        const { rowCount } = await this.pool.query('DELETE FROM category_attributes WHERE id = $1', [id]);
        if (rowCount === 0) throw new NotFoundException('Attribute not found');
    }

    async reorderAttributes(updates: { id: number; display_order: number }[]): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const update of updates) {
                await client.query(
                    'UPDATE category_attributes SET display_order = $1 WHERE id = $2',
                    [update.display_order, update.id]
                );
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async cloneCategory(sourceId: number, newName: string, newSlug: string): Promise<Category> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get source category
            const { rows: sourceMethod } = await client.query('SELECT * FROM categories WHERE id = $1', [sourceId]);
            if (sourceMethod.length === 0) throw new NotFoundException('Source category not found');
            const source = sourceMethod[0];

            // Create new category
            const { rows: newCatRows } = await client.query(
                `INSERT INTO categories (name, slug, icon, is_published) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [newName, newSlug, source.icon, false]
            );
            const newCat = newCatRows[0];

            // Clone attributes
            const { rows: attrs } = await client.query(
                'SELECT * FROM category_attributes WHERE category_id = $1',
                [sourceId]
            );

            for (const attr of attrs) {
                await client.query(
                    `INSERT INTO category_attributes 
                    (category_id, key_name, label, input_type, options, data_source, filter_context, unit, is_required, display_order)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        newCat.id, attr.key_name, attr.label, attr.input_type,
                        attr.options, attr.data_source, attr.filter_context,
                        attr.unit, attr.is_required, attr.display_order
                    ]
                );
            }

            await client.query('COMMIT');
            return newCat;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    private mapAttribute(row: any): CategoryAttribute {
        return {
            ...row,
            options: row.options, // pg auto-parses specific json columns, or it's implicitly handled. 
            // NOTE: In the original file CategoriesService checks for auto-parsing. 
            // If pg doesn't auto-parse, we need JSON.parse logic depending on driver config. 
            // Assuming default config from other files which didn't verify this.
            // But let's act consistent with CategoriesService.ts that says "pg driver auto-parses JSONB columns"
        };
    }
}
