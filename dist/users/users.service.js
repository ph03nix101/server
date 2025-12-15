"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let UsersService = class UsersService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async findById(id) {
        const { rows } = await this.pool.query(`SELECT id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at 
             FROM users WHERE id = $1`, [id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return rows[0];
    }
    async findAll() {
        const { rows } = await this.pool.query(`SELECT id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at 
             FROM users ORDER BY created_at DESC`);
        return rows;
    }
    async update(id, updates) {
        const { rows } = await this.pool.query(`UPDATE users SET
                full_name = COALESCE($1, full_name),
                phone = COALESCE($2, phone),
                location = COALESCE($3, location),
                bio = COALESCE($4, bio),
                avatar_url = COALESCE($5, avatar_url)
             WHERE id = $6
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`, [updates.full_name, updates.phone, updates.location, updates.bio, updates.avatar_url, id]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return rows[0];
    }
    async setAdmin(userId, isAdmin) {
        const { rows } = await this.pool.query(`UPDATE users SET is_admin = $1 WHERE id = $2
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`, [isAdmin, userId]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return rows[0];
    }
    async setVerified(userId, isVerified) {
        const { rows } = await this.pool.query(`UPDATE users SET is_verified_seller = $1 WHERE id = $2
             RETURNING id, email, username, full_name, phone, location, bio, avatar_url, is_verified_seller, is_admin, created_at`, [isVerified, userId]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return rows[0];
    }
    async isAdmin(userId) {
        const { rows } = await this.pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        return rows[0]?.is_admin === true;
    }
    async deleteAccount(userId, password) {
        const bcrypt = require('bcrypt');
        const { rows: users } = await this.pool.query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            throw new common_1.NotFoundException('User not found');
        }
        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Incorrect password');
        }
        await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
        return { message: 'Account deleted successfully' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], UsersService);
//# sourceMappingURL=users.service.js.map