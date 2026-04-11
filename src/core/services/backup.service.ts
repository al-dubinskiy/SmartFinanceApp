import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Papa from 'papaparse';
import { database, getBudgetsCollection, getCategoriesCollection, getGoalsCollection, getTransactionsCollection } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Platform } from 'react-native';

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
  async exportToJSON(): Promise<{ fileName: string; savePath: string }> {
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
      const fileName = `SmartFinance_Backup_${
        new Date().toISOString().split('T')[0]
      }.json`;
      let savePath: string;
      if (Platform.OS === 'android') {
        savePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      } else {
        savePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      await RNFS.writeFile(savePath, jsonString, 'utf8');

      return { fileName, savePath };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // Экспорт транзакций в CSV
  async exportToCSV(): Promise<string> {
    try {
      const transactions = await database
        .get('transactions')
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
      const fileName = `SmartFinance_Transactions_${
        new Date().toISOString().split('T')[0]
      }.csv`;
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
    console.log('📥 Начало импорта данных из:', fileUri);
    
    // Читаем файл
    const fileContent = await RNFS.readFile(fileUri, 'utf8');
    const backupData: BackupData = JSON.parse(fileContent);

    // Валидация версии
    if (backupData.version !== 1) {
      return { success: false, message: 'Неподдерживаемая версия резервной копии' };
    }

    if (!backupData.data) {
      return { success: false, message: 'Неверный формат файла резервной копии' };
    }

    console.log(`📊 Импортируемые данные: категорий ${backupData.data.categories.length}, транзакций ${backupData.data.transactions.length}`);

    // Очищаем существующие данные
    await database.write(async () => {
      const existingTransactions = await getTransactionsCollection().query().fetch();
      const existingBudgets = await getBudgetsCollection().query().fetch();
      const existingGoals = await getGoalsCollection().query().fetch();
      const existingCategories = await getCategoriesCollection().query().fetch();
      
      console.log('🗑️ Очистка существующих данных...');
      
      // Удаляем транзакции
      for (const t of existingTransactions) {
        await t.destroyPermanently();
      }
      
      // Удаляем бюджеты
      for (const b of existingBudgets) {
        await b.destroyPermanently();
      }
      
      // Удаляем цели
      for (const g of existingGoals) {
        await g.destroyPermanently();
      }
      
      // Удаляем категории
      for (const c of existingCategories) {
        await c.destroyPermanently();
      }
    });

    // Импортируем категории заново
    console.log('📁 Импорт категорий...');
    const categoryIdMap = new Map<string, string>(); // Старый ID -> Новый ID
    
    await database.write(async () => {
      const categoriesCollection = getCategoriesCollection();
      
      // Сначала импортируем корневые категории (без parent_id)
      const rootCategories = backupData.data.categories.filter(c => !c.parent_id || c.parent_id === '');
      
      for (const catData of rootCategories) {
        const newCategory = await categoriesCollection.create((record: any) => {
          record.name = catData.name;
          record.type = catData.type;
          record.icon = catData.icon;
          record.color = catData.color;
          record.parentId = '';
          record.order = catData.order || 0;
          record.isActive = catData.is_active !== undefined ? catData.is_active : true;
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
        categoryIdMap.set(catData.id, newCategory.id);
      }
      
      // Затем импортируем подкатегории (с parent_id)
      const subCategories = backupData.data.categories.filter(c => c.parent_id && c.parent_id !== '');
      
      for (const catData of subCategories) {
        const newParentId = categoryIdMap.get(catData.parent_id);
        if (newParentId) {
          const newCategory = await categoriesCollection.create((record: any) => {
            record.name = catData.name;
            record.type = catData.type;
            record.icon = catData.icon;
            record.color = catData.color;
            record.parentId = newParentId;
            record.order = catData.order || 0;
            record.isActive = catData.is_active !== undefined ? catData.is_active : true;
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });
          categoryIdMap.set(catData.id, newCategory.id);
        } else {
          console.warn(`⚠️ Родительская категория не найдена для: ${catData.name}`);
        }
      }
    });

    // Обновляем маппинг категорий по имени для транзакций
    const allCategories = await getCategoriesCollection().query().fetch();
    const categoryNameToIdMap = new Map<string, string>();
    for (const cat of allCategories) {
      categoryNameToIdMap.set(cat.name, cat.id);
    }

    // Импортируем транзакции
    console.log('💰 Импорт транзакций...');
    await database.write(async () => {
      const transactionsCollection = getTransactionsCollection();
      
      for (const tData of backupData.data.transactions) {
        // Пытаемся найти категорию по ID из маппинга или по имени
        let categoryId = categoryIdMap.get(tData.category_id);
        
        if (!categoryId && tData.category_name) {
          categoryId = categoryNameToIdMap.get(tData.category_name);
        }
        
        if (!categoryId) {
          // Если категория не найдена, пропускаем транзакцию
          console.warn(`⚠️ Категория не найдена для транзакции: ${tData.note || 'без названия'}`);
          continue;
        }
        
        await transactionsCollection.create((record: any) => {
          record.amount = tData.amount;
          record.type = tData.type;
          record.categoryId = categoryId;
          record.note = tData.note || '';
          record.date = tData.date;
          record.isRecurring = tData.is_recurring || false;
          record.recurringType = tData.recurring_type || null;
          record.location = tData.location || null;
          record.goalId = tData.goal_id || null;
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
      }
    });

    // Импортируем бюджеты
    console.log('📊 Импорт бюджетов...');
    await database.write(async () => {
      const budgetsCollection = getBudgetsCollection();
      
      for (const bData of backupData.data.budgets) {
        let categoryId = categoryIdMap.get(bData.category_id);
        
        if (!categoryId && bData.category_name) {
          categoryId = categoryNameToIdMap.get(bData.category_name);
        }
        
        if (!categoryId) {
          console.warn(`⚠️ Категория не найдена для бюджета`);
          continue;
        }
        
        await budgetsCollection.create((record: any) => {
          record.categoryId = categoryId;
          record.amount = bData.amount;
          record.period = bData.period;
          record.month = bData.month;
          record.year = bData.year;
          record.isActive = bData.is_active !== undefined ? bData.is_active : true;
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
      }
    });

    // Импортируем цели
    console.log('🎯 Импорт целей...');
    await database.write(async () => {
      const goalsCollection = getGoalsCollection();
      
      for (const gData of backupData.data.goals) {
        await goalsCollection.create((record: any) => {
          record.name = gData.name;
          record.targetAmount = gData.target_amount;
          record.currentAmount = gData.current_amount;
          record.deadline = gData.deadline;
          record.icon = gData.icon;
          record.color = gData.color;
          record.isCompleted = gData.is_completed || false;
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
      }
    });

    console.log('✅ Импорт успешно завершен');
    return { success: true, message: 'Резервная копия успешно восстановлена' };
  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
    return { success: false, message: 'Не удалось восстановить данные из резервной копии' };
  }
}

  // Импорт CSV из банка
  async importCSV(
    fileUri: string,
    mapping: CSVColumnMapping,
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const fileContent = await RNFS.readFile(fileUri, 'utf8');
      const result = Papa.parse(fileContent, { header: true });

      if (result.errors.length > 0) {
        return { success: false, message: 'Invalid CSV format' };
      }

      const categories = await database.get('categories').query().fetch();
      const categoryMap = new Map(
        categories.map(c => [c.name.toLowerCase(), c]),
      );

      let importedCount = 0;
      const now = Date.now();

      await database.write(async () => {
        for (const row of result.data) {
          // Маппим колонки
          const dateValue = row[mapping.dateColumn];
          const amountValue = parseFloat(row[mapping.amountColumn]);
          const type = mapping.typeColumn
            ? row[mapping.typeColumn]
            : amountValue >= 0
            ? 'income'
            : 'expense';
          const description = row[mapping.descriptionColumn] || '';

          // Определяем категорию
          let category = categoryMap.get(
            mapping.defaultCategory?.toLowerCase() || 'other',
          );

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
            record.type =
              type === 'income' || amountValue > 0 ? 'income' : 'expense';
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

      return {
        success: true,
        message: `Imported ${importedCount} transactions`,
        count: importedCount,
      };
    } catch (error) {
      console.error('CSV import failed:', error);
      return { success: false, message: 'Failed to import CSV' };
    }
  }
  /**
   * Полная очистка всех таблиц базы данных
   */
  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Начало очистки всех данных...');

      await database.write(async () => {
        // Очищаем транзакции
        const transactions = await getTransactionsCollection().query().fetch();
        console.log(`📊 Удаляется ${transactions.length} транзакций...`);
        for (const t of transactions) {
          await t.destroyPermanently();
        }

        // Очищаем бюджеты
        const budgets = await getBudgetsCollection().query().fetch();
        console.log(`📊 Удаляется ${budgets.length} бюджетов...`);
        for (const b of budgets) {
          await b.destroyPermanently();
        }

        // Очищаем цели
        const goals = await getGoalsCollection().query().fetch();
        console.log(`📊 Удаляется ${goals.length} целей...`);
        for (const g of goals) {
          await g.destroyPermanently();
        }

        // Очищаем категории (кроме системных, если нужно)
        const categories = await getCategoriesCollection().query().fetch();
        console.log(`📊 Удаляется ${categories.length} категорий...`);
        for (const c of categories) {
          await c.destroyPermanently();
        }
      });

      console.log('✅ Все данные успешно очищены');
      return {
        success: true,
        message: 'Все данные успешно очищены',
      };
    } catch (error) {
      console.error('❌ Ошибка при очистке данных:', error);
      return {
        success: false,
        message: 'Не удалось очистить данные',
      };
    }
  }
  /**
   * Полная очистка таблицы со списком транзакций
  */
  async clearAllTransactions(): Promise<{ success: boolean; message: string }> {
    try {
      await database.write(async () => {
        // Очищаем транзакции
        const transactions = await getTransactionsCollection().query().fetch();
        console.log(`📊 Удаляется ${transactions.length} транзакций...`);
        for (const t of transactions) {
          await t.destroyPermanently();
        }
      });

      console.log('✅ Список транзакций успешно очищен');
      return {
        success: true,
        message: 'Список транзакций успешно очищен',
      };
    } catch (error) {
      console.error('❌ Ошибка при очистке списка транзакций:', error);
      return {
        success: false,
        message: 'Не удалось очистить список транзакций ',
      };
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
