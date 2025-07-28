import { Entity, Index, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: 'email_verifications' })
@Index("idx_verification_email", ["email"], { unique: true })
export class VerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => "CURRENT_TIMESTAMP + INTERVAL '30 days'" })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;
}