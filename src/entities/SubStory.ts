import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Story } from "./Story";

@ObjectType({ description: "sub-story model" })
@Entity()
export class SubStory extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column("numeric")
  order_index!: number;

  @Field()
  @Column()
  storyId: number;

  @Field(() => String)
  @CreateDateColumn({ type: "date" })
  createdAt: Date = new Date();

  @Field(() => String)
  @UpdateDateColumn({ type: "date" })
  updatedAt: Date = new Date();

  //relationship
  @Field(() => Story)
  @ManyToOne(() => Story, (story) => story.substories, {onDelete: "CASCADE"}) 
  story: Story;
}
