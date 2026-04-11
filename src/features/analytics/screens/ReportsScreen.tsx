import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency, formatDate } from '../../../core/utils/formatters';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import * as XLSX from 'xlsx';
import { encode } from 'base64-arraybuffer';
import Papa from 'papaparse';
import Share from 'react-native-share';

export const ReportsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Фильтры
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<
    'all' | 'income' | 'expense'
  >('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'all'>(
    'month',
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, selectedCategoryId, selectedType, dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allTransactions = await transactionService.getRecentTransactions(
        1000,
      );
      const allCategories = await categoryService.getAllCategories();
      setTransactions(allTransactions);
      setCategories(allCategories);
    } catch (error) {
      console.error('Не удалось загрузить данные:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить транзакции');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    if (selectedCategoryId) {
      filtered = filtered.filter(t => t.categoryId === selectedCategoryId);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date(0);

      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate(),
          );
          break;
        case 'year':
          startDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate(),
          );
          break;
      }

      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    setFilteredTransactions(filtered);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Неизвестно';
  };

  const getTotalIncome = () =>
    filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

  const getTotalExpense = () =>
    filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

  const getCategoryStats = () => {
    const stats: Record<
      string,
      { name: string; amount: number; count: number }
    > = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const catId = t.categoryId;
        if (!stats[catId]) {
          stats[catId] = { name: getCategoryName(catId), amount: 0, count: 0 };
        }
        stats[catId].amount += t.amount || 0;
        stats[catId].count += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.amount - a.amount);
  };

  // Улучшенный CSV с правильным экранированием
  const generateCSV = () => {
    const data = filteredTransactions.map(t => ({
      Дата: formatDate(t.date),
      Тип: t.type === 'income' ? 'Доход' : 'Расход',
      Сумма: Number(t.amount),
      Категория: getCategoryName(t.categoryId),
      Заметка: t.note || '',
    }));

    // Основная таблица
    let csv = Papa.unparse(data, {
      delimiter: ';',
      newline: '\r\n',
    });

    // ===== Анализ категорий =====
    const categoryStats = getCategoryStats();

    if (categoryStats.length > 0) {
      csv += '\r\n\r\n\r\nАнализ по категориям\r\n';

      const categoryTable = Papa.unparse(
        categoryStats.map(stat => ({
          Категория: stat.name,
          Сумма: stat.amount,
          'Количество транзакций': stat.count,
        })),
        {
          delimiter: ';',
          newline: '\r\n',
        },
      );

      csv += categoryTable;
    }

    // ===== Общая статистика =====
    const statsData = [
      { Показатель: 'Общий доход', Значение: getTotalIncome() },
      { Показатель: 'Общий расход', Значение: getTotalExpense() },
      { Показатель: 'Баланс', Значение: getTotalIncome() - getTotalExpense() },
      {
        Показатель: 'Период',
        Значение:
          dateRange === 'week'
            ? 'Неделя'
            : dateRange === 'month'
            ? 'Месяц'
            : dateRange === 'year'
            ? 'Год'
            : 'За всё время',
      },
      {
        Показатель: 'Количество транзакций',
        Значение: filteredTransactions.length,
      },
    ];

    csv += '\r\n\r\nОбщая статистика\r\n';

    const statsTable = Papa.unparse(statsData, {
      delimiter: ';',
      newline: '\r\n',
    });

    csv += statsTable;

    // BOM для Excel
    return '\uFEFF' + csv;
  };
  // Надёжная генерация Excel
  const generateExcel = async (): Promise<string> => {
    const excelData = filteredTransactions.map(t => ({
      Дата: formatDate(t.date),
      Тип: t.type === 'income' ? 'Доход' : 'Расход',
      Сумма: Number(t.amount),
      Категория: getCategoryName(t.categoryId),
      Заметка: t.note || '',
    }));

    // ✅ Добавили период
    const periodLabel =
      dateRange === 'week'
        ? 'Неделя'
        : dateRange === 'month'
        ? 'Месяц'
        : dateRange === 'year'
        ? 'Год'
        : 'За всё время';

    const statsData = [
      { Показатель: 'Общий доход', Значение: getTotalIncome() },
      { Показатель: 'Общий расход', Значение: getTotalExpense() },
      { Показатель: 'Баланс', Значение: getTotalIncome() - getTotalExpense() },
      {
        Показатель: 'Количество транзакций',
        Значение: filteredTransactions.length,
      },
      {
        Показатель: 'Период', // ✅ ВОТ ОН
        Значение: periodLabel,
      },
    ];

    const categoryStats = getCategoryStats();
    const categoryData = categoryStats.map(stat => ({
      Категория: stat.name,
      Сумма: stat.amount,
      'Количество транзакций': stat.count,
    }));

    const wb = XLSX.utils.book_new();

    // ===== ТРАНЗАКЦИИ =====
    const wsTransactions = XLSX.utils.json_to_sheet(excelData);

    wsTransactions['!cols'] = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...excelData.map(r => String(r[key] || '').length),
      ),
    }));

    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Транзакции');

    // ===== КАТЕГОРИИ =====
    if (categoryData.length > 0) {
      const wsCategories = XLSX.utils.json_to_sheet(categoryData);

      wsCategories['!cols'] = Object.keys(categoryData[0]).map(key => ({
        wch: Math.max(
          key.length,
          ...categoryData.map(r => String(r[key] || '').length),
        ),
      }));

      XLSX.utils.book_append_sheet(wb, wsCategories, 'Анализ по категориям');
    }

    // ===== СТАТИСТИКА =====
    const wsStats = XLSX.utils.json_to_sheet(statsData);

    wsStats['!cols'] = Object.keys(statsData[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...statsData.map(r => String(r[key] || '').length),
      ),
    }));

    XLSX.utils.book_append_sheet(wb, wsStats, 'Общая статистика');

    // ===== EXPORT =====
    const buffer = XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
    }) as ArrayBuffer;

    return encode(buffer);
  };

  const shareFile = async (
    content: string,
    fileName: string,
    isBase64: boolean = false,
    mimeType: string = 'text/csv',
  ) => {
    setIsExporting(true);
    let filePath = '';

    try {
      const path = RNFS.CachesDirectoryPath;
      filePath = `${path}/${fileName}`;

      if (isBase64) {
        await RNFS.writeFile(filePath, content, 'base64');
      } else {
        await RNFS.writeFile(filePath, content, 'utf8');
      }

      const exists = await RNFS.exists(filePath);
      if (!exists) throw new Error('Файл не создан');

      const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;

      await Share.open({
        url,
        type: mimeType,
        filename: fileName,
        failOnCancel: false,
      });

      // cleanup
      setTimeout(async () => {
        try {
          if (await RNFS.exists(filePath)) {
            await RNFS.unlink(filePath);
          }
        } catch {}
      }, 5000);
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Ошибка', error.message || 'Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('Нет данных', 'Нет транзакций для экспорта.');
      return;
    }
    const csv = generateCSV();
    const fileName = `SmartFinance_Report_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    await shareFile(csv, fileName);
  };

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('Нет данных', 'Нет транзакций для экспорта.');
      return;
    }

    try {
      const excelBase64 = await generateExcel();
      const fileName = `SmartFinance_Report_${
        new Date().toISOString().split('T')[0]
      }.xlsx`;
      await shareFile(
        excelBase64,
        fileName,
        true,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (error: any) {
      console.error('Excel generation error:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать Excel-файл');
    }
  };

  const resetFilters = () => {
    setSelectedCategoryId('');
    setSelectedType('all');
    setDateRange('month');
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

  const categoryStats = getCategoryStats();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Отчёты
        </Text>
        <TouchableOpacity onPress={resetFilters}>
          <Icon name="filter-off" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Кнопки экспорта */}
      <View style={styles.exportSection}>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={handleExportCSV}
          >
            <Icon name="file-excel" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.success }]}
            onPress={handleExportExcel}
          >
            <Icon name="microsoft-excel" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Карточки сводки */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Доходы
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(getTotalIncome())}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Расходы
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(getTotalExpense())}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
            Баланс
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              {
                color:
                  getTotalIncome() - getTotalExpense() >= 0
                    ? colors.success
                    : colors.error,
              },
            ]}
          >
            {formatCurrency(getTotalIncome() - getTotalExpense())}
          </Text>
        </View>
      </View>

      {/* Фильтры */}
      <View
        style={[styles.filtersContainer, { backgroundColor: colors.surface }]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'all' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedType('all')}
          >
            <Text
              style={[
                styles.filterText,
                selectedType === 'all' && { color: '#FFFFFF' },
              ]}
            >
              Все
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'income' && { backgroundColor: colors.success },
            ]}
            onPress={() => setSelectedType('income')}
          >
            <Text
              style={[
                styles.filterText,
                selectedType === 'income' && { color: '#FFFFFF' },
              ]}
            >
              Доходы
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'expense' && { backgroundColor: colors.error },
            ]}
            onPress={() => setSelectedType('expense')}
          >
            <Text
              style={[
                styles.filterText,
                selectedType === 'expense' && { color: '#FFFFFF' },
              ]}
            >
              Расходы
            </Text>
          </TouchableOpacity>

          <View style={styles.filterDivider} />

          <TouchableOpacity
            style={[
              styles.filterChip,
              dateRange === 'week' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDateRange('week')}
          >
            <Text
              style={[
                styles.filterText,
                dateRange === 'week' ? { color: '#fff' } : {},
              ]}
            >
              Неделя
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              dateRange === 'month' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDateRange('month')}
          >
            <Text
              style={[
                styles.filterText,
                dateRange === 'month' ? { color: '#fff' } : {},
              ]}
            >
              Месяц
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              dateRange === 'year' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDateRange('year')}
          >
            <Text
              style={[
                styles.filterText,
                dateRange === 'year' ? { color: '#fff' } : {},
              ]}
            >
              Год
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              dateRange === 'all' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDateRange('all')}
          >
            <Text
              style={[
                styles.filterText,
                dateRange === 'all' ? { color: '#fff' } : {},
              ]}
            >
              За всё время
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Список транзакций */}
      <ScrollView style={styles.transactionsList}>
        {/* Статистика по категориям */}
        {categoryStats.length > 0 && (
          <View
            style={[
              styles.categoryStatsContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.categoryStatsTitle,
                { color: colors.text.primary },
              ]}
            >
              Топ категории расходов
            </Text>

            {categoryStats.slice(0, 5).map((stat, index) => (
              <View key={index} style={styles.categoryStatItem}>
                <View style={styles.categoryStatLeft}>
                  <Text
                    style={[
                      styles.categoryStatName,
                      { color: colors.text.primary },
                    ]}
                  >
                    {stat.name}
                  </Text>
                  <Text
                    style={[
                      styles.categoryStatCount,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {stat.count} транзакций
                  </Text>
                </View>
                <Text
                  style={[styles.categoryStatAmount, { color: colors.error }]}
                >
                  {formatCurrency(stat.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {/* Информация о количестве транзакций */}
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            Найдено транзакций: {filteredTransactions.length}
          </Text>
        </View>

        {filteredTransactions.length === 0 ? (
          <View
            style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
          >
            <Icon
              name="file-document-outline"
              size={64}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Транзакции не найдены
            </Text>
            <Text
              style={[styles.emptySubtext, { color: colors.text.secondary }]}
            >
              Измените фильтры или добавьте транзакции
            </Text>
          </View>
        ) : (
          filteredTransactions.map(transaction => (
            <View
              key={transaction.id}
              style={[
                styles.transactionItem,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={{flex: 1}}>
                  <Text
                    style={[
                      styles.transactionCategory,
                      { color: colors.text.primary },
                    ]}
                  >
                    {getCategoryName(transaction.categoryId)}
                  </Text>
                  <Text
                    style={[
                      styles.transactionDate,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatDate(transaction.date)}
                  </Text>
                  {transaction.note ? (
                    <Text
                      style={[
                        styles.transactionNote,
                        { color: colors.text.secondary },
                      ]}
                      numberOfLines={1}
                    >
                      {transaction.note}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.type === 'income'
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  infoContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  infoText: { fontSize: 14 },
  exportSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  exportSectionTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  exportButtons: { flexDirection: 'row', gap: 12 },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  exportButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryAmount: { fontSize: 16, fontWeight: 'bold' },
  filtersContainer: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: { fontSize: 14 },
  filterDivider: { width: 1, backgroundColor: '#ccc', marginHorizontal: 8 },
  categoryStatsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  categoryStatsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  categoryStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryStatLeft: { flex: 1 },
  categoryStatName: { fontSize: 14, fontWeight: '500' },
  categoryStatCount: { fontSize: 11, marginTop: 2 },
  categoryStatAmount: { fontSize: 14, fontWeight: '600' },
  transactionsList: { flex: 1 },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
  },
  transactionCategory: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  transactionDate: { fontSize: 12 },
  transactionNote: { fontSize: 12, marginTop: 2 },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  bottomSpacing: { height: 100 },
});
