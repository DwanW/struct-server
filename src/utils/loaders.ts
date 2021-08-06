import DataLoader from "dataloader";
import { ReviewVote } from "../entities/ReviewVote";
import { Story } from "../entities/Story";
import { User } from "../entities/User";

export const createCreatorLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};

    users.forEach((user) => {
      userIdToUser[user.id] = user;
    });

    return userIds.map((userId) => userIdToUser[userId]);
  });

export const createStoryLoader = () =>
  new DataLoader<number, Story>(async (storyIds) => {
    const stories = await Story.findByIds(storyIds as number[]);
    const storyIdToStory: Record<number, Story> = {};

    stories.forEach((story) => {
      storyIdToStory[story.id] = story;
    });

    return storyIds.map((storyId) => storyIdToStory[storyId]);
  });

export const createReviewVoteLoader = () =>
  new DataLoader<{ reviewId: number; userId: number }, ReviewVote | null>(
    async (keys) => {
      const reviewVote = await ReviewVote.findByIds(keys as any);
      const reviewVotesObject: Record<string, ReviewVote> = {};
      reviewVote.forEach((vote) => {
        reviewVotesObject[`${vote.userId}|${vote.reviewId}`] = vote;
      });

      return keys.map(
        (key) => reviewVotesObject[`${key.userId}|${key.reviewId}`]
      );
    }
  );
