import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Papa from 'papaparse';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';

interface BackupData {
  version: number;
  timestamp: number;
  data: {
    categories: any[];
    transactions: any[];
    budgets: any[];
    goals: any[];
  };
}

class BackupService {
  // ===== EXPORT =====
  
  // Экспорт всех данных в JSON
  async exportToJSON(): Promise<string> {
    try {
      // Получаем все данные из БД
      const categories = await database.get('categories').query().fetch();
      const transactions = await database.get('transactions').query().fetch();
      const budgets = await database.get('budgets').query().fetch();
      const goals = await database.get('goals').query().fetch();

      const backupData: BackupData = {
        version: 1,
        timestamp: Date.now(),
        data: {
          categories: categories.map(c => c._raw),
          transactions: transactions.map(t => t._raw),
          budgets: budgets.map(b => b._raw),
          goals: goals.map(g => g._raw),
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `SmartFinance_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(filePath, jsonString, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // Экспорт транзакций в CSV
  async exportToCSV(): Promise<string> {
    try {
      const transactions = await database.get('transactions')
        .query(Q.sortBy('date', Q.desc))
        .fetch();
      
      // Получаем категории для маппинга
      const categories = await database.get('categories').query().fetch();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Форматируем данные для CSV
      const csvData = transactions.map(t => ({
        Date: new Date(t.date).toISOString().split('T')[0],
        Type: t.type === 'income' ? 'Income' : 'Expense',
        Amount: t.amount,
        Category: categoryMap.get(t.categoryId)?.name || 'Unknown',
        Note: t.note || '',
        Location: t.location || '',
      }));

      const csvString = Papa.unparse(csvData);
      const fileName = `SmartFinance_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(filePath, csvString, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  // Поделиться файлом
  async shareFile(filePath: string) {
    try {
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/json',
        title: 'Share Backup',
      });
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  }

  // ===== IMPORT =====
  
  // Импорт из JSON файла
  async importFromJSON(fileUri: string): Promise<{ success: boolean; message: string }> {
    try {
      // Читаем файл
      const fileContent = await RNFS.readFile(fileUri, 'utf8');
      const backupData: BackupData = JSON.parse(fileContent);

      // Валидация версии
      if (backupData.version !== 1) {
        return { success: false, message: 'Unsupported backup version' };
      }

      // Проверяем наличие данных
      if (!backupData.data) {
        return { success: false, message: 'Invalid backup file format' };
      }

      // Начинаем транзакцию БД
      await database.write(async () => {
        // Очищаем существующие данные
        const transactions = await database.get('transactions').query().fetch();
        const budgets = await database.get('budgets').query().fetch();
        const goals = await database.get('goals').query().fetch();
        
        // Удаляем все транзакции
        for (const t of transactions) {
          await t.destroyPermanently();
        }
        
        // Удаляем все бюджеты
        for (const b of budgets) {
          await b.destroyPermanently();
        }
        
        // Удаляем все цели
        for (const g of goals) {
          await g.destroyPermanently();
        }
        
        // Импортируем категории (обновляем существующие)
        const existingCategories = await database.get('categories').query().fetch();
        const categoryMap = new Map(existingCategories.map(c => [c.name, c]));
        
        for (const catData of backupData.data.categories) {
          const existing = categoryMap.get(catData.name);
          if (existing) {
            // Обновляем существующую категорию
            await existing.update((record: any) => {
              record.icon = catData.icon;
              record.color = catData.color;
              record.order = catData.order;
              record.updatedAt = Date.now();
            });
          } else {
            // Создаем новую категорию
            await database.get('categories').create((record: any) => {
              record.name = catData.name;
              record.type = catData.type;
              record.icon = catData.icon;
              record.color = catData.color;
              record.parentId = catData.parentId || '';
              record.order = catData.order;
              record.isActive = catData.isActive;
              record.createdAt = catData.createdAt;
              record.updatedAt = catData.updatedAt;
            });
          }
        }
        
        // Импортируем транзакции
        for (const tData of backupData.data.transactions) {
          await database.get('transactions').create((record: any) => {
            record.amount = tData.amount;
            record.type = tData.type;
            record.categoryId = tData.category_id;
            record.note = tData.note || '';
            record.date = tData.date;
            record.isRecurring = tData.is_recurring || false;
            record.recurringType = tData.recurring_type || null;
            record.location = tData.location || null;
            record.attachments = tData.attachments || [];
            record.createdAt = tData.created_at;
            record.updatedAt = tData.updated_at;
          });
        }
        
        // Импортируем бюджеты
        for (const bData of backupData.data.budgets) {
          await database.get('budgets').create((record: any) => {
            record.categoryId = bData.category_id;
            record.amount = bData.amount;
            record.period = bData.period;
            record.month = bData.month;
            record.year = bData.year;
            record.isActive = bData.is_active;
            record.createdAt = bData.created_at;
            record.updatedAt = bData.updated_at;
          });
        }
        
        // Импортируем цели
        for (const gData of backupData.data.goals) {
          await database.get('goals').create((record: any) => {
            record.name = gData.name;
            record.targetAmount = gData.target_amount;
            record.currentAmount = gData.current_amount;
            record.deadline = gData.deadline;
            record.icon = gData.icon;
            record.color = gData.color;
            record.isCompleted = gData.is_completed;
            record.createdAt = gData.created_at;
            record.updatedAt = gData.updated_at;
          });
        }
      });

      return { success: true, message: 'Backup restored successfully' };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, message: 'Failed to import backup' };
    }
  }

  // Импорт CSV из банка
  async importCSV(fileUri: string, mapping: CSVColumnMapping): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const fileContent = await RNFS.readFile(fileUri, 'utf8');
      const result = Papa.parse(fileContent, { header: true });
      
      if (result.errors.length > 0) {
        return { success: false, message: 'Invalid CSV format' };
      }

      const categories = await database.get('categories').query().fetch();
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));

      let importedCount = 0;
      const now = Date.now();

      await database.write(async () => {
        for (const row of result.data) {
          // Маппим колонки
          const dateValue = row[mapping.dateColumn];
          const amountValue = parseFloat(row[mapping.amountColumn]);
          const type = mapping.typeColumn ? row[mapping.typeColumn] : (amountValue >= 0 ? 'income' : 'expense');
          const description = row[mapping.descriptionColumn] || '';
          
          // Определяем категорию
          let category = categoryMap.get(mapping.defaultCategory?.toLowerCase() || 'other');
          
          // Пытаемся найти категорию по описанию (простая логика)
          if (!category && description) {
            for (const [catName, cat] of categoryMap) {
              if (description.toLowerCase().includes(catName)) {
                category = cat;
                break;
              }
            }
          }
          
          if (!category) {
            category = categoryMap.get('other');
          }
          
          if (!category) continue;

          // Создаем транзакцию
          await database.get('transactions').create((record: any) => {
            record.amount = Math.abs(amountValue);
            record.type = type === 'income' || amountValue > 0 ? 'income' : 'expense';
            record.categoryId = category.id;
            record.note = description;
            record.date = new Date(dateValue).getTime();
            record.isRecurring = false;
            record.location = null;
            record.attachments = [];
            record.createdAt = now;
            record.updatedAt = now;
          });
          
          importedCount++;
        }
      });

      return { success: true, message: `Imported ${importedCount} transactions`, count: importedCount };
    } catch (error) {
      console.error('CSV import failed:', error);
      return { success: false, message: 'Failed to import CSV' };
    }
  }
}

export interface CSVColumnMapping {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  typeColumn?: string;
  defaultCategory: string;
}

export default new BackupService();