export class CreateDonationDto {
  amount!: number;
  campaignId!: number;
  donorName!: string;
  donorEmail!: string;
  isAnonymous!: boolean;
  message?: string;
  paymentIntentId?: string
}
