import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

export interface SellerRating {
    id: string;
    seller_id: string;
    reviewer_id: string;
    product_id: string | null;
    rating: number;
    review: string | null;
    created_at: Date;
    updated_at: Date;
    reviewer_name?: string;
    reviewer_avatar?: string;
    product_title?: string;
}

export interface SellerStats {
    average_rating: number;
    total_ratings: number;
    positive_count: number;
    positive_percentage: number;
    rating_distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

@Injectable()
export class RatingsService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) {
        this.ensureTable();
    }

    private async ensureTable() {
        // Create table if not exists
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

        // Create indexes if not exists
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller ON seller_ratings(seller_id);
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_reviewer ON seller_ratings(reviewer_id);
            CREATE INDEX IF NOT EXISTS idx_seller_ratings_created ON seller_ratings(created_at DESC);
        `);
    }

    async create(
        sellerId: string,
        reviewerId: string,
        rating: number,
        review?: string,
        productId?: string
    ): Promise<SellerRating> {
        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        // Can't rate yourself
        if (sellerId === reviewerId) {
            throw new ForbiddenException('You cannot rate yourself');
        }

        // Check if seller exists
        const { rows: sellerRows } = await this.pool.query(
            'SELECT id FROM users WHERE id = $1',
            [sellerId]
        );
        if (sellerRows.length === 0) {
            throw new NotFoundException('Seller not found');
        }

        // Check for existing rating
        const { rows: existingRows } = await this.pool.query(
            `SELECT id FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND (product_id = $3 OR ($3 IS NULL AND product_id IS NULL))`,
            [sellerId, reviewerId, productId || null]
        );

        if (existingRows.length > 0) {
            throw new BadRequestException('You have already rated this seller for this product');
        }

        const { rows } = await this.pool.query(
            `INSERT INTO seller_ratings (seller_id, reviewer_id, product_id, rating, review)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [sellerId, reviewerId, productId || null, rating, review || null]
        );

        return rows[0];
    }

    async getSellerRatings(sellerId: string, limit = 10, offset = 0): Promise<SellerRating[]> {
        const { rows } = await this.pool.query(
            `SELECT sr.*, 
                    u.full_name as reviewer_name, 
                    u.avatar_url as reviewer_avatar,
                    p.title as product_title
             FROM seller_ratings sr
             LEFT JOIN users u ON sr.reviewer_id = u.id
             LEFT JOIN products p ON sr.product_id = p.id
             WHERE sr.seller_id = $1
             ORDER BY sr.created_at DESC
             LIMIT $2 OFFSET $3`,
            [sellerId, limit, offset]
        );
        return rows;
    }

    async getSellerStats(sellerId: string): Promise<SellerStats> {
        const { rows } = await this.pool.query(
            `SELECT 
                COUNT(*) as total_ratings,
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_count,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
             FROM seller_ratings
             WHERE seller_id = $1`,
            [sellerId]
        );

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

    async findById(id: string): Promise<SellerRating> {
        const { rows } = await this.pool.query(
            `SELECT sr.*, 
                    u.full_name as reviewer_name, 
                    u.avatar_url as reviewer_avatar,
                    p.title as product_title
             FROM seller_ratings sr
             LEFT JOIN users u ON sr.reviewer_id = u.id
             LEFT JOIN products p ON sr.product_id = p.id
             WHERE sr.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            throw new NotFoundException('Rating not found');
        }

        return rows[0];
    }

    async update(id: string, reviewerId: string, rating: number, review?: string): Promise<SellerRating> {
        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        // Check ownership
        const existing = await this.findById(id);
        if (existing.reviewer_id !== reviewerId) {
            throw new ForbiddenException('You can only update your own ratings');
        }

        const { rows } = await this.pool.query(
            `UPDATE seller_ratings 
             SET rating = $1, review = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [rating, review || null, id]
        );

        return rows[0];
    }

    async delete(id: string, reviewerId: string): Promise<void> {
        // Check ownership
        const existing = await this.findById(id);
        if (existing.reviewer_id !== reviewerId) {
            throw new ForbiddenException('You can only delete your own ratings');
        }

        await this.pool.query('DELETE FROM seller_ratings WHERE id = $1', [id]);
    }

    async canRate(reviewerId: string, sellerId: string): Promise<boolean> {
        // Can't rate yourself
        if (reviewerId === sellerId) {
            return false;
        }

        // Check if already rated (without product)
        const { rows } = await this.pool.query(
            `SELECT id FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND product_id IS NULL`,
            [sellerId, reviewerId]
        );

        return rows.length === 0;
    }

    async getMyRatingForSeller(reviewerId: string, sellerId: string, productId?: string): Promise<SellerRating | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM seller_ratings 
             WHERE seller_id = $1 AND reviewer_id = $2 AND (product_id = $3 OR ($3 IS NULL AND product_id IS NULL))`,
            [sellerId, reviewerId, productId || null]
        );

        return rows.length > 0 ? rows[0] : null;
    }
}
