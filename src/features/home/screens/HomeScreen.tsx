import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabScreenProps } from '../../../navigation/types';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { BalanceCard } from '../components/BalanceCard';
import { TransactionItem } from '../components/TransactionItem';
import { formatMonthYear } from '../../../core/utils/formatters';
import { useIsFocused } from '@react-navigation/native';
import {
  getBudgetsCollection,
  getCategoriesCollection,
  getGoalsCollection,
  getTransactionsCollection,
} from '../../../database';

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const HomeScreen: React.FC<MainTabScreenProps<'Home'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { user } = useAppSelector(state => state.auth);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [totalBalance, setTotalBalance] = useState(0);

  // Функция для получения данных из _raw или напрямую
  const getRawData = (item: any) => {
    return item._raw || item;
  };

  // Форматирование транзакций для отображения
  const formatTransactions = (
    transactionsList: any[],
    categoryMap: Map<string, any>,
  ) => {
    return transactionsList.map((t: any) => {
      const raw = getRawData(t);
      const category = categoryMap.get(raw.category_id);

      return {
        id: t.id || raw.id,
        amount: raw.amount,
        type: raw.type,
        categoryId: raw.category_id,
        note: raw.note,
        date: raw.date,
        category: category
          ? {
              name: category.name,
              icon: category.icon,
              color: category.color,
            }
          : {
              name: 'Без категории',
              icon: 'help-circle',
              color: colors.text.secondary,
            },
      };
    });
  };

  const loadData = useCallback(async () => {
    try {
      const now = currentMonth;
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

      const statistics = await transactionService.getStatistics(
        startOfMonth,
        endOfMonth,
      );

      setStats({
        totalIncome: statistics.totalIncome,
        totalExpense: statistics.totalExpense,
        balance: statistics.balance,
      });

      const categories = await getCategoriesCollection().query().fetch();
      const goals = await getGoalsCollection().query().fetch();
      const budgets = await getBudgetsCollection().query().fetch();
      const transactions = await getTransactionsCollection().query().fetch();
      console.log(
        'Список всех категорий',
        categories.map(el => el._raw),
      );
      console.log(
        'Список всех бюджетов',
        budgets.map(el => el._raw),
      );
      console.log(
        'Список всех целей',
        goals.map(el => el._raw),
      );
      console.log(
        'Список всех транзакций',
        transactions.map(el => el._raw),
      );
      // Получаем все транзакции
      const allTransactionsList =
        await transactionService.getRecentTransactions(1000);

      // Получаем все категории для маппинга
      const allCategories = await categoryService.getAllCategories();
      const categoryMap = new Map<string, any>();

      // Функция для рекурсивного добавления всех категорий (включая подкатегории)
      const addCategoriesToMap = (cats: any[]) => {
        cats.forEach(cat => {
          const catData = cat._raw || cat;
          categoryMap.set(catData.id, catData);
          if (cat.children && cat.children.length > 0) {
            addCategoriesToMap(cat.children);
          }
        });
      };

      // Получаем деревья категорий для расходов и доходов
      const expenseTree = await categoryService.getCategoriesByTypeWithTree(
        'expense',
      );
      const incomeTree = await categoryService.getCategoriesByTypeWithTree(
        'income',
      );

      addCategoriesToMap(expenseTree);
      addCategoriesToMap(incomeTree);

      // Форматируем все транзакции
      const formattedAllTransactions = formatTransactions(
        allTransactionsList,
        categoryMap,
      );

      // Сортируем по дате (новые сверху)
      formattedAllTransactions.sort((a, b) => b.date - a.date);

      setAllTransactions(formattedAllTransactions);

      // Берем только первые 20 для отображения на главном экране
      const recentTransactions = formattedAllTransactions.slice(0, 20);
      setTransactions(recentTransactions);

      const totalBalanceCalc = await transactionService.getTotalBalance();
      setTotalBalance(totalBalanceCalc);

      // Логирование для отладки
      console.log(`📊 Всего транзакций: ${formattedAllTransactions.length}`);
      console.log(`📊 На главном экране: ${recentTransactions.length}`);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentMonth, colors, isFocused]);

  useEffect(() => {
    loadData();
  }, [loadData, isFocused]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleTransactionPress = (transaction: any) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction.id });
  };

  const handleTransactionDelete = (transaction: any) => {
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
              await transactionService.deleteTransaction(transaction.id);
              await loadData();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить транзакцию');
            }
          },
        },
      ],
    );
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }

    if (newDate > new Date()) return;

    setCurrentMonth(newDate);
    setIsLoading(true);
  };

  const handleAddTransaction = (type: 'income' | 'expense') => {
    navigation.getParent()?.navigate('AddTransactionModal', { type });
  };

  const handleViewAllTransactions = () => {
    // Передаем все транзакции на экран со списком
    navigation.navigate('AllTransactions', { transactions: allTransactions });
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <BalanceCard
          balance={0}
          income={0}
          expense={0}
          isLoading={true}
          totalBalance={totalBalance}
        />
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
        {/* Выбор месяца */}
        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={() => handleMonthChange('prev')}
            style={styles.monthButton}
          >
            <Icon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.monthText, { color: colors.text.primary }]}>
            {formatMonthYear(currentMonth.getTime())}
          </Text>

          <TouchableOpacity
            onPress={() => handleMonthChange('next')}
            style={styles.monthButton}
            disabled={currentMonth >= new Date()}
          >
            <Icon
              name="chevron-right"
              size={24}
              color={
                currentMonth >= new Date()
                  ? colors.text.secondary
                  : colors.text.primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Карточка баланса */}
        <BalanceCard
          balance={stats.balance}
          income={stats.totalIncome}
          expense={stats.totalExpense}
          currency={user?.currency || 'RUB'}
          totalBalance={totalBalance}
        />

        {/* Быстрые действия */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: colors.success }]}
            onPress={() => handleAddTransaction('income')}
          >
            <Icon name="arrow-up" size={24} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>Доход</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: colors.error }]}
            onPress={() => handleAddTransaction('expense')}
          >
            <Icon name="arrow-down" size={24} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>Расход</Text>
          </TouchableOpacity>
        </View>

        {/* Недавние транзакции */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Недавние транзакции
          </Text>
          {allTransactions.length > 20 ? (
            <TouchableOpacity onPress={handleViewAllTransactions}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Посмотреть все
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {transactions.length === 0 ? (
          <View
            style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
          >
            <Icon
              name="cash-multiple"
              size={64}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Пока нет транзакций
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Начните, добавив первый доход или расход
            </Text>
            {/* <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.success },
                ]}
                onPress={() => handleAddTransaction('income')}
              >
                <Icon name="arrow-up" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Добавить доход</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.error }]}
                onPress={() => handleAddTransaction('expense')}
              >
                <Icon name="arrow-down" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Добавить расход</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map(transaction => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onPress={() => handleTransactionPress(transaction)}
                onDelete={() => handleTransactionDelete(transaction)}
              />
            ))}

            {/* Индикатор, что есть еще транзакции */}
            {allTransactions.length > 20 && (
              <TouchableOpacity
                style={[
                  styles.showMoreButton,
                  { backgroundColor: colors.surface },
                ]}
                onPress={handleViewAllTransactions}
              >
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  + еще {allTransactions.length - 20} транзакций
                </Text>
                <Icon name="arrow-right" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, paddingTop: 60 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  monthButton: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 16,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  seeAllText: { fontSize: 14, fontWeight: '500' },
  transactionsList: { marginBottom: 8 },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: { height: 100 },
});
