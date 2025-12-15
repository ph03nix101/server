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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let VerificationService = class VerificationService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async apply(userId, data) {
        const existing = await this.pool.query(`SELECT id, status FROM seller_verification_requests 
             WHERE user_id = $1 AND status IN ('pending', 'approved') 
             ORDER BY created_at DESC LIMIT 1`, [userId]);
        if (existing.rows.length > 0) {
            const status = existing.rows[0].status;
            if (status === 'approved') {
                throw new common_1.ConflictException('You are already a verified seller');
            }
            if (status === 'pending') {
                throw new common_1.ConflictException('You already have a pending verification request');
            }
        }
        const { rows } = await this.pool.query(`INSERT INTO seller_verification_requests (user_id, business_name, business_address, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`, [userId, data.business_name, data.business_address, data.reason]);
        return rows[0];
    }
    async getMyStatus(userId) {
        const { rows } = await this.pool.query(`SELECT * FROM seller_verification_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 1`, [userId]);
        return rows[0] || null;
    }
    async getAllPending() {
        const { rows } = await this.pool.query(`SELECT v.*, u.email as user_email, u.full_name as user_name
             FROM seller_verification_requests v
             JOIN users u ON v.user_id = u.id
             WHERE v.status = 'pending'
             ORDER BY v.created_at ASC`);
        return rows;
    }
    async review(requestId, adminId, action, notes) {
        const { rows: requests } = await this.pool.query('SELECT * FROM seller_verification_requests WHERE id = $1', [requestId]);
        if (requests.length === 0) {
            throw new common_1.NotFoundException('Verification request not found');
        }
        const request = requests[0];
        if (request.status !== 'pending') {
            throw new common_1.ConflictException('This request has already been reviewed');
        }
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const { rows } = await this.pool.query(`UPDATE seller_verification_requests 
             SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`, [newStatus, notes, adminId, requestId]);
        if (action === 'approve') {
            await this.pool.query('UPDATE users SET is_verified_seller = TRUE WHERE id = $1', [request.user_id]);
        }
        return rows[0];
    }
    async isAdmin(userId) {
        const { rows } = await this.pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        return rows[0]?.is_admin === true;
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], VerificationService);
//# sourceMappingURL=verification.service.js.map