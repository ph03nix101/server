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
exports.AdminCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const admin_categories_service_1 = require("./admin-categories.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
let AdminCategoriesController = class AdminCategoriesController {
    adminCategoriesService;
    constructor(adminCategoriesService) {
        this.adminCategoriesService = adminCategoriesService;
    }
    async createCategory(body) {
        return this.adminCategoriesService.createCategory(body);
    }
    async updateCategory(id, body) {
        return this.adminCategoriesService.updateCategory(parseInt(id), body);
    }
    async deleteCategory(id) {
        return this.adminCategoriesService.deleteCategory(parseInt(id));
    }
    async cloneCategory(body) {
        return this.adminCategoriesService.cloneCategory(body.sourceId, body.newName, body.newSlug);
    }
    async getAttributes(id) {
        return this.adminCategoriesService.getAttributes(parseInt(id));
    }
    async createAttribute(id, body) {
        return this.adminCategoriesService.createAttribute(parseInt(id), body);
    }
    async updateAttribute(id, body) {
        return this.adminCategoriesService.updateAttribute(parseInt(id), body);
    }
    async deleteAttribute(id) {
        return this.adminCategoriesService.deleteAttribute(parseInt(id));
    }
    async reorderAttributes(body) {
        if (!Array.isArray(body.updates))
            throw new common_1.BadRequestException('Updates must be an array');
        return this.adminCategoriesService.reorderAttributes(body.updates);
    }
};
exports.AdminCategoriesController = AdminCategoriesController;
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Post)('categories/clone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "cloneCategory", null);
__decorate([
    (0, common_1.Get)('categories/:id/attributes'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "getAttributes", null);
__decorate([
    (0, common_1.Post)('categories/:id/attributes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "createAttribute", null);
__decorate([
    (0, common_1.Patch)('attributes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "updateAttribute", null);
__decorate([
    (0, common_1.Delete)('attributes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "deleteAttribute", null);
__decorate([
    (0, common_1.Post)('attributes/reorder'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCategoriesController.prototype, "reorderAttributes", null);
exports.AdminCategoriesController = AdminCategoriesController = __decorate([
    (0, common_1.Controller)('api/admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [admin_categories_service_1.AdminCategoriesService])
], AdminCategoriesController);
//# sourceMappingURL=admin-categories.controller.js.map