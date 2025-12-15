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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let WishlistService = class WishlistService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getWishlist(userId) {
        const { rows } = await this.pool.query(`SELECT w.*, 
                p.title as product_title, 
                p.price as product_price, 
                p.condition as product_condition,
                p.status as product_status,
                p.category_id
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC`, [userId]);
        return rows;
    }
    async isInWishlist(userId, productId) {
        const { rows } = await this.pool.query('SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2', [userId, productId]);
        return rows.length > 0;
    }
    async addToWishlist(userId, productId) {
        const { rows } = await this.pool.query(`INSERT INTO wishlists (user_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, product_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP
            RETURNING *`, [userId, productId]);
        return rows[0];
    }
    async removeFromWishlist(userId, productId) {
        await this.pool.query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    }
    async toggleWishlist(userId, productId) {
        const isInList = await this.isInWishlist(userId, productId);
        if (isInList) {
            await this.removeFromWishlist(userId, productId);
            return { added: false };
        }
        else {
            await this.addToWishlist(userId, productId);
            return { added: true };
        }
    }
    async getWishlistCount(userId) {
        const { rows } = await this.pool.query('SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1', [userId]);
        return parseInt(rows[0].count, 10);
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map