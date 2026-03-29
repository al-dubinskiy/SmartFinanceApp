import { database, getBudgetsCollection, getTransactionsCollection, getCategoriesCollection } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Budget } from '../../database/models/Budget';
import { startOfMonth, endOfMonth, getMonth, getYear, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

export interface CreateBudgetDTO {
  categoryId: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  month?: number;
  year?: number;
}

class BudgetService {
  // Создать бюджет
  async createBudget(data: CreateBudgetDTO): Promise<Budget> {
    return await database.write(async () => {
      const budgets = getBudgetsCollection();
      return await budgets.create((budget: any) => {
        budget.categoryId = data.categoryId;
        budget.amount = data.amount;
        budget.period = data.period;
        budget.month = data.month !== undefined ? data.month : null;
        budget.year = data.year !== undefined ? data.year : null;
        budget.isActive = true;
        budget.createdAt = Date.now();
        budget.updatedAt = Date.now();
      });
    });
  }

  // Получить бюджет на текущий месяц
  async getCurrentMonthBudgets() {
    const now = new Date();
    const month = getMonth(now); // 0-11
    const year = getYear(now);
    
    const budgets = getBudgetsCollection();
    return await budgets
      .query(
        Q.where('period', 'monthly'),
        Q.where('month', month),
        Q.where('year', year),
        Q.where('is_active', true)
      )
      .fetch();
  }

  // Получить прогресс по бюджетам
  async getBudgetsProgress() {
    const now = new Date();
    let start: number, end: number;
    
    // Определяем период в зависимости от типа бюджета
    // Для простоты пока работаем только с месячными бюджетами
    start = startOfMonth(now).getTime();
    end = endOfMonth(now).getTime();
    
    const budgets = await this.getCurrentMonthBudgets();
    const transactions = getTransactionsCollection();
    const categories = await getCategoriesCollection().query().fetch();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const progress = await Promise.all(
      budgets.map(async (budget: any) => {
        const spent = await transactions
          .query(
            Q.where('category_id', budget.categoryId),
            Q.where('type', 'expense'),
            Q.where('date', Q.between(start, end))
          )
          .fetch()
          .then(ts => ts.reduce((sum, t: any) => sum + t.amount, 0));

        const percentage = (spent / budget.amount) * 100;
        const category = categoryMap.get(budget.categoryId);
        
        return {
          budget,
          category: {
            id: category?.id,
            name: category?.name,
            icon: category?.icon,
            color: category?.color,
          },
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentage: Math.min(percentage, 100),
          status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'good',
        };
      })
    );

    return progress;
  }

  // Получить все бюджеты
  async getAllBudgets() {
    const budgets = getBudgetsCollection();
    return await budgets
      .query(Q.where('is_active', true))
      .fetch();
  }

  // Обновить бюджет
  async updateBudget(id: string, data: Partial<CreateBudgetDTO>) {
    return await database.write(async () => {
      const budgets = getBudgetsCollection();
      const budget = await budgets.find(id);
      return await budget.update((record: any) => {
        if (data.amount !== undefined) record.amount = data.amount;
        if (data.period !== undefined) record.period = data.period;
        if (data.month !== undefined) record.month = data.month;
        if (data.year !== undefined) record.year = data.year;
        record.updatedAt = Date.now();
      });
    });
  }

  // Удалить бюджет
  async deleteBudget(id: string) {
    return await database.write(async () => {
      const budgets = getBudgetsCollection();
      const budget = await budgets.find(id);
      await budget.destroyPermanently();
    });
  }
}

export default new BudgetService();