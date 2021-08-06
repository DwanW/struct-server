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
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { Review } from "../entities/Review";
import { Story } from "../entities/Story";
import { getConnection } from "typeorm";
import { ReviewVote } from "../entities/ReviewVote";
import { User } from "../entities/User";

declare type ReviewType = "positive" | "negative" | "neutral";

@ObjectType()
class PaginatedReview {
  @Field(() => [Review])
  reviews: Review[];
  @Field(() => Review, { nullable: true })
  next_cursor: Review;
}

@ObjectType()
class ReviewResponse {
  @Field(() => Review, { nullable: true })
  review?: Review;

  @Field(() => String, { nullable: true })
  error?: string;
}

@InputType()
class HelpfulReviewCursor {
  @Field(() => Int)
  id: number; // review id

  @Field(() => Int)
  helpful_score: number;
}

@Resolver(Review)
export class ReviewResolver {
  @FieldResolver(() => User)
  user(@Root() review: Review, @Ctx() { creatorLoader }: MyContext) {
    return creatorLoader.load(review.userId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async reviewVoteStatus(
    @Root() review: Review,
    @Ctx() { reviewVoteLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null;
    }
    const currentVote = await reviewVoteLoader.load({
      reviewId: review.id,
      userId: req.session.userId,
    });

    return currentVote ? currentVote.value : null;
  }

  @Mutation(() => ReviewResponse)
  @UseMiddleware(isAuth)
  async createReview(
    @Arg("storyId", () => Int) storyId: number,
    @Arg("text") text: string,
    @Arg("type") type: ReviewType,
    @Ctx() { req }: MyContext
  ): Promise<ReviewResponse> {
    const story = await Story.findOne(storyId);
    // cant create review for your own story
    if (story?.creatorId === req.session.userId) {
      return {
        error: "Cannot create review for your own story",
      };
    }

    const review = await Review.findOne({
      storyId,
      userId: req.session.userId,
    });

    if (review) {
      return {
        error: "already reviewed this story",
      };
    }

    // const result = await Review.create({
    //   text,
    //   type,
    //   userId: req.session.userId,
    //   storyId,
    // }).save();

    const voteNumber = type === "positive" ? 1 : type === "negative" ? -1 : 0;
    const upvoteValue = voteNumber > 0 ? 1 : 0;
    const downvoteValue = voteNumber < 0 ? 1 : 0;

    const transResult = await getConnection().transaction(
      async (transManager) => {
        await transManager.query(
          `
        insert into vote ("userId", "storyId", "value")
        values (${req.session.userId}, ${storyId}, ${voteNumber})
        `
        );

        await transManager.query(
          `
        update story
        set up_vote = up_vote + ${upvoteValue}, down_vote = down_vote + ${downvoteValue}
        where id = ${storyId}
        `
        );

        const result = await transManager
          .create(Review, {
            text,
            type,
            userId: req.session.userId,
            storyId,
          })
          .save();

        return result;
      }
    );

    return {
      review: transResult,
    };
  }

  @Query(() => Review, { nullable: true })
  async getReviewById(
    @Arg("id", () => Int) id: number
  ): Promise<Review | undefined> {
    return Review.findOne(id);
  }

  @Query(() => Boolean, {})
  async canUserCreateReview(
    @Arg("storyId", () => Int) storyId: number,
    @Arg("storyCreatorId", () => Int) storyCreatorId: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    if (!req.session.userId || req.session.userId === storyCreatorId) {
      return false;
    }

    const review = await Review.findOne({
      storyId,
      userId: req.session.userId,
    });
    if (review) {
      return false;
    }

    return true;
  }

  @Query(() => PaginatedReview)
  async getHelpfulStoryReviews(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", { nullable: true }) cursor: HelpfulReviewCursor,
    @Arg("time_range", () => Int, { defaultValue: 30, nullable: true })
    time_range: number,
    @Arg("storyId", () => Int) storyId: number
  ): Promise<PaginatedReview> {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;

    const time_limit = new Date(Date.now() - time_range * 86400000);
    const sqlVariables: any[] = [fetchAmount, storyId, time_limit];

    if (cursor !== null) {
      sqlVariables.push(cursor.helpful_score); //$4
      sqlVariables.push(cursor.id); //$5
    }

    const result = await getConnection().query(
      `
        select * from review
        where ${
          cursor
            ? `(review.helpful_score = $4 and review.id <= $5 ) or (review.helpful_score < $2) and`
            : ""
        } review."storyId" = $2 and (review."createdAt" > $3)
        order by review.helpful_score DESC, review.id DESC
        limit $1
        `,
      sqlVariables
    );

    return {
      reviews: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  @Query(() => PaginatedReview)
  async getRecentUserReviews(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", { nullable: true }) cursor: number, //review id
    @Arg("time_range", () => String, { defaultValue: "1" }) time_range: string,
    @Arg("userId", () => Int) userId: number
  ) {
    const fetchLimit = Math.min(20, limit);
    const fetchAmount = fetchLimit + 1;
    const time_limit = new Date(Date.now() - parseInt(time_range) * 86400000);
    const sqlVariables: any[] = [fetchAmount, userId, time_limit];
    if (cursor !== null) {
      sqlVariables.push(cursor); //$4
    }

    const result = await getConnection().query(
      `
        select * from review
        where ${
          cursor ? `review.id <= $4 and` : ""
        } review."userId" = $2 and (review."createdAt" > $3)
        order by review.id DESC
        limit $1
        `,
      sqlVariables
    );

    return {
      reviews: result.slice(0, fetchLimit),
      next_cursor:
        result.length === fetchAmount ? result[result.length - 1] : null,
    };
  }

  @Mutation(() => Review)
  @UseMiddleware(isAuth)
  async updateReview(
    @Arg("id", () => Int) id: number,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Review | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Review)
      .set({ text })
      .where('id = :id and "userId" = :userId', {
        id,
        userId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Review)
  @UseMiddleware(isAuth)
  async voteReview(
    @Arg("reviewId", () => Int) reviewId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session;
    const voteValue = value > 0 ? 1 : value < 0 ? -1 : 0;
    const upvote = value > 0 ? 1 : 0;
    const downvote = value < 0 ? 1 : 0;

    const currentVote = await ReviewVote.findOne({
      where: { reviewId, userId },
    }); // (+1 , -1 or 0) or undefined

    if (
      currentVote !== undefined &&
      currentVote.value !== voteValue &&
      voteValue !== 0
    ) {
      //changing vote to helpful or unhelpful
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
          update review_vote
          set value = ${voteValue}
          where "reviewId" = ${reviewId} and "userId" = ${userId}
          `);

        await transManager.query(`
          update review
          set helpful_score = helpful_score + ${
            currentVote.value === 0 ? upvote : voteValue
          }, unhelpful_score = unhelpful_score + ${
          currentVote.value === 0 ? downvote : -voteValue
        }, funny_score = funny_score + ${currentVote.value === 0 ? -1 : 0}
          where id = ${reviewId}
          `);
      });
    } else if (
      currentVote !== undefined &&
      currentVote.value !== voteValue &&
      voteValue === 0
    ) {
      //changing vote to funny
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
          update review_vote
          set value = ${voteValue}
          where "reviewId" = ${reviewId} and "userId" = ${userId}
          `);

        await transManager.query(`
          update review
          set helpful_score = helpful_score + ${
            currentVote.value > 0 ? -1 : 0
          }, unhelpful_score = unhelpful_score + ${
          currentVote.value < 0 ? -1 : 0
        }, funny_score = funny_score + 1
          where id = ${reviewId}
          `);
      });
    } else if (currentVote === undefined) {
      //has never voted, creating new vote
      await getConnection().transaction(async (transManager) => {
        await transManager.query(`
          insert into review_vote ("userId", "reviewId", "value")
          values (${userId}, ${reviewId}, ${voteValue})
          `);
        await transManager.query(`
          update review
          set helpful_score = helpful_score + ${upvote}, unhelpful_score = unhelpful_score + ${downvote}, funny_score = funny_score + ${
          voteValue === 0 ? 1 : 0
        }
          where id = ${reviewId}
          `);
      });
    }

    const modifiedReview = await Review.findOne({
      where: { id: reviewId },
    });
    return modifiedReview;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteReview(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ) {
    const review = await Review.findOne(id);
    if (!review) {
      return false;
    }
    if (review.userId !== req.session.userId) {
      return false;
    }
    await Review.delete({ id });
    return true;
  }
}
