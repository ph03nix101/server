import type { Request } from 'express';
import { RatingsService, SellerRating, SellerStats } from './ratings.service';
export declare class RatingsController {
    private readonly ratingsService;
    constructor(ratingsService: RatingsService);
    create(req: Request, body: {
        seller_id: string;
        rating: number;
        review?: string;
        product_id?: string;
    }): Promise<SellerRating>;
    getSellerRatings(sellerId: string, limit?: string, offset?: string): Promise<SellerRating[]>;
    getSellerStats(sellerId: string): Promise<SellerStats>;
    canRate(req: Request, sellerId: string): Promise<{
        canRate: boolean;
    }>;
    getMyRating(req: Request, sellerId: string, productId?: string): Promise<{
        rating: SellerRating | null;
    }>;
    findById(id: string): Promise<SellerRating>;
    update(req: Request, id: string, body: {
        rating: number;
        review?: string;
    }): Promise<SellerRating>;
    delete(req: Request, id: string): Promise<{
        message: string;
    }>;
}
