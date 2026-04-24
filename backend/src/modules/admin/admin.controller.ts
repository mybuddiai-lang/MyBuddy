import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST', 'SUPPORT')
  @Get('dashboard')
  @ApiOperation({ summary: 'Overview KPIs' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('dashboard/signup-trend')
  @ApiOperation({ summary: 'Daily signup trend' })
  getSignupTrend(@Query('days') days?: string) {
    return this.adminService.getSignupTrend(days ? parseInt(days) : 7);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('analytics/countries')
  @ApiOperation({ summary: 'Users grouped by country' })
  getCountryStats() {
    return this.adminService.getCountryStats();
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST', 'SUPPORT')
  @Get('users')
  @ApiOperation({ summary: 'Paginated user list' })
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST', 'SUPPORT')
  @Get('users/:id')
  @ApiOperation({ summary: 'User detail with activity' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserRole(id, role, adminId);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user account' })
  blockUser(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminService.blockUser(id, adminId);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user account' })
  unblockUser(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminService.unblockUser(id, adminId);
  }

  @Roles('SUPER_ADMIN')
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a user (SUPER_ADMIN only)' })
  deleteUser(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminService.deleteUser(id, adminId);
  }

  // ─── Admin Management ─────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admins')
  @ApiOperation({ summary: 'List all admin-role users' })
  listAdmins() {
    return this.adminService.listAdmins();
  }

  @Roles('SUPER_ADMIN')
  @Post('admins')
  @ApiOperation({ summary: 'Create a new admin user (SUPER_ADMIN only)' })
  createAdmin(@Body() body: any, @CurrentUser('id') adminId: string) {
    return this.adminService.createAdmin(body, adminId);
  }

  // ─── Mental Health ────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('mental-health')
  @ApiOperation({ summary: 'Anonymized sentiment distribution' })
  getMentalHealthStats() {
    return this.adminService.getMentalHealthStats();
  }

  // ─── Referrals ────────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('referrals')
  @ApiOperation({ summary: 'Referral funnel stats' })
  getReferralStats() {
    return this.adminService.getReferralStats();
  }

  // ─── Monetization ─────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('monetization')
  @ApiOperation({ summary: 'Revenue and subscription stats' })
  getMonetizationStats() {
    return this.adminService.getMonetizationStats();
  }

  // ─── Professionals ────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST', 'SUPPORT')
  @Get('professionals')
  @ApiOperation({ summary: 'List professionals' })
  getProfessionals(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getProfessionals(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('professionals')
  @ApiOperation({ summary: 'Create a professional' })
  createProfessional(@Body() body: any) {
    return this.adminService.createProfessional(body);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('professionals/:id')
  @ApiOperation({ summary: 'Update professional (approve/reject/edit)' })
  updateProfessional(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateProfessional(id, body);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('professionals/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete professional' })
  deleteProfessional(@Param('id') id: string) {
    return this.adminService.deleteProfessional(id);
  }

  // ─── Operations ───────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @Get('operations/activity')
  @ApiOperation({ summary: 'Live activity feed' })
  getActivityFeed(@Query('limit') limit?: string) {
    return this.adminService.getActivityFeed(limit ? parseInt(limit) : 50);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @Get('operations/lookup')
  @ApiOperation({ summary: 'Lookup user by email or ID' })
  lookupUser(@Query('q') query: string) {
    return this.adminService.lookupUser(query);
  }

  // ─── AI Monitoring ────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('ai')
  @ApiOperation({ summary: 'AI usage and token cost stats' })
  getAiStats(@Query('days') days?: string) {
    return this.adminService.getAiStats(days ? parseInt(days) : 30);
  }

  // ─── System Health ────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('system')
  @ApiOperation({ summary: 'API health and DB ping' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ─── Reports ─────────────────────────────────────────────────────────────
  @Roles('ADMIN', 'SUPER_ADMIN', 'ANALYST')
  @Get('reports/export')
  @ApiOperation({ summary: 'Export data as JSON (convert to CSV on client)' })
  exportData(@Query('type') type: 'users' | 'subscriptions' | 'activity') {
    return this.adminService.exportData(type || 'users');
  }
}
