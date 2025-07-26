import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserRole, UserStatus, UserPreference, UserProfile, UserGenderValue, UserGender } from '@crwsync/types';

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
  avatarUrl?: string;

  @Column('enum', { enum: UserRole, array: true, default: [UserRole.MEMBER] })
  roles!: UserRole[];

  @Column('enum', { enum: UserStatus, default: UserStatus.OFFLINE })
  status!: UserStatus;
 
  @Column({ type: 'jsonb', default: () => `'{"theme":"system","notifications":{"email":false,"push":false}}'` })
  preferences!: UserPreference;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  profile!: UserProfile;

  @Column()
  passwordHash!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  refreshToken?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin?: Date;
}