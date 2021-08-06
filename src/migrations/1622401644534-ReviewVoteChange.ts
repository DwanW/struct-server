import {MigrationInterface, QueryRunner} from "typeorm";

export class ReviewVoteChange1622401644534 implements MigrationInterface {
    name = 'ReviewVoteChange1622401644534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review_vote" ALTER COLUMN "value" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review_vote" ALTER COLUMN "value" SET NOT NULL`);
    }

}
