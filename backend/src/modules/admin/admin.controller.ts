import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private analyticsService: AnalyticsService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  getUsers(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.adminService.getUsers(pagination, search);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get('analytics/dau')
  getDau() {
    return this.analyticsService.getDauWauMau();
  }

  @Get('analytics/sentiment-risks')
  getSentimentRisks() {
    return this.analyticsService.getSentimentRisks();
  }

  @Get('analytics/token-costs')
  getTokenCosts(@Query('days') days = 30) {
    return this.analyticsService.getTokenCosts(+days);
  }

  @Get('alerts')
  getAlerts(@Query('resolved') resolved?: string) {
    return this.adminService.getAlerts(resolved === 'true');
  }

  @Post('alerts/:id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.adminService.resolveAlert(id);
  }
}
