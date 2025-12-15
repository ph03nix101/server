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
exports.RatingsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let RatingsService = class RatingsService {
    pool;
    constructor(pool) {
        this.pool = pool;
        this.ensureTable();
    }
    async ensureTable() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS seller_ratings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller ON seller_ratings(seller_id);
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_reviewer ON seller_ratings(reviewer_id);
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_created ON seller_ratings(created_at DESC);
        `);
    }
    async create(sellerId, reviewerId, rating, review, productId) {
        if (rating < 1 || rating > 5) {
            throw new common_1.BadRequestException('Rating must be between 1 and 5');
        }
        if (sellerId === reviewerId) {
            throw new common_1.ForbiddenException('You cannot rate yourself');
        }
        const { rows: sellerRows } = await this.pool.query('SELECT id FROM users WHERE id = $1', [sellerId]);
        if (sellerRows.length === 0) {
            throw new common_1.NotFoundException('Seller not found');
        }
        const { rows: existingRows } = await this.pool.query(`SELECT id FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND (product_id = $3 OR ($3 IS NULL AND product_id IS NULL))`, [sellerId, reviewerId, productId || null]);
        if (existingRows.length > 0) {
            throw new common_1.BadRequestException('You have already rated this seller for this product');
        }
        const { rows } = await this.pool.query(`INSERT INTO seller_ratings (seller_id, reviewer_id, product_id, rating, review)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [sellerId, reviewerId, productId || null, rating, review || null]);
        return rows[0];
    }
    async getSellerRatings(sellerId, limit = 10, offset = 0) {
        const { rows } = await this.pool.query(`SELECT sr.*, 
                    u.full_name as reviewer_name, 
                    u.avatar_url as reviewer_avatar,
                    p.title as product_title
             FROM seller_ratings sr
             LEFT JOIN users u ON sr.reviewer_id = u.id
             LEFT JOIN products p ON sr.product_id = p.id
             WHERE sr.seller_id = $1
             ORDER BY sr.created_at DESC
             LIMIT $2 OFFSET $3`, [sellerId, limit, offset]);
        return rows;
    }
    async getSellerStats(sellerId) {
        const { rows } = await this.pool.query(`SELECT 
                COUNT(*) as total_ratings,
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_count,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
             FROM seller_ratings
             WHERE seller_id = $1`, [sellerId]);
        const result = rows[0];
        const total = parseInt(result.total_ratings) || 0;
        const positive = parseInt(result.positive_count) || 0;
        return {
            average_rating: parseFloat(result.average_rating) || 0,
            total_ratings: total,
            positive_count: positive,
            positive_percentage: total > 0 ? Math.round((positive / total) * 100) : 0,
            rating_distribution: {
                1: parseInt(result.rating_1) || 0,
                2: parseInt(result.rating_2) || 0,
                3: parseInt(result.rating_3) || 0,
                4: parseInt(result.rating_4) || 0,
                5: parseInt(result.rating_5) || 0,
            },
        };
    }
    async findById(id) {
        const { rows } = await this.pool.query(`SELECT sr.*, 
                    u.full_name as reviewer_name, 
                    u.avatar_url as reviewer_avatar,
                    p.title as product_title
             FROM seller_ratings sr
             LEFT JOIN users u ON sr.reviewer_id = u.id
             LEFT JOIN products p ON sr.product_id = p.id
             WHERE sr.id = $1`, [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Rating not found');
        }
        return rows[0];
    }
    async update(id, reviewerId, rating, review) {
        if (rating < 1 || rating > 5) {
            throw new common_1.BadRequestException('Rating must be between 1 and 5');
        }
        const existing = await this.findById(id);
        if (existing.reviewer_id !== reviewerId) {
            throw new common_1.ForbiddenException('You can only update your own ratings');
        }
        const { rows } = await this.pool.query(`UPDATE seller_ratings 
             SET rating = $1, review = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`, [rating, review || null, id]);
        return rows[0];
    }
    async delete(id, reviewerId) {
        const existing = await this.findById(id);
        if (existing.reviewer_id !== reviewerId) {
            throw new common_1.ForbiddenException('You can only delete your own ratings');
        }
        await this.pool.query('DELETE FROM seller_ratings WHERE id = $1', [id]);
    }
    async canRate(reviewerId, sellerId) {
        if (reviewerId === sellerId) {
            return false;
        }
        const { rows } = await this.pool.query(`SELECT id FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND product_id IS NULL`, [sellerId, reviewerId]);
        return rows.length === 0;
    }
    async getMyRatingForSeller(reviewerId, sellerId, productId) {
        const { rows } = await this.pool.query(`SELECT * FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND (product_id = $3 OR ($3 IS NULL AND product_id IS NULL))`, [sellerId, reviewerId, productId || null]);
        return rows.length > 0 ? rows[0] : null;
    }
};
exports.RatingsService = RatingsService;
exports.RatingsService = RatingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], RatingsService);
//# sourceMappingURL=ratings.service.js.map