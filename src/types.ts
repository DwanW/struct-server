import { Request, Response } from "express";
import { Redis } from "ioredis";
import {
  createCreatorLoader,
  createStoryLoader,
  createReviewVoteLoader,
} from "./utils/loaders";

export type MyContext = {
  req: Request;
  res: Response;
  redis: Redis;
  creatorLoader: ReturnType<typeof createCreatorLoader>;
  storyLoader: ReturnType<typeof createStoryLoader>;
  reviewVoteLoader: ReturnType<typeof createReviewVoteLoader>;
};
