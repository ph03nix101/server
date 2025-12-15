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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const uploads_service_1 = require("./uploads.service");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const multerOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new common_1.BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    },
};
let UploadsController = class UploadsController {
    uploadsService;
    constructor(uploadsService) {
        this.uploadsService = uploadsService;
    }
    async uploadSingle(productId, file) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const { filename, url } = await this.uploadsService.saveFile(file);
        const image = await this.uploadsService.createProductImage(productId, url, filename);
        return image;
    }
    async uploadMultiple(productId, files) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files uploaded');
        }
        const images = [];
        for (let i = 0; i < files.length; i++) {
            const { filename, url } = await this.uploadsService.saveFile(files[i]);
            const image = await this.uploadsService.createProductImage(productId, url, filename, i === 0, i);
            images.push(image);
        }
        return images;
    }
    async getProductImages(productId) {
        return this.uploadsService.getProductImages(productId);
    }
    async setPrimary(imageId, productId) {
        await this.uploadsService.setPrimaryImage(parseInt(imageId), productId);
        return { success: true };
    }
    async deleteImage(imageId) {
        await this.uploadsService.deleteProductImage(parseInt(imageId));
        return { success: true };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)('product/:productId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', multerOptions)),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadSingle", null);
__decorate([
    (0, common_1.Post)('product/:productId/multiple'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 6, multerOptions)),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadMultiple", null);
__decorate([
    (0, common_1.Get)('product/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "getProductImages", null);
__decorate([
    (0, common_1.Post)(':imageId/primary'),
    __param(0, (0, common_1.Param)('imageId')),
    __param(1, (0, common_1.Body)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "setPrimary", null);
__decorate([
    (0, common_1.Delete)(':imageId'),
    __param(0, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "deleteImage", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('api/uploads'),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map