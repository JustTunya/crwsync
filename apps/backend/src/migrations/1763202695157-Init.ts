import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1763202695157 implements MigrationInterface {
    name = 'Init1763202695157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "system_role_id"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('member', 'admin', 'super_admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'member'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role_version" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role_changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "persistent" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "persistent"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_changed_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_version"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "system_role_id" uuid`);
    }

}
