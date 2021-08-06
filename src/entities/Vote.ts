import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Story } from "./Story";
import { User } from "./User";

@Entity()
export class Vote extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  storyId: number;

  //relationship
  @ManyToOne(() => User, (user) => user.votes, {onDelete: "CASCADE"})
  user: User;

  @ManyToOne(() => Story, (story) => story.votes, {onDelete: "CASCADE"})
  story: Story;
}
