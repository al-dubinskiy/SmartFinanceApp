import { Model } from '@nozbe/watermelondb';
import { field, text, json, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class Transaction extends Model {
  static table = 'transactions';

  @field('amount') amount!: number;
  @text('type') type!: 'income' | 'expense';
  @field('category_id') categoryId!: string;
  @text('note') note!: string;
  @field('date') date!: number;
  @field('is_recurring') isRecurring!: boolean;
  @text('recurring_type') recurringType!: string | null;
  @text('location') location!: string | null;
  // @json('attachments', () => []) attachments!: any[];

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('categories', 'category_id') category!: any;
}