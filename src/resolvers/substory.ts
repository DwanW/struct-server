import { Story } from "../entities/Story";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Float,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { CreateSubStoryInput } from "../utils/inputTypes";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { SubStory } from "../entities/SubStory";

@ObjectType()
class SubStoryResponse {
  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => SubStory, { nullable: true })
  substory?: SubStory;
}

@Resolver(SubStory)
export class SubStoryResolver {
  @FieldResolver(() => Story)
  story(@Root() substory: SubStory, @Ctx() { storyLoader }: MyContext) {
    return storyLoader.load(substory.storyId);
  }

  @Mutation(() => SubStoryResponse)
  @UseMiddleware(isAuth)
  async createSubStory( 
    @Arg("storyInput", () => CreateSubStoryInput) input: CreateSubStoryInput,
    @Arg("storyId", () => Int) storyId: number,
    @Ctx() { req }: MyContext
  ): Promise<SubStoryResponse> {
    const story = await Story.findOne(storyId);
    if (!story) {
      return {
        error: "no story with this id exist",
      };
    }

    if (story.creatorId !== req.session.userId) {
      return {
        error: "not authorized",
      };
    }

    const resultData = await getConnection().query(
      `
      select MAX(order_index) from sub_story
      where sub_story."storyId" = ${storyId}
      `
    );

    const maxOrderIdx = resultData[0].max ? parseFloat(resultData[0].max) : 0;

    const finalValue =
      maxOrderIdx % 1 === 0 ? maxOrderIdx + 1 : Math.ceil(maxOrderIdx);

    const result = await SubStory.create({
      ...input,
      storyId,
      order_index: finalValue,
    }).save();

    return {
      substory: result,
    };
  }

  @Query(() => SubStory, { nullable: true })
  async getSubStoryById(
    @Arg("id", () => Int) id: number
  ): Promise<SubStory | undefined> {
    return SubStory.findOne(id);
  }

  @Query(() => [SubStory])
  async getSubStoriesFromStoryId(
    @Arg("storyId", () => Int) storyId: number
  ): Promise<SubStory[]> {
    return SubStory.find({ storyId });
  }

  @Mutation(() => SubStoryResponse)
  @UseMiddleware(isAuth)
  async updateSubStory(
    @Arg("id", () => Int) id: number,
    @Arg("storyId", () => Int) storyId: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<SubStoryResponse | null> {
    const story = await Story.findOne(storyId);

    if (!story) {
      return {
        error: "no story with this id exist",
      };
    }

    if (story.creatorId !== req.session.userId) {
      return {
        error: "not authorized",
      };
    }

    const result = await getConnection()
      .createQueryBuilder()
      .update(SubStory)
      .set({ title, text })
      .where("id = :id", {
        id,
      })
      .returning("*")
      .execute();

    return {
      substory: result.raw[0],
    };
  }

  //unstable, subject to change
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async rearrangeSubStory(
    @Arg("id", () => Int) id: number,
    @Arg("storyId", () => Int) storyId: number,
    @Arg("prev_order_index", () => Float, { nullable: true })
    prev_order_index: number,
    @Arg("next_order_index", () => Float, { nullable: true })
    next_order_index: number,
    @Ctx() { req }: MyContext
  ) {
    if (!prev_order_index && !next_order_index) {
      return false;
    }

    const story = await Story.findOne(storyId);

    if (!story) {
      return false;
    }

    if (story.creatorId !== req.session.userId) {
      return false;
    }

    let updatedIndex;
    if (prev_order_index && next_order_index) {
      // rearrange to between two substories
      updatedIndex = (prev_order_index + next_order_index) / 2;
    } else if (!prev_order_index && next_order_index) {
      // rearrange to the beginning
      updatedIndex = (0 + next_order_index) / 2;
    } else if (!next_order_index && prev_order_index) {
      // rearrage to the end
      const endLimit =
        prev_order_index % 1 === 0
          ? prev_order_index + 1
          : Math.ceil(prev_order_index);
      updatedIndex = (prev_order_index + endLimit) / 2;
    }

    await SubStory.update({ id: id }, { order_index: updatedIndex });

    return true;
  }

  @Mutation(() => Boolean)
  async deleteSubStoryById(
    @Arg("id", () => Int) id: number,
    @Arg("storyId", () => Int) storyId: number,
    @Ctx() { req }: MyContext
  ) {
    const story = await Story.findOne(storyId);
    if (!story) {
      return false;
    }
    if (story.creatorId !== req.session.userId) {
      return false;
    }
    await SubStory.delete({ id });
    return true;
  }
}
