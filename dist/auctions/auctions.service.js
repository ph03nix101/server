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
exports.AuctionsService = exports.CreateAuctionDto = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
class CreateAuctionDto {
    product_id;
    starting_price;
    reserve_price;
    buy_now_price;
    duration_hours;
}
exports.CreateAuctionDto = CreateAuctionDto;
let AuctionsService = class AuctionsService {
    pool;
    MIN_BID_INCREMENT = 50;
    EXTENSION_MINUTES = 5;
    constructor(pool) {
        this.pool = pool;
    }
    async create(dto, sellerId) {
        const { rows: products } = await this.pool.query('SELECT id, seller_id, status FROM products WHERE id = $1', [dto.product_id]);
        if (products.length === 0) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (products[0].seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only create auctions for your own products');
        }
        const { rows: existingAuctions } = await this.pool.query("SELECT id FROM auctions WHERE product_id = $1 AND status = 'active'", [dto.product_id]);
        if (existingAuctions.length > 0) {
            throw new common_1.BadRequestException('This product already has an active auction');
        }
        if (dto.buy_now_price && dto.buy_now_price <= dto.starting_price) {
            throw new common_1.BadRequestException('Buy Now price must be greater than starting price');
        }
        const endTime = new Date(Date.now() + dto.duration_hours * 60 * 60 * 1000);
        const { rows } = await this.pool.query(`INSERT INTO auctions (product_id, starting_price, reserve_price, buy_now_price, end_time)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [dto.product_id, dto.starting_price, dto.reserve_price || null, dto.buy_now_price || null, endTime]);
        await this.pool.query("UPDATE products SET status = 'Auction' WHERE id = $1", [dto.product_id]);
        return rows[0];
    }
    async placeBid(auctionId, bidderId, amount) {
        const { rows: auctions } = await this.pool.query(`SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id 
             WHERE a.id = $1`, [auctionId]);
        if (auctions.length === 0) {
            throw new common_1.NotFoundException('Auction not found');
        }
        const auction = auctions[0];
        if (auction.status !== 'active') {
            throw new common_1.BadRequestException('This auction is no longer active');
        }
        if (new Date(auction.end_time) < new Date()) {
            throw new common_1.BadRequestException('This auction has ended');
        }
        if (auction.seller_id === bidderId) {
            throw new common_1.ForbiddenException('You cannot bid on your own auction');
        }
        const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : parseFloat(auction.starting_price);
        const minBid = auction.current_bid
            ? currentBid + this.MIN_BID_INCREMENT
            : currentBid;
        if (amount < minBid) {
            throw new common_1.BadRequestException(`Minimum bid is R${minBid.toLocaleString()}`);
        }
        const isBuyNow = auction.buy_now_price && amount >= parseFloat(auction.buy_now_price);
        const { rows: bids } = await this.pool.query(`INSERT INTO bids (auction_id, bidder_id, amount)
             VALUES ($1, $2, $3)
             RETURNING *`, [auctionId, bidderId, amount]);
        let newEndTime = auction.end_time;
        const timeRemaining = new Date(auction.end_time).getTime() - Date.now();
        if (timeRemaining < this.EXTENSION_MINUTES * 60 * 1000 && !isBuyNow) {
            newEndTime = new Date(Date.now() + this.EXTENSION_MINUTES * 60 * 1000);
        }
        const newStatus = isBuyNow ? 'sold' : 'active';
        const productStatus = isBuyNow ? 'Sold' : 'Auction';
        const { rows: updatedAuctions } = await this.pool.query(`UPDATE auctions SET 
                current_bid = $1, 
                highest_bidder_id = $2, 
                bid_count = bid_count + 1,
                end_time = $3,
                status = $4,
                updated_at = NOW()
             WHERE id = $5
             RETURNING *`, [amount, bidderId, newEndTime, newStatus, auctionId]);
        await this.pool.query('UPDATE products SET status = $1 WHERE id = $2', [productStatus, auction.product_id]);
        return { auction: updatedAuctions[0], bid: bids[0] };
    }
    async getActiveAuctions(limit = 10, categoryId) {
        let query = `
            SELECT a.*, row_to_json(p) as product
            FROM auctions a
            JOIN products p ON a.product_id = p.id
            WHERE a.status = 'active' AND a.end_time > NOW()
        `;
        const params = [];
        if (categoryId) {
            params.push(categoryId);
            query += ` AND p.category_id = $${params.length}`;
        }
        params.push(limit);
        query += ` ORDER BY a.end_time ASC LIMIT $${params.length}`;
        const { rows } = await this.pool.query(query, params);
        return rows;
    }
    async getById(id) {
        const { rows } = await this.pool.query(`SELECT a.*, p.title, p.seller_id, u.username as seller_username
             FROM auctions a
             JOIN products p ON a.product_id = p.id
             JOIN users u ON p.seller_id = u.id
             WHERE a.id = $1`, [id]);
        return rows[0] || null;
    }
    async getByProductId(productId) {
        const { rows } = await this.pool.query('SELECT * FROM auctions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1', [productId]);
        return rows[0] || null;
    }
    async getBidHistory(auctionId) {
        const { rows } = await this.pool.query(`SELECT b.*, u.username
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = $1
             ORDER BY b.created_at DESC`, [auctionId]);
        return rows;
    }
    async getUserBids(userId) {
        const { rows } = await this.pool.query(`SELECT b.*, a.status as auction_status, a.end_time, a.current_bid, 
                    p.title as product_title, p.id as product_id
             FROM bids b
             JOIN auctions a ON b.auction_id = a.id
             JOIN products p ON a.product_id = p.id
             WHERE b.bidder_id = $1
             ORDER BY b.created_at DESC`, [userId]);
        return rows;
    }
    async cancelAuction(auctionId, sellerId) {
        const { rows: auctions } = await this.pool.query(`SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id 
             WHERE a.id = $1`, [auctionId]);
        if (auctions.length === 0) {
            throw new common_1.NotFoundException('Auction not found');
        }
        const auction = auctions[0];
        if (auction.seller_id !== sellerId) {
            throw new common_1.ForbiddenException('You can only cancel your own auctions');
        }
        if (auction.status !== 'active') {
            throw new common_1.BadRequestException('This auction cannot be cancelled');
        }
        if (auction.bid_count > 0) {
            throw new common_1.BadRequestException('Cannot cancel auction with existing bids');
        }
        const { rows } = await this.pool.query(`UPDATE auctions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`, [auctionId]);
        await this.pool.query("UPDATE products SET status = 'Active' WHERE id = $1", [auction.product_id]);
        return rows[0];
    }
    async endExpiredAuctions() {
        const { rows: expired } = await this.pool.query(`SELECT a.*, p.seller_id 
             FROM auctions a 
             JOIN products p ON a.product_id = p.id
             WHERE a.status = 'active' AND a.end_time <= NOW()`);
        for (const auction of expired) {
            const metReserve = !auction.reserve_price ||
                (auction.current_bid && parseFloat(auction.current_bid) >= parseFloat(auction.reserve_price));
            const newStatus = auction.current_bid && metReserve ? 'sold' : 'ended';
            const productStatus = newStatus === 'sold' ? 'Sold' : 'Active';
            await this.pool.query(`UPDATE auctions SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, auction.id]);
            await this.pool.query('UPDATE products SET status = $1 WHERE id = $2', [productStatus, auction.product_id]);
        }
    }
};
exports.AuctionsService = AuctionsService;
exports.AuctionsService = AuctionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], AuctionsService);
//# sourceMappingURL=auctions.service.js.map