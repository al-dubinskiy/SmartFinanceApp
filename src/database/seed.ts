import { database } from './index';
import { Q } from '@nozbe/watermelondb';

// Стандартные категории расходов
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'food', color: '#FF6B6B', type: 'expense', order: 1 },
  { name: 'Groceries', icon: 'cart', color: '#4ECDC4', type: 'expense', order: 2 },
  { name: 'Transport', icon: 'car', color: '#45B7D1', type: 'expense', order: 3 },
  { name: 'Entertainment', icon: 'movie', color: '#96CEB4', type: 'expense', order: 4 },
  { name: 'Shopping', icon: 'shopping', color: '#FFEAA7', type: 'expense', order: 5 },
  { name: 'Bills & Utilities', icon: 'flash', color: '#DDA0DD', type: 'expense', order: 6 },
  { name: 'Healthcare', icon: 'hospital', color: '#98D8C8', type: 'expense', order: 7 },
  { name: 'Education', icon: 'school', color: '#F7DC6F', type: 'expense', order: 8 },
  { name: 'Gifts', icon: 'gift', color: '#E67E22', type: 'expense', order: 9 },
  { name: 'Other', icon: 'dots-horizontal', color: '#95A5A6', type: 'expense', order: 10 },
];

// Стандартные категории доходов
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'cash', color: '#2ECC71', type: 'income', order: 1 },
  { name: 'Freelance', icon: 'laptop', color: '#3498DB', type: 'income', order: 2 },
  { name: 'Investments', icon: 'trending-up', color: '#9B59B6', type: 'income', order: 3 },
  { name: 'Business', icon: 'store', color: '#F1C40F', type: 'income', order: 4 },
  { name: 'Rental', icon: 'home', color: '#1ABC9C', type: 'income', order: 5 },
  { name: 'Gifts', icon: 'gift', color: '#E67E22', type: 'income', order: 6 },
  { name: 'Refunds', icon: 'cash-refund', color: '#E74C3C', type: 'income', order: 7 },
  { name: 'Other', icon: 'dots-horizontal', color: '#95A5A6', type: 'income', order: 8 },
];

export async function seedDefaultCategories() {
  const categoriesCollection = database.get('categories');
  
  // Проверяем, есть ли уже категории
  const existingCount = await categoriesCollection.query().fetchCount();
  
  if (existingCount === 0) {
    await database.write(async () => {
      // Создаем категории расходов
      for (const category of DEFAULT_EXPENSE_CATEGORIES) {
        await categoriesCollection.create((record: any) => {
          record.name = category.name;
          record.type = category.type;
          record.icon = category.icon;
          record.color = category.color;
          record.order = category.order;
          record.isActive = true;
          record.parentId = '';
          // record.createdAt = Date.now();
          // record.updatedAt = Date.now();
        });
      }
      
      // Создаем категории доходов
      for (const category of DEFAULT_INCOME_CATEGORIES) {
        await categoriesCollection.create((record: any) => {
          record.name = category.name;
          record.type = category.type;
          record.icon = category.icon;
          record.color = category.color;
          record.order = category.order;
          record.isActive = true;
          record.parentId = '';
          // record.createdAt = Date.now();
          // record.updatedAt = Date.now();
        });
      }
    });
    
    console.log('Default categories seeded successfully');
  }
}