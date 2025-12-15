import type { Request } from 'express';
import { OrdersService, Order, SellerStats } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(req: Request, body: {
        product_id: string;
        seller_id: string;
        amount: number;
        shipping_cost?: number;
        shipping_address?: string;
        notes?: string;
    }): Promise<Order>;
    getMySales(req: Request, limit?: string, offset?: string): Promise<Order[]>;
    getMyPurchases(req: Request, limit?: string, offset?: string): Promise<Order[]>;
    getMyStats(req: Request): Promise<SellerStats>;
    getRecentSales(req: Request, limit?: string): Promise<Order[]>;
    getById(id: string): Promise<Order>;
    updateStatus(req: Request, id: string, body: {
        status: string;
        tracking_number?: string;
    }): Promise<Order>;
}
