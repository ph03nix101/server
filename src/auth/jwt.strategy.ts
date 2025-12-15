import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, UserPayload } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // First try Authorization header
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                // Then try cookie
                (request: Request) => {
                    return request?.cookies?.access_token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'techfinder-jwt-secret-key',
        });
    }

    async validate(payload: UserPayload) {
        const user = await this.authService.validateUser(payload.id);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
