import { database, getGoalsCollection } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Goal } from '../../database/models/Goal';

export interface CreateGoalDTO {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: number | null;
  icon: string;
  color: string;
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

  // Получить все активные цели
  async getActiveGoals() {
    const goals = getGoalsCollection();
    return await goals
      .query(
        Q.where('is_completed', false),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();
  }

  // Получить завершенные цели
  async getCompletedGoals() {
    const goals = getGoalsCollection();
    return await goals
      .query(
        Q.where('is_completed', true),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();
  }

  // Обновить сумму накоплений
  async addToGoal(id: string, amount: number) {
    return await database.write(async () => {
      const goals = getGoalsCollection();
      const goal = await goals.find(id);
      
      const newAmount = goal.currentAmount + amount;
      const isCompleted = newAmount >= goal.targetAmount;
      
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