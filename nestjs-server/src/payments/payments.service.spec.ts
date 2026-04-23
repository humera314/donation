import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const mockPaymentIntent = {
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_abc',
  amount: 10000,
  metadata: { campaignId: '1' },
};

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

const mockDonor = {
  donorName: 'Sara',
  donorEmail: 'sara@example.com',
  isAnonymous: 'false',
  message: 'Keep it up!',
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_fake';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should return clientSecret and paymentIntentId', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(100, 1, mockDonor);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          currency: 'usd',
          metadata: expect.objectContaining({ campaignId: '1', donorName: 'Sara' }),
        }),
      );
      expect(result).toEqual({
        clientSecret: 'pi_test_123_secret_abc',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('should throw BadRequestException when Stripe fails', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Card declined'));

      await expect(service.createPaymentIntent(100, 1, mockDonor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    it('should return the Stripe event on valid signature', async () => {
      const fakeEvent = { type: 'payment_intent.succeeded', data: { object: {} } };
      mockStripe.webhooks.constructEvent.mockReturnValue(fakeEvent);

      const result = await service.handleWebhook('valid-sig', Buffer.from('payload'));

      expect(result).toEqual(fakeEvent);
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook('bad-sig', Buffer.from('payload')),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    it('should create a refund for the given paymentIntentId', async () => {
      const mockRefund = { id: 're_test_123', status: 'succeeded' };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.refundPayment('pi_test_123');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' });
      expect(result).toEqual(mockRefund);
    });

    it('should throw BadRequestException when refund fails', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Already refunded'));

      await expect(service.refundPayment('pi_test_123')).rejects.toThrow(BadRequestException);
    });
  });
});
