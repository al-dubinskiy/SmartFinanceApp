import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MainTabScreenProps } from '../../../navigation/types';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { PeriodFilter, PeriodType } from '../components/PeriodFilter';
import { PieChart } from '../components/PieChart';
import { BarChart } from '../components/BarChart';
import { ABCAnalysis } from '../components/ABCAnalysis';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from 'date-fns';
import { ForecastCard } from '../components/ForecastCard';

interface PeriodStats {
  startDate: number;
  endDate: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: any[];
}

export const AnalyticsScreen: React.FC<
  MainTabScreenProps<'Analytics'>
> = () => {
  const { colors } = useTheme();
  const { user } = useAppSelector(state => state.auth);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [abcData, setAbcData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (selectedPeriod) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { startDate: start.getTime(), endDate: end.getTime() };
  }, [selectedPeriod]);

  const loadTrendData = useCallback(async () => {
    const { startDate, endDate } = getDateRange();

    if (selectedPeriod === 'week') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = eachDayOfInterval({ start, end });

      const dailyData = await Promise.all(
        days.map(async day => {
          const dayStart = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
          ).getTime();
          const dayEnd = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            23,
            59,
            59,
          ).getTime();
          const statistics = await transactionService.getStatistics(
            dayStart,
            dayEnd,
          );
          return {
            label: format(day, 'EEE'),
            value: statistics.expense,
          };
        }),
      );

      setTrendData(dailyData);
    } else if (selectedPeriod === 'month') {
      const weeks = ['1 неделя', '2 неделя', '3 неделя', '4 неделя'];
      const now = new Date();
      const monthStart = startOfMonth(now);
      const weekData = [];

      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(monthStart);
        weekStart.setDate(monthStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (weekStart <= endDate) {
          const statistics = await transactionService.getStatistics(
            weekStart.getTime(),
            weekEnd.getTime(),
          );
          weekData.push({
            label: weeks[i],
            value: statistics.expense,
          });
        }
      }

      setTrendData(weekData);
    } else if (selectedPeriod === 'year') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = eachMonthOfInterval({ start, end });

      const monthlyData = await Promise.all(
        months.map(async month => {
          const monthStart = startOfMonth(month).getTime();
          const monthEnd = endOfMonth(month).getTime();
          const statistics = await transactionService.getStatistics(
            monthStart,
            monthEnd,
          );
          return {
            label: format(month, 'MMM'),
            value: statistics.expense,
          };
        }),
      );

      setTrendData(monthlyData);
    }
  }, [selectedPeriod, getDateRange]);

  const loadAnalytics = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange();

      const statistics = await transactionService.getStatistics(
        startDate,
        endDate,
      );

      setStats({
        startDate,
        endDate,
        totalIncome: statistics.totalIncome,
        totalExpense: statistics.totalExpense,
        balance: statistics.balance,
        byCategory: statistics.byCategory,
      });

      // ABC-анализ
      if (statistics.totalExpense > 0) {
        const sortedCategories = [...statistics.byCategory].sort(
          (a, b) => b.amount - a.amount,
        );
        let cumulativePercentage = 0;

        const abcItems = sortedCategories.map(item => {
          const percentage = (item.amount / statistics.totalExpense) * 100;
          cumulativePercentage += percentage;

          let rank: 'A' | 'B' | 'C';
          if (cumulativePercentage <= 70) rank = 'A';
          else if (cumulativePercentage <= 85) rank = 'B';
          else rank = 'C';

          return {
            ...item,
            percentage,
            rank,
          };
        });

        setAbcData(abcItems);
      } else {
        setAbcData([]);
      }

      await loadTrendData();
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getDateRange, loadTrendData]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  const formatCurrencyForChart = (value: number) => {
    return `${
      user?.currency === 'RUB' ? '₽' : user?.currency || ''
    }${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Загрузка аналитики...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Фильтр периода */}
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Сводные карточки */}
        <View style={styles.summaryContainer}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Общий доход
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {stats?.totalIncome.toFixed(2)} {user?.currency || '₽'}
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Общие расходы
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {stats?.totalExpense.toFixed(2)} {user?.currency || '₽'}
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Баланс
            </Text>
            <Text
              style={[
                styles.summaryAmount,
                {
                  color:
                    (stats?.balance || 0) >= 0 ? colors.success : colors.error,
                },
              ]}
            >
              {stats?.balance.toFixed(2)} {user?.currency || '₽'}
            </Text>
          </View>
        </View>

        {/* Круговая диаграмма расходов */}
        <PieChart
          data={
            stats?.byCategory.map(item => ({
              value: item.amount,
              color: item.categoryColor,
              label: item.categoryName,
            })) || []
          }
          totalAmount={stats?.totalExpense || 0}
          title="Структура расходов"
          currency={user?.currency || 'RUB'}
        />

        {/* Столбчатая диаграмма тренда расходов */}
        <BarChart
          data={trendData.map(item => ({
            value: item.value,
            label: item.label,
          }))}
          title="Динамика расходов"
          currency={user?.currency || 'RUB'}
        />

        {/* ABC-анализ */}
        <ABCAnalysis
          data={abcData}
          totalAmount={stats?.totalExpense || 0}
          currency={user?.currency || 'RUB'}
        />

        <ForecastCard currency={user?.currency || 'RUB'} />

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 2,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
});
