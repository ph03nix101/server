"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    pool;
    jwtService;
    constructor(pool, jwtService) {
        this.pool = pool;
        this.jwtService = jwtService;
    }
    async register(data) {
        const existingUser = await this.pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [data.email, data.username]);
        if (existingUser.rows.length > 0) {
            throw new common_1.ConflictException('Email or username already exists');
        }
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(data.password, saltRounds);
        const { rows } = await this.pool.query(`INSERT INTO users (email, username, password_hash, full_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, username, full_name, created_at`, [data.email, data.username, password_hash, data.full_name]);
        const user = rows[0];
        const token = this.generateToken(user);
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
            },
            access_token: token,
        };
    }
    async login(email, password) {
        const { rows } = await this.pool.query(`SELECT id, email, username, full_name, password_hash, avatar_url, is_verified_seller, is_admin
             FROM users WHERE email = $1`, [email]);
        if (rows.length === 0) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = rows[0];
        if (!user.password_hash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = this.generateToken(user);
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                is_verified_seller: user.is_verified_seller,
                is_admin: user.is_admin,
            },
            access_token: token,
        };
    }
    async validateUser(userId) {
        const { rows } = await this.pool.query(`SELECT id, email, username, full_name, avatar_url, is_verified_seller, is_admin
             FROM users WHERE id = $1`, [userId]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
    async requestPasswordReset(email) {
        const { rows: users } = await this.pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
        if (users.length === 0) {
            return { message: 'If your email exists in our system, you will receive a password reset link.' };
        }
        const user = users[0];
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);
        await this.pool.query(`INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)`, [user.id, token, expiresAt]);
        console.log(`\n🔑 Password Reset Token for ${email}:`);
        console.log(`   Token: ${token}`);
        console.log(`   Reset URL: http://localhost:3000/reset-password?token=${token}\n`);
        return {
            message: 'If your email exists in our system, you will receive a password reset link.',
            token: process.env.NODE_ENV === 'development' ? token : undefined,
        };
    }
    async resetPassword(token, newPassword) {
        const { rows: tokens } = await this.pool.query(`SELECT t.id, t.user_id, u.email 
             FROM password_reset_tokens t
             JOIN users u ON t.user_id = u.id
             WHERE t.token = $1 AND t.used = FALSE AND t.expires_at > CURRENT_TIMESTAMP`, [token]);
        if (tokens.length === 0) {
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        }
        const resetToken = tokens[0];
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
        await this.pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id]);
        return { message: 'Password has been reset successfully.' };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const bcrypt = require('bcrypt');
        const { rows: users } = await this.pool.query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const user = users[0];
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        if (newPassword.length < 8) {
            throw new common_1.UnauthorizedException('New password must be at least 8 characters');
        }
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);
        return { message: 'Password changed successfully.' };
    }
    generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            username: user.username,
        };
        return this.jwtService.sign(payload);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map