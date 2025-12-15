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
export declare class RatingsService {
    private pool;
    constructor(pool: Pool);
    private ensureTable;
    create(sellerId: string, reviewerId: string, rating: number, review?: string, productId?: string): Promise<SellerRating>;
    getSellerRatings(sellerId: string, limit?: number, offset?: number): Promise<SellerRating[]>;
    getSellerStats(sellerId: string): Promise<SellerStats>;
    findById(id: string): Promise<SellerRating>;
    update(id: string, reviewerId: string, rating: number, review?: string): Promise<SellerRating>;
    delete(id: string, reviewerId: string): Promise<void>;
    canRate(reviewerId: string, sellerId: string): Promise<boolean>;
    getMyRatingForSeller(reviewerId: string, sellerId: string, productId?: string): Promise<SellerRating | null>;
}
