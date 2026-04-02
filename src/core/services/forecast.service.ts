import transactionService from './transaction.service';
import {
  startOfMonth,
  endOfMonth,
  differenceInDays,
  getDate,
  getDaysInMonth,
  addDays,
  isSameDay,
  isBefore,
  isAfter,
  addMonths,
  addWeeks,
  addYears,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
} from 'date-fns';
import budgetService from './budget.service';
import { getTransactionsCollection } from '../../database';

export interface DailySpending {
  date: Date;
  amount: number;
  cumulative: number;
  limit: number;
  isOverLimit: boolean;
}

export interface FutureIncome {
  date: Date;
  amount: number;
  note: string;
  isRecurring: boolean;
  recurringType?: 'monthly' | 'weekly' | 'yearly' | null;
  originalDate?: Date;
}

export interface ExpectedIncomeDetails {
  total: number;
  regularIncome: number;
  oneTimeIncome: number;
  upcomingIncomes: Array<{
    date: Date;
    amount: number;
    note: string;
    type: 'regular' | 'one-time';
    recurringType?: string;
  }>;
  averageMonthlyIncome: number;
  incomeStability: 'high' | 'medium' | 'low';
  hasOneTimeIncomes: boolean;
}

export interface CashFlowPrediction {
  predictedBalance: number;
  daysUntilNegative: number | null;
  recommendedDailyLimit: number;
  riskLevel: 'low' | 'medium' | 'high';
  dailyBreakdown: DailySpending[];
  futureIncomes: FutureIncome[];
  totalFutureIncome: number;
  monthlyBudget?: MonthlyBudget;
  savingsRecommendation?: string;
  expectedIncome: number;
  expectedIncomeDetails: ExpectedIncomeDetails;
  oneTimeIncomeTotal?: number;
}

export interface MonthlyBudget {
  totalAvailable: number;
  dailyBudget: number;
  weeklyBudget: number;
  recommendedLimit: number;
  safetyBuffer: number;
}

class ForecastService {
  async getAverageDailySpending(daysHistory: number = 30): Promise<number> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysHistory + 1);
    startDate.setHours(0, 0, 0, 0);
    
    const statistics = await transactionService.getStatistics(
      startDate.getTime(),
      endDate.getTime(),
    );
    
    if (daysHistory === 0) return 0;
    const avgSpending = statistics.totalExpense / daysHistory;
    console.log(`📉 Сумма всех расходов за последних 30 дней: ${statistics.totalExpense.toLocaleString()} ₽, средние: ${Math.round(avgSpending)} ₽/день`);

    return avgSpending === 0 ? 0 : Math.max(100, avgSpending);
  }

  /**
   * Получает все регулярные доходы из базы (с is_recurring: true)
   */
  private async getAllRecurringIncomes(): Promise<any[]> {
    const transactions = getTransactionsCollection();
    const allTransactions = await transactions.query().fetch();
    
    const recurringIncomes = allTransactions.filter(t => {
      const raw = t._raw || t;
      return raw.type === 'income' && raw.is_recurring === true;
    });
    
    const uniqueMap = new Map<string, any>();
    
    recurringIncomes.forEach(inc => {
      const raw = inc._raw || inc;
      const key = `${raw.note}_${raw.amount}_${raw.recurring_type}`;
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, inc);
      }
    });
    
    const uniqueIncomes = Array.from(uniqueMap.values());
    
    console.log(`📊 Найдено регулярных доходов в базе: ${recurringIncomes.length}`);
    console.log(`📊 Уникальных регулярных доходов: ${uniqueIncomes.length}`);
    
    uniqueIncomes.forEach(inc => {
      const raw = inc._raw || inc;
      console.log(`  - ${new Date(raw.date).toISOString().split('T')[0]}: ${raw.amount} ₽ - ${raw.note} (${raw.recurring_type})`);
    });
    
    return uniqueIncomes;
  }

  /**
   * Рассчитывает следующую дату повторения на основе периодичности
   */
  private getNextRecurringDate(
    originalDate: Date,
    recurringType: 'monthly' | 'weekly' | 'yearly',
    fromDate: Date
  ): Date | null {
    let nextDate = new Date(originalDate);
    
    while (nextDate <= fromDate) {
      switch (recurringType) {
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return null;
      }
    }
    
    return nextDate;
  }

  /**
   * Рассчитывает все повторения регулярного дохода в заданном периоде
   */
  private calculateRecurrencesInPeriod(
    income: any,
    startDate: Date,
    endDate: Date
  ): FutureIncome[] {
    const raw = income._raw || income;
    const recurringType = raw.recurring_type as 'monthly' | 'weekly' | 'yearly';
    
    if (!recurringType) {
      return [];
    }
    
    const originalDate = new Date(raw.date);
    const result: FutureIncome[] = [];
    
    let nextDate = this.getNextRecurringDate(originalDate, recurringType, startDate);
    
    while (nextDate && nextDate <= endDate) {
      result.push({
        date: nextDate,
        amount: raw.amount,
        note: raw.note,
        isRecurring: true,
        recurringType: recurringType,
        originalDate: originalDate
      });
      
      switch (recurringType) {
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
      }
    }
    
    return result;
  }

  /**
   * Получает будущие регулярные доходы до конца текущего месяца
   */
  private async getFutureRecurringIncomesForCurrentMonth(): Promise<FutureIncome[]> {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    console.log('📅 Расчет будущих регулярных доходов:');
    console.log('  Текущая дата:', now.toISOString().split('T')[0]);
    console.log('  Конец месяца:', endOfMonth.toISOString().split('T')[0]);
    
    const recurringIncomes = await this.getAllRecurringIncomes();
    const uniqueIncomes = new Map<string, any>();
    
    for (const income of recurringIncomes) {
      const raw = income._raw || income;
      const key = `${raw.note}_${raw.amount}_${raw.recurring_type}`;
      
      if (!uniqueIncomes.has(key)) {
        uniqueIncomes.set(key, {
          id: raw.id,
          note: raw.note,
          amount: raw.amount,
          recurringType: raw.recurring_type,
          originalDate: new Date(raw.date),
        });
      }
    }
    
    console.log(`📊 Уникальных регулярных доходов: ${uniqueIncomes.size}`);
    
    const incomesByDate = new Map<string, FutureIncome>();
    
    for (const income of uniqueIncomes.values()) {
      const recurringType = income.recurringType;
      if (!recurringType) continue;
      
      const originalDate = income.originalDate;
      let nextDate = this.getNextRecurringDate(originalDate, recurringType, now);
      
      while (nextDate && nextDate <= endOfMonth) {
        const dateKey = nextDate.toISOString().split('T')[0];
        
        if (incomesByDate.has(dateKey)) {
          const existing = incomesByDate.get(dateKey)!;
          existing.amount += income.amount;
          if (!existing.note.includes(income.note)) {
            existing.note = `${existing.note}, ${income.note}`;
          }
        } else {
          incomesByDate.set(dateKey, {
            date: nextDate,
            amount: income.amount,
            note: income.note,
            isRecurring: true,
            recurringType: recurringType,
            originalDate: originalDate
          });
        }
        
        switch (recurringType) {
          case 'monthly':
            nextDate = addMonths(nextDate, 1);
            break;
          case 'weekly':
            nextDate = addWeeks(nextDate, 1);
            break;
          case 'yearly':
            nextDate = addYears(nextDate, 1);
            break;
        }
      }
    }
    
    const result = Array.from(incomesByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    
    const totalRegularIncome = result.reduce((sum, inc) => sum + inc.amount, 0);
    console.log(`\n📊 ИТОГО будущих РЕГУЛЯРНЫХ доходов в этом месяце: ${result.length} поступлений на сумму ${totalRegularIncome.toLocaleString()} ₽`);
    
    result.forEach(inc => {
      console.log(`  - ${inc.date.toISOString().split('T')[0]}: ${inc.amount.toLocaleString()} ₽ - ${inc.note}`);
    });
    
    return result;
  }

  /**
   * Получает будущие разовые доходы до конца текущего месяца
   */
  private async getFutureOneTimeIncomesForCurrentMonth(): Promise<FutureIncome[]> {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const transactions = await transactionService.getTransactionsByPeriod(
      now.getTime(),
      endOfMonth.getTime(),
    );
    
    const futureIncomes = transactions.filter(t => 
      t.type === 'income' && 
      t.is_recurring === false &&
      new Date(t.date) >= now
    );
    
    const incomesByDate = new Map<string, FutureIncome>();
    
    futureIncomes.forEach(income => {
      const date = new Date(income.date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (incomesByDate.has(dateKey)) {
        const existing = incomesByDate.get(dateKey)!;
        existing.amount += income.amount;
        existing.note += `, ${income.note}`;
      } else {
        incomesByDate.set(dateKey, {
          date,
          amount: income.amount,
          note: income.note,
          isRecurring: false,
        });
      }
    });
    
    const result = Array.from(incomesByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    
    const totalOneTimeIncome = result.reduce((sum, inc) => sum + inc.amount, 0);
    console.log(`📊 Будущих РАЗОВЫХ доходов в этом месяце: ${result.length} на сумму ${totalOneTimeIncome.toLocaleString()} ₽`);
    
    return result;
  }

  /**
   * Рассчитывает ожидаемые доходы (ТОЛЬКО регулярные, с учетом периодичности)
   */
  private async calculateExpectedIncome(): Promise<ExpectedIncomeDetails> {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    console.log('\n========================================');
    console.log('📊 РАСЧЕТ ОЖИДАЕМЫХ ДОХОДОВ');
    console.log('========================================');
    console.log(`Период: ${now.toISOString().split('T')[0]} - ${endOfMonth.toISOString().split('T')[0]}`);
    console.log('========================================\n');
    
    const regularIncomes = await this.getFutureRecurringIncomesForCurrentMonth();
    const oneTimeIncomes = await this.getFutureOneTimeIncomesForCurrentMonth();
    
    let regularIncome = 0;
    const upcomingIncomes: ExpectedIncomeDetails['upcomingIncomes'] = [];
    
    regularIncomes.forEach(income => {
      regularIncome += income.amount;
      upcomingIncomes.push({
        date: income.date,
        amount: income.amount,
        note: income.note,
        type: 'regular',
        recurringType: income.recurringType
      });
    });
    
    let oneTimeIncome = 0;
    oneTimeIncomes.forEach(income => {
      oneTimeIncome += income.amount;
      upcomingIncomes.push({
        date: income.date,
        amount: income.amount,
        note: income.note,
        type: 'one-time'
      });
    });
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const historyTransactions = await transactionService.getTransactionsByPeriod(
      sixMonthsAgo.getTime(),
      now.getTime()
    );
    
    const monthlyRegularIncomes = new Map<string, number>();
    
    historyTransactions.forEach(t => {
      if (t.type === 'income' && t.is_recurring === true) {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const current = monthlyRegularIncomes.get(monthKey) || 0;
        monthlyRegularIncomes.set(monthKey, current + t.amount);
      }
    });
    
    const incomeValues = Array.from(monthlyRegularIncomes.values());
    
    let averageMonthlyIncome = 0;
    let incomeStability: 'high' | 'medium' | 'low' = 'medium';
    
    if (incomeValues.length > 0) {
      const sum = incomeValues.reduce((a, b) => a + b, 0);
      averageMonthlyIncome = Math.round(sum / incomeValues.length);
      
      const variance = this.calculateIncomeVariance(incomeValues);
      if (variance < 0.1) {
        incomeStability = 'high';
      } else if (variance < 0.3) {
        incomeStability = 'medium';
      } else {
        incomeStability = 'low';
      }
    }
    
    const total = regularIncome;
    
    console.log('\n========================================');
    console.log('📊 ИТОГОВЫЙ ОЖИДАЕМЫЙ ДОХОД');
    console.log('========================================');
    console.log(`💰 Ожидаемый доход (регулярный): ${total.toLocaleString()} ₽`);
    console.log(`📅 Количество регулярных поступлений: ${regularIncomes.length}`);
    if (regularIncomes.length > 0) {
      console.log('📋 Детали регулярных поступлений:');
      regularIncomes.forEach(inc => {
        console.log(`   - ${inc.date.toISOString().split('T')[0]}: ${inc.amount.toLocaleString()} ₽ - ${inc.note}`);
      });
    }
    console.log(`\n💡 Разовые доходы (не учитываются в прогнозе): ${oneTimeIncome.toLocaleString()} ₽`);
    console.log(`📊 Среднемесячный регулярный доход (6 месяцев): ${averageMonthlyIncome.toLocaleString()} ₽`);
    console.log(`📈 Стабильность дохода: ${incomeStability === 'high' ? 'Высокая' : incomeStability === 'medium' ? 'Средняя' : 'Низкая'}`);
    console.log('========================================\n');
    
    return {
      total,
      regularIncome,
      oneTimeIncome,
      upcomingIncomes: upcomingIncomes.sort((a, b) => a.date.getTime() - b.date.getTime()),
      averageMonthlyIncome,
      incomeStability,
      hasOneTimeIncomes: oneTimeIncome > 0
    };
  }

  private calculateIncomeVariance(incomeValues: number[]): number {
    if (incomeValues.length === 0) return 1;
    
    const mean = incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
    const variance = incomeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / incomeValues.length;
    const standardDeviation = Math.sqrt(variance);
    
    return standardDeviation / mean;
  }

  /**
   * Получает все будущие доходы для расчета прогнозов
   */
  private async getAllFutureIncomes(daysAhead: number = 60): Promise<FutureIncome[]> {
    const now = new Date();
    const futureDate = addDays(now, daysAhead);
    
    const regularIncomes = await this.getFutureRecurringIncomesForPeriod(now, futureDate);
    const oneTimeIncomes = await this.getFutureOneTimeIncomesForPeriod(now, futureDate);
    
    return [...regularIncomes, ...oneTimeIncomes];
  }

  /**
   * Получает будущие регулярные доходы для заданного периода
   */
  private async getFutureRecurringIncomesForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<FutureIncome[]> {
    const recurringIncomes = await this.getAllRecurringIncomes();
    const futureIncomes: FutureIncome[] = [];
    
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const actualEndDate = endDate > monthEnd ? monthEnd : endDate;
    
    for (const income of recurringIncomes) {
      const occurrences = this.calculateRecurrencesInPeriod(income, startDate, actualEndDate);
      futureIncomes.push(...occurrences);
    }
    
    const incomesByDate = new Map<string, FutureIncome>();
    
    futureIncomes.forEach(income => {
      const dateKey = income.date.toISOString().split('T')[0];
      
      if (incomesByDate.has(dateKey)) {
        const existing = incomesByDate.get(dateKey)!;
        existing.amount += income.amount;
        existing.note += `, ${income.note}`;
      } else {
        incomesByDate.set(dateKey, income);
      }
    });
    
    return Array.from(incomesByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * Получает будущие разовые доходы для заданного периода
   */
  private async getFutureOneTimeIncomesForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<FutureIncome[]> {
    const transactions = await transactionService.getTransactionsByPeriod(
      startDate.getTime(),
      endDate.getTime(),
    );
    
    const futureIncomes = transactions.filter(t => 
      t.type === 'income' && 
      t.is_recurring === false &&
      new Date(t.date) >= startDate
    );
    
    const incomesByDate = new Map<string, FutureIncome>();
    
    futureIncomes.forEach(income => {
      const date = new Date(income.date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (incomesByDate.has(dateKey)) {
        const existing = incomesByDate.get(dateKey)!;
        existing.amount += income.amount;
        existing.note += `, ${income.note}`;
      } else {
        incomesByDate.set(dateKey, {
          date,
          amount: income.amount,
          note: income.note,
          isRecurring: false,
        });
      }
    });
    
    return Array.from(incomesByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }

  private calculateDaysUntilNegative(
    currentBalance: number,
    futureIncomes: FutureIncome[],
    avgDailySpending: number,
    maxDays: number = 60
  ): number | null {
    if (avgDailySpending <= 0) return null;
    if (currentBalance < 0) return 0;
    
    let balance = currentBalance;
    let days = 0;
    let incomeIndex = 0;
    const sortedIncomes = [...futureIncomes].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (let day = 1; day <= maxDays; day++) {
      const currentDate = addDays(new Date(), day);
      currentDate.setHours(0, 0, 0, 0);
      
      balance -= avgDailySpending;
      days++;
      
      while (incomeIndex < sortedIncomes.length && 
            isSameDay(sortedIncomes[incomeIndex].date, currentDate)) {
        balance += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      if (balance < 0) {
        return days;
      }
    }
    return null;
  }

  /**
   * Подсчет ежедневного рекомендуемого лимита (БЕЗ учета ожидаемых доходов)
   * Лимит рассчитывается только на основе текущего баланса и оставшихся дней
   */
  private async calculateRecommendedDailyLimit(
    currentBalance: number,
    futureIncomes: FutureIncome[],
    avgDailySpending: number,
    remainingDays: number
  ): Promise<{ limit: number; monthlyBudget: MonthlyBudget; rawLimit: number }> {
    
    const totalFutureIncome = futureIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalAvailable = currentBalance + totalFutureIncome;
    
    if (remainingDays <= 0 || totalAvailable <= 0) {
      return {
        limit: 100,
        rawLimit: 100,
        monthlyBudget: {
          totalAvailable: Math.max(0, totalAvailable),
          dailyBudget: 100,
          weeklyBudget: 700,
          recommendedLimit: 100,
          safetyBuffer: 0
        }
      };
    }
    
    // 1. Базовый консервативный лимит (только на основе текущего баланса)
    // Это максимальная сумма, которую можно тратить в день, чтобы денег хватило до конца месяца
    const conservativeLimit = totalAvailable / remainingDays;
    
    // 2. Исторический лимит - ваши привычные траты × 0.8 (80% от средних)
    const historicalLimit = avgDailySpending * 0.8;
    
    // 3. Комбинированный лимит (консервативный + исторический)
    let rawRecommendedLimit = (conservativeLimit * 0.6) + (historicalLimit * 0.4);
    
    // 4. Ограничение: лимит не может быть выше консервативного
    // Это гарантирует, что денег хватит до конца месяца
    if (rawRecommendedLimit > conservativeLimit) {
      rawRecommendedLimit = conservativeLimit;
    }
    
    // 5. Минимальный лимит (защита от слишком низких значений)
    const minLimit = 100;
    rawRecommendedLimit = Math.max(minLimit, rawRecommendedLimit);
    
    // 6. Округление для отображения
    const displayLimit = Math.round(rawRecommendedLimit);
    
    // Проверка: если соблюдать лимит, денег должно хватить
    const totalNeeded = displayLimit * remainingDays;
    const willBeEnough = totalNeeded <= totalAvailable;
    
    console.log('📊 Расчет консервативного лимита (без учета будущих доходов):', {
      currentBalance,
      remainingDays,
      conservativeLimit: Math.round(conservativeLimit),
      historicalLimit: Math.round(historicalLimit),
      rawRecommendedLimit: Math.round(rawRecommendedLimit),
      displayLimit,
      totalNeeded: `${displayLimit} × ${remainingDays} = ${totalNeeded}`,
      willBeEnough: willBeEnough ? '✅ Денег хватит' : '⚠️ Денег не хватит',
      формула: `${Math.round(conservativeLimit)} × 0.6 + ${Math.round(historicalLimit)} × 0.4 = ${Math.round(rawRecommendedLimit)}`
    });
    
    const monthlyBudget: MonthlyBudget = {
      totalAvailable: totalAvailable,
      dailyBudget: displayLimit,
      weeklyBudget: displayLimit * 7,
      recommendedLimit: displayLimit,
      safetyBuffer: totalAvailable * 0.1
    };
    
    return { limit: displayLimit, rawLimit: rawRecommendedLimit, monthlyBudget };
  }

  private async calculatePredictedBalance(
    currentBalance: number,
    futureIncomes: FutureIncome[],
    avgDailySpending: number,
    remainingDays: number,
    recommendedLimit?: number,
    rawRecommendedLimit?: number
  ): Promise<{ 
    optimistic: number; 
    pessimistic: number; 
    realistic: number;
    recommended: number;
    byDay: Array<{ day: number; balance: number; income: number; expense: number }>;
  }> {
    
    const sortedIncomes = [...futureIncomes].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let realisticBalance = currentBalance;
    let incomeIndex = 0;
    const byDay: Array<{ day: number; balance: number; income: number; expense: number }> = [];
    
    for (let day = 1; day <= remainingDays; day++) {
      const currentDate = addDays(new Date(), day);
      currentDate.setHours(0, 0, 0, 0);
      
      let dailyIncome = 0;
      while (incomeIndex < sortedIncomes.length && 
             isSameDay(sortedIncomes[incomeIndex].date, currentDate)) {
        dailyIncome += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      realisticBalance += dailyIncome;
      realisticBalance -= avgDailySpending;
      
      byDay.push({
        day,
        balance: Math.round(realisticBalance),
        income: dailyIncome,
        expense: avgDailySpending
      });
    }
    
    const optimisticExpense = avgDailySpending * 0.8;
    let optimisticBalance = currentBalance;
    incomeIndex = 0;
    
    for (let day = 1; day <= remainingDays; day++) {
      const currentDate = addDays(new Date(), day);
      currentDate.setHours(0, 0, 0, 0);
      
      let dailyIncome = 0;
      while (incomeIndex < sortedIncomes.length && 
             isSameDay(sortedIncomes[incomeIndex].date, currentDate)) {
        dailyIncome += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      optimisticBalance += dailyIncome;
      optimisticBalance -= optimisticExpense;
    }
    
    const pessimisticExpense = avgDailySpending * 1.2;
    let pessimisticBalance = currentBalance;
    incomeIndex = 0;
    
    for (let day = 1; day <= remainingDays; day++) {
      const currentDate = addDays(new Date(), day);
      currentDate.setHours(0, 0, 0, 0);
      
      let dailyIncome = 0;
      while (incomeIndex < sortedIncomes.length && 
             isSameDay(sortedIncomes[incomeIndex].date, currentDate)) {
        dailyIncome += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      pessimisticBalance += dailyIncome;
      pessimisticBalance -= pessimisticExpense;
    }
    
    let recommendedBalance = currentBalance;
    incomeIndex = 0;
    const recommendedExpense = rawRecommendedLimit || recommendedLimit || avgDailySpending;
        console.log('777', recommendedBalance)

    for (let day = 1; day <= remainingDays; day++) {
      const currentDate = addDays(new Date(), day);
      currentDate.setHours(0, 0, 0, 0);
      
      let dailyIncome = 0;
      while (incomeIndex < sortedIncomes.length && 
             isSameDay(sortedIncomes[incomeIndex].date, currentDate)) {
        dailyIncome += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      recommendedBalance += dailyIncome;
      recommendedBalance -= recommendedExpense; 

    }
    
    return {
      optimistic: Math.max(0, Math.round(optimisticBalance)),
      pessimistic: Math.max(0, Math.round(pessimisticBalance)),
      realistic: Math.max(0, Math.round(realisticBalance)),
      recommended: Math.max(0, Math.round(recommendedBalance)),
      byDay
    };
  }

  private async calculateDailyBreakdown(
    initialBalance: number,
    futureIncomes: FutureIncome[],
    avgDailySpending: number,
    dailyLimit: number,
    days: number,
  ): Promise<DailySpending[]> {
    const breakdown: DailySpending[] = [];
    let currentBalance = initialBalance;
    let cumulativeSpent = 0;
    let incomeIndex = 0;
    
    const sortedIncomes = [...futureIncomes].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      while (incomeIndex < sortedIncomes.length && 
             isSameDay(sortedIncomes[incomeIndex].date, date)) {
        currentBalance += sortedIncomes[incomeIndex].amount;
        incomeIndex++;
      }
      
      const projectedSpending = avgDailySpending;
      cumulativeSpent += projectedSpending;
      
      const daysRemaining = days - i;
      let dynamicLimit = dailyLimit;
      if (daysRemaining > 0 && currentBalance > 0) {
        const availableForToday = currentBalance / daysRemaining;
        dynamicLimit = Math.min(dailyLimit, availableForToday);
      }
      
      breakdown.push({
        date,
        amount: projectedSpending,
        cumulative: cumulativeSpent,
        limit: Math.max(100, dynamicLimit),
        isOverLimit: projectedSpending > dynamicLimit,
      });
      
      currentBalance -= projectedSpending;
    }
    
    return breakdown;
  }

  async predictCashFlowGaps(): Promise<CashFlowPrediction> {
    const now = new Date();
    const currentBalance = await transactionService.getBalanceUntilDate(now.getTime());
    const avgDailySpending = await this.getAverageDailySpending(30);
    
    // Получаем ВСЕ будущие доходы (для прогноза баланса)
    const allFutureIncomes = await this.getAllFutureIncomes(60);
    const totalFutureIncome = allFutureIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Получаем детализированные ожидаемые доходы (только регулярные в текущем месяце)
    const expectedIncomeDetails = await this.calculateExpectedIncome();
    
    // Получаем разовые доходы для информации
    const oneTimeIncomes = await this.getFutureOneTimeIncomesForCurrentMonth();
    const oneTimeIncomeTotal = oneTimeIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    const daysInMonth = getDaysInMonth(now);
    const currentDay = getDate(now);
    let remainingDays = daysInMonth - currentDay;

    console.log("Оставшиеся дни в текущем месяце", remainingDays)
    if (remainingDays <= 0) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      remainingDays = getDaysInMonth(nextMonth);
    }
    
    // Для расчета дней до отрицательного используем ТОЛЬКО регулярные доходы в текущем месяце
    const regularIncomesThisMonth = await this.getFutureRecurringIncomesForPeriod(now, new Date(now.getFullYear(), now.getMonth() + 1, 0));
    
    const daysUntilNegative = this.calculateDaysUntilNegative(
      currentBalance,
      regularIncomesThisMonth,
      avgDailySpending,
      remainingDays
    );
    
    // Для расчета лимита НЕ используем будущие доходы
    const { limit: recommendedDailyLimit, rawLimit, monthlyBudget } = await this.calculateRecommendedDailyLimit(
      currentBalance,
      allFutureIncomes,
      avgDailySpending,
      remainingDays
    );
    
    const balanceForecast = await this.calculatePredictedBalance(
      currentBalance,
      allFutureIncomes,
      avgDailySpending,
      remainingDays,
      recommendedDailyLimit,
      rawLimit
    );
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (currentBalance < 0) {
      riskLevel = 'high';
    } else if (daysUntilNegative !== null) {
      if (daysUntilNegative <= 7) riskLevel = 'high';
      else if (daysUntilNegative <= 14) riskLevel = 'medium';
      else riskLevel = 'low';
    } else {
      if (balanceForecast.recommended < 0) {
        riskLevel = 'high';
      } else if (balanceForecast.recommended < (monthlyBudget?.safetyBuffer || 0)) {
        riskLevel = 'medium';
      } else if (avgDailySpending > recommendedDailyLimit) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
    }
    
    let savingsRecommendation = '';
    const overspend = avgDailySpending - recommendedDailyLimit;
    
    if (balanceForecast.recommended < 0) {
      const neededSavings = Math.abs(balanceForecast.recommended);
      const dailySavings = Math.ceil(neededSavings / remainingDays);
      savingsRecommendation = `⚠️ Для достижения нулевого баланса необходимо экономить ${dailySavings} ₽ в день. Рекомендуемый лимит: ${recommendedDailyLimit} ₽/день.`;
    } else if (overspend > 0) {
      savingsRecommendation = `⚠️ Ваши средние траты (${Math.round(avgDailySpending)} ₽) превышают рекомендуемый лимит на ${Math.round(overspend)} ₽ в день. Постарайтесь сократить расходы, чтобы улучшить финансовое положение.`;
    } else if (balanceForecast.recommended < (monthlyBudget?.safetyBuffer || 0)) {
      savingsRecommendation = `💡 Ваш буфер безопасности составляет ${Math.round(balanceForecast.recommended)} ₽. Рекомендуем придерживаться лимита ${recommendedDailyLimit} ₽/день для создания подушки безопасности.`;
    } else {
      savingsRecommendation = `✅ Отлично! При соблюдении лимита ${recommendedDailyLimit} ₽/день вы сможете накопить ${Math.round(balanceForecast.recommended)} ₽ к концу месяца.`;
    }
    
    const dailyBreakdown = await this.calculateDailyBreakdown(
      currentBalance,
      allFutureIncomes,
      avgDailySpending,
      recommendedDailyLimit,
      Math.min(14, remainingDays),
    );
    
    console.log('\n========================================');
    console.log('📊 ИТОГОВЫЙ ПРОГНОЗ');
    console.log('========================================');
    console.log(`💰 Текущий баланс: ${currentBalance.toLocaleString()} ₽`);
    console.log(`📈 Ожидаемый доход (регулярный): ${expectedIncomeDetails.total.toLocaleString()} ₽`);
    console.log(`🎲 Разовые доходы: ${oneTimeIncomeTotal.toLocaleString()} ₽ (не учитываются в прогнозе)`);
    console.log(`📉 Средние траты: ${avgDailySpending.toLocaleString()} ₽/день`);
    console.log(`⚡ Рекомендуемый лимит: ${recommendedDailyLimit.toLocaleString()} ₽/день`);
    console.log(`🎯 Прогнозируемый баланс: ${balanceForecast.recommended.toLocaleString()} ₽`);
    console.log(`📅 Дней до отрицательного: ${daysUntilNegative || '> 60'}`);
    console.log(`⚠️ Уровень риска: ${riskLevel === 'high' ? 'Высокий' : riskLevel === 'medium' ? 'Средний' : 'Низкий'}`);
    console.log('========================================\n');
    
    return {
      predictedBalance: balanceForecast.recommended,
      daysUntilNegative,
      recommendedDailyLimit,
      riskLevel,
      dailyBreakdown,
      futureIncomes: allFutureIncomes,
      totalFutureIncome,
      monthlyBudget,
      savingsRecommendation,
      expectedIncome: expectedIncomeDetails.total,
      expectedIncomeDetails,
      oneTimeIncomeTotal
    };
  }

  async calculateOptimalDailyLimit(
    goalAmount?: number,
    daysToGoal?: number,
  ): Promise<number> {
    const avgDailySpending = await this.getAverageDailySpending(30);
    const currentBalance = await transactionService.getBalanceUntilDate(
      Date.now(),
    );

    let baseLimit = avgDailySpending;

    if (goalAmount && daysToGoal && daysToGoal > 0) {
      const dailySavingsNeeded = goalAmount / daysToGoal;
      baseLimit = Math.max(100, avgDailySpending - dailySavingsNeeded);
    }

    const maxLimit = Math.max(100, currentBalance / 30);
    return Math.min(baseLimit, maxLimit);
  }

  async predictEndOfMonthBalance(): Promise<number> {
    const now = new Date();
    const currentBalance = await transactionService.getBalanceUntilDate(
      now.getTime(),
    );
    const avgDailySpending = await this.getAverageDailySpending(30);
    const futureIncomes = await this.getAllFutureIncomes(60);
    const totalFutureIncome = futureIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    const daysInMonth = getDaysInMonth(now);
    const currentDay = getDate(now);
    const remainingDays = Math.max(0, daysInMonth - currentDay);

    const predictedBalance = currentBalance + totalFutureIncome - (avgDailySpending * remainingDays);
    return Math.max(0, predictedBalance);
  }

  private async getPlannedIncomeForMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    ).getTime();

    const monthTransactions = await transactionService.getTransactionsByPeriod(
      startOfMonth,
      endOfMonth,
    );

    const incomeThisMonth = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    if (incomeThisMonth > 0) {
      return incomeThisMonth;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const historyTransactions =
      await transactionService.getTransactionsByPeriod(
        sixMonthsAgo.getTime(),
        now.getTime(),
      );

    const monthlyIncomes = this.groupIncomesByMonth(historyTransactions);
    const regularIncome = this.findRegularIncome(monthlyIncomes);

    if (regularIncome > 0) {
      return regularIncome;
    }

    return this.calculateAverageIncome(monthlyIncomes);
  }

  private groupIncomesByMonth(transactions: any[]): Map<string, number> {
    const monthlyMap = new Map<string, number>();

    for (const t of transactions) {
      if (t.type !== 'income') continue;

      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, current + t.amount);
    }

    return monthlyMap;
  }

  private findRegularIncome(monthlyIncomes: Map<string, number>): number {
    const incomeValues = Array.from(monthlyIncomes.values());

    if (incomeValues.length === 0) return 0;

    const frequency = new Map<number, number>();
    for (const amount of incomeValues) {
      frequency.set(amount, (frequency.get(amount) || 0) + 1);
    }

    let maxFreq = 0;
    let regularIncome = 0;

    for (const [amount, count] of frequency) {
      if (count > maxFreq && count >= Math.ceil(incomeValues.length / 2)) {
        maxFreq = count;
        regularIncome = amount;
      }
    }

    if (regularIncome > 0) {
      console.log(
        `📊 Найден регулярный доход: ${regularIncome.toLocaleString()} ₽ (встречается ${maxFreq} раз)`,
      );
    }

    return regularIncome;
  }

  private calculateAverageIncome(monthlyIncomes: Map<string, number>): number {
    const incomeValues = Array.from(monthlyIncomes.values());

    if (incomeValues.length === 0) return 0;

    const sorted = [...incomeValues].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);

    if (trimmed.length === 0) {
      const sum = incomeValues.reduce((a, b) => a + b, 0);
      return Math.round(sum / incomeValues.length);
    }

    const sum = trimmed.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / trimmed.length);

    console.log(`📊 Средний доход (без аномалий): ${avg.toLocaleString()} ₽`);
    return avg;
  }
}

export default new ForecastService();