import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { ProgressBar } from './ProgressBar';
import { formatCurrency } from '../../../core/utils/formatters';

interface BudgetCardProps {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'good' | 'warning' | 'exceeded';
  currency?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  categoryName,
  categoryIcon,
  categoryColor,
  budgetAmount,
  spent,
  remaining,
  percentage,
  status,
  currency = 'USD',
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: categoryColor + '20' },
            ]}
          >
            <Icon name={categoryIcon} size={24} color={categoryColor} />
          </View>
          <View>
            <Text style={[styles.categoryName, { color: colors.text.primary }]}>
              {categoryName}
            </Text>
            <Text style={[styles.budgetAmount, { color: colors.text.secondary }]}>
              Budget: {formatCurrency(budgetAmount, currency)}
            </Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Icon name="pencil" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Icon name="delete" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Spent
          </Text>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {formatCurrency(spent, currency)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Remaining
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: status === 'exceeded' ? colors.error : colors.success },
            ]}
          >
            {formatCurrency(Math.max(0, remaining), currency)}
          </Text>
        </View>
      </View>

      <ProgressBar progress={percentage} status={status} />

      {status === 'exceeded' && (
        <Text style={[styles.warningText, { color: colors.error }]}>
          ⚠️ Budget exceeded by {formatCurrency(Math.abs(remaining), currency)}
        </Text>
      )}
      {status === 'warning' && (
        <Text style={[styles.warningText, { color: colors.warning }]}>
          ⚠️ Approaching budget limit ({(100 - percentage).toFixed(0)}% remaining)
        </Text>
      )}
    </TouchableOpacity>
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
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetAmount: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
  },
});