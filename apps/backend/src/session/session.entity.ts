import { Entity, Index, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Exclude } from "class-transformer";
import { UserEntity } from "src/user/user.entity";

@Entity({ name: "sessions" })
@Index("idx_session_user_id", ["user_id"])
export class SessionEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: "uuid" })
  user_id!: string;

  @Exclude()
  @Column({ type: "text" })
  refresh_token_hash!: string;

  @Column({ type: "boolean", default: false })
  persistent!: boolean;

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