import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UsersService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async findById(id: string): Promise<User> {
        const { rows } = await this.pool.query(
            `SELECT id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at 
             FROM users WHERE id = $1`,
            [id]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return rows[0];
    }

    async findAll(): Promise<User[]> {
        const { rows } = await this.pool.query(
            `SELECT id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at 
             FROM users ORDER BY created_at DESC`
        );
        return rows;
    }

    async update(id: string, updates: Partial<{
        full_name: string;
        phone: string;
        location: string;
        bio: string;
        avatar_url: string;
    }>): Promise<User> {
        const { rows } = await this.pool.query(
            `UPDATE users SET
                full_name = COALESCE($1, full_name),
                phone = COALESCE($2, phone),
                location = COALESCE($3, location),
                bio = COALESCE($4, bio),
                avatar_url = COALESCE($5, avatar_url)
             WHERE id = $6
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`,
            [updates.full_name, updates.phone, updates.location, updates.bio, updates.avatar_url, id]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return rows[0];
    }

    async setAdmin(userId: string, isAdmin: boolean): Promise<User> {
        const { rows } = await this.pool.query(
            `UPDATE users SET is_admin = $1 WHERE id = $2
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`,
            [isAdmin, userId]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        return rows[0];
    }

    async setVerified(userId: string, isVerified: boolean): Promise<User> {
        const { rows } = await this.pool.query(
            `UPDATE users SET is_verified_seller = $1 WHERE id = $2
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`,
            [isVerified, userId]
        );

        if (rows.length === 0) {
            throw new NotFoundException(`User with ID ${userId} not found`);
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

    async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
        const bcrypt = require('bcrypt');

        // Verify user exists and check password
        const { rows: users } = await this.pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (users.length === 0) {
            throw new NotFoundException('User not found');
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Incorrect password');
        }

        // Due to CASCADE DELETE on foreign keys, deleting user will automatically delete:
        // - products (seller_id)
        // - conversations (buyer_id, seller_id)
        // - messages (sender_id) 
        // - wishlists (user_id)
        // - verification_requests (user_id)
        // - password_reset_tokens (user_id)

        await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);

        return { message: 'Account deleted successfully' };
    }
}
