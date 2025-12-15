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
exports.ComponentsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let ComponentsService = class ComponentsService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async search(query, type, category) {
        if (!query || query.length < 2) {
            return [];
        }
        const dbCategory = category === 'Laptop' ? 'Mobile' : 'Desktop';
        const { rows } = await this.pool.query(`SELECT * FROM reference_components
       WHERE component_type = $1 
       AND category = $2
       AND (model_name ILIKE $3 OR manufacturer ILIKE $3)
       ORDER BY model_name
       LIMIT 15`, [type, dbCategory, `%${query}%`]);
        return rows;
    }
    async getById(id) {
        const { rows } = await this.pool.query('SELECT * FROM reference_components WHERE id = $1', [id]);
        return rows[0] || null;
    }
};
exports.ComponentsService = ComponentsService;
exports.ComponentsService = ComponentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], ComponentsService);
//# sourceMappingURL=components.service.js.map