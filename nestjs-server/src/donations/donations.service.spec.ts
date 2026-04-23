import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { Donation } from './entities/donations.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignsGateway } from '../gateways/campaigns.gateway';

const mockCampaign: Campaign = {
  id: 1,
  userId: 10,
  title: 'Build Mosque',
  description: 'Help us build a community mosque',
  goalAmount: 50000,
  currentAmount: 0,
  status: 'active',
  creatorName: 'Ahmed',
  createdAt: new Date('2024-01-01'),
};

const mockDonation: Donation = {
  id: 1,
  amount: 100.50,
  campaignId: 1,
  donorName: 'Sara',
  donorEmail: 'sara@example.com',
  isAnonymous: false,
  message: 'Keep up the great work!',
  paymentIntentId: 'pi_test_123',
  paymentStatus: 'completed',
  createdAt: new Date('2024-01-01'),
};

const mockDonationsRepository = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockCampaignsRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockCampaignsGateway = {
  broadcastNewDonation: jest.fn(),
  broadcastProgressUpdate: jest.fn(),
};

describe('DonationsService', () => {
  let service: DonationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: mockDonationsRepository },
        { provide: getRepositoryToken(Campaign), useValue: mockCampaignsRepository },
        { provide: CampaignsGateway, useValue: mockCampaignsGateway },
      ],
    }).compile();

    service = module.get<DonationsService>(DonationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of donations', async () => {
      mockDonationsRepository.find.mockResolvedValue([mockDonation]);

      const result = await service.findAll();

      expect(result).toEqual([mockDonation]);
      expect(mockDonationsRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    const baseDto = {
      amount: 100.50,
      campaignId: 1,
      donorName: 'Sara',
      donorEmail: 'sara@example.com',
      isAnonymous: false,
      message: 'Keep up the great work!',
    };

    describe('Stripe-paid donations', () => {
      const stripeDto = { ...baseDto, paymentIntentId: 'pi_test_123' };

      it('should save donation with paymentIntentId from confirmed Stripe payment', async () => {
        const campaign = { ...mockCampaign };
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        const result = await service.create(stripeDto);

        expect(mockDonationsRepository.create).toHaveBeenCalledWith(stripeDto);
        expect(result.paymentIntentId).toBe('pi_test_123');
        expect(result.paymentStatus).toBe('completed');
      });

      it('should update campaign currentAmount after Stripe payment', async () => {
        const campaign = { ...mockCampaign, currentAmount: 0 };
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        await service.create(stripeDto);

        expect(campaign.currentAmount).toBe(100.5);
        expect(mockCampaignsRepository.save).toHaveBeenCalled();
      });

      it('should broadcast donation and progress after Stripe payment', async () => {
        const campaign = { ...mockCampaign };
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        await service.create(stripeDto);

        expect(mockCampaignsGateway.broadcastNewDonation).toHaveBeenCalledWith('1', mockDonation);
        expect(mockCampaignsGateway.broadcastProgressUpdate).toHaveBeenCalled();
      });
    });

    describe('direct donations (no Stripe)', () => {
      it('should save donation without paymentIntentId', async () => {
        const directDonation = { ...mockDonation, paymentIntentId: null };
        const campaign = { ...mockCampaign };
        mockDonationsRepository.create.mockReturnValue(directDonation);
        mockDonationsRepository.save.mockResolvedValue(directDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        const result = await service.create(baseDto);

        expect(mockDonationsRepository.create).toHaveBeenCalledWith(baseDto);
        expect(result.paymentIntentId).toBeNull();
      });
    });

    describe('campaign goal tracking', () => {
      it('should set campaign status to completed when goal is reached', async () => {
        const campaign = { ...mockCampaign, currentAmount: 49900, goalAmount: 50000 };
        mockDonationsRepository.create.mockReturnValue({ ...mockDonation, amount: 100 });
        mockDonationsRepository.save.mockResolvedValue({ ...mockDonation, amount: 100 });
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        await service.create({ ...baseDto, amount: 100 });

        expect(campaign.status).toBe('completed');
        expect(mockCampaignsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'completed' }),
        );
      });

      it('should keep campaign active when goal is not yet reached', async () => {
        const campaign = { ...mockCampaign, currentAmount: 0, goalAmount: 50000 };
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(campaign);
        mockCampaignsRepository.save.mockResolvedValue(campaign);

        await service.create(baseDto);

        expect(campaign.status).toBe('active');
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException when campaign does not exist', async () => {
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(undefined);

        await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
      });

      it('should not create donation when campaign is not found', async () => {
        mockDonationsRepository.create.mockReturnValue(mockDonation);
        mockDonationsRepository.save.mockResolvedValue(mockDonation);
        mockCampaignsRepository.findOne.mockResolvedValue(undefined);

        await expect(service.create(baseDto)).rejects.toThrow();

        expect(mockCampaignsGateway.broadcastNewDonation).not.toHaveBeenCalled();
        expect(mockCampaignsGateway.broadcastProgressUpdate).not.toHaveBeenCalled();
      });
    });
  });
});
