import "reflect-metadata";
import "dotenv-safe/config";
import chalk from "chalk";
import { createConnection } from "typeorm";
import path from "path";
import { User } from "./entities/User";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import { COOKIE_NAME, __prod__ } from "./constants";
import Redis from "ioredis";
import connectRedis from "connect-redis";
import { Story } from "./entities/Story";
import { Vote } from "./entities/Vote";
import { StoryResolver } from "./resolvers/story";
import {
  createCreatorLoader,
  createReviewVoteLoader,
  createStoryLoader,
} from "./utils/loaders";
import { SubStory } from "./entities/SubStory";
import { SubStoryResolver } from "./resolvers/substory";
import { Review } from "./entities/Review";
import { ReviewResolver } from "./resolvers/review";
import { ReviewVote } from "./entities/ReviewVote";
import cors from "cors";

// session custom variable type merging
declare module "express-session" {
  export interface Session {
    userId?: number;
  }
}

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    entities: [User, Story, SubStory, Vote, Review, ReviewVote],
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    //   synchronize: true,
    logging: true,
    migrations: [path.join(__dirname, "./migrations/*")],
  });

  await connection.runMigrations();

  //express server
  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 3600 * 24,
        httpOnly: true,
        sameSite: "none",
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [
        UserResolver,
        StoryResolver,
        SubStoryResolver,
        ReviewResolver,
      ],
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      creatorLoader: createCreatorLoader(),
      storyLoader: createStoryLoader(),
      reviewVoteLoader: createReviewVoteLoader(),
    }),
    formatError: (err) => {
      console.log("formatError:", err);
      if (err.message === "Argument Validation Error") {
        return new Error("validation failed");
      }
      return err;
    },
  });

  app.get("/", (_, res) => {
    res.json({ message: "server is running on path: /graphql " });
  });

  apolloServer.applyMiddleware({ path: "/graphql", app, cors: false });

  app.listen(parseInt(process.env.PORT), () => {
    console.log(
      chalk.green.bold(
        `✔ express server started on port http://localhost:${process.env.PORT}`
      )
    );
    console.log(
      chalk.magenta.bold(
        `✔ apollo server started on port http://localhost:${process.env.PORT}${apolloServer.graphqlPath}`
      )
    );
  });
};

main().catch((err) => {
  console.error(err);
});
