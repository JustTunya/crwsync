import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757972076755 implements MigrationInterface {
    name = 'Init1757972076755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "user_id" uuid, "token" character varying NOT NULL, "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "verified_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_44e5cfea68f87243cad38bb1b1f" UNIQUE ("email"), CONSTRAINT "PK_c1ea2921e767f83cd44c0af203f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_verification_user_id" ON "email_verifications" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_verification_token" ON "email_verifications" ("token") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_verification_email" ON "email_verifications" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('admin', 'member')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('available', 'away', 'busy', 'do_not_disturb', 'offline')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "username" character varying NOT NULL, "firstname" character varying NOT NULL, "lastname" character varying NOT NULL, "gender" jsonb NOT NULL DEFAULT '{"value":"prefer_not_to_say","label":"Prefer not to say"}', "birthdate" date NOT NULL, "avatar_url" character varying, "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{member}', "status" "public"."users_status_enum" NOT NULL DEFAULT 'offline', "preferences" jsonb NOT NULL DEFAULT '{"theme":"system","notifications":{"email":false,"push":false}}', "profile" jsonb NOT NULL DEFAULT '{}', "password_hash" character varying NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "refresh_token" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_login" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_user_username" ON "users" ("username") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_user_email" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "email_verifications" ADD CONSTRAINT "FK_c4f1838323ae1dff5aa00148915" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verifications" DROP CONSTRAINT "FK_c4f1838323ae1dff5aa00148915"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_username"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_verification_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_verification_token"`);
        await queryRunner.query(`DROP INDEX "public"."idx_verification_user_id"`);
        await queryRunner.query(`DROP TABLE "email_verifications"`);
    }

}
