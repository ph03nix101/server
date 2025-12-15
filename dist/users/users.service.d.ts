import { Pool } from 'pg';
export interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    phone?: string;
    location?: string;
    bio?: string;
    avatar_url?: string;
    is_verified_seller: boolean;
    is_admin?: boolean;
    created_at: Date;
}
export declare class UsersService {
    private pool;
    constructor(pool: Pool);
    findById(id: string): Promise<User>;
    findAll(): Promise<User[]>;
    update(id: string, updates: Partial<{
        full_name: string;
        phone: string;
        location: string;
        bio: string;
        avatar_url: string;
    }>): Promise<User>;
    setAdmin(userId: string, isAdmin: boolean): Promise<User>;
    setVerified(userId: string, isVerified: boolean): Promise<User>;
    isAdmin(userId: string): Promise<boolean>;
    deleteAccount(userId: string, password: string): Promise<{
        message: string;
    }>;
}
