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

export const PlanningScreen: React.FC<MainTabScreenProps<'Planning'>> = () => {
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [completedGoals, setCompletedGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load budgets with progress
      const budgetsProgress = await budgetService.getBudgetsProgress();
      setBudgets(budgetsProgress);

      // Load goals
      const activeGoals = await goalService.getActiveGoals();
      const completed = await goalService.getCompletedGoals();
      
      // Get category info for goals (for display)
      setGoals(activeGoals);
      setCompletedGoals(completed);
    } catch (error) {
      console.error('Failed to load planning data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleDeleteBudget = (budgetId: string) => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.deleteBudget(budgetId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete budget');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.deleteGoal(goalId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const handleAddToGoal = (goalId: string) => {
    Alert.prompt(
      'Add Funds',
      'Enter amount to add:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (amount) => {
            const numericAmount = parseFloat(amount || '0');
            if (isNaN(numericAmount) || numericAmount <= 0) {
              Alert.alert('Error', 'Please enter a valid amount');
              return;
            }
            try {
              await goalService.addToGoal(goalId, numericAmount);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to add funds');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

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
        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              Total Budget
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.text.primary }]}>
              {formatCurrency(totalBudget, user?.currency || 'USD')}
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              Total Spent
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(totalSpent, user?.currency || 'USD')}
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              Remaining
            </Text>
            <Text
              style={[
                styles.summaryAmount,
                { color: totalRemaining >= 0 ? colors.success : colors.error },
              ]}
            >
              {formatCurrency(totalRemaining, user?.currency || 'USD')}
            </Text>
          </View>
        </View>

        {/* Budgets Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Monthly Budgets
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddBudget(true)}
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Budget</Text>
          </TouchableOpacity>
        </View>

        {budgets.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
            <Icon name="chart-bell-curve" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Budgets Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Create budgets to track your spending
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddBudget(true)}
            >
              <Text style={styles.emptyButtonText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map((item) => (
            <BudgetCard
              key={item.budget.id}
              categoryName={item.category?.name || 'Unknown'}
              categoryIcon={item.category?.icon || 'help'}
              categoryColor={item.category?.color || colors.primary}
              budgetAmount={item.budget.amount}
              spent={item.spent}
              remaining={item.remaining}
              percentage={item.percentage}
              status={item.status}
              currency={user?.currency || 'USD'}
              onDelete={() => handleDeleteBudget(item.budget.id)}
            />
          ))
        )}

        {/* Goals Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Financial Goals
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddGoal(true)}
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 && completedGoals.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
            <Icon name="target" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Goals Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Set financial goals to stay motivated
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddGoal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Goal</Text>
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
                currency={user?.currency || 'USD'}
                onAdd={() => handleAddToGoal(goal.id)}
                onDelete={() => handleDeleteGoal(goal.id)}
              />
            ))}
            
            {completedGoals.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={[styles.completedTitle, { color: colors.text.secondary }]}>
                  Completed Goals
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
                    currency={user?.currency || 'USD'}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <AddBudgetModal
        visible={showAddBudget}
        onClose={() => setShowAddBudget(false)}
        onSuccess={loadData}
      />

      <AddGoalModal
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSuccess={loadData}
      />
    </View>
  );
};

// Helper function
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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