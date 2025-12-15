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
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let UploadsService = class UploadsService {
    pool;
    uploadDir = path.join(process.cwd(), 'uploads');
    constructor(pool) {
        this.pool = pool;
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    async saveFile(file) {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${(0, uuid_1.v4)()}${ext}`;
        const filepath = path.join(this.uploadDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        return {
            filename,
            url: `/uploads/${filename}`,
        };
    }
    async deleteFile(filename) {
        const filepath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
    async createProductImage(productId, url, filename, isPrimary = false, displayOrder = 0) {
        const existingImages = await this.getProductImages(productId);
        if (existingImages.length === 0) {
            isPrimary = true;
        }
        const result = await this.pool.query(`INSERT INTO product_images (product_id, url, filename, is_primary, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [productId, url, filename, isPrimary, displayOrder]);
        return result.rows[0];
    }
    async getProductImages(productId) {
        const result = await this.pool.query(`SELECT * FROM product_images 
             WHERE product_id = $1 
             ORDER BY is_primary DESC, display_order ASC`, [productId]);
        return result.rows;
    }
    async getPrimaryImage(productId) {
        const result = await this.pool.query(`SELECT * FROM product_images 
             WHERE product_id = $1 AND is_primary = true`, [productId]);
        return result.rows[0] || null;
    }
    async setPrimaryImage(imageId, productId) {
        await this.pool.query(`UPDATE product_images SET is_primary = false WHERE product_id = $1`, [productId]);
        await this.pool.query(`UPDATE product_images SET is_primary = true WHERE id = $1`, [imageId]);
    }
    async deleteProductImage(imageId) {
        const result = await this.pool.query(`SELECT * FROM product_images WHERE id = $1`, [imageId]);
        if (result.rows[0]) {
            const image = result.rows[0];
            await this.deleteFile(image.filename);
            await this.pool.query(`DELETE FROM product_images WHERE id = $1`, [imageId]);
            if (image.is_primary) {
                const remaining = await this.getProductImages(image.product_id);
                if (remaining.length > 0) {
                    await this.setPrimaryImage(remaining[0].id, image.product_id);
                }
            }
        }
    }
    async deleteAllProductImages(productId) {
        const images = await this.getProductImages(productId);
        for (const image of images) {
            await this.deleteFile(image.filename);
        }
        await this.pool.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function" ? _a : Object])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map