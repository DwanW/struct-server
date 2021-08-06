import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ReviewVote } from "./ReviewVote";
import { Story } from "./Story";
import { User } from "./User";

@ObjectType({ description: "review model" })
@Entity()
export class Review extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  text!: string;

  // positive, negative, neutral
  @Field()
  @Column()
  type!: string;

  @Field()
  @Column("int", { default: 0 })
  helpful_score: number;

  @Field()
  @Column("int", { default: 0 })
  funny_score: number;

  @Field()
  @Column("int", { default: 0 })
  unhelpful_score: number;

  @Field()
  @Column()
  userId: number;

  @Field()
  @Column()
  storyId: number;

  @Field(() => Int, { nullable: true })
  reviewVoteStatus: number | null; //1, 0, -1 or null

  @Field(() => String)
  @CreateDateColumn({ type: "date" })
  createdAt: Date = new Date();

  @Field(() => String)
  @UpdateDateColumn({ type: "date" })
  updatedAt: Date = new Date();

  //relationship
  @Field(() => User)
  @ManyToOne(() => User, (user) => user.reviews, { onDelete: "CASCADE" })
  user: User;

  @Field(() => Story)
  @ManyToOne(() => Story, (story) => story.reviews, { onDelete: "CASCADE" })
  story: Story;

  @OneToMany(() => ReviewVote, (review_vote) => review_vote.review)
  review_votes: ReviewVote[];
}
