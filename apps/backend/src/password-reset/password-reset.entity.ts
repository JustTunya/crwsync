import { Entity, Index, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { UserEntity } from "src/user/user.entity";

@Entity({ name: 'password_resets' })
@Index("idx_password_reset_email", ["email"], { unique: true })
@Index("idx_password_reset_token", ["token"], { unique: true })
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

  @Column()
  token!: string;

  @Column({ default: false })
  is_reseted!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reseted_at?: Date;
}