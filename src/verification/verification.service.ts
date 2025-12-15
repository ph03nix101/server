import { Injectable, Inject, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

export interface VerificationRequest {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    id_document_url?: string;
    business_name?: string;
    business_address?: string;
    reason?: string;
    admin_notes?: string;
    reviewed_by?: string;
    reviewed_at?: Date;
    created_at: Date;
}

export interface CreateVerificationRequest {
    business_name: string;
    business_address?: string;
    reason: string;
}

@Injectable()
export class VerificationService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async apply(userId: string, data: CreateVerificationRequest): Promise<VerificationRequest> {
        // Check if user already has a pending or approved request
        const existing = await this.pool.query(
            `SELECT id, status FROM seller_verification_requests 
             WHERE user_id = $1 AND status IN ('pending', 'approved') 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (existing.rows.length > 0) {
            const status = existing.rows[0].status;
            if (status === 'approved') {
                throw new ConflictException('You are already a verified seller');
            }
            if (status === 'pending') {
                throw new ConflictException('You already have a pending verification request');
            }
        }

        const { rows } = await this.pool.query(
            `INSERT INTO seller_verification_requests (user_id, business_name, business_address, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, data.business_name, data.business_address, data.reason]
        );

        return rows[0];
    }

    async getMyStatus(userId: string): Promise<VerificationRequest | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM seller_verification_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    }

    async getAllPending(): Promise<(VerificationRequest & { user_email: string; user_name: string })[]> {
        const { rows } = await this.pool.query(
            `SELECT v.*, u.email as user_email, u.full_name as user_name
             FROM seller_verification_requests v
             JOIN users u ON v.user_id = u.id
             WHERE v.status = 'pending'
             ORDER BY v.created_at ASC`
        );
        return rows;
    }

    async review(
        requestId: string,
        adminId: string,
        action: 'approve' | 'reject',
        notes?: string
    ): Promise<VerificationRequest> {
        // Get the request
        const { rows: requests } = await this.pool.query(
            'SELECT * FROM seller_verification_requests WHERE id = $1',
            [requestId]
        );

        if (requests.length === 0) {
            throw new NotFoundException('Verification request not found');
        }

        const request = requests[0];
        if (request.status !== 'pending') {
            throw new ConflictException('This request has already been reviewed');
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update the request
        const { rows } = await this.pool.query(
            `UPDATE seller_verification_requests 
             SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [newStatus, notes, adminId, requestId]
        );

        // If approved, update user's is_verified_seller status
        if (action === 'approve') {
            await this.pool.query(
                'UPDATE users SET is_verified_seller = TRUE WHERE id = $1',
                [request.user_id]
            );
        }

        return rows[0];
    }

    async isAdmin(userId: string): Promise<boolean> {
        const { rows } = await this.pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [userId]
        );
        return rows[0]?.is_admin === true;
    }
}
