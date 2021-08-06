import {MigrationInterface, QueryRunner} from "typeorm";

export class TAG1626620727251 implements MigrationInterface {
    name = 'TAG1626620727251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "story" ADD "tags" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "story" DROP COLUMN "tags"`);
    }

}
