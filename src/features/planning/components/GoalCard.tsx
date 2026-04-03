import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { ProgressBar } from './ProgressBar';
import { formatCurrency } from '../../../core/utils/formatters';

interface GoalCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: number;
  progress: number;
  isCompleted: boolean;
  currency?: string;
  onPress?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  name,
  icon,
  color,
  targetAmount,
  currentAmount,
  deadline,
  progress,
  isCompleted,
  currency = 'RUB',
  onPress,
  onAdd,
  onDelete,
  onEdit,
}) => {
  const { colors } = useTheme();

  const getRemainingDays = () => {
    if (!deadline) return null;
    const today = new Date();
    const targetDate = new Date(deadline);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  const getDailyRecommendation = () => {
    if (!deadline || remainingDays <= 0 || isCompleted) return null;
    const dailyAmount = remainingAmount / remainingDays;
    return formatCurrency(dailyAmount, currency);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          opacity: isCompleted ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View
            style={[styles.iconContainer, { backgroundColor: color + '20' }]}
          >
            <Icon name={icon} size={24} color={color} />
          </View>
          <View>
            <Text style={[styles.name, { color: colors.text.primary }]}>
              {name}
            </Text>
            <Text style={[styles.target, { color: colors.text.secondary }]}>
              Цель: {formatCurrency(targetAmount, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Icon name="pencil" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}

          {onDelete && !isCompleted && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Icon name="delete" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ProgressBar progress={progress} status="good" />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Накоплено
          </Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(currentAmount, currency)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Осталось
          </Text>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>
            {formatCurrency(remainingAmount, currency)}
          </Text>
        </View>
      </View>

      {!isCompleted && (
        <>
          {remainingDays && remainingDays > 0 && (
            <View style={styles.deadlineContainer}>
              <Icon
                name="calendar-clock"
                size={16}
                color={colors.text.secondary}
              />
              <Text
                style={[styles.deadlineText, { color: colors.text.secondary }]}
              >
                Осталось {remainingDays} {getDaysWord(remainingDays)}
              </Text>
            </View>
          )}

          {getDailyRecommendation() && (
            <View style={styles.recommendationContainer}>
              <Icon name="lightbulb" size={16} color={colors.primary} />
              <Text
                style={[
                  styles.recommendationText,
                  { color: colors.text.secondary },
                ]}
              >
                Откладывайте {getDailyRecommendation()} в день, чтобы достичь
                цели вовремя
              </Text>
            </View>
          )}

          {onAdd && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: color }]}
              onPress={onAdd}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Добавить средства</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {isCompleted && (
        <View
          style={[styles.completedBadge, { backgroundColor: colors.success }]}
        >
          <Icon name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.completedText}>Цель достигнута!</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Вспомогательная функция для склонения слова "день"
const getDaysWord = (days: number): string => {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20))
    return 'дня';
  return 'дней';
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
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 70,
    flex: 1
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 25,
  },
  target: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
  },
  actionButton: {
    padding: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deadlineText: {
    fontSize: 12,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(78, 84, 200, 0.1)',
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
