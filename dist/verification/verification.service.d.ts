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
export declare class VerificationService {
    private pool;
    constructor(pool: Pool);
    apply(userId: string, data: CreateVerificationRequest): Promise<VerificationRequest>;
    getMyStatus(userId: string): Promise<VerificationRequest | null>;
    getAllPending(): Promise<(VerificationRequest & {
        user_email: string;
        user_name: string;
    })[]>;
    review(requestId: string, adminId: string, action: 'approve' | 'reject', notes?: string): Promise<VerificationRequest>;
    isAdmin(userId: string): Promise<boolean>;
}
