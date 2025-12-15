import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

export interface UserPayload {
    id: string;
    email: string;
    username: string;
}

@Injectable()
export class AuthService {
    constructor(
        @Inject('DATABASE_CONNECTION') private pool: Pool,
        private jwtService: JwtService,
        private mailService: MailService,
    ) {
        this.ensureSchema();
    }

    private async ensureSchema() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                token TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    async register(data: {
        email: string;
        username: string;
        password: string;
        full_name: string;
    }) {
        // Check if user already exists
        const existingUser = await this.pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [data.email, data.username]
        );

        if (existingUser.rows.length > 0) {
            throw new ConflictException('Email or username already exists');
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(data.password, saltRounds);

        // Create user
        const { rows } = await this.pool.query(
            `INSERT INTO users (email, username, password_hash, full_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, username, full_name, created_at`,
            [data.email, data.username, password_hash, data.full_name]
        );

        const user = rows[0];

        // Generate JWT token
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

    async login(email: string, password: string) {
        // Find user by email
        const { rows } = await this.pool.query(
            `SELECT id, email, username, full_name, password_hash, avatar_url, is_verified_seller, is_admin
             FROM users WHERE email = $1`,
            [email]
        );

        if (rows.length === 0) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const user = rows[0];

        // Check password
        if (!user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate JWT token
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

    async validateUser(userId: string) {
        const { rows } = await this.pool.query(
            `SELECT id, email, username, full_name, avatar_url, is_verified_seller, is_admin
             FROM users WHERE id = $1`,
            [userId]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0];
    }

    async requestPasswordReset(email: string): Promise<{ message: string; token?: string }> {
        // Find user by email
        const { rows: users } = await this.pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            // Don't reveal if email exists - return success message anyway
            return { message: 'If your email exists in our system, you will receive a password reset link.' };
        }

        const user = users[0];

        // Generate secure random token
        const token = require('crypto').randomBytes(32).toString('hex');

        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Invalidate any existing tokens for this user
        await this.pool.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
            [user.id]
        );

        // Create new token
        await this.pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, token, expiresAt]
        );

        // Send email with reset link
        await this.mailService.sendPasswordReset(email, token);

        return {
            message: 'If your email exists in our system, you will receive a password reset link.',
            // Return token only in development for easier testing if needed
            token: process.env.NODE_ENV === 'development' ? token : undefined,
        };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        // Find valid token
        const { rows: tokens } = await this.pool.query(
            `SELECT t.id, t.user_id, u.email 
             FROM password_reset_tokens t
             JOIN users u ON t.user_id = u.id
             WHERE t.token = $1 AND t.used = FALSE AND t.expires_at > CURRENT_TIMESTAMP`,
            [token]
        );

        if (tokens.length === 0) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        const resetToken = tokens[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update user password
        await this.pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, resetToken.user_id]
        );

        // Mark token as used
        await this.pool.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
            [resetToken.id]
        );

        return { message: 'Password has been reset successfully.' };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const bcrypt = require('bcrypt');

        // Get user with password hash
        const { rows: users } = await this.pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (users.length === 0) {
            throw new UnauthorizedException('User not found');
        }

        const user = users[0];

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Validate new password
        if (newPassword.length < 8) {
            throw new UnauthorizedException('New password must be at least 8 characters');
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await this.pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, userId]
        );

        return { message: 'Password changed successfully.' };
    }

    private generateToken(user: { id: string; email: string; username: string }) {
        const payload: UserPayload = {
            id: user.id,
            email: user.email,
            username: user.username,
        };

        return this.jwtService.sign(payload);
    }
}
