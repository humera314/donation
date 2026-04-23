import { Module } from '@nestjs/common';
import { ProductModule } from './product';
import { TypeOrmModule } from "@nestjs/typeorm";
import { configService } from "./config/configService";
import { CampaignsModule } from './campaigns/campaigns.module';
import { UsersModule } from './users/users.module';
import { DonationsModule } from './donations/donations.module';
import { AuthModule } from './auth/auth.module';
import { GatewaysModule } from './gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    ProductModule,
    CampaignsModule,
    UsersModule,
    DonationsModule,
    AuthModule,
    GatewaysModule,
  ]
})
export class AppModule { }
