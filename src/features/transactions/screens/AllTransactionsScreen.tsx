import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { TransactionItem } from '../../home/components/TransactionItem';
import transactionService from '../../../core/services/transaction.service';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AllTransactionsScreenProps {
  navigation: any;
  route: {
    params: {
      transactions: any[];
    };
  };
}

export const AllTransactionsScreen: React.FC<AllTransactionsScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { transactions: initialTransactions } = route.params;

  const [transactions, setTransactions] = useState(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTransactionPress = (transaction: any) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction.id });
  };

  const handleTransactionDelete = async (transaction: any) => {
    try {
      await transactionService.deleteTransaction(transaction.id);
      setTransactions(prev => prev.filter(t => t.id !== transaction.id));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // Фильтрация транзакций по поисковому запросу
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      transaction.category?.name?.toLowerCase().includes(query) ||
      transaction.note?.toLowerCase().includes(query) ||
      transaction.amount.toString().includes(query)
    );
  });

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
          <View style={styles.placeholder} />
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
            numberOfLines={1}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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
            {searchQuery ? 'Найдено:Rj' : 'Всего:'}{' '}
            {filteredTransactions.length} транзакций
          </Text>
        </View>

        {/* Список транзакций */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Icon
                name="file-document-outline"
                size={64}
                color={colors.text.secondary}
              />
              <Text
                style={[styles.emptyText, { color: colors.text.secondary }]}
              >
                {searchQuery ? 'Ничего не найдено' : 'Нет транзакций'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map(transaction => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onPress={() => handleTransactionPress(transaction)}
                onDelete={() => handleTransactionDelete(transaction)}
              />
            ))
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
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
  },
  bottomSpacing: {
    height: 100,
  },
});
