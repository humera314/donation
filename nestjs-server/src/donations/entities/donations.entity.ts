import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  campaignId!: number;

  @Column()
  donorName!: string;

  @Column()
  donorEmail!: string;

  @Column({ default: false })
  isAnonymous!: boolean;

  @Column('text', { nullable: true })
  message!: string | null;

  @Column({ nullable: true })
  paymentIntentId!: string | null;

  @Column({ default: 'completed' })
  paymentStatus!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
