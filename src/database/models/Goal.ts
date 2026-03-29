import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class Goal extends Model {
  static table = 'goals';

  @text('name') name!: string;
  @field('target_amount') targetAmount!: number;
  @field('current_amount') currentAmount!: number;
  @field('deadline') deadline!: number | null;
  @text('icon') icon!: string;
  @text('color') color!: string;
  @field('is_completed') isCompleted!: boolean;

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  // Прогресс в процентах
  get progress(): number {
    return (this.currentAmount / this.targetAmount) * 100;
  }

  // Осталось накопить
  get remaining(): number {
    return Math.max(0, this.targetAmount - this.currentAmount);
  }
}