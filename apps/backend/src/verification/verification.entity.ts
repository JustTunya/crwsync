import { UserEntity } from "src/user/user.entity";
import { Entity, Index, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";

@Entity({ name: 'email_verifications' })
@Index("idx_verification_email", ["email"], { unique: true })
@Index("idx_verification_token", ["token"], { unique: true })
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

  @Column()
  token!: string;

  @Column({ default: false })
  is_verified!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at?: Date;
}