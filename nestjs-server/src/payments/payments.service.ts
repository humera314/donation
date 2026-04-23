import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface DonorMetadata {
  donorName: string;
  donorEmail: string;
  isAnonymous: string;
  message: string;
}

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe>;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      { apiVersion: '2026-03-25.dahlia' as any },
    );
  }

  async createPaymentIntent(amount: number, campaignId: number, donor: DonorMetadata) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: {
          campaignId: campaignId.toString(),
          donorName: donor.donorName,
          donorEmail: donor.donorEmail,
          isAnonymous: donor.isAnonymous,
          message: donor.message,
        },
        capture_method: 'automatic',
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!;

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      throw new BadRequestException('Webhook signature verification failed');
    }
  }

  async refundPayment(paymentIntentId: string) {
    try {
      return await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}
