import {MigrationInterface, QueryRunner} from "typeorm";

export class ReviewTable1622243713286 implements MigrationInterface {
    name = 'ReviewTable1622243713286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "review_vote" ("value" integer NOT NULL, "userId" integer NOT NULL, "reviewId" integer NOT NULL, CONSTRAINT "PK_0279a09a8855cf2108365616b72" PRIMARY KEY ("userId", "reviewId"))`);
        await queryRunner.query(`CREATE TABLE "review" ("id" SERIAL NOT NULL, "text" character varying NOT NULL, "type" character varying NOT NULL, "helpful_score" integer NOT NULL DEFAULT '0', "funny_score" integer NOT NULL DEFAULT '0', "unhelpful_score" integer NOT NULL DEFAULT '0', "userId" integer NOT NULL, "storyId" integer NOT NULL, "createdAt" date NOT NULL DEFAULT now(), "updatedAt" date NOT NULL DEFAULT now(), CONSTRAINT "PK_2e4299a343a81574217255c00ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "review_vote" ADD CONSTRAINT "FK_4de8aa192a7d2919b66ce83e6f8" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review_vote" ADD CONSTRAINT "FK_f714bf883874fbd00b52bf16407" FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review" ADD CONSTRAINT "FK_1337f93918c70837d3cea105d39" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review" ADD CONSTRAINT "FK_f095351fcb677419c4b4ecd2b04" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review" DROP CONSTRAINT "FK_f095351fcb677419c4b4ecd2b04"`);
        await queryRunner.query(`ALTER TABLE "review" DROP CONSTRAINT "FK_1337f93918c70837d3cea105d39"`);
        await queryRunner.query(`ALTER TABLE "review_vote" DROP CONSTRAINT "FK_f714bf883874fbd00b52bf16407"`);
        await queryRunner.query(`ALTER TABLE "review_vote" DROP CONSTRAINT "FK_4de8aa192a7d2919b66ce83e6f8"`);
        await queryRunner.query(`DROP TABLE "review"`);
        await queryRunner.query(`DROP TABLE "review_vote"`);
    }

}
