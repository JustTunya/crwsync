import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { UserRole, UserStatus, UserPreference, UserProfile, UserGenderValue, UserGender } from '@crwsync/types';
import { VerificationEntity } from 'src/mail-verification/verification.entity';

@Entity({ name: 'users' })
@Index("idx_user_email", ["email"], { unique: true })
@Index("idx_user_username", ["username"], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  firstname!: string;

  @Column()
  lastname!: string;

  @Column('jsonb', { default: UserGender.PREFER_NOT_TO_SAY })
  gender!: UserGenderValue;

  @Column({ type: 'date' })
  birthdate!: string;

  @Column({ nullable: true })
  avatar_url?: string;

  @Column('enum', { enum: UserRole, array: true, default: [UserRole.MEMBER] })
  roles!: UserRole[];

  @Column('enum', { enum: UserStatus, default: UserStatus.OFFLINE })
  status!: UserStatus;
 
  @Column({ type: 'jsonb', default: () => `'{"theme":"system","notifications":{"email":false,"push":false}}'` })
  preferences!: UserPreference;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  profile!: UserProfile;

  @Column()
  password_hash!: string;

  @OneToMany(() => VerificationEntity, v => v.user)
  verifications?: VerificationEntity[];

  @Column({ default: false })
  email_verified!: boolean;

  @Column({ nullable: true })
  refresh_token?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_login?: Date;
}