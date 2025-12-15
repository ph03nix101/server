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
exports.AdminCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let AdminCategoriesService = class AdminCategoriesService {
    pool;
    constructor(pool) {
        this.pool = pool;
        this.ensureSchema();
    }
    async ensureSchema() {
        await this.pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_published') THEN 
                    ALTER TABLE categories ADD COLUMN is_published BOOLEAN DEFAULT false; 
                END IF;
            END $$;
        `);
    }
    async createCategory(data) {
        const { rows } = await this.pool.query(`INSERT INTO categories (name, slug, icon, is_published) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`, [data.name, data.slug, data.icon, data.is_published || false]);
        return rows[0];
    }
    async updateCategory(id, data) {
        const updates = [];
        const values = [];
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
        if (updates.length === 0)
            return this.getCategoryById(id);
        values.push(id);
        const { rows } = await this.pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (rows.length === 0)
            throw new common_1.NotFoundException('Category not found');
        return rows[0];
    }
    async deleteCategory(id) {
        await this.pool.query('DELETE FROM category_attributes WHERE category_id = $1', [id]);
        const { rowCount } = await this.pool.query('DELETE FROM categories WHERE id = $1', [id]);
        if (rowCount === 0)
            throw new common_1.NotFoundException('Category not found');
    }
    async getCategoryById(id) {
        const { rows } = await this.pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        if (rows.length === 0)
            throw new common_1.NotFoundException('Category not found');
        return rows[0];
    }
    async getAttributes(categoryId) {
        const { rows } = await this.pool.query('SELECT * FROM category_attributes WHERE category_id = $1 ORDER BY display_order ASC', [categoryId]);
        return rows.map(this.mapAttribute);
    }
    async createAttribute(categoryId, data) {
        const { rows } = await this.pool.query(`INSERT INTO category_attributes 
            (category_id, key_name, label, input_type, options, data_source, filter_context, unit, is_required, display_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`, [
            categoryId, data.key_name, data.label, data.input_type,
            JSON.stringify(data.options || []),
            data.data_source,
            JSON.stringify(data.filter_context || {}),
            data.unit, data.is_required, data.display_order
        ]);
        return this.mapAttribute(rows[0]);
    }
    async updateAttribute(id, data) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        const fields = ['key_name', 'label', 'input_type', 'unit', 'is_required', 'display_order', 'data_source'];
        fields.forEach(field => {
            if (data[field] !== undefined) {
                updates.push(`${field} = $${paramIndex++}`);
                values.push(data[field]);
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
        if (updates.length === 0)
            throw new common_1.BadRequestException('No updates provided');
        values.push(id);
        const { rows } = await this.pool.query(`UPDATE category_attributes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (rows.length === 0)
            throw new common_1.NotFoundException('Attribute not found');
        return this.mapAttribute(rows[0]);
    }
    async deleteAttribute(id) {
        const { rowCount } = await this.pool.query('DELETE FROM category_attributes WHERE id = $1', [id]);
        if (rowCount === 0)
            throw new common_1.NotFoundException('Attribute not found');
    }
    async reorderAttributes(updates) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const update of updates) {
                await client.query('UPDATE category_attributes SET display_order = $1 WHERE id = $2', [update.display_order, update.id]);
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async cloneCategory(sourceId, newName, newSlug) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: sourceMethod } = await client.query('SELECT * FROM categories WHERE id = $1', [sourceId]);
            if (sourceMethod.length === 0)
                throw new common_1.NotFoundException('Source category not found');
            const source = sourceMethod[0];
            const { rows: newCatRows } = await client.query(`INSERT INTO categories (name, slug, icon, is_published) 
                 VALUES ($1, $2, $3, $4) RETURNING *`, [newName, newSlug, source.icon, false]);
            const newCat = newCatRows[0];
            const { rows: attrs } = await client.query('SELECT * FROM category_attributes WHERE category_id = $1', [sourceId]);
            for (const attr of attrs) {
                await client.query(`INSERT INTO category_attributes 
                    (category_id, key_name, label, input_type, options, data_source, filter_context, unit, is_required, display_order)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    newCat.id, attr.key_name, attr.label, attr.input_type,
                    attr.options, attr.data_source, attr.filter_context,
                    attr.unit, attr.is_required, attr.display_order
                ]);
            }
            await client.query('COMMIT');
            return newCat;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    mapAttribute(row) {
        return {
            ...row,
            options: row.options,
        };
    }
};
exports.AdminCategoriesService = AdminCategoriesService;
exports.AdminCategoriesService = AdminCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], AdminCategoriesService);
//# sourceMappingURL=admin-categories.service.js.map