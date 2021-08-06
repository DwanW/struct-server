import { Story } from "../entities/Story";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { CreateStoryInput } from "../utils/inputTypes";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { User } from "../entities/User";
import { getConnection } from "typeorm";
import { S3SignResponse } from "../utils/sharedTypes";
import { S3BUCKET_NAME, S3SIGN_EXPIRE_TIME } from "../constants";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../s3";
import { Vote } from "../entities/Vote";

@ObjectType()
class PaginatedStory {
  @Field(() => [Story])
  stories: Story[];
  @Field(() => Story, { nullable: true })
  next_cursor: Story;
}

@InputType()
class TopStoryCursor {
  @Field(() => Int)
  id: number; // story id

  @Field(() => Int)
  net_up_votes: number;
}

@Resolver(Story)
export class StoryResolver {
  @FieldResolver(() => User)
  creator(@Root() story: Story, @Ctx() { creatorLoader }: MyContext) {
    return creatorLoader.load(story.creatorId);
  }

  @Mutation(() => Story)
  @UseMiddleware(isAuth)
  async createStory(
    @Arg("storyInput", () => CreateStoryInput) input: CreateStoryInput,
    @Ctx() { req }: MyContext
  ): Promise<Story> {
    return Story.create({ ...input, creatorId: req.session.userId }).save();
  }

  @Query(() => Story, { nullable: true })
  async getStoryById(
    @Arg("id", () => Int) id: number
  ): Promise<Story | undefined> {
    return Story.findOne(id);
  }

  @Query(() => PaginatedStory, { nullable: true })
  async searchStory(
    @Arg("title", () => String) title: string,
    @Arg("tags", () => String, { nullable: true }) tags: string,
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Int, { nullable: true }) cursor: number
  ): Promise<PaginatedStory> {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;
    const pattern = `%${title}%`;
    const sqlVariables: any[] = [fetchAmount, pattern];
    if (cursor) {
      sqlVariables.push(cursor);
    }

    let tagSql = "";

    if (tags) {
      let tagsArr = tags.split(",");

      tagsArr.forEach((tag) => {
        if (tag) {
          tagSql += ` and ( story."tags" like '${tag},%' or story."tags" like '%,${tag},%' )`;
        }
      });
    }

    const result = await getConnection().query(
      `
      select * from story
      where story."title" like $2 ${cursor ? "and story.id <= $3" : ""}
      ${tagSql}
      order by story.id DESC
      limit $1
      `,
      sqlVariables
    );

    return {
      stories: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  @Query(() => PaginatedStory, { nullable: true })
  async getMyStories(
    @Ctx() { req }: MyContext,
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Int, { nullable: true }) cursor: number // story id
  ): Promise<PaginatedStory> {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;
    const sqlVariables: any[] = [fetchAmount, req.session.userId];
    if (cursor) {
      sqlVariables.push(cursor);
    }

    const result = await getConnection().query(
      `
      select * from story
      where story."creatorId" = $2 ${cursor ? "and story.id <= $3" : ""}
      order by story.id DESC
      limit $1
      `,
      sqlVariables
    );

    return {
      stories: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  // query sort from new to old
  @Query(() => PaginatedStory)
  async getNewStories(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Int, { nullable: true }) cursor: number // story id
  ): Promise<PaginatedStory> {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;
    const sqlVariables: any[] = [fetchAmount];
    if (cursor) {
      sqlVariables.push(cursor);
    }

    const result = await getConnection().query(
      `
      select * from story
      ${cursor ? "where story.id <= $2" : ""}
      order by story.id DESC
      limit $1
      `,
      sqlVariables
    );

    return {
      stories: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  @Query(() => PaginatedStory)
  async getTopStories(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", { nullable: true }) cursor: TopStoryCursor,
    @Arg("time_range", () => Int, { defaultValue: 180, nullable: true })
    time_range: number //# number of days in string
  ) {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;
    const time_limit = new Date(Date.now() - time_range * 86400000);
    const sqlVariables: any[] = [fetchAmount, time_limit];

    if (cursor !== null) {
      sqlVariables.push(cursor.net_up_votes); //$3
      sqlVariables.push(cursor.id); //$4
    }

    const result = await getConnection().query(
      `
      select * from story
      where ${
        cursor
          ? `((story.up_vote - story.down_vote) = $3 and story.id <= $4 ) or ((story.up_vote - story.down_vote) < $3) and `
          : ""
      } story."createdAt" > $2
      order by (story.up_vote - story.down_vote) DESC, story.id DESC
      limit $1
    `,
      sqlVariables
    );

    return {
      stories: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  @Mutation(() => Story)
  @UseMiddleware(isAuth)
  async updateStory(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("overview") overview: string,
    @Arg("tags") tags: string,
    @Ctx()
    { req }: MyContext
  ): Promise<Story | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Story)
      .set({ title, overview, tags })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Story)
  @UseMiddleware(isAuth)
  async publishStory(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Story | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Story)
      .set({ status: "published" })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("storyId", () => Int) storyId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session;
    const voteValue = value > 0 ? 1 : value < 0 ? -1 : 0;
    const upvote = value > 0 ? 1 : 0;
    const downvote = value < 0 ? 1 : 0;

    const currentVote = await Vote.findOne({ where: { storyId, userId } }); // (+1 , -1 or 0) or undefined

    if (
      currentVote !== undefined &&
      currentVote.value !== voteValue &&
      voteValue !== 0
    ) {
      //changing vote
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
        update vote
        set value = ${voteValue}
        where "storyId" = ${storyId} and "userId" = ${userId}
        `);

        await transManager.query(`
        update story
        set up_vote = up_vote + ${
          currentVote.value === 0 ? upvote : voteValue
        }, down_vote = down_vote + ${
          currentVote.value === 0 ? downvote : -voteValue
        }
        where id = ${storyId}
        `);
      });
    } else if (
      currentVote !== undefined &&
      currentVote.value !== voteValue &&
      voteValue === 0
    ) {
      //unvote
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
        update vote
        set value = ${voteValue}
        where "storyId" = ${storyId} and "userId" = ${userId}
        `);

        await transManager.query(`
        update story
        set up_vote = up_vote + ${
          currentVote.value > 0 ? -1 : 0
        }, down_vote = down_vote + ${currentVote.value < 0 ? -1 : 0}
        where id = ${storyId}
        `);
      });
    } else if (currentVote === undefined && voteValue !== 0) {
      //has never voted, creating new vote
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
        insert into vote ("userId", "storyId", "value")
        values (${userId}, ${storyId}, ${voteValue})
        `);
        await transManager.query(`
        update story
        set up_vote = up_vote + ${upvote}, down_vote = down_vote + ${downvote}
        where id = ${storyId}
        `);
      });
    }
    return true;
  }

  @Mutation(() => S3SignResponse)
  @UseMiddleware(isAuth)
  async signS3StoryCover(
    @Arg("filename", () => String) filename: string,
    @Arg("filetype", () => String) filetype: string
  ) {
    const s3Params = {
      Bucket: S3BUCKET_NAME,
      Key: `cover/${filename}`,
      ContentType: filetype,
      ACL: "public-read",
    };

    const signedS3url = await getSignedUrl(s3, new PutObjectCommand(s3Params), {
      expiresIn: S3SIGN_EXPIRE_TIME,
    });

    const object_url = `https//${S3BUCKET_NAME}.s3.amazonaws.com/cover/${filename}`;

    return {
      error: null,
      signedS3url: signedS3url,
      obj_url: object_url,
    };
  }

  @Mutation(() => Boolean)
  async deleteStoryById(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ) {
    const story = await Story.findOne(id);
    if (!story) {
      return false;
    }
    if (story.creatorId !== req.session.userId) {
      return false;
    }
    await Story.delete({ id, creatorId: req.session.userId });
    return true;
  }

  @Mutation(() => Story, { nullable: true })
  @UseMiddleware(isAuth)
  async updateStoryCover(
    @Arg("cover_url", () => String) cover_url: string,
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Story | null> {
    const story = await Story.findOne(id);
    if (!story) {
      return null;
    }

    if (story.creatorId !== req.session.userId) {
      return null;
    }
    story.cover_url = cover_url;
    const result = await story.save();
    return result;
  }
}
