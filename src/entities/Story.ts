import { IsUrl } from "class-validator";
import { Field, ObjectType } from "type-graphql";
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
import { Review } from "./Review";
import { SubStory } from "./SubStory";
import { User } from "./User";
import { Vote } from "./Vote";

@ObjectType({ description: "story model" })
@Entity()
export class Story extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  overview!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  @IsUrl()
  cover_url: string;

  @Field()
  @Column("int", { default: 0 })
  up_vote: number;

  @Field()
  @Column("int", { default: 0 })
  down_vote: number;

  @Field()
  @Column({ default: "draft" })
  status: string;

  @Field()
  @Column({ default: "" })
  tags: string;

  @Field()
  @Column()
  creatorId: number;

  @Field(() => String)
  @CreateDateColumn({ type: "date" })
  createdAt: Date = new Date();

  @Field(() => String)
  @UpdateDateColumn({ type: "date" })
  updatedAt: Date = new Date();

  //relationship
  @Field(() => User)
  @ManyToOne(() => User, (user) => user.stories, { onDelete: "CASCADE" })
  creator: User;

  @OneToMany(() => Vote, (vote) => vote.story)
  votes: Vote[];

  @OneToMany(() => SubStory, (substory) => substory.story)
  substories: SubStory[];

  @OneToMany(() => Review, (review) => review.story)
  reviews: Review[];
}
