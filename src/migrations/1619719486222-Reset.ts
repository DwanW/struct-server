import {MigrationInterface, QueryRunner} from "typeorm";

export class Reset1619719486222 implements MigrationInterface {
    name = 'Reset1619719486222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sub_story" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "text" character varying NOT NULL, "order_index" numeric NOT NULL, "storyId" integer NOT NULL, "createdAt" date NOT NULL DEFAULT now(), "updatedAt" date NOT NULL DEFAULT now(), CONSTRAINT "PK_26b011e47e9cf6bcadb6e4c1a69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vote" ("value" integer NOT NULL, "userId" integer NOT NULL, "storyId" integer NOT NULL, CONSTRAINT "PK_bdf1fcd791b78366b493e3698a1" PRIMARY KEY ("userId", "storyId"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "about" character varying NOT NULL DEFAULT '', "endorsed" integer NOT NULL DEFAULT '0', "avatar_url" character varying, "createdAt" date NOT NULL DEFAULT now(), "updatedAt" date NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "story" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "overview" character varying NOT NULL, "cover_url" character varying, "up_vote" integer NOT NULL DEFAULT '0', "down_vote" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'draft', "creatorId" integer NOT NULL, "createdAt" date NOT NULL DEFAULT now(), "updatedAt" date NOT NULL DEFAULT now(), CONSTRAINT "PK_28fce6873d61e2cace70a0f3361" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sub_story" ADD CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_f5de237a438d298031d11a57c3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_958895d3789d1e509e88def82df" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "story" ADD CONSTRAINT "FK_59db3731bb1da73f87200450623" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "story" DROP CONSTRAINT "FK_59db3731bb1da73f87200450623"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_958895d3789d1e509e88def82df"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_f5de237a438d298031d11a57c3b"`);
        await queryRunner.query(`ALTER TABLE "sub_story" DROP CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b"`);
        await queryRunner.query(`DROP TABLE "story"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "vote"`);
        await queryRunner.query(`DROP TABLE "sub_story"`);
    }

}
