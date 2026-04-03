import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

const PLANS = {
  premium_monthly: { amount: 999, currency: 'usd', interval: 'month' },
  premium_annual: { amount: 7999, currency: 'usd', interval: 'year' },
  premium_monthly_ngn: { amount: 4999, currency: 'ngn', interval: 'month' },
};

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createStripeSession(userId: string, planType: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const plan = PLANS[planType];
    if (!plan) throw new BadRequestException('Invalid plan');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      metadata: { userId, planType },
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: { name: `Buddi ${planType}` },
          unit_amount: plan.amount,
          recurring: { interval: plan.interval as any },
        },
        quantity: 1,
      }],
      success_url: `${this.config.get('FRONTEND_URL')}/profile?payment=success`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/profile?payment=cancelled`,
    });

    await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.amount,
        currency: plan.currency,
        provider: 'STRIPE',
        providerPaymentId: session.id,
        planType,
        status: 'PENDING',
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.activateSubscription(session.metadata.userId, session.metadata.planType, session.id);
    }

    return { received: true };
  }

  async initializePaystack(userId: string, planType: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const plan = PLANS[planType + '_ngn'] || PLANS[planType];
    if (!plan) throw new BadRequestException('Invalid plan');

    const paystackKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
    const reference = `buddi_${userId}_${Date.now()}`;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: user.email, amount: plan.amount * 100, reference, metadata: { userId, planType } },
      { headers: { Authorization: `Bearer ${paystackKey}` } },
    );

    await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.amount,
        currency: 'NGN',
        provider: 'PAYSTACK',
        providerPaymentId: reference,
        planType,
        status: 'PENDING',
      },
    });

    return { authorizationUrl: response.data.data.authorization_url, reference };
  }

  async verifyPaystack(reference: string, userId: string) {
    const paystackKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });

    const txn = response.data.data;
    if (txn.status === 'success') {
      const payment = await this.prisma.payment.findFirst({ where: { providerPaymentId: reference, userId } });
      if (payment) {
        await this.activateSubscription(payment.userId, payment.planType, reference);
      }
    }

    return { status: txn.status };
  }

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: { payment: { select: { planType: true, createdAt: true } } },
    });
  }

  private async activateSubscription(userId: string, planType: string, paymentId: string) {
    const isAnnual = planType.includes('annual');
    const expiresAt = new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000);

    await this.prisma.payment.updateMany({
      where: { providerPaymentId: paymentId },
      data: { status: 'COMPLETED' },
    });

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, planType, expiresAt, status: 'active' },
      update: { planType, expiresAt, status: 'active' },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'PREMIUM' },
    });
  }
}
