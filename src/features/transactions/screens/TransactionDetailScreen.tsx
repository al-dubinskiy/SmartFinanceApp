import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency, formatDate } from '../../../core/utils/formatters';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { useIsFocused } from '@react-navigation/native';

interface TransactionDetailScreenProps {
  navigation: any;
  route: {
    params: {
      transactionId: string;
    };
  };
}

export const TransactionDetailScreen: React.FC<
  TransactionDetailScreenProps
> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const isFocus = useIsFocused();
  const { transactionId } = route.params;

  const [transaction, setTransaction] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransaction();
  }, [isFocus]);

  const loadTransaction = async () => {
    try {
      const transactions = await transactionService.getRecentTransactions(100);
      const found = transactions.find(t => t._raw.id === transactionId);
      setTransaction(found);

      if (found) {
        const cat = await categoryService.getCategoryById(found.categoryId);
        setCategory(cat);
      }
    } catch (error) {
      console.error('Failed to load transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Удаление транзакции',
      'Вы уверены, что хотите удалить эту транзакцию?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(transactionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить транзакцию');
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditTransaction', { transactionId });
  };

  // Функция для получения текста периодичности на русском
  const getRecurringTypeText = (type: string | null | undefined): string => {
    switch (type) {
      case 'monthly':
        return 'Ежемесячно';
      case 'weekly':
        return 'Еженедельно';
      case 'yearly':
        return 'Ежегодно';
      default:
        return '';
    }
  };

  // Функция для получения иконки периодичности
  const getRecurringIcon = (type: string | null | undefined): string => {
    switch (type) {
      case 'monthly':
        return 'calendar-month';
      case 'weekly':
        return 'calendar-week';
      case 'yearly':
        return 'calendar-today';
      default:
        return 'calendar-blank';
    }
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
      </View>
    );
  }

  if (!transaction) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Icon name="alert-circle" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          Транзакция не найдена
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const amountColor =
    transaction.type === 'income' ? colors.success : colors.error;
  const amountPrefix = transaction.type === 'income' ? '+' : '-';
  const isRecurring = transaction._raw.is_recurring || false;
  const recurringType = transaction._raw.recurring_type;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Детали транзакции
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerAction}>
            <Icon name="pencil" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
            <Icon name="delete" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.amountLabel, { color: colors.text.secondary }]}>
            Сумма
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}
            {formatCurrency(transaction.amount)}
          </Text>
        </View>

        {/* Category */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: category?.color + '20' },
              ]}
            >
              <Icon
                name={category?.icon || 'help'}
                size={32}
                color={category?.color}
              />
            </View>
            <View style={styles.categoryInfo}>
              <Text
                style={[styles.infoLabel, { color: colors.text.secondary }]}
              >
                Категория
              </Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {category?.name || 'Неизвестно'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recurring Info */}
        {category?.name !== 'Накопления' && transaction.type === 'income' ? (
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Icon
                name={getRecurringIcon(recurringType)}
                size={24}
                color={isRecurring ? colors.primary : colors.text.secondary}
              />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  Регулярный
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {isRecurring ? 'Да' : 'Нет'}
                </Text>
                {isRecurring && recurringType && (
                  <View style={styles.recurringBadge}>
                    <Icon
                      name={getRecurringIcon(recurringType)}
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.recurringTypeText,
                        { color: colors.primary },
                      ]}
                    >
                      {getRecurringTypeText(recurringType)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : null}
        {/* Date */}
       {category?.name !== 'Накопления' ?  <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={24} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text
                style={[styles.infoLabel, { color: colors.text.secondary }]}
              >
                Дата
              </Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {formatDate(transaction.date, 'long')}
              </Text>
            </View>
          </View>
        </View> : null}

        {/* Note */}
        {transaction.note ? (
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Icon name="note-text" size={24} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  Примечание
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {transaction.note}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Type */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Icon
              name={transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}
              size={24}
              color={
                transaction.type === 'income' ? colors.success : colors.error
              }
            />
            <View style={styles.infoContent}>
              <Text
                style={[styles.infoLabel, { color: colors.text.secondary }]}
              >
                Тип
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      transaction.type === 'income'
                        ? colors.success
                        : colors.error,
                  },
                ]}
              >
                {transaction.type === 'income' ? 'Доход' : 'Расход'}
              </Text>
            </View>
          </View>
        </View>

        {/* Created At */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Icon
              name="clock-outline"
              size={24}
              color={colors.text.secondary}
            />
            <View style={styles.infoContent}>
              <Text
                style={[styles.infoLabel, { color: colors.text.secondary }]}
              >
                Создано
              </Text>
              <Text
                style={[styles.infoValue, { color: colors.text.secondary }]}
              >
                {new Date(transaction.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    padding: 4,
  },
  amountCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 84, 200, 0.1)',
    alignSelf: 'flex-start',
  },
  recurringTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
