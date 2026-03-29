import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { Category, Transaction, Budget, Goal } from './models';

// Создаем адаптер с OP-SQLite (полностью совместим!)
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'smartfinance',
  
  // Опционально: миграции будут добавлены позже
  // migrations,
  
  // Для отладки
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
  
  // Дополнительные опции для OP-SQLite (опционально)
  // synchronous: true, // Синхронный режим для лучшей производительности
});

// Создаем базу данных
export const database = new Database({
  adapter,
  modelClasses: [Category, Transaction, Budget, Goal],
  actionsEnabled: true, // Включаем для использования actions
});

// Helper функции для работы с БД
export const getCategoriesCollection = () => database.get<Category>('categories');
export const getTransactionsCollection = () => database.get<Transaction>('transactions');
export const getBudgetsCollection = () => database.get<Budget>('budgets');
export const getGoalsCollection = () => database.get<Goal>('goals');

// Экспортируем типы
export type { Category, Transaction, Budget, Goal };