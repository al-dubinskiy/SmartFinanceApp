import {
  database,
  getGoalsCollection,
  getTransactionsCollection,
} from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Goal } from '../../database/models/Goal';
import transactionService from './transaction.service';
import categoryService from './category.service';

export interface CreateGoalDTO {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: number | null;
  icon: string;
  color: string;
}

export interface UpdateGoalDTO {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: number | null;
  icon?: string;
  color?: string;
  isCompleted?: boolean;
}

class GoalService {
  // Создать цель
  async createGoal(data: CreateGoalDTO): Promise<Goal> {
    return await database.write(async () => {
      const goals = getGoalsCollection();
      return await goals.create((goal: any) => {
        goal.name = data.name;
        goal.targetAmount = data.targetAmount;
        goal.currentAmount = data.currentAmount;
        goal.deadline = data.deadline;
        goal.icon = data.icon;
        goal.color = data.color;
        goal.isCompleted = false;
        goal.createdAt = Date.now();
        goal.updatedAt = Date.now();
      });
    });
  }

  // Обновить цель
  async updateGoal(id: string, data: UpdateGoalDTO): Promise<Goal> {
    return await database.write(async () => {
      const goals = getGoalsCollection();
      const goal = await goals.find(id);

      return await goal.update((record: any) => {
        if (data.name !== undefined) record.name = data.name;
        if (data.targetAmount !== undefined)
          record.targetAmount = data.targetAmount;
        if (data.currentAmount !== undefined)
          record.currentAmount = data.currentAmount;
        if (data.deadline !== undefined) record.deadline = data.deadline;
        if (data.icon !== undefined) record.icon = data.icon;
        if (data.color !== undefined) record.color = data.color;
        if (data.isCompleted !== undefined)
          record.isCompleted = data.isCompleted;
        record.updatedAt = Date.now();
      });
    });
  }

  // Получить все активные цели
  async getActiveGoals() {
    const goals = getGoalsCollection();
    return await goals
      .query(Q.where('is_completed', false), Q.sortBy('created_at', Q.desc))
      .fetch();
  }

  // Получить завершенные цели
  async getCompletedGoals() {
    const goals = getGoalsCollection();
    return await goals
      .query(Q.where('is_completed', true), Q.sortBy('created_at', Q.desc))
      .fetch();
  }

  // Получить цель по ID
  async getGoalById(id: string) {
    const goals = getGoalsCollection();
    return await goals.find(id);
  }

  // Обновить сумму накоплений (с созданием транзакции расхода)
  async addToGoal(id: string, amount: number, note?: string, isCreateTransaction?: boolean) {
    return await database.write(async () => {
      const goals = getGoalsCollection();
      const goal = await goals.find(id);
      const newAmount = goal.currentAmount + amount;
      const isCompleted = newAmount >= goal.targetAmount;

      if (isCreateTransaction) {
        // Получаем категорию "Накопления"
        let savingsCategory = await categoryService.getCategoryByName('Накопления');
        
        if (!savingsCategory) {
          savingsCategory = await categoryService.createCategory({
            name: 'Накопления',
            type: 'expense',
            icon: 'piggy-bank',
            color: '#9B59B6',
            order: 999,
          });
        }
        
        // Создаем транзакцию расхода с привязкой к ID цели
        const transactions = getTransactionsCollection();

        await transactions.create((transaction: any) => {
          transaction.amount = amount;
          transaction.type = 'expense';
          transaction.categoryId = savingsCategory.id;
          transaction.note = note || `Пополнение цели "${goal.name}" на сумму ${amount} ₽`;
          transaction.date = Date.now();
          transaction.isRecurring = false;
          transaction.recurringType = null;
          transaction.location = null;
          transaction.goalId = id;
          
        });
      }
      
      return await goal.update((record: any) => {
        record.currentAmount = Math.min(newAmount, goal.targetAmount);
        record.isCompleted = isCompleted;
        record.updatedAt = Date.now();
      });
    });
  }

  // Удалить цель
  async deleteGoal(id: string) {
    return await database.write(async () => {
      const goals = getGoalsCollection();
      const goal = await goals.find(id);
      await goal.destroyPermanently();
    });
  }
}

export default new GoalService();
