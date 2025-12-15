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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let CategoriesService = class CategoriesService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getAllCategories() {
        const { rows } = await this.pool.query('SELECT * FROM categories ORDER BY id');
        return rows;
    }
    async getCategoriesWithCounts() {
        const { rows } = await this.pool.query(`SELECT c.*, COALESCE(COUNT(p.id), 0)::int as product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.status = 'Active'
             GROUP BY c.id
             ORDER BY product_count DESC, c.id`);
        return rows;
    }
    async getCategoryBySlug(slug) {
        const { rows } = await this.pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
        return rows[0] || null;
    }
    async getAttributes(slug) {
        const category = await this.getCategoryBySlug(slug);
        if (!category) {
            throw new common_1.NotFoundException(`Category "${slug}" not found`);
        }
        const { rows } = await this.pool.query(`SELECT * FROM category_attributes 
       WHERE category_id = $1 
       ORDER BY display_order ASC`, [category.id]);
        return rows.map(row => ({
            ...row,
            options: row.options,
            filter_context: row.filter_context,
        }));
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map