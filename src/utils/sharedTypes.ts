import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class S3SignResponse {
  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  signedS3url?: string;

  @Field(() => String, { nullable: true })
  obj_url?: string;
}
