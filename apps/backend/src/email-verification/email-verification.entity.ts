import { Entity, Index, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Exclude } from "class-transformer";
import { UserEntity } from "src/user/user.entity";

@Entity({ name: 'email_verifications' })
@Index("idx_verification_email", ["email"], { unique: true })
@Index("idx_verification_token", ["token_hash"], { unique: true })
@Index("idx_verification_user_id", ["user_id"], { unique: false })
export class VerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;
  
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ nullable: true })
  user_id!: string;

  @Exclude()
  @Column()
  token_hash!: string;

  @Column({ default: "pending" })
  status!: "pending" | "verified" | "expired" | "revoked";

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at?: Date;
}