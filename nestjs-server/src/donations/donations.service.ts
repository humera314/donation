import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from './entities/donations.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreateDonationDto } from './dto/create-donation.dto';
import { CampaignsGateway } from '../gateways/campaigns.gateway';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationsRepository: Repository<Donation>,

    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    private campaignsGateway: CampaignsGateway,
  ) {}

  findAll(): Promise<Donation[]> {
    return this.donationsRepository.find();
  }

  async create(createDonationDto: CreateDonationDto): Promise<Donation> {
    const donation = this.donationsRepository.create(createDonationDto);
    await this.donationsRepository.save(donation);

    const campaign = await this.campaignsRepository.findOne(createDonationDto.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${createDonationDto.campaignId} not found`);
    }
    campaign.currentAmount = Number(campaign.currentAmount) + Number(donation.amount);

    if (campaign.currentAmount >= campaign.goalAmount) {
      campaign.status = 'completed';
    }

    await this.campaignsRepository.save(campaign);

    this.campaignsGateway.broadcastNewDonation(String(campaign.id), donation);
    this.campaignsGateway.broadcastProgressUpdate(String(campaign.id), campaign);

    return donation;
  }
}
