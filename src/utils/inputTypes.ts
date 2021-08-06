import { Field, InputType } from "type-graphql";

@InputType()
export class CreateStoryInput {
  @Field()
  title: string;

  @Field()
  overview?: string;
}


@InputType()
export class CreateSubStoryInput {
  @Field()
  title: string;

  @Field()
  text: string;
}
