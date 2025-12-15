import { Pool } from 'pg';
export interface WishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: Date;
    product_title?: string;
    product_price?: string;
    product_condition?: string;
    product_status?: string;
    category_id?: number;
}
export declare class WishlistService {
    private pool;
    constructor(pool: Pool);
    getWishlist(userId: string): Promise<WishlistItem[]>;
    isInWishlist(userId: string, productId: string): Promise<boolean>;
    addToWishlist(userId: string, productId: string): Promise<WishlistItem>;
    removeFromWishlist(userId: string, productId: string): Promise<void>;
    toggleWishlist(userId: string, productId: string): Promise<{
        added: boolean;
    }>;
    getWishlistCount(userId: string): Promise<number>;
}
