import type { Request, Response } from 'express';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findById(id: string): Promise<import("./users.service").User>;
    update(id: string, updates: {
        full_name?: string;
        phone?: string;
        location?: string;
        bio?: string;
        avatar_url?: string;
    }): Promise<import("./users.service").User>;
    findAll(req: Request): Promise<import("./users.service").User[]>;
    setAdmin(req: Request, userId: string, isAdmin: boolean): Promise<import("./users.service").User>;
    setVerified(req: Request, userId: string, isVerified: boolean): Promise<import("./users.service").User>;
    deleteMyAccount(req: Request, res: Response, password: string): Promise<{
        message: string;
    }>;
}
