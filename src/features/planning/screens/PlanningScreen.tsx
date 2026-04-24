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
import budgetService from '../../../core/services/budget.service';
import goalService from '../../../core/services/goal.service';
import categoryService from '../../../core/services/category.service';
import { BudgetCard } from '../components/BudgetCard';
import { GoalCard } from '../components/GoalCard';
import { AddBudgetModal } from '../components/AddBudgetModal';
import { AddGoalModal } from '../components/AddGoalModal';
import { EditBudgetModal } from '../components/EditBudgetModal';
import { EditGoalModal } from '../components/EditGoalModal';
import { useIsFocused } from '@react-navigation/native';
import { AddFundsModal } from '../components/AddFundsModal';

type TabType = 'budgets' | 'goals';

export const PlanningScreen: React.FC<MainTabScreenProps<'Planning'>> = () => {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { user } = useAppSelector(state => state.auth);

  const [activeTab, setActiveTab] = useState<TabType>('budgets');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [completedGoals, setCompletedGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      // Загружаем бюджеты с прогрессом
      const budgetsProgress = await budgetService.getBudgetsProgress();
      setBudgets(budgetsProgress.reverse());

      // Загружаем цели
      const activeGoals = await goalService.getActiveGoals();
      const completed = await goalService.getCompletedGoals();

      setGoals(activeGoals);
      setCompletedGoals(completed);
    } catch (error) {
      console.error('Не удалось загрузить данные планирования:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, isFocused]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleEditBudget = (budget: any) => {
    setEditingBudget(budget);
    setShowEditBudget(true);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setShowEditGoal(true);
  };

  const handleDeleteBudget = (budgetId: string) => {
    Alert.alert(
      'Удаление бюджета',
      'Вы уверены, что хотите удалить этот бюджет?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.deleteBudget(budgetId);
              await loadData();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить бюджет');
            }
          },
        },
      ],
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert('Удаление цели', 'Вы уверены, что хотите удалить эту цель?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalService.deleteGoal(goalId);
            await loadData();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить цель');
          }
        },
      },
    ]);
  };

  const handleAddToGoal = (goal: any) => {
    setSelectedGoalForFunds(goal);
    setShowAddFunds(true);
  };

  const handleConfirmAddFunds = async (amount: number, note?: string) => {
    if (selectedGoalForFunds) {
      await goalService.addToGoal(selectedGoalForFunds.id, amount, note, true);
      await loadData();
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  const renderBudgetsTab = () => (
    <>
      {/* Сводка по бюджетам */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Общий бюджет
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.text.primary }]}>
            {formatCurrency(totalBudget, user?.currency || 'RUB')}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Потрачено
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(totalSpent, user?.currency || 'RUB')}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Осталось
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              { color: totalRemaining >= 0 ? colors.success : colors.error },
            ]}
          >
            {formatCurrency(totalRemaining, user?.currency || 'RUB')}
          </Text>
        </View>
      </View>

      {/* Кнопка добавления бюджета */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButtonLarge, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddBudget(true)}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonLargeText}>Добавить бюджет</Text>
        </TouchableOpacity>
      </View>

      {/* Список бюджетов */}
      {budgets.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Icon name="chart-bell-curve" size={64} color={colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Пока нет бюджетов
          </Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Создайте бюджеты для отслеживания расходов
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddBudget(true)}
          >
            <Text style={styles.emptyButtonText}>Создать бюджет</Text>
          </TouchableOpacity>
        </View>
      ) : (
        budgets.map(item => (
          <BudgetCard
            key={item.budget.id}
            categoryName={item.category?.name || 'Без категории'}
            categoryIcon={item.category?.icon || 'help'}
            categoryColor={item.category?.color || colors.primary}
            budgetAmount={item.budget.amount}
            spent={item.spent}
            remaining={item.remaining}
            percentage={item.percentage}
            status={item.status}
            currency={user?.currency || 'RUB'}
            onEdit={() => handleEditBudget(item)}
            onDelete={() => handleDeleteBudget(item.budget.id)}
          />
        ))
      )}
    </>
  );

  const renderGoalsTab = () => (
    <>
      {/* Кнопка добавления цели */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButtonLarge, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddGoal(true)}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonLargeText}>Добавить цель</Text>
        </TouchableOpacity>
      </View>

      {/* Список целей */}
      {goals.length === 0 && completedGoals.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Icon name="target" size={64} color={colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Пока нет целей
          </Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Поставьте финансовые цели для мотивации
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddGoal(true)}
          >
            <Text style={styles.emptyButtonText}>Создать цель</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {goals.map((goal: any) => (
            <GoalCard
              key={goal.id}
              id={goal.id}
              name={goal.name}
              icon={goal.icon}
              color={goal.color}
              targetAmount={goal.targetAmount}
              currentAmount={goal.currentAmount}
              deadline={goal.deadline}
              progress={goal.progress}
              isCompleted={false}
              currency={user?.currency || 'RUB'}
              onAdd={() => handleAddToGoal(goal)}
              onEdit={() => handleEditGoal(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
            />
          ))}

          {completedGoals.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={[styles.completedTitle, { color: colors.text.secondary }]}>
                Выполненные цели
              </Text>
              {completedGoals.map((goal: any) => (
                <GoalCard
                  key={goal.id}
                  id={goal.id}
                  name={goal.name}
                  icon={goal.icon}
                  color={goal.color}
                  targetAmount={goal.targetAmount}
                  currentAmount={goal.currentAmount}
                  deadline={goal.deadline}
                  progress={goal.progress}
                  isCompleted={true}
                  currency={user?.currency || 'RUB'}
                  onDelete={() => handleDeleteGoal(goal.id)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </>
  );

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
        {/* Segmented Control */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'budgets' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab('budgets')}
          >
            <Icon
              name="chart-bell-curve"
              size={18}
              color={activeTab === 'budgets' ? '#FFFFFF' : colors.text.secondary}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'budgets' ? '#FFFFFF' : colors.text.secondary,
                },
              ]}
            >
              Бюджеты
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'goals' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab('goals')}
          >
            <Icon
              name="target"
              size={18}
              color={activeTab === 'goals' ? '#FFFFFF' : colors.text.secondary}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'goals' ? '#FFFFFF' : colors.text.secondary,
                },
              ]}
            >
              Цели
            </Text>
          </TouchableOpacity>
        </View>

        {/* Контент активной вкладки */}
        {activeTab === 'budgets' ? renderBudgetsTab() : renderGoalsTab()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Модальные окна */}
      {showAddBudget && (
        <AddBudgetModal
          visible={showAddBudget}
          onClose={() => setShowAddBudget(false)}
          onSuccess={loadData}
        />
      )}

      {showAddGoal && (
        <AddGoalModal
          visible={showAddGoal}
          onClose={() => setShowAddGoal(false)}
          onSuccess={loadData}
        />
      )}

      {showEditBudget && (
        <EditBudgetModal
          visible={showEditBudget}
          budget={editingBudget}
          onClose={() => {
            setShowEditBudget(false);
            setEditingBudget(null);
          }}
          onSuccess={loadData}
        />
      )}

      {showEditGoal && (
        <EditGoalModal
          visible={showEditGoal}
          goal={editingGoal}
          onClose={() => {
            setShowEditGoal(false);
            setEditingGoal(null);
          }}
          onSuccess={loadData}
        />
      )}

      {showAddFunds && (
        <AddFundsModal
          visible={showAddFunds}
          goalName={selectedGoalForFunds?.name || ''}
          goalCurrentAmount={selectedGoalForFunds?.currentAmount || 0}
          goalTargetAmount={selectedGoalForFunds?.targetAmount || 0}
          currency={user?.currency || 'RUB'}
          onClose={() => {
            setShowAddFunds(false);
            setSelectedGoalForFunds(null);
          }}
          onConfirm={handleConfirmAddFunds}
        />
      )}
    </View>
  );
};

// Вспомогательная функция форматирования валюты
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 12,
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
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  addButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedSection: {
    marginTop: 16,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 100,
  },
});