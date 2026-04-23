import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DonationsService } from '../donations/donations.service';

const mockPaymentsService = {
  createPaymentIntent: jest.fn(),
  handleWebhook: jest.fn(),
};

const mockDonationsService = {
  create: jest.fn(),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: DonationsService, useValue: mockDonationsService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    const validBody = {
      amount: 100,
      campaignId: 1,
      donorName: 'Sara',
      donorEmail: 'sara@example.com',
      isAnonymous: false,
      message: 'Keep it up!',
    };

    it('should return clientSecret from the service', async () => {
      const mockResult = { clientSecret: 'pi_secret', paymentIntentId: 'pi_123' };
      mockPaymentsService.createPaymentIntent.mockResolvedValue(mockResult);

      const result = await controller.createPaymentIntent(validBody);

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        100, 1,
        expect.objectContaining({ donorName: 'Sara', donorEmail: 'sara@example.com' }),
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when amount is less than 1', async () => {
      await expect(
        controller.createPaymentIntent({ ...validBody, amount: 0 }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPaymentsService.createPaymentIntent).not.toHaveBeenCalled();
    });
  });

  describe('handleStripeWebhook', () => {
    it('should create a donation on payment_intent.succeeded', async () => {
      const paymentIntent = {
        id: 'pi_123',
        amount: 10000,
        metadata: {
          campaignId: '1',
          donorName: 'Sara',
          donorEmail: 'sara@example.com',
          isAnonymous: 'false',
          message: 'Keep it up!',
        },
      };
      mockPaymentsService.handleWebhook.mockResolvedValue({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      });
      mockDonationsService.create.mockResolvedValue({});

      const result = await controller.handleStripeWebhook(
        'stripe-sig',
        { body: Buffer.from('{}') } as any,
      );

      expect(mockDonationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          campaignId: 1,
          donorName: 'Sara',
          paymentIntentId: 'pi_123',
        }),
      );
      expect(result).toEqual({ received: true });
    });

    it('should not create a donation on payment_intent.payment_failed', async () => {
      mockPaymentsService.handleWebhook.mockResolvedValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123' } },
      });

      const result = await controller.handleStripeWebhook(
        'stripe-sig',
        { body: Buffer.from('{}') } as any,
      );

      expect(mockDonationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });
  });
});
