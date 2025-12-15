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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const users_service_1 = require("../users/users.service");
let ReportsController = class ReportsController {
    reportsService;
    usersService;
    constructor(reportsService, usersService) {
        this.reportsService = reportsService;
        this.usersService = usersService;
    }
    async createReport(req, body) {
        const user = req.user;
        return this.reportsService.createReport(body.product_id, user.id, body.reason, body.description);
    }
    async getReports(req, status) {
        const user = req.user;
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return this.reportsService.getReports(status);
    }
    async getPendingCount(req) {
        const user = req.user;
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return { count: await this.reportsService.getPendingCount() };
    }
    async getReport(req, id) {
        const user = req.user;
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return this.reportsService.getReportById(id);
    }
    async updateStatus(req, id, body) {
        const user = req.user;
        const isAdmin = await this.usersService.isAdmin(user.id);
        if (!isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return this.reportsService.updateReportStatus(id, body.status, user.id, body.admin_notes);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "createReport", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('pending-count'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getPendingCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getReport", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "updateStatus", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('api/reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        users_service_1.UsersService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map