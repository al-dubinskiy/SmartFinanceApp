import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ListRenderItemInfo,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { TransactionItem } from '../../home/components/TransactionItem';
import transactionService from '../../../core/services/transaction.service';
import { SafeAreaView } from 'react-native-safe-area-context';
import categoryService from '../../../core/services/category.service';

interface AllTransactionsScreenProps {
  navigation: any;
  route: {
    params: {
      initialTransactions?: any[];
    };
  };
}

const PAGE_SIZE = 20;

export const AllTransactionsScreen: React.FC<AllTransactionsScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { initialTransactions = [] } = route.params;

  const [transactions, setTransactions] = useState<any[]>(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const listRef = useRef<FlashList<any>>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Загрузка общего количества транзакций
  const loadTotalCount = useCallback(async () => {
    try {
      const allTransactions = await transactionService.getAllTransactions();
      setTotalCount(allTransactions.length);
    } catch (error) {
      console.error('Failed to load total count:', error);
    }
  }, []);

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

  // Загрузка транзакций с пагинацией
  const loadTransactions = useCallback(
    async (page: number, refresh: boolean = false) => {
      if (refresh) {
        // setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
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

        // Получаем все транзакции с сортировкой по дате (новые сверху)
        const allTransactions = await transactionService.getAllTransactions();

        // Форматируем все транзакции
        const formattedAllTransactions = formatTransactions(
          allTransactions,
          categoryMap,
        );

        // Сортируем по дате (новые первые)
        const sortedTransactions = formattedAllTransactions.sort(
          (a: any, b: any) => {
            const dateA = a._raw?.date || a.date;
            const dateB = b._raw?.date || b.date;
            return dateB - dateA;
          },
        );

        // Пагинация
        const startIndex = (page - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedTransactions = sortedTransactions.slice(
          startIndex,
          endIndex,
        );

        if (refresh) {
          setTransactions(paginatedTransactions);
        } else {
          setTransactions(prev => [...prev, ...paginatedTransactions]);
        }

        // Проверяем, есть ли еще данные
        setHasMore(endIndex < sortedTransactions.length);
        setCurrentPage(page);
      } catch (error) {
        console.error('Failed to load transactions:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  // Загрузка с поиском
const searchTransactions = useCallback(
  async (query: string) => {
    if (!query.trim()) {
      // Если поиск пустой, загружаем обычные транзакции
      setCurrentPage(1);
      await loadTransactions(1, true);
      await loadTotalCount();
      return;
    }

    setIsLoading(true);
    try {
      // Получаем все категории для маппинга (как в loadTransactions)
      const allCategories = await categoryService.getAllCategories();
      const categoryMap = new Map<string, any>();

      // Функция для рекурсивного добавления всех категорий (включая подкатегории)
      const addCategoriesToMap = (cats: any[]) => {
        cats.forEach(cat => {
          const catData = cat._raw || cat;
          categoryMap.set(catData.id, {
            id: catData.id,
            name: catData.name,
            icon: catData.icon,
            color: catData.color,
            type: catData.type,
          });
          if (cat.children && cat.children.length > 0) {
            addCategoriesToMap(cat.children);
          }
        });
      };

      // Получаем деревья категорий для расходов и доходов
      const expenseTree = await categoryService.getCategoriesByTypeWithTree('expense');
      const incomeTree = await categoryService.getCategoriesByTypeWithTree('income');

      addCategoriesToMap(expenseTree);
      addCategoriesToMap(incomeTree);

      // Получаем все транзакции
      const allTransactions = await transactionService.getAllTransactions();

      // Форматируем и фильтруем транзакции
      const queryLower = query.toLowerCase();
      
      const filtered = allTransactions.filter((transaction: any) => {
        const raw = transaction._raw || transaction;
        const category = categoryMap.get(raw.category_id);
        const categoryName = category?.name?.toLowerCase() || '';
        const note = raw.note?.toLowerCase() || '';
        const amount = raw.amount?.toString() || '';

        return (
          categoryName.includes(queryLower) ||
          note.includes(queryLower) ||
          amount.includes(queryLower)
        );
      });

      // Форматируем отфильтрованные транзакции (как в loadTransactions)
      const formattedTransactions = filtered.map((t: any) => {
        const raw = t._raw || t;
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

      // Сортируем по дате (новые первые)
      const sorted = formattedTransactions.sort((a: any, b: any) => {
        return b.date - a.date;
      });

      setTransactions(sorted);
      setHasMore(false); // При поиске отключаем пагинацию
      setTotalCount(sorted.length);
    } catch (error) {
      console.error('Failed to search transactions:', error);
    } finally {
      setIsLoading(false);
    }
  },
  [loadTransactions, colors.text.secondary],
);

  // Обработчик поиска с debounce
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchTransactions(text);
      }, 300);
    },
    [searchTransactions],
  );

  // Загрузка следующих страниц
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !searchQuery.trim()) {
      loadTransactions(currentPage + 1, false);
    }
  }, [isLoadingMore, hasMore, currentPage, searchQuery, loadTransactions]);

  // Обновление (pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);

    if (searchQuery.trim()) {
      await searchTransactions(searchQuery);
    } else {
      await loadTransactions(1, true);
      await loadTotalCount();
    }

    setRefreshing(false);
  }, [searchQuery, searchTransactions, loadTransactions, loadTotalCount]);

  // Прокрутка вверх
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    // Скрываем кнопку после прокрутки
    setTimeout(() => {
      setShowScrollTop(false);
    }, 500);
  }, []);

  // Обработчик скролла для показа/скрытия кнопки
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Показываем кнопку после прокрутки на 300 пикселей
    setShowScrollTop(offsetY > 500);
  }, []);

  // Анимированное появление/исчезновение кнопки
  const buttonOpacity = scrollY.interpolate({
    inputRange: [0, 300, 301],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const buttonScale = scrollY.interpolate({
    inputRange: [0, 300, 301],
    outputRange: [0.5, 0.5, 1],
    extrapolate: 'clamp',
  });

  // Инициализация
  useEffect(() => {
    if (initialTransactions.length > 0) {
      // Если переданы начальные транзакции, используем их
      setTransactions(initialTransactions);
      setTotalCount(initialTransactions.length);
      setHasMore(false);
    } else {
      // Иначе загружаем с пагинацией
      loadTransactions(1, true);
      loadTotalCount();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleTransactionPress = (transaction: any) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction.id });
  };

  const handleTransactionDelete = async (transaction: any) => {
    try {
      await transactionService.deleteTransaction(transaction.id);

      // Обновляем список после удаления
      if (searchQuery.trim()) {
        await searchTransactions(searchQuery);
      } else {
        setCurrentPage(1);
        await loadTransactions(1, true);
        await loadTotalCount();
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<any>) => {
    const raw = item._raw || item;
    const transaction = {
      ...raw,
      category: raw.category,
    };

    return (
      <TransactionItem
        transaction={transaction}
        onPress={() => handleTransactionPress(transaction)}
        onDelete={() => handleTransactionDelete(transaction)}
      />
    );
  }, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Загрузка...
        </Text>
      </View>
    );
  }, [isLoadingMore, colors]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
      >
        <Icon
          name={searchQuery ? 'file-search-outline' : 'file-document-outline'}
          size={64}
          color={colors.text.secondary}
        />
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {searchQuery ? 'Ничего не найдено' : 'Нет транзакций'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <Icon name="plus" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Добавить транзакцию</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, colors, navigation]);

  if (isLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={[styles.header, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backIcon}
            >
              <Icon name="arrow-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Все транзакции
            </Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.text.secondary }]}
            >
              Загрузка транзакций...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
            Все транзакции
          </Text>
          {/* <TouchableOpacity
            onPress={scrollToTop}
            style={styles.scrollTopButton}
          >
            <Icon name="chevron-up" size={24} color={colors.primary} />
          </TouchableOpacity> */}
        </View>

        {/* Поиск */}
        <View
          style={[styles.searchContainer, { backgroundColor: colors.surface }]}
        >
          <Icon name="magnify" size={20} color={colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Поиск по названию, категории или сумме"
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon
                name="close-circle"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Количество транзакций */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: colors.text.secondary }]}>
            {searchQuery ? 'Найдено:' : 'Всего:'} {totalCount} транзакций
          </Text>
          {!searchQuery && hasMore && transactions.length > 0 && (
            <Text style={[styles.loadedText, { color: colors.text.secondary }]}>
              Показано: {transactions.length} из {totalCount}
            </Text>
          )}
        </View>

        <FlashList
          ref={listRef}
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          estimatedItemSize={80}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          windowSize={10}
        />
        {/* Плавающая кнопка прокрутки вверх */}
        {showScrollTop && (
          <View
            style={[
              styles.floatingScrollButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={scrollToTop}
              activeOpacity={0.8}
              style={styles.floatingButtonInner}
            >
              <Icon name="chevron-up" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    gap: 12,
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
  placeholder: {
    width: 32,
  },
  scrollTopButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    height: 50,
  },
  searchInput: {
    flex: 1,
    // fontSize: 16,
    // padding: 0,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
  },
  loadedText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  footerText: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  bottomSpacing: {
    height: 100,
  },
  floatingScrollButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
