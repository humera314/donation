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
    const dto = {
      amount: 100.50,
      campaignId: 1,
      donorName: 'Sara',
      donorEmail: 'sara@example.com',
      isAnonymous: false,
      message: 'Keep up the great work!',
    };

    it('should save the donation and update campaign currentAmount', async () => {
      const campaign = { ...mockCampaign, currentAmount: 0 };
      mockDonationsRepository.create.mockReturnValue(mockDonation);
      mockDonationsRepository.save.mockResolvedValue(mockDonation);
      mockCampaignsRepository.findOne.mockResolvedValue(campaign);
      mockCampaignsRepository.save.mockResolvedValue({ ...campaign, currentAmount: 100.50 });

      const result = await service.create(dto);

      expect(mockDonationsRepository.save).toHaveBeenCalled();
      expect(mockCampaignsRepository.findOne).toHaveBeenCalledWith(1);
      expect(campaign.currentAmount).toBe(100.5);
      expect(result).toEqual(mockDonation);
    });

    it('should broadcast new donation and progress update via gateway', async () => {
      const campaign = { ...mockCampaign, currentAmount: 0 };
      mockDonationsRepository.create.mockReturnValue(mockDonation);
      mockDonationsRepository.save.mockResolvedValue(mockDonation);
      mockCampaignsRepository.findOne.mockResolvedValue(campaign);
      mockCampaignsRepository.save.mockResolvedValue(campaign);

      await service.create(dto);

      expect(mockCampaignsGateway.broadcastNewDonation).toHaveBeenCalledWith('1', mockDonation);
      expect(mockCampaignsGateway.broadcastProgressUpdate).toHaveBeenCalled();
    });

    it('should set campaign status to completed when goal is reached', async () => {
      const campaign = { ...mockCampaign, currentAmount: 49900, goalAmount: 50000 };
      mockDonationsRepository.create.mockReturnValue({ ...mockDonation, amount: 100 });
      mockDonationsRepository.save.mockResolvedValue({ ...mockDonation, amount: 100 });
      mockCampaignsRepository.findOne.mockResolvedValue(campaign);
      mockCampaignsRepository.save.mockResolvedValue(campaign);

      await service.create({ ...dto, amount: 100 });

      expect(campaign.status).toBe('completed');
      expect(mockCampaignsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should keep campaign active when goal is not reached', async () => {
      const campaign = { ...mockCampaign, currentAmount: 0, goalAmount: 50000 };
      mockDonationsRepository.create.mockReturnValue(mockDonation);
      mockDonationsRepository.save.mockResolvedValue(mockDonation);
      mockCampaignsRepository.findOne.mockResolvedValue(campaign);
      mockCampaignsRepository.save.mockResolvedValue(campaign);

      await service.create(dto);

      expect(campaign.status).toBe('active');
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockDonationsRepository.create.mockReturnValue(mockDonation);
      mockDonationsRepository.save.mockResolvedValue(mockDonation);
      mockCampaignsRepository.findOne.mockResolvedValue(undefined);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
