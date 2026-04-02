import {
  database,
  getTransactionsCollection,
  getCategoriesCollection,
  getBudgetsCollection,
} from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Transaction } from '../../database/models/Transaction';

export interface CreateTransactionDTO {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  note?: string;
  date: number;
  isRecurring?: boolean;
  recurringType?: string | null;
  location?: string | null;
}

class TransactionService {
  // Создать транзакцию
  async createTransaction(data: CreateTransactionDTO): Promise<Transaction> {
    return await database.write(async () => {
      const transactions = getTransactionsCollection();
      const existingCount = await transactions.query().fetch();
      //   const budgets = await database.get('budgets').query().fetch();
      //  for (const item of [...budgets]) {
      //   await item.destroyPermanently();
      // }
      return await transactions.create((transaction: any) => {
        transaction.amount = data.amount;
        transaction.type = data.type;
        transaction.categoryId = data.categoryId;
        transaction.note = data.note || '';
        transaction.date = data.date;
        transaction.isRecurring = data.isRecurring || false;
        transaction.recurringType = data.recurringType || null;
        transaction.location = data.location || null;
        transaction.attachments = [];
        // transaction.createdAt = Date.now();
        // transaction.updatedAt = Date.now();
      });
    });
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const transactions = getTransactionsCollection();
    return await transactions.query().fetch();
  }
  async getTransactionById(id: string) {
    const transactions = getTransactionsCollection();
    return await transactions.find(id);
  }
  // Получить транзакции за период
  async getTransactionsByPeriod(
    startDate: number,
    endDate: number,
    type?: 'expense' | 'income',
  ) {
    const transactions = getTransactionsCollection();

    // Нормализуем даты
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);

    let query = transactions.query(
      Q.where(
        'date',
        Q.between(normalizedStartDate.getTime(), normalizedEndDate.getTime()),
      ),
      Q.sortBy('date', Q.desc),
    );

    // Добавляем фильтр по типу, если указан
    if (type) {
      query = query.filter(Q.where('type', '==', type));
    }

    const result = await query.fetch();

    // Дедупликация по id
    const uniqueById = new Map();
    result.forEach(t => {
      if (!uniqueById.has(t.id)) {
        uniqueById.set(t.id, t);
      }
    });

    return Array.from(uniqueById.values());
  }

  // Получить транзакции по категории
  async getTransactionsByCategory(categoryId: string, limit: number = 50) {
    const transactions = getTransactionsCollection();
    return await transactions
      .query(
        Q.where('category_id', categoryId),
        Q.sortBy('date', Q.desc),
        Q.take(limit),
      )
      .fetch();
  }

  // Получить последние транзакции
  async getRecentTransactions(limit: number = 20) {
    const transactions = getTransactionsCollection();
    return await transactions
      .query(Q.sortBy('date', Q.desc), Q.take(limit))
      .fetch();
  }

  // Получить статистику за период
  async getStatistics(startDate: number, endDate: number) {
    const transactions = await this.getTransactionsByPeriod(startDate, endDate);

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((t: any) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
      }
    });

    // Получаем названия категорий
    const categories = await getCategoriesCollection().query().fetch();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const categoryStats = Object.entries(byCategory).map(([id, amount]) => ({
      categoryId: id,
      categoryName: categoryMap.get(id)?.name || 'Unknown',
      categoryIcon: categoryMap.get(id)?.icon || 'help',
      categoryColor: categoryMap.get(id)?.color || '#95A5A6',
      amount,
    }));

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategory: categoryStats,
      transactionCount: transactions.length,
    };
  }

  // Удалить транзакцию
  async deleteTransaction(id: string) {
    return await database.write(async () => {
      const transactions = getTransactionsCollection();
      const transaction = await transactions.find(id);
      await transaction.destroyPermanently();
    });
  }

  // Обновить транзакцию
async updateTransaction(id: string, data: Partial<CreateTransactionDTO>) {
  return await database.write(async () => {
    const transactions = getTransactionsCollection();
    const transaction = await transactions.find(id);
    console.log('sfsfsdf', data)
    return await transaction.update((record: any) => {
      console.log('dfsdf', record)
      if (data.amount !== undefined) record.amount = data.amount;
      if (data.type !== undefined) record.type = data.type;
      if (data.categoryId !== undefined) record.categoryId = data.categoryId;
      if (data.note !== undefined) record.note = data.note;
      if (data.date !== undefined) record.date = data.date;
      if (data.location !== undefined) record.location = data.location;
      if (data.isRecurring !== undefined) record.isRecurring = data.isRecurring;
      if (data.recurringType !== undefined) record.recurringType = data.recurringType;
      record.updatedAt = Date.now();
    });
  });
}

  // Получить баланс на определенную дату
  async getBalanceUntilDate(date: number) {
    const transactions = getTransactionsCollection();
    const allTransactions = await transactions
      .query(Q.where('date', Q.lte(date)), Q.sortBy('date', Q.asc))
      .fetch();

    let balance = 0;
    allTransactions.forEach((t: any) => {
      if (t.type === 'income') {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
    });

    return balance;
  }

  // Добавьте метод для получения общего баланса
  async getTotalBalance(): Promise<number> {
    const transactions = getTransactionsCollection();
    const allTransactions = await transactions.query().fetch();

    let balance = 0;
    for (const t of allTransactions) {
      const raw = t._raw || t;
      if (raw.type === 'income') {
        balance += raw.amount;
      } else {
        balance -= raw.amount;
      }
    }
    return balance;
  }
}

export default new TransactionService();
