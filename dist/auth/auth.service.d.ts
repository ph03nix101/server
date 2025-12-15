import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
export interface UserPayload {
    id: string;
    email: string;
    username: string;
}
export declare class AuthService {
    private pool;
    private jwtService;
    constructor(pool: Pool, jwtService: JwtService);
    register(data: {
        email: string;
        username: string;
        password: string;
        full_name: string;
    }): Promise<{
        user: {
            id: any;
            email: any;
            username: any;
            full_name: any;
        };
        access_token: string;
    }>;
    login(email: string, password: string): Promise<{
        user: {
            id: any;
            email: any;
            username: any;
            full_name: any;
            avatar_url: any;
            is_verified_seller: any;
            is_admin: any;
        };
        access_token: string;
    }>;
    validateUser(userId: string): Promise<any>;
    requestPasswordReset(email: string): Promise<{
        message: string;
        token?: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    private generateToken;
}
