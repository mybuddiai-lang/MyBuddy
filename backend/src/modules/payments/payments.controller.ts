import { Controller, Post, Get, Body, Param, Headers, Req, RawBodyRequest, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('stripe/create-session')
  createStripeSession(@CurrentUser('id') userId: string, @Body('planType') planType: string) {
    return this.paymentsService.createStripeSession(userId, planType);
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(200)
  stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, sig);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('paystack/initialize')
  initializePaystack(@CurrentUser('id') userId: string, @Body('planType') planType: string) {
    return this.paymentsService.initializePaystack(userId, planType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('paystack/verify/:reference')
  verifyPaystack(@Param('reference') reference: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.verifyPaystack(reference, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@CurrentUser('id') userId: string) {
    return this.paymentsService.getSubscription(userId);
  }
}
