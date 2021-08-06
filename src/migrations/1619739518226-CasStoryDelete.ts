import {MigrationInterface, QueryRunner} from "typeorm";

export class CasStoryDelete1619739518226 implements MigrationInterface {
    name = 'CasStoryDelete1619739518226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sub_story" DROP CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b"`);
        await queryRunner.query(`ALTER TABLE "sub_story" ADD CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sub_story" DROP CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b"`);
        await queryRunner.query(`ALTER TABLE "sub_story" ADD CONSTRAINT "FK_16c534b4a4f65ae0ee5f3af2e9b" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
