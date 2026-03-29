import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency, formatDate } from '../../../core/utils/formatters';

interface TransactionItemProps {
  transaction: any;
  onPress: (transaction: any) => void;
  onDelete: (transaction: any) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  onDelete,
}) => {
  const { colors } = useTheme();
  const swipeableRef = React.useRef<Swipeable>(null);

  // Получаем данные из _raw или напрямую из модели
  const getRawData = () => {
    if (transaction._raw) {
      return transaction._raw;
    }
    return transaction;
  };

  const raw = getRawData();
  
  // Получаем значения
  const id = transaction.id || raw.id;
  const amount = raw.amount || transaction.amount;
  const type = raw.type || transaction.type;
  const note = raw.note || transaction.note;
  const date = raw.date || transaction.date;
  const category = transaction.category || raw.category;

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(raw);
        }}
      >
        <Icon name="delete" size={24} color="#FFFFFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const amountColor = type === 'income' ? colors.success : colors.error;
  const amountPrefix = type === 'income' ? '+' : '-';
  
  const getFormattedDate = () => {
    if (!date || isNaN(date)) {
      return 'Date not set';
    }
    return formatDate(date);
  };
  
  const getFormattedAmount = () => {
    if (!amount || isNaN(amount)) {
      return '$0.00';
    }
    return formatCurrency(amount);
  };

  const categoryName = category?.name || raw.category_name || 'Unknown';
  const categoryIcon = category?.icon || raw.category_icon || 'help';
  const categoryColor = category?.color || raw.category_color || colors.text.secondary;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        onPress={() => onPress(raw)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryColor + '20' },
          ]}
        >
          <Icon
            name={categoryIcon}
            size={24}
            color={categoryColor}
          />
        </View>

        <View style={styles.details}>
          <Text style={[styles.category, { color: colors.text.primary }]}>
            {categoryName}
          </Text>
          {note ? (
            <Text style={[styles.note, { color: colors.text.secondary }]} numberOfLines={1}>
              {note}
            </Text>
          ) : null}
          <Text style={[styles.date, { color: colors.text.secondary }]}>
            {getFormattedDate()}
          </Text>
        </View>

        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{getFormattedAmount()}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  note: {
    fontSize: 12,
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  deleteButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderRadius: 12,
    marginVertical: 4
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
});