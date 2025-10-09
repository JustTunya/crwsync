import { Entity, Index, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_sessions" })
@Index("idx_user_session_user_id", ["user_id"])
export class UserSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "text" })
  refresh_token_hash!: string;

  @Column({ type: "timestamptz" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  expires_at?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  revoked_at?: Date | null;

  @Column({ type: "text", nullable: true })
  ua?: string | null;

  @Column({ type: "text", nullable: true })
  ip?: string | null;
}