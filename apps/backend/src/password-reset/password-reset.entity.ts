import { Entity, Index, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Exclude } from "class-transformer";
import { UserEntity } from "src/user/user.entity";

@Entity({ name: 'password_resets' })
@Index("idx_password_reset_email", ["email"], { unique: true })
@Index("idx_password_reset_token", ["token_hash"], { unique: true })
@Index("idx_password_reset_user_id", ["user_id"], { unique: false })
export class PasswordResetEntity {
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
  status!: "pending" | "used" | "expired" | "revoked";

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reset_at?: Date;
}