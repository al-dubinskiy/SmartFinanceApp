import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Категории транзакций
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' }, // 'income' | 'expense'
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'parent_id', type: 'string', isOptional: true },
        { name: 'order', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // Транзакции
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'type', type: 'string' }, // 'income' | 'expense'
        { name: 'category_id', type: 'string' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
        { name: 'is_recurring', type: 'boolean' },
        { name: 'recurring_type', type: 'string', isOptional: true }, // 'daily' | 'weekly' | 'monthly' | 'yearly'
        { name: 'location', type: 'string', isOptional: true },
        // { name: 'attachments', type: 'string', isOptional: true }, // JSON string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // Бюджеты
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'category_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'period', type: 'string' }, // 'monthly' | 'weekly' | 'yearly'
        { name: 'month', type: 'number', isOptional: true }, // 0-11 для monthly
        { name: 'year', type: 'number', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // Финансовые цели
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'target_amount', type: 'number' },
        { name: 'current_amount', type: 'number' },
        { name: 'deadline', type: 'number', isOptional: true },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'is_completed', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // Регулярные платежи
    tableSchema({
      name: 'recurring_payments',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'category_id', type: 'string' },
        { name: 'frequency', type: 'string' }, // 'daily' | 'weekly' | 'monthly' | 'yearly'
        { name: 'day_of_month', type: 'number', isOptional: true },
        { name: 'day_of_week', type: 'number', isOptional: true },
        { name: 'month_of_year', type: 'number', isOptional: true },
        { name: 'next_date', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});