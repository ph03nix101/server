import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        user: {
            id: any;
            email: any;
            username: any;
            full_name: any;
        };
        access_token: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
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
    getProfile(req: Request): Promise<{
        user: Express.User | undefined;
    }>;
    logout(res: Response): Promise<{
        message: string;
    }>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        message: string;
        token?: string;
    }>;
    resetPassword(body: {
        token: string;
        password: string;
    }): Promise<{
        message: string;
    }>;
    changePassword(req: Request, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
