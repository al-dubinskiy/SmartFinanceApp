import transactionService from './transaction.service';
import { startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';

export interface DailySpending {
  date: Date;
  amount: number;
  cumulative: number;
  limit: number;
  isOverLimit: boolean;
}

export interface CashFlowPrediction {
  predictedBalance: number;
  daysUntilNegative: number | null;
  recommendedDailyLimit: number;
  riskLevel: 'low' | 'medium' | 'high';
  dailyBreakdown: DailySpending[];
}

class ForecastService {
  // Расчет средней дневной траты на основе истории
  async getAverageDailySpending(daysHistory: number = 30): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysHistory);
    
    const statistics = await transactionService.getStatistics(
      startDate.getTime(),
      endDate.getTime()
    );
    
    // Только расходы
    const dailyAverage = statistics.totalExpense / daysHistory;
    return dailyAverage;
  }

  // Прогнозирование баланса на конец месяца
  async predictEndOfMonthBalance(): Promise<number> {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    // Текущий баланс
    const currentBalance = await transactionService.getBalanceUntilDate(now.getTime());
    
    // Уже потрачено в этом месяце
    const spentThisMonth = await transactionService.getStatistics(
      startOfCurrentMonth.getTime(),
      now.getTime()
    );
    
    // Осталось дней в месяце
    const daysRemaining = differenceInDays(endOfCurrentMonth, now);
    
    // Средняя дневная трата
    const avgDailySpending = await this.getAverageDailySpending(30);
    
    // Прогнозируемые будущие расходы
    const predictedExpenses = avgDailySpending * daysRemaining;
    
    // Прогнозируемые доходы (можно усложнить)
    const avgDailyIncome = 0; // TODO: рассчитать из истории
    
    const predictedBalance = currentBalance - predictedExpenses + (avgDailyIncome * daysRemaining);
    
    return predictedBalance;
  }

  // Прогнозирование кассовых разрывов
  async predictCashFlowGaps(): Promise<CashFlowPrediction> {
    const now = new Date();
    const currentBalance = await transactionService.getBalanceUntilDate(now.getTime());
    const avgDailySpending = await this.getAverageDailySpending(30);
    
    // Рассчитываем, через сколько дней баланс станет отрицательным
    let daysUntilNegative = null;
    if (currentBalance > 0 && avgDailySpending > 0) {
      const days = Math.floor(currentBalance / avgDailySpending);
      daysUntilNegative = days;
    }
    
    // Рекомендуемый дневной лимит
    const daysInMonth = differenceInDays(endOfMonth(now), startOfMonth(now));
    const recommendedDailyLimit = currentBalance / daysInMonth;
    
    // Уровень риска
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysUntilNegative !== null) {
      if (daysUntilNegative <= 7) riskLevel = 'high';
      else if (daysUntilNegative <= 14) riskLevel = 'medium';
      else riskLevel = 'low';
    }
    
    // Дневная разбивка
    const dailyBreakdown: DailySpending[] = [];
    let cumulativeSpent = 0;
    
    for (let i = 0; i < 14; i++) { // Прогноз на 14 дней
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dailyAmount = avgDailySpending;
      cumulativeSpent += dailyAmount;
      
      dailyBreakdown.push({
        date,
        amount: dailyAmount,
        cumulative: cumulativeSpent,
        limit: recommendedDailyLimit,
        isOverLimit: dailyAmount > recommendedDailyLimit,
      });
    }
    
    return {
      predictedBalance: currentBalance - (avgDailySpending * 30),
      daysUntilNegative,
      recommendedDailyLimit,
      riskLevel,
      dailyBreakdown,
    };
  }

  // Расчет оптимального дневного лимита на основе целей
  async calculateOptimalDailyLimit(goalAmount?: number, daysToGoal?: number): Promise<number> {
    const avgDailySpending = await this.getAverageDailySpending(30);
    
    if (goalAmount && daysToGoal) {
      const dailySavingsNeeded = goalAmount / daysToGoal;
      return Math.max(0, avgDailySpending - dailySavingsNeeded);
    }
    
    return avgDailySpending;
  }

  // Прогноз расходов по категориям
  async predictCategorySpending(categoryId: string, days: number = 30): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Берем 90 дней истории
    
    const transactions = await transactionService.getTransactionsByCategory(categoryId, 1000);
    const recentTransactions = transactions.filter(t => t.date >= startDate.getTime());
    
    if (recentTransactions.length === 0) return 0;
    
    // Рассчитываем среднюю сумму за период
    const totalAmount = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averagePerDay = totalAmount / 90;
    
    return averagePerDay * days;
  }
}

export default new ForecastService();