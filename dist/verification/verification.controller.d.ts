import type { Request } from 'express';
import { VerificationService } from './verification.service';
import type { CreateVerificationRequest } from './verification.service';
export declare class VerificationController {
    private verificationService;
    constructor(verificationService: VerificationService);
    apply(req: Request, data: CreateVerificationRequest): Promise<import("./verification.service").VerificationRequest>;
    getMyStatus(req: Request): Promise<{
        request: import("./verification.service").VerificationRequest | null;
    }>;
    getPendingRequests(req: Request): Promise<(import("./verification.service").VerificationRequest & {
        user_email: string;
        user_name: string;
    })[]>;
    reviewRequest(req: Request, requestId: string, body: {
        action: 'approve' | 'reject';
        notes?: string;
    }): Promise<import("./verification.service").VerificationRequest>;
}
