import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';
import forecastService from '../../../core/services/forecast.service';

interface ForecastCardProps {
  currency?: string;
  onInfoPress?: (
    type:
      | 'daysUntilNegative'
      | 'expectedIncome'
      | 'dailyLimit'
      | 'predictedBalance'
      | 'dailyForecast'
      | 'avgDailySpending'
      | 'riskLevel',
  ) => void;

  isFocused?: boolean;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({
  currency = 'RUB',
  onInfoPress,
  isFocused,
}) => {
  const { colors } = useTheme();
  const [prediction, setPrediction] = useState<any>(null);
  const [avgDailySpending, setAvgDailySpending] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showAllIncomes, setShowAllIncomes] = useState(false);
  const [displayCount, setDisplayCount] = useState(3);

  useEffect(() => {
    loadData();
  }, [isFocused]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await forecastService.predictCashFlowGaps();
      setPrediction(result);

      const avg = await forecastService.getAverageDailySpending(30);
      setAvgDailySpending(avg);
    } catch (error) {
      console.error('Failed to load prediction:', error);
    } finally {
      setIsLoading(false);
      setIsFirstLoad(false);
    }
  };

  const getRiskColor = () => {
    switch (prediction?.riskLevel) {
      case 'high':
        return '#E74C3C';
      case 'medium':
        return '#F39C12';
      default:
        return '#2ECC71';
    }
  };

  const getRiskText = () => {
    switch (prediction?.riskLevel) {
      case 'high':
        return 'Высокий риск';
      case 'medium':
        return 'Средний риск';
      default:
        return 'Низкий риск';
    }
  };

  const getRiskIcon = () => {
    switch (prediction?.riskLevel) {
      case 'high':
        return 'alert-circle';
      case 'medium':
        return 'alert';
      default:
        return 'check-circle';
    }
  };

  // Группировка доходов по датам для отображения
  const getGroupedIncomes = () => {
    if (!prediction?.expectedIncomeDetails?.upcomingIncomes) return [];

    const incomesByDate = new Map<string, any>();

    prediction.expectedIncomeDetails.upcomingIncomes.forEach((income: any) => {
      const dateKey = income.date.toISOString().split('T')[0];
      const date = new Date(income.date);

      if (incomesByDate.has(dateKey)) {
        const existing = incomesByDate.get(dateKey);
        existing.amount += income.amount;
        existing.notes.push(income.note);
      } else {
        incomesByDate.set(dateKey, {
          date,
          amount: income.amount,
          notes: [income.note],
          type: income.type,
        });
      }
    });

    const result = Array.from(incomesByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Логируем для отладки
    console.log('📊 Сгруппированные доходы для отображения:');
    result.forEach(r => {
      console.log(
        `  ${r.date.toLocaleDateString('ru-RU')}: ${r.amount} ₽ - ${r.notes}`,
      );
    });

    return result;
  };

  const groupedIncomes = getGroupedIncomes();
  const displayedIncomes = groupedIncomes.slice(0, displayCount);
  const hasMoreIncomes = groupedIncomes.length > displayCount;

  const handleShowMore = () => {
    if (hasMoreIncomes) {
      setDisplayCount(groupedIncomes.length);
    } else {
      setShowAllIncomes(false);
      setDisplayCount(3);
    }
  };

  if (isLoading && isFirstLoad) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!prediction) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          📊 Финансовый прогноз
        </Text>
        <TouchableOpacity onPress={loadData}>
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Risk Indicator */}
      <View
        style={[
          styles.riskContainer,
          { backgroundColor: getRiskColor() + '20' },
        ]}
      >
        <Icon name={getRiskIcon()} size={24} color={getRiskColor()} />
        <View style={styles.riskTextContainer}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={[styles.riskLabel, { color: colors.text.secondary }]}>
              Риск денежного потока
            </Text>
            <TouchableOpacity
              style={styles.smallInfoButton}
              onPress={() => onInfoPress?.('riskLevel')}
            >
              <Icon
                name="information-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.riskValue, { color: getRiskColor() }]}>
            {getRiskText()}
          </Text>
        </View>
      </View>

      {/* Average Daily Spending */}
      <View style={styles.infoRow}>
        <Icon name="chart-arc" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <View style={styles.infoRowLeft}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Средние дневные расходы (30 дней)
            </Text>
            <TouchableOpacity
              style={styles.smallInfoButton}
              onPress={() => onInfoPress?.('avgDailySpending')}
            >
              <Icon
                name="information-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.infoValue,
              { color: colors.error, fontWeight: '600' },
            ]}
          >
            {formatCurrency(avgDailySpending, currency)}/день
          </Text>
        </View>
      </View>

      {/* Expected Income Section */}
      <View style={styles.incomeSection}>
        <View style={styles.infoRow}>
          <Icon name="cash-plus" size={20} color={colors.success} />
          <View style={styles.infoContent}>
            <View style={styles.infoRowLeft}>
              <Text
                style={[styles.infoLabel, { color: colors.text.secondary }]}
              >
                Ожидаемые доходы (в этом месяце)
              </Text>

              <TouchableOpacity
                style={styles.smallInfoButton}
                onPress={() => onInfoPress?.('expectedIncome')}
              >
                <Icon
                  name="information-outline"
                  size={16}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.infoValue,
                { color: colors.success, fontWeight: 'bold', fontSize: 20 },
              ]}
            >
              {formatCurrency(prediction.expectedIncomeDetails.total, currency)}
            </Text>
            <View style={styles.incomeDetails}>
              <Text
                style={[
                  styles.incomeDetailText,
                  { color: colors.text.secondary },
                ]}
              >
                Регулярные:{' '}
                {formatCurrency(
                  prediction.expectedIncomeDetails.regularIncome,
                  currency,
                )}
              </Text>
              <Text
                style={[
                  styles.incomeDetailText,
                  { color: colors.text.secondary },
                ]}
              >
                Стабильность:{' '}
                {prediction.expectedIncomeDetails.incomeStability === 'high'
                  ? 'Высокая'
                  : prediction.expectedIncomeDetails.incomeStability ===
                    'medium'
                  ? 'Средняя'
                  : 'Низкая'}
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Incomes List */}
        {groupedIncomes.length > 0 && (
          <View style={styles.upcomingContainer}>
            <Text
              style={[styles.upcomingTitle, { color: colors.text.secondary }]}
            >
              Ближайшие поступления:
            </Text>
            {displayedIncomes.map((income, index) => (
              <View key={index} style={styles.upcomingItem}>
                <View style={styles.upcomingDate}>
                  <Text
                    style={[
                      styles.upcomingDateText,
                      { color: colors.text.primary },
                    ]}
                  >
                    {income.date.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <View style={styles.upcomingInfo}>
                  <Text
                    style={[
                      styles.upcomingNotes,
                      { color: colors.text.secondary },
                    ]}
                    numberOfLines={2}
                  >
                    {income.notes.join(', ')}
                  </Text>
                  <Text
                    style={[styles.upcomingAmount, { color: colors.success }]}
                  >
                    +{formatCurrency(income.amount, currency)}
                  </Text>
                </View>
              </View>
            ))}

            {hasMoreIncomes && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setDisplayCount(groupedIncomes.length)}
              >
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  + еще {groupedIncomes.length - displayCount} поступлений
                </Text>
                <Icon name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}

            {displayCount > 3 && !hasMoreIncomes && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setDisplayCount(3)}
              >
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  Скрыть
                </Text>
                <Icon name="chevron-up" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Days Until Negative */}
      <View style={styles.infoRow}>
        <Icon name="calendar-clock" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <View style={styles.infoRowLeft}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Дней до отрицательного баланса
            </Text>
            <TouchableOpacity
              style={styles.smallInfoButton}
              onPress={() => onInfoPress?.('daysUntilNegative')}
            >
              <Icon
                name="information-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.infoValue,
              { color: colors.text.primary, fontWeight: '600' },
            ]}
          >
            {prediction.daysUntilNegative !== null
              ? `${prediction.daysUntilNegative} дней`
              : 'Более 30 дней'}
          </Text>
        </View>
      </View>

      {/* Recommended Daily Limit */}
      <View style={styles.infoRow}>
        <Icon name="speedometer" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <View style={styles.infoRowLeft}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Рекомендуемый дневной лимит
            </Text>
            <TouchableOpacity
              style={styles.smallInfoButton}
              onPress={() => onInfoPress?.('dailyLimit')}
            >
              <Icon
                name="information-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.infoValue,
              { color: colors.success, fontWeight: '600' },
            ]}
          >
            {formatCurrency(prediction.recommendedDailyLimit, currency)}/день
          </Text>
        </View>
      </View>

      {/* Predicted Balance */}
      <View style={styles.infoRow}>
        <Icon name="chart-line" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <View style={styles.infoRowLeft}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Прогнозируемый баланс на конец месяца
            </Text>
            <TouchableOpacity
              style={styles.smallInfoButton}
              onPress={() => onInfoPress?.('predictedBalance')}
            >
              <Icon
                name="information-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.infoValue,
              {
                color:
                  prediction.predictedBalance >= 0
                    ? colors.success
                    : colors.error,
                fontWeight: '600',
              },
            ]}
          >
            {formatCurrency(prediction.predictedBalance, currency)}
          </Text>
        </View>
      </View>

      {/* Expand/Collapse */}
      <View style={styles.expandSection}>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={[styles.expandText, { color: colors.primary }]}>
            {expanded ? 'Скрыть детали' : 'Показать детали'}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoButtonSmall}
          onPress={() => onInfoPress?.('dailyForecast')}
        >
          <Icon name="information-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoButtonText, { color: colors.primary }]}>
            Как это работает?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Daily Breakdown */}
      {expanded && (
        <View style={styles.dailyBreakdown}>
          <Text
            style={[styles.breakdownTitle, { color: colors.text.secondary }]}
          >
            Прогноз на следующие {prediction.dailyBreakdown.length} дней
          </Text>
          {prediction.dailyBreakdown.map((day: any, index: number) => (
            <View key={index} style={styles.dailyRow}>
              <Text
                style={[styles.dailyDate, { color: colors.text.secondary }]}
              >
                {day.date.toLocaleDateString('ru-RU')}
              </Text>
              <Text style={[styles.dailyAmount, { color: colors.error }]}>
                -{formatCurrency(day.amount, currency)}
              </Text>
              <View style={styles.dailyLimitContainer}>
                <Text
                  style={[
                    styles.dailyLimit,
                    {
                      color: day.isOverLimit ? colors.error : colors.success,
                    },
                  ]}
                >
                  Лимит: {formatCurrency(day.limit, currency)}
                </Text>
                {day.isOverLimit && (
                  <Icon name="alert" size={14} color={colors.error} />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Insight */}
      <View
        style={[
          styles.insightContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Icon name="lightbulb" size={20} color={colors.primary} />
        <Text style={[styles.insightText, { color: colors.text.secondary }]}>
          {prediction.savingsRecommendation ||
            (avgDailySpending > prediction.recommendedDailyLimit
              ? `💡 Чтобы достичь прогнозируемого баланса, старайтесь тратить не более ${formatCurrency(
                  prediction.recommendedDailyLimit,
                  currency,
                )} в день.`
              : '🎉 Отличная работа! Ваши средние траты ниже рекомендуемого лимита.')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  riskTextContainer: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 12,
  },
  riskValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  smallInfoButton: {
    padding: 2,
  },
  incomeSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  incomeDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  incomeDetailText: {
    fontSize: 11,
  },
  upcomingContainer: {
    marginTop: 12,
    marginLeft: 32,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  upcomingTitle: {
    fontSize: 11,
    marginBottom: 8,
  },
  upcomingItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  upcomingDate: {
    width: 55,
  },
  upcomingDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingNotes: {
    fontSize: 11,
    marginBottom: 2,
  },
  upcomingAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  infoButtonText: {
    fontSize: 12,
  },
  dailyBreakdown: {
    marginTop: 12,
  },
  breakdownTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  dailyDate: {
    fontSize: 12,
    width: 80,
  },
  dailyAmount: {
    fontSize: 12,
    fontWeight: '500',
    width: 80,
  },
  dailyLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyLimit: {
    fontSize: 11,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
    gap: 12,
  },
  comparisonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
