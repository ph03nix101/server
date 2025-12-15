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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let ReportsService = class ReportsService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createReport(productId, reporterId, reason, description) {
        const { rows: products } = await this.pool.query('SELECT id, seller_id FROM products WHERE id = $1', [productId]);
        if (products.length === 0) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (products[0].seller_id === reporterId) {
            throw new common_1.BadRequestException('You cannot report your own listing');
        }
        const { rows: existing } = await this.pool.query('SELECT id FROM reports WHERE product_id = $1 AND reporter_id = $2', [productId, reporterId]);
        if (existing.length > 0) {
            throw new common_1.BadRequestException('You have already reported this listing');
        }
        const { rows } = await this.pool.query(`INSERT INTO reports (product_id, reporter_id, reason, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`, [productId, reporterId, reason, description]);
        return rows[0];
    }
    async getReports(status) {
        let query = `
            SELECT r.*, 
                   p.title as product_title,
                   u.full_name as reporter_name,
                   u.email as reporter_email
            FROM reports r
            JOIN products p ON r.product_id = p.id
            JOIN users u ON r.reporter_id = u.id
        `;
        const params = [];
        if (status) {
            query += ' WHERE r.status = $1';
            params.push(status);
        }
        query += ' ORDER BY r.created_at DESC';
        const { rows } = await this.pool.query(query, params);
        return rows;
    }
    async getReportById(id) {
        const { rows } = await this.pool.query(`SELECT r.*, 
                    p.title as product_title,
                    u.full_name as reporter_name,
                    u.email as reporter_email
             FROM reports r
             JOIN products p ON r.product_id = p.id
             JOIN users u ON r.reporter_id = u.id
             WHERE r.id = $1`, [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Report not found');
        }
        return rows[0];
    }
    async updateReportStatus(id, status, adminId, adminNotes) {
        const { rows } = await this.pool.query(`UPDATE reports 
             SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, admin_notes = $3
             WHERE id = $4
             RETURNING *`, [status, adminId, adminNotes, id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Report not found');
        }
        return rows[0];
    }
    async getReportCountByProduct(productId) {
        const { rows } = await this.pool.query('SELECT COUNT(*) FROM reports WHERE product_id = $1', [productId]);
        return parseInt(rows[0].count);
    }
    async getPendingCount() {
        const { rows } = await this.pool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'");
        return parseInt(rows[0].count);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], ReportsService);
//# sourceMappingURL=reports.service.js.map