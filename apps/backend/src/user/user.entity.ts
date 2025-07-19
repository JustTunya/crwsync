import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole, UserStatus, UserPreference, UserProfile } from '@crwsync/types';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  phone!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  firstname!: string;

  @Column()
  lastname!: string;

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

  @Column({ default: false })
  phoneVerified!: boolean;

  @Column({ nullable: true })
  refreshToken?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin?: Date;
}