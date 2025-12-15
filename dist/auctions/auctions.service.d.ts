import { Pool } from 'pg';
export interface Auction {
    id: string;
    product_id: string;
    starting_price: string;
    reserve_price: string | null;
    buy_now_price: string | null;
    current_bid: string | null;
    bid_count: number;
    highest_bidder_id: string | null;
    start_time: string;
    end_time: string;
    status: 'active' | 'ended' | 'cancelled' | 'sold';
    created_at: string;
    updated_at: string;
}
export interface Bid {
    id: string;
    auction_id: string;
    bidder_id: string;
    amount: string;
    created_at: string;
}
export declare class CreateAuctionDto {
    product_id: string;
    starting_price: number;
    reserve_price?: number;
    buy_now_price?: number;
    duration_hours: number;
}
export declare class AuctionsService {
    private pool;
    private readonly MIN_BID_INCREMENT;
    private readonly EXTENSION_MINUTES;
    constructor(pool: Pool);
    create(dto: CreateAuctionDto, sellerId: string): Promise<Auction>;
    placeBid(auctionId: string, bidderId: string, amount: number): Promise<{
        auction: Auction;
        bid: Bid;
    }>;
    getActiveAuctions(limit?: number, categoryId?: number): Promise<Auction[]>;
    getById(id: string): Promise<Auction | null>;
    getByProductId(productId: string): Promise<Auction | null>;
    getBidHistory(auctionId: string): Promise<Bid[]>;
    getUserBids(userId: string): Promise<any[]>;
    cancelAuction(auctionId: string, sellerId: string): Promise<Auction>;
    endExpiredAuctions(): Promise<void>;
}
