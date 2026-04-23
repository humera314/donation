import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { DonationsService } from '../donations/donations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface CreateIntentBody {
  amount: number;
  campaignId: number;
  donorName: string;
  donorEmail: string;
  isAnonymous?: boolean;
  message?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private donationsService: DonationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  async createPaymentIntent(@Body() body: CreateIntentBody) {
    const { amount, campaignId, donorName, donorEmail, isAnonymous, message } = body;

    if (!amount || amount < 1) {
      throw new BadRequestException('Amount must be at least $1');
    }

    return this.paymentsService.createPaymentIntent(
      amount,
      campaignId,
      { donorName, donorEmail, isAnonymous: String(isAnonymous ?? false), message: message ?? '' },
    );
  }

  // No JWT guard — Stripe calls this directly
  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    // express.raw() sets body to a Buffer for this route
    const payload = request.body as Buffer;
    const event = await this.paymentsService.handleWebhook(signature, payload);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as any);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as any);
        break;
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    const { campaignId, donorName, donorEmail, isAnonymous, message } = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100;

    await this.donationsService.create({
      amount,
      campaignId: parseInt(campaignId, 10),
      donorName,
      donorEmail,
      isAnonymous: isAnonymous === 'true',
      message: message || null,
      paymentIntentId: paymentIntent.id,
    });
  }

  private async handlePaymentFailed(paymentIntent: any) {
    console.log('Payment failed:', paymentIntent.id);
  }
}
