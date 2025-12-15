import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

export class CreateAuctionDto {
    product_id: string;
    starting_price: number;
    reserve_price?: number;
    buy_now_price?: number;
    duration_hours: number; // 24, 72, 168 (1, 3, 7 days)
}

@Injectable()
export class AuctionsService {
    private readonly MIN_BID_INCREMENT = 50; // R50 minimum increment
    private readonly EXTENSION_MINUTES = 5; // Extend by 5 mins if bid in last 5 mins

    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async create(dto: CreateAuctionDto, sellerId: string): Promise<Auction> {
        // Verify product exists and belongs to seller
        const { rows: products } = await this.pool.query(
            'SELECT id, seller_id, status FROM products WHERE id = $1',
            [dto.product_id]
        );

        if (products.length === 0) {
            throw new NotFoundException('Product not found');
        }

        if (products[0].seller_id !== sellerId) {
            throw new ForbiddenException('You can only create auctions for your own products');
        }

        // Check if product already has an active auction
        const { rows: existingAuctions } = await this.pool.query(
            "SELECT id FROM auctions WHERE product_id = $1 AND status = 'active'",
            [dto.product_id]
        );

        if (existingAuctions.length > 0) {
            throw new BadRequestException('This product already has an active auction');
        }

        // Validate buy_now_price is greater than starting_price
        if (dto.buy_now_price && dto.buy_now_price <= dto.starting_price) {
            throw new BadRequestException('Buy Now price must be greater than starting price');
        }

        // Calculate end time
        const endTime = new Date(Date.now() + dto.duration_hours * 60 * 60 * 1000);

        const { rows } = await this.pool.query(
            `INSERT INTO auctions (product_id, starting_price, reserve_price, buy_now_price, end_time)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [dto.product_id, dto.starting_price, dto.reserve_price || null, dto.buy_now_price || null, endTime]
        );

        // Update product status to indicate it's in auction
        await this.pool.query(
            "UPDATE products SET status = 'Auction' WHERE id = $1",
            [dto.product_id]
        );

        return rows[0];
    }

    async placeBid(auctionId: string, bidderId: string, amount: number): Promise<{ auction: Auction; bid: Bid }> {
        // Get auction with product info
        const { rows: auctions } = await this.pool.query(
            `SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id 
             WHERE a.id = $1`,
            [auctionId]
        );

        if (auctions.length === 0) {
            throw new NotFoundException('Auction not found');
        }

        const auction = auctions[0];

        // Verify auction is active
        if (auction.status !== 'active') {
            throw new BadRequestException('This auction is no longer active');
        }

        // Check if auction has ended
        if (new Date(auction.end_time) < new Date()) {
            throw new BadRequestException('This auction has ended');
        }

        // Prevent seller from bidding on own auction
        if (auction.seller_id === bidderId) {
            throw new ForbiddenException('You cannot bid on your own auction');
        }

        // Calculate minimum bid
        const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : parseFloat(auction.starting_price);
        const minBid = auction.current_bid
            ? currentBid + this.MIN_BID_INCREMENT
            : currentBid;

        if (amount < minBid) {
            throw new BadRequestException(`Minimum bid is R${minBid.toLocaleString()}`);
        }

        // Check if this is a buy now
        const isBuyNow = auction.buy_now_price && amount >= parseFloat(auction.buy_now_price);

        // Create bid
        const { rows: bids } = await this.pool.query(
            `INSERT INTO bids (auction_id, bidder_id, amount)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [auctionId, bidderId, amount]
        );

        // Update auction
        let newEndTime = auction.end_time;
        const timeRemaining = new Date(auction.end_time).getTime() - Date.now();

        // Extend auction if bid in last 5 minutes
        if (timeRemaining < this.EXTENSION_MINUTES * 60 * 1000 && !isBuyNow) {
            newEndTime = new Date(Date.now() + this.EXTENSION_MINUTES * 60 * 1000);
        }

        const newStatus = isBuyNow ? 'sold' : 'active';
        const productStatus = isBuyNow ? 'Sold' : 'Auction';

        const { rows: updatedAuctions } = await this.pool.query(
            `UPDATE auctions SET 
                current_bid = $1, 
                highest_bidder_id = $2, 
                bid_count = bid_count + 1,
                end_time = $3,
                status = $4,
                updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [amount, bidderId, newEndTime, newStatus, auctionId]
        );

        // Update product status
        await this.pool.query(
            'UPDATE products SET status = $1 WHERE id = $2',
            [productStatus, auction.product_id]
        );

        return { auction: updatedAuctions[0], bid: bids[0] };
    }

    async getActiveAuctions(limit: number = 10, categoryId?: number): Promise<Auction[]> {
        let query = `
            SELECT a.*, row_to_json(p) as product
            FROM auctions a
            JOIN products p ON a.product_id = p.id
            WHERE a.status = 'active' AND a.end_time > NOW()
        `;
        const params: any[] = [];

        if (categoryId) {
            params.push(categoryId);
            query += ` AND p.category_id = $${params.length}`;
        }

        params.push(limit);
        query += ` ORDER BY a.end_time ASC LIMIT $${params.length}`;

        const { rows } = await this.pool.query(query, params);
        return rows;
    }

    async getById(id: string): Promise<Auction | null> {
        const { rows } = await this.pool.query(
            `SELECT a.*, p.title, p.seller_id, u.username as seller_username
             FROM auctions a
             JOIN products p ON a.product_id = p.id
             JOIN users u ON p.seller_id = u.id
             WHERE a.id = $1`,
            [id]
        );
        return rows[0] || null;
    }

    async getByProductId(productId: string): Promise<Auction | null> {
        const { rows } = await this.pool.query(
            'SELECT * FROM auctions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
            [productId]
        );
        return rows[0] || null;
    }

    async getBidHistory(auctionId: string): Promise<Bid[]> {
        const { rows } = await this.pool.query(
            `SELECT b.*, u.username
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = $1
             ORDER BY b.created_at DESC`,
            [auctionId]
        );
        return rows;
    }

    async getUserBids(userId: string): Promise<any[]> {
        const { rows } = await this.pool.query(
            `SELECT b.*, a.status as auction_status, a.end_time, a.current_bid, 
                    p.title as product_title, p.id as product_id
             FROM bids b
             JOIN auctions a ON b.auction_id = a.id
             JOIN products p ON a.product_id = p.id
             WHERE b.bidder_id = $1
             ORDER BY b.created_at DESC`,
            [userId]
        );
        return rows;
    }

    async cancelAuction(auctionId: string, sellerId: string): Promise<Auction> {
        const { rows: auctions } = await this.pool.query(
            `SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id 
             WHERE a.id = $1`,
            [auctionId]
        );

        if (auctions.length === 0) {
            throw new NotFoundException('Auction not found');
        }

        const auction = auctions[0];

        if (auction.seller_id !== sellerId) {
            throw new ForbiddenException('You can only cancel your own auctions');
        }

        if (auction.status !== 'active') {
            throw new BadRequestException('This auction cannot be cancelled');
        }

        // Can only cancel if no bids
        if (auction.bid_count > 0) {
            throw new BadRequestException('Cannot cancel auction with existing bids');
        }

        const { rows } = await this.pool.query(
            `UPDATE auctions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [auctionId]
        );

        // Reset product status
        await this.pool.query(
            "UPDATE products SET status = 'Active' WHERE id = $1",
            [auction.product_id]
        );

        return rows[0];
    }

    async endExpiredAuctions(): Promise<void> {
        // Find expired auctions that are still active
        const { rows: expired } = await this.pool.query(
            `SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id
             WHERE a.status = 'active' AND a.end_time <= NOW()`
        );

        for (const auction of expired) {
            const metReserve = !auction.reserve_price ||
                (auction.current_bid && parseFloat(auction.current_bid) >= parseFloat(auction.reserve_price));

            const newStatus = auction.current_bid && metReserve ? 'sold' : 'ended';
            const productStatus = newStatus === 'sold' ? 'Sold' : 'Active';

            await this.pool.query(
                `UPDATE auctions SET status = $1, updated_at = NOW() WHERE id = $2`,
                [newStatus, auction.id]
            );

            await this.pool.query(
                'UPDATE products SET status = $1 WHERE id = $2',
                [productStatus, auction.product_id]
            );

            // TODO: Send notification to winner and seller
        }
    }
}
