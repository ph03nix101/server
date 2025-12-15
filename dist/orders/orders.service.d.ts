import { Pool } from 'pg';
export interface Order {
    id: string;
    product_id: string;
    seller_id: string;
    buyer_id: string;
    amount: number;
    shipping_cost: number;
    total: number;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    shipping_address: string | null;
    tracking_number: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    product_title?: string;
    product_image?: string;
    buyer_username?: string;
    buyer_email?: string;
    seller_username?: string;
}
export interface SellerStats {
    total_revenue: number;
    total_sales: number;
    pending_orders: number;
    this_month_revenue: number;
    this_month_sales: number;
}
export declare class OrdersService {
    private pool;
    constructor(pool: Pool);
    private ensureTable;
    create(data: {
        product_id: string;
        seller_id: string;
        buyer_id: string;
        amount: number;
        shipping_cost?: number;
        shipping_address?: string;
        notes?: string;
    }): Promise<Order>;
    getSellerSales(sellerId: string, limit?: number, offset?: number): Promise<Order[]>;
    getBuyerPurchases(buyerId: string, limit?: number, offset?: number): Promise<Order[]>;
    getById(id: string): Promise<Order>;
    updateStatus(id: string, userId: string, status: string, trackingNumber?: string): Promise<Order>;
    getSellerStats(sellerId: string): Promise<SellerStats>;
    getRecentSales(sellerId: string, limit?: number): Promise<Order[]>;
    private mapOrder;
}
