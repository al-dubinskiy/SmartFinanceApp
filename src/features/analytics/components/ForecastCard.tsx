import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';
import forecastService, { CashFlowPrediction } from '../../../core/services/forecast.service';

interface ForecastCardProps {
  currency?: string;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ currency = 'USD' }) => {
  const { colors } = useTheme();
  const [prediction, setPrediction] = useState<CashFlowPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadPrediction();
  }, []);

  const loadPrediction = async () => {
    setIsLoading(true);
    try {
      const result = await forecastService.predictCashFlowGaps();
      setPrediction(result);
    } catch (error) {
      console.error('Failed to load prediction:', error);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
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
        <TouchableOpacity onPress={loadPrediction}>
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Индикатор риска */}
      <View style={[styles.riskContainer, { backgroundColor: getRiskColor() + '20' }]}>
        <Icon name={getRiskIcon()} size={24} color={getRiskColor()} />
        <View style={styles.riskTextContainer}>
          <Text style={[styles.riskLabel, { color: colors.text.secondary }]}>
            Риск денежного потока
          </Text>
          <Text style={[styles.riskValue, { color: getRiskColor() }]}>
            {getRiskText()}
          </Text>
        </View>
      </View>

      {/* Дней до отрицательного баланса */}
      {prediction.daysUntilNegative !== null && (
        <View style={styles.infoRow}>
          <Icon name="calendar-clock" size={20} color={colors.text.secondary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Дней до отрицательного баланса
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {prediction.daysUntilNegative} дней
            </Text>
          </View>
        </View>
      )}

      {/* Рекомендуемый дневной лимит */}
      <View style={styles.infoRow}>
        <Icon name="speedometer" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
            Рекомендуемый дневной лимит
          </Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>
            {formatCurrency(prediction.recommendedDailyLimit, currency)}
          </Text>
        </View>
      </View>

      {/* Прогнозируемый баланс на конец месяца */}
      <View style={styles.infoRow}>
        <Icon name="chart-line" size={20} color={colors.text.secondary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
            Прогнозируемый баланс на конец месяца
          </Text>
          <Text
            style={[
              styles.infoValue,
              {
                color: prediction.predictedBalance >= 0
                  ? colors.success
                  : colors.error,
              },
            ]}
          >
            {formatCurrency(prediction.predictedBalance, currency)}
          </Text>
        </View>
      </View>

      {/* Кнопка развернуть/свернуть */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.expandText, { color: colors.primary }]}>
          {expanded ? 'Скрыть детали' : 'Показать прогноз по дням'}
        </Text>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dailyBreakdown}>
          <Text style={[styles.breakdownTitle, { color: colors.text.secondary }]}>
            Прогноз на следующие 14 дней
          </Text>
          {prediction.dailyBreakdown.map((day, index) => (
            <View key={index} style={styles.dailyRow}>
              <Text style={[styles.dailyDate, { color: colors.text.secondary }]}>
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

      {/* Полезный совет */}
      <View style={[styles.insightContainer, { backgroundColor: colors.background }]}>
        <Icon name="lightbulb" size={20} color={colors.primary} />
        <Text style={[styles.insightText, { color: colors.text.secondary }]}>
          {prediction.daysUntilNegative !== null && prediction.daysUntilNegative <= 7
            ? '⚠️ Ваш баланс может скоро стать отрицательным. Рекомендуется сократить расходы или увеличить доходы.'
            : prediction.recommendedDailyLimit > 0
            ? '💡 Придерживайтесь рекомендованного дневного лимита, чтобы избежать проблем с денежным потоком.'
            : '🎯 Отличная работа! Ваши текущие расходы хорошо укладываются в лимиты.'}
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
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '500',
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
});