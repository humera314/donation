import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  goalAmount!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  currentAmount!: number;

  @Column({ default: 'active' })
  status!: string;

  @Column()
  creatorName!: string;

  @Column()
  userId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}