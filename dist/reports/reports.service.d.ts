import { Pool } from 'pg';
export interface Report {
    id: string;
    product_id: string;
    reporter_id: string;
    reason: string;
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    admin_notes?: string;
    reviewed_by?: string;
    reviewed_at?: Date;
    created_at: Date;
    product_title?: string;
    reporter_name?: string;
    reporter_email?: string;
}
export declare class ReportsService {
    private pool;
    constructor(pool: Pool);
    createReport(productId: string, reporterId: string, reason: string, description?: string): Promise<Report>;
    getReports(status?: string): Promise<Report[]>;
    getReportById(id: string): Promise<Report>;
    updateReportStatus(id: string, status: string, adminId: string, adminNotes?: string): Promise<Report>;
    getReportCountByProduct(productId: string): Promise<number>;
    getPendingCount(): Promise<number>;
}
