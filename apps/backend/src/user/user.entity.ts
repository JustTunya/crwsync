import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { Exclude } from "class-transformer";
import { RoleEnum } from "@crwsync/types";

@Entity({ name: "users" })
@Index("idx_user_email", ["email"], { unique: true })
@Index("idx_user_username", ["username"], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "citext", unique: true })
  email!: string;

  @Column({ type: "citext", unique: true })
  username!: string;

  @Column({ type: "text" })
  firstname!: string;

  @Column({ type: "text" })
  lastname!: string;

  @Column({ type: "date" })
  birthdate!: string;

  @Column({ type: "text", nullable: true })
  avatar_key?: string | null;

  @Column({ type: "enum", enum: RoleEnum, default: RoleEnum.MEMBER })
  role!: RoleEnum;

  @Column({ type: "int", default: 1 })
  role_version!: number;

  @Exclude()
  @Column({ type: "text" })
  password_hash!: string;

  @Column({ type: "timestamptz", nullable: true })
  last_password_change?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  email_verified_at?: Date | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  role_changed_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  last_login?: Date | null;
  
  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}