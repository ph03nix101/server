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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let OrdersService = class OrdersService {
    pool;
    constructor(pool) {
        this.pool = pool;
        this.ensureTable();
    }
    async ensureTable() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id),
                seller_id UUID NOT NULL REFERENCES users(id),
                buyer_id UUID NOT NULL REFERENCES users(id),
                amount DECIMAL(10,2) NOT NULL,
                shipping_cost DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                shipping_address TEXT,
                tracking_number VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await this.pool.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
            CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
        `);
    }
    async create(data) {
        const shippingCost = data.shipping_cost || 0;
        const total = data.amount + shippingCost;
        const { rows } = await this.pool.query(`INSERT INTO orders (product_id, seller_id, buyer_id, amount, shipping_cost, total, shipping_address, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`, [data.product_id, data.seller_id, data.buyer_id, data.amount, shippingCost, total, data.shipping_address || null, data.notes || null]);
        await this.pool.query("UPDATE products SET status = 'Sold' WHERE id = $1", [data.product_id]);
        return this.mapOrder(rows[0]);
    }
    async getSellerSales(sellerId, limit = 20, offset = 0) {
        const { rows } = await this.pool.query(`SELECT o.*, 
                    p.title as product_title,
                    (SELECT url FROM product_images WHERE product_id = o.product_id AND is_primary = true LIMIT 1) as product_image,
                    u.username as buyer_username,
                    u.email as buyer_email
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN users u ON o.buyer_id = u.id
             WHERE o.seller_id = $1
             ORDER BY o.created_at DESC
             LIMIT $2 OFFSET $3`, [sellerId, limit, offset]);
        return rows.map(this.mapOrder);
    }
    async getBuyerPurchases(buyerId, limit = 20, offset = 0) {
        const { rows } = await this.pool.query(`SELECT o.*, 
                    p.title as product_title,
                    (SELECT url FROM product_images WHERE product_id = o.product_id AND is_primary = true LIMIT 1) as product_image,
                    s.username as seller_username
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN users s ON o.seller_id = s.id
             WHERE o.buyer_id = $1
             ORDER BY o.created_at DESC
             LIMIT $2 OFFSET $3`, [buyerId, limit, offset]);
        return rows.map(this.mapOrder);
    }
    async getById(id) {
        const { rows } = await this.pool.query(`SELECT o.*, 
                    p.title as product_title,
                    (SELECT url FROM product_images WHERE product_id = o.product_id AND is_primary = true LIMIT 1) as product_image,
                    b.username as buyer_username,
                    b.email as buyer_email,
                    s.username as seller_username
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN users b ON o.buyer_id = b.id
             JOIN users s ON o.seller_id = s.id
             WHERE o.id = $1`, [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Order not found');
        }
        return this.mapOrder(rows[0]);
    }
    async updateStatus(id, userId, status, trackingNumber) {
        const order = await this.getById(id);
        if (order.seller_id !== userId && order.buyer_id !== userId) {
            throw new common_1.ForbiddenException('You can only update your own orders');
        }
        const updates = ["status = $1", "updated_at = CURRENT_TIMESTAMP"];
        const values = [status];
        let paramIndex = 2;
        if (trackingNumber) {
            updates.push(`tracking_number = $${paramIndex}`);
            values.push(trackingNumber);
            paramIndex++;
        }
        values.push(id);
        const { rows } = await this.pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return this.mapOrder(rows[0]);
    }
    async getSellerStats(sellerId) {
        const { rows: overallRows } = await this.pool.query(`SELECT 
                COALESCE(SUM(total), 0) as total_revenue,
                COUNT(*) as total_sales,
                COUNT(*) FILTER (WHERE status = 'pending' OR status = 'paid') as pending_orders
             FROM orders 
             WHERE seller_id = $1 AND status != 'cancelled'`, [sellerId]);
        const { rows: monthRows } = await this.pool.query(`SELECT 
                COALESCE(SUM(total), 0) as this_month_revenue,
                COUNT(*) as this_month_sales
             FROM orders 
             WHERE seller_id = $1 
               AND status != 'cancelled'
               AND created_at >= date_trunc('month', CURRENT_DATE)`, [sellerId]);
        return {
            total_revenue: parseFloat(overallRows[0].total_revenue) || 0,
            total_sales: parseInt(overallRows[0].total_sales) || 0,
            pending_orders: parseInt(overallRows[0].pending_orders) || 0,
            this_month_revenue: parseFloat(monthRows[0].this_month_revenue) || 0,
            this_month_sales: parseInt(monthRows[0].this_month_sales) || 0,
        };
    }
    async getRecentSales(sellerId, limit = 5) {
        return this.getSellerSales(sellerId, limit, 0);
    }
    mapOrder(row) {
        return {
            id: row.id,
            product_id: row.product_id,
            seller_id: row.seller_id,
            buyer_id: row.buyer_id,
            amount: parseFloat(row.amount),
            shipping_cost: parseFloat(row.shipping_cost),
            total: parseFloat(row.total),
            status: row.status,
            shipping_address: row.shipping_address,
            tracking_number: row.tracking_number,
            notes: row.notes,
            created_at: row.created_at,
            updated_at: row.updated_at,
            product_title: row.product_title,
            product_image: row.product_image,
            buyer_username: row.buyer_username,
            buyer_email: row.buyer_email,
            seller_username: row.seller_username,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], OrdersService);
//# sourceMappingURL=orders.service.js.map