import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
    // Joined fields
    product_title?: string;
    reporter_name?: string;
    reporter_email?: string;
}

@Injectable()
export class ReportsService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async createReport(
        productId: string,
        reporterId: string,
        reason: string,
        description?: string
    ): Promise<Report> {
        // Check if product exists
        const { rows: products } = await this.pool.query(
            'SELECT id, seller_id FROM products WHERE id = $1',
            [productId]
        );

        if (products.length === 0) {
            throw new NotFoundException('Product not found');
        }

        // Can't report own product
        if (products[0].seller_id === reporterId) {
            throw new BadRequestException('You cannot report your own listing');
        }

        // Check for existing report
        const { rows: existing } = await this.pool.query(
            'SELECT id FROM reports WHERE product_id = $1 AND reporter_id = $2',
            [productId, reporterId]
        );

        if (existing.length > 0) {
            throw new BadRequestException('You have already reported this listing');
        }

        const { rows } = await this.pool.query(
            `INSERT INTO reports (product_id, reporter_id, reason, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [productId, reporterId, reason, description]
        );

        return rows[0];
    }

    async getReports(status?: string): Promise<Report[]> {
        let query = `
            SELECT r.*, 
                   p.title as product_title,
                   u.full_name as reporter_name,
                   u.email as reporter_email
            FROM reports r
            JOIN products p ON r.product_id = p.id
            JOIN users u ON r.reporter_id = u.id
        `;

        const params: any[] = [];

        if (status) {
            query += ' WHERE r.status = $1';
            params.push(status);
        }

        query += ' ORDER BY r.created_at DESC';

        const { rows } = await this.pool.query(query, params);
        return rows;
    }

    async getReportById(id: string): Promise<Report> {
        const { rows } = await this.pool.query(
            `SELECT r.*, 
                    p.title as product_title,
                    u.full_name as reporter_name,
                    u.email as reporter_email
             FROM reports r
             JOIN products p ON r.product_id = p.id
             JOIN users u ON r.reporter_id = u.id
             WHERE r.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            throw new NotFoundException('Report not found');
        }

        return rows[0];
    }

    async updateReportStatus(
        id: string,
        status: string,
        adminId: string,
        adminNotes?: string
    ): Promise<Report> {
        const { rows } = await this.pool.query(
            `UPDATE reports 
             SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, admin_notes = $3
             WHERE id = $4
             RETURNING *`,
            [status, adminId, adminNotes, id]
        );

        if (rows.length === 0) {
            throw new NotFoundException('Report not found');
        }

        return rows[0];
    }

    async getReportCountByProduct(productId: string): Promise<number> {
        const { rows } = await this.pool.query(
            'SELECT COUNT(*) FROM reports WHERE product_id = $1',
            [productId]
        );
        return parseInt(rows[0].count);
    }

    async getPendingCount(): Promise<number> {
        const { rows } = await this.pool.query(
            "SELECT COUNT(*) FROM reports WHERE status = 'pending'"
        );
        return parseInt(rows[0].count);
    }
}
