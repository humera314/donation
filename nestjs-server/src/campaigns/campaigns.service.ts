import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
  ) {}

  findAll(): Promise<Campaign[]> {
    return this.campaignsRepository.find();
  }

  async findOne(id: number): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  create(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepository.create(createCampaignDto);
    return this.campaignsRepository.save(campaign);
  }

  async update(id: number, userId: number, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only edit your own campaigns');
    }
    Object.assign(campaign, updateCampaignDto);
    return this.campaignsRepository.save(campaign);
  }

  async remove(id: number, userId: number): Promise<void> {
    const campaign = await this.findOne(id);
    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }
    await this.campaignsRepository.remove(campaign);
  }
}
