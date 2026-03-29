import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class Budget extends Model {
  static table = 'budgets';

  @field('category_id') categoryId!: string;
  @field('amount') amount!: number;
  @text('period') period!: 'monthly' | 'weekly' | 'yearly';
  @field('month') month!: number | null;
  @field('year') year!: number | null;
  @field('is_active') isActive!: boolean;

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('categories', 'category_id') category!: any;
}