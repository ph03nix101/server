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
exports.AuctionsController = void 0;
const common_1 = require("@nestjs/common");
const auctions_service_1 = require("./auctions.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let AuctionsController = class AuctionsController {
    auctionsService;
    constructor(auctionsService) {
        this.auctionsService = auctionsService;
    }
    create(dto, req) {
        const user = req.user;
        return this.auctionsService.create(dto, user.id);
    }
    placeBid(id, body, req) {
        const user = req.user;
        return this.auctionsService.placeBid(id, user.id, body.amount);
    }
    getActiveAuctions(limit, categoryId) {
        return this.auctionsService.getActiveAuctions(limit ? parseInt(limit) : 10, categoryId ? parseInt(categoryId) : undefined);
    }
    getMyBids(req) {
        const user = req.user;
        return this.auctionsService.getUserBids(user.id);
    }
    getByProductId(productId) {
        return this.auctionsService.getByProductId(productId);
    }
    getById(id) {
        return this.auctionsService.getById(id);
    }
    getBidHistory(id) {
        return this.auctionsService.getBidHistory(id);
    }
    cancelAuction(id, req) {
        const user = req.user;
        return this.auctionsService.cancelAuction(id, user.id);
    }
};
exports.AuctionsController = AuctionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auctions_service_1.CreateAuctionDto, Object]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/bid'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "placeBid", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('category_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "getActiveAuctions", null);
__decorate([
    (0, common_1.Get)('my-bids'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "getMyBids", null);
__decorate([
    (0, common_1.Get)('product/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "getByProductId", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)(':id/bids'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "getBidHistory", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuctionsController.prototype, "cancelAuction", null);
exports.AuctionsController = AuctionsController = __decorate([
    (0, common_1.Controller)('api/auctions'),
    __metadata("design:paramtypes", [auctions_service_1.AuctionsService])
], AuctionsController);
//# sourceMappingURL=auctions.controller.js.map