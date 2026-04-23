import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { Donation } from './entities/donations.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { AuthModule } from '../auth/auth.module';
import { GatewaysModule } from '../gateways/gateways.module';
@Module({
  imports: [TypeOrmModule.forFeature([Donation, Campaign]), AuthModule, GatewaysModule,],
  controllers: [DonationsController],
  providers: [DonationsService],
  
})
export class DonationsModule {}
