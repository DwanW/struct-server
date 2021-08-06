import { IsEmail, Length } from "class-validator";
import { InputType, Field } from "type-graphql";

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string;
  @Field()
  @Length(4, 100, {
    message: "username length must be between 4 to 100 characters",
  })
  username: string;
  @Field()
  @Length(6, 100, {
    message: "password length must be between 6 to 100 characters",
  })
  password: string;
}
