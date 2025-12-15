import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { UsersService } from '../users/users.service';
export declare class ReportsController {
    private readonly reportsService;
    private readonly usersService;
    constructor(reportsService: ReportsService, usersService: UsersService);
    createReport(req: Request, body: {
        product_id: string;
        reason: string;
        description?: string;
    }): Promise<import("./reports.service").Report>;
    getReports(req: Request, status?: string): Promise<import("./reports.service").Report[]>;
    getPendingCount(req: Request): Promise<{
        count: number;
    }>;
    getReport(req: Request, id: string): Promise<import("./reports.service").Report>;
    updateStatus(req: Request, id: string, body: {
        status: string;
        admin_notes?: string;
    }): Promise<import("./reports.service").Report>;
}
