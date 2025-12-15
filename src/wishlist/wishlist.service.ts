import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';

export interface WishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: Date;
    // Joined product fields
    product_title?: string;
    product_price?: string;
    product_condition?: string;
    product_status?: string;
    category_id?: number;
}

@Injectable()
export class WishlistService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async getWishlist(userId: string): Promise<WishlistItem[]> {
        const { rows } = await this.pool.query(
            `SELECT w.*, 
                p.title as product_title, 
                p.price as product_price, 
                p.condition as product_condition,
                p.status as product_status,
                p.category_id
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC`,
            [userId]
        );
        return rows;
    }

    async isInWishlist(userId: string, productId: string): Promise<boolean> {
        const { rows } = await this.pool.query(
            'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        return rows.length > 0;
    }

    async addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
        const { rows } = await this.pool.query(
            `INSERT INTO wishlists (user_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, product_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [userId, productId]
        );
        return rows[0];
    }

    async removeFromWishlist(userId: string, productId: string): Promise<void> {
        await this.pool.query(
            'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
    }

    async toggleWishlist(userId: string, productId: string): Promise<{ added: boolean }> {
        const isInList = await this.isInWishlist(userId, productId);

        if (isInList) {
            await this.removeFromWishlist(userId, productId);
            return { added: false };
        } else {
            await this.addToWishlist(userId, productId);
            return { added: true };
        }
    }

    async getWishlistCount(userId: string): Promise<number> {
        const { rows } = await this.pool.query(
            'SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1',
            [userId]
        );
        return parseInt(rows[0].count, 10);
    }
}
