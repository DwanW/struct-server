import { User } from "../entities/User";
import {
  Resolver,
  Query,
  Mutation,
  ObjectType,
  Field,
  Arg,
  Ctx,
  FieldResolver,
  Root,
  UseMiddleware,
  Int,
} from "type-graphql";
// import { MyContext } from "../types";
import { RegisterInput } from "../utils/RegisterInput";
import argon from "argon2";
import { MyContext } from "../types";
import {
  COOKIE_NAME,
  FORGET_PASSWORD_PREFIX,
  S3BUCKET_NAME,
  S3SIGN_EXPIRE_TIME,
} from "../constants";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../s3";
import { isAuth } from "../middleware/isAuth";
import { S3SignResponse } from "../utils/sharedTypes";

@ObjectType()
class AuthResponse {
  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => User, { nullable: true })
  user?: User;
}

// resolvers for apollo graphql server
@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // hide email to users other than the owner
    if (req.session.userId === user.id) {
      return user.email;
    }

    return "";
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Query(() => User, { nullable: true })
  getUserById(@Arg("id", () => Int) id: number): Promise<User | undefined> {
    return User.findOne(id);
  }

  @Mutation(() => AuthResponse)
  async register(
    @Arg("options", () => RegisterInput) options: RegisterInput,
    @Ctx() { req }: MyContext
  ): Promise<AuthResponse> {
    const hashedPassword = await argon.hash(options.password);
    let user;
    console.log(options);

    try {
      const newUser = User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      });

      const result = await User.save(newUser);
      user = result;
    } catch (err) {
      console.log("createUser error: ", err);
      return { error: "Failed to create account" };
    }

    req.session.userId = user?.id;

    return {
      user,
    };
  }

  @Mutation(() => AuthResponse)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<AuthResponse> {
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return {
        error: "User does not exist",
      };
    }
    const valid = await argon.verify(user.password, password);
    if (!valid) {
      return {
        error: "username or password is incorrect",
      };
    }

    req.session.userId = user.id;
    return {
      user,
    };
  }

  @Mutation(() => AuthResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword", () => String)
    newPassword: string,
    @Ctx() { redis, req }: MyContext
  ) {
    const forgetPasswordKey = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(forgetPasswordKey);

    if (!userId) {
      return {
        error: "token expired",
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);

    if (!user) {
      return {
        error: "user no longer exist",
      };
    }

    await User.update(
      { id: userIdNum },
      { password: await argon.hash(newPassword) }
    );

    await redis.del(forgetPasswordKey);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // the email is not in the db
      return true;
    }

    const token = v4();
    console.log({ token });

    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, "ex", 1000 * 3600); //change this to the appropriate amount

    await sendEmail(
      email,
      `<div>A password reset request was received, click the link below to reset your password.</div>
      <a href="${process.env.CORS_ORIGIN}/auth/change-password/${token}">reset password</a>`
    );
    return true;
  }

  @Mutation(() => User, { nullable: true })
  async updateUserAbout(
    @Arg("about", () => String) about: string,
    @Ctx() { req }: MyContext
  ): Promise<User | null> {
    if (!req.session.userId) {
      return null;
    }

    const user = await User.findOne(req.session.userId);
    if (!user) {
      return null;
    }
    user.about = about;
    const result = await user.save();
    return result;
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
        }
        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async deleteAccount(@Ctx() { req }: MyContext): Promise<boolean> {
    if (!req.session.userId) {
      return false;
    }
    const userToDelete = await User.findOne(req.session.userId);
    if (!userToDelete) {
      return false;
    }

    await User.delete({ id: req.session.userId });
    return true;
  }

  @Mutation(() => S3SignResponse)
  @UseMiddleware(isAuth)
  async signS3UserAvatar(
    @Arg("filename", () => String) filename: string,
    @Arg("filetype", () => String) filetype: string
  ) {
    const s3Params = {
      Bucket: S3BUCKET_NAME,
      Key: `avatar/${filename}`,
      ContentType: filetype,
      ACL: "public-read",
    };

    const signedS3url = await getSignedUrl(s3, new PutObjectCommand(s3Params), {
      expiresIn: S3SIGN_EXPIRE_TIME,
    });

    const object_url = `https//${S3BUCKET_NAME}.s3.amazonaws.com/avatar/${filename}`;

    return {
      error: null,
      signedS3url: signedS3url,
      obj_url: object_url,
    };
  }

  @Mutation(() => User, { nullable: true })
  async updateUserAvatar(
    @Arg("avatar_url", () => String) avatar_url: string,
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<User | null> {
    if (!req.session.userId) {
      return null;
    }
    let user;
    if (id === req.session.userId) {
      user = await User.findOne(req.session.userId);
    }

    if (!user) {
      return null;
    }
    
    user.avatar_url = avatar_url;
    const result = await user.save();
    return result;
  }
}
