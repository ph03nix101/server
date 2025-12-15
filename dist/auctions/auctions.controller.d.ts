import type { Request } from 'express';
import { AuctionsService, CreateAuctionDto } from './auctions.service';
export declare class AuctionsController {
    private readonly auctionsService;
    constructor(auctionsService: AuctionsService);
    create(dto: CreateAuctionDto, req: Request): Promise<import("./auctions.service").Auction>;
    placeBid(id: string, body: {
        amount: number;
    }, req: Request): Promise<{
        auction: import("./auctions.service").Auction;
        bid: import("./auctions.service").Bid;
    }>;
    getActiveAuctions(limit?: string, categoryId?: string): Promise<import("./auctions.service").Auction[]>;
    getMyBids(req: Request): Promise<any[]>;
    getByProductId(productId: string): Promise<import("./auctions.service").Auction | null>;
    getById(id: string): Promise<import("./auctions.service").Auction | null>;
    getBidHistory(id: string): Promise<import("./auctions.service").Bid[]>;
    cancelAuction(id: string, req: Request): Promise<import("./auctions.service").Auction>;
}
