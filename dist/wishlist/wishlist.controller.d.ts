import type { Request } from 'express';
import { WishlistService } from './wishlist.service';
export declare class WishlistController {
    private wishlistService;
    constructor(wishlistService: WishlistService);
    getWishlist(req: Request): Promise<import("./wishlist.service").WishlistItem[]>;
    checkWishlist(req: Request, productId: string): Promise<{
        isInWishlist: boolean;
    }>;
    addToWishlist(req: Request, productId: string): Promise<import("./wishlist.service").WishlistItem>;
    removeFromWishlist(req: Request, productId: string): Promise<{
        success: boolean;
    }>;
    toggleWishlist(req: Request, productId: string): Promise<{
        added: boolean;
    }>;
    getWishlistCount(req: Request): Promise<{
        count: number;
    }>;
}
