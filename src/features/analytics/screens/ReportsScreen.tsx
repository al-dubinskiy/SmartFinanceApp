import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency, formatDate } from '../../../core/utils/formatters';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import backupService from '../../../core/services/backup.service';

export const ReportsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, selectedCategoryId, selectedType, dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allTransactions = await transactionService.getRecentTransactions(1000);
      const allCategories = await categoryService.getAllCategories();
      setTransactions(allTransactions);
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    // Filter by category
    if (selectedCategoryId) {
      filtered = filtered.filter(t => t.categoryId === selectedCategoryId);
    }
    
    // Filter by date range
    const now = new Date();
    if (dateRange !== 'all') {
      let startDate: Date;
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter(t => t.date >= startDate.getTime());
    }
    
    setFilteredTransactions(filtered);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getTotalIncome = () => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpense = () => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleExportCSV = async () => {
    try {
      const filePath = await backupService.exportToCSV();
      await Share.share({
        url: `file://${filePath}`,
        message: 'Here is your transaction report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const handleExportJSON = async () => {
    try {
      const filePath = await backupService.exportToJSON();
      await Share.share({
        url: `file://${filePath}`,
        message: 'Here is your backup file',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export backup');
    }
  };

  const resetFilters = () => {
    setSelectedCategoryId('');
    setSelectedType('all');
    setDateRange('month');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Reports</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Icon name="filter-off" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Export Buttons */}
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.success }]}
          onPress={handleExportCSV}
        >
          <Icon name="file-excel" size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExportJSON}
        >
          <Icon name="backup-restore" size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export JSON</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Income</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(getTotalIncome())}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Expense</Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(getTotalExpense())}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Balance</Text>
          <Text style={[styles.summaryAmount, { color: getTotalIncome() - getTotalExpense() >= 0 ? colors.success : colors.error }]}>
            {formatCurrency(getTotalIncome() - getTotalExpense())}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedType === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={[styles.filterText, selectedType === 'all' && { color: '#FFFFFF' }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedType === 'income' && { backgroundColor: colors.success }]}
            onPress={() => setSelectedType('income')}
          >
            <Text style={[styles.filterText, selectedType === 'income' && { color: '#FFFFFF' }]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedType === 'expense' && { backgroundColor: colors.error }]}
            onPress={() => setSelectedType('expense')}
          >
            <Text style={[styles.filterText, selectedType === 'expense' && { color: '#FFFFFF' }]}>Expense</Text>
          </TouchableOpacity>
          
          <View style={styles.filterDivider} />
          
          <TouchableOpacity
            style={[styles.filterChip, dateRange === 'week' && { backgroundColor: colors.primary }]}
            onPress={() => setDateRange('week')}
          >
            <Text style={styles.filterText}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateRange === 'month' && { backgroundColor: colors.primary }]}
            onPress={() => setDateRange('month')}
          >
            <Text style={styles.filterText}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateRange === 'year' && { backgroundColor: colors.primary }]}
            onPress={() => setDateRange('year')}
          >
            <Text style={styles.filterText}>Year</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateRange === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setDateRange('all')}
          >
            <Text style={styles.filterText}>All Time</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView style={styles.transactionsList}>
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
            <Icon name="file-document-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No transactions found</Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, { backgroundColor: colors.surface }]}>
              <View>
                <Text style={[styles.transactionCategory, { color: colors.text.primary }]}>
                  {getCategoryName(transaction.categoryId)}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.text.secondary }]}>
                  {formatDate(transaction.date)}
                </Text>
                {transaction.note ? (
                  <Text style={[styles.transactionNote, { color: colors.text.secondary }]} numberOfLines={1}>
                    {transaction.note}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'income' ? colors.success : colors.error },
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  exportButtons: { flexDirection: 'row', gap: 12, padding: 16 },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  exportButtonText: { color: '#FFFFFF', fontWeight: '600' },
  summaryContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryAmount: { fontSize: 16, fontWeight: 'bold' },
  filtersContainer: { padding: 12, marginHorizontal: 16, borderRadius: 12, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterText: { fontSize: 14 },
  filterDivider: { width: 1, backgroundColor: '#ccc', marginHorizontal: 8 },
  transactionsList: { flex: 1 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginVertical: 4, padding: 12, borderRadius: 12 },
  transactionCategory: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  transactionDate: { fontSize: 12 },
  transactionNote: { fontSize: 12, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  emptyContainer: { margin: 16, padding: 40, borderRadius: 16, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  bottomSpacing: { height: 100 },
});