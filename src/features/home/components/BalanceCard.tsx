import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';

interface BalanceCardProps {
  balance: number;
  income: number;
  expense: number;
  currency?: string;
  isLoading?: boolean;
  totalBalance?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  income,
  expense,
  currency = 'RUB',
  isLoading = false,
  totalBalance = 0,
}) => {
  const { colors } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.skeletonHeader}>
          <View style={[styles.skeletonText, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonAmount, { backgroundColor: colors.border }]} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text.secondary }]}>
          Общий баланс
        </Text>
        <Icon name="eye-off" size={20} color={colors.text.secondary} />
      </View>

      <Text style={[styles.balance, { color: colors.text.primary }]}>
        {formatCurrency(totalBalance, currency)}
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <Icon name="arrow-up" size={16} color={colors.success} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Доходы
            </Text>
            <Text style={[styles.statAmount, { color: colors.success }]}>
              {formatCurrency(income, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
            <Icon name="arrow-down" size={16} color={colors.error} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Расходы
            </Text>
            <Text style={[styles.statAmount, { color: colors.error }]}>
              {formatCurrency(expense, currency)}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  balance: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  skeletonHeader: {
    gap: 12,
  },
  skeletonText: {
    height: 14,
    width: 80,
    borderRadius: 4,
  },
  skeletonAmount: {
    height: 36,
    width: 150,
    borderRadius: 4,
    marginTop: 8,
  },
});