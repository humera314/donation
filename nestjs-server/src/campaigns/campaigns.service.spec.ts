import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';

const mockCampaign: Campaign = {
  id: 1,
  title: 'Build Mosque',
  description: 'Help us build a community mosque',
  goalAmount: 50000,
  currentAmount: 0,
  status: 'active',
  creatorName: 'Ahmed',
  userId: 10,
  createdAt: new Date('2024-01-01'),
};

const mockCampaignsRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: getRepositoryToken(Campaign), useValue: mockCampaignsRepository },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of campaigns', async () => {
      mockCampaignsRepository.find.mockResolvedValue([mockCampaign]);

      const result = await service.findAll();

      expect(result).toEqual([mockCampaign]);
      expect(mockCampaignsRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no campaigns', async () => {
      mockCampaignsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a campaign by id', async () => {
      mockCampaignsRepository.findOne.mockResolvedValue(mockCampaign);

      const result = await service.findOne(1);

      expect(mockCampaignsRepository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCampaign);
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockCampaignsRepository.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new campaign', async () => {
      const dto = {
        title: 'Build Mosque',
        description: 'Help us build a community mosque',
        goalAmount: 50000,
        creatorName: 'Ahmed',
        userId: 10,
      };
      mockCampaignsRepository.create.mockReturnValue(mockCampaign);
      mockCampaignsRepository.save.mockResolvedValue(mockCampaign);

      const result = await service.create(dto);

      expect(mockCampaignsRepository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('update', () => {
    it('should update and return the campaign when user is the owner', async () => {
      const updated = { ...mockCampaign, title: 'Updated Title' };
      mockCampaignsRepository.findOne.mockResolvedValue({ ...mockCampaign });
      mockCampaignsRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, 10, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockCampaignsRepository.findOne.mockResolvedValue(mockCampaign);

      await expect(service.update(1, 99, { title: 'Hack' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove the campaign when user is the owner', async () => {
      mockCampaignsRepository.findOne.mockResolvedValue({ ...mockCampaign });
      mockCampaignsRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10)).resolves.toBeUndefined();
      expect(mockCampaignsRepository.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockCampaignsRepository.findOne.mockResolvedValue(mockCampaign);

      await expect(service.remove(1, 99)).rejects.toThrow(ForbiddenException);
    });
  });
});
