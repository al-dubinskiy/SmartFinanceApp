import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { CategorySelector } from '../components/CategorySelector';
import { formatCurrency } from '../../../core/utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AddTransactionScreenProps {
  navigation: any;
  route?: {
    params?: {
      type?: 'income' | 'expense';
    };
  };
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    route?.params?.type || 'expense'
  );
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [transactionType]);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoriesByType(transactionType);
      setCategories(cats);
      
      if (cats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(cats[0].id);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAmountChange = (text: string) => {
    // Разрешаем только цифры и точку
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Защита от множественных точек
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Ограничиваем 2 знака после запятой
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    setAmount(cleaned);
  };

  const getNumericAmount = (): number => {
    if (!amount || amount === '') return 0;
    return parseFloat(amount);
  };

  const handleDonePress = async () => {
    const numericAmount = getNumericAmount();
    if (numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsLoading(true);
    try {
      await transactionService.createTransaction({
        amount: numericAmount,
        type: transactionType,
        categoryId: selectedCategoryId,
        note: note.trim() || undefined,
        date: date.getTime(),
        isRecurring: false,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayAmount = () => {
    const num = getNumericAmount();
    if (num === 0) return formatCurrency(0, user?.currency || 'USD');
    return formatCurrency(num, user?.currency || 'USD');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Add Transaction
        </Text>
        
        <View style={styles.placeholder} />
      </View>

      {/* Type Selector */}
      <View style={[styles.typeSelector, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === 'expense' && {
              backgroundColor: colors.error + '20',
            },
          ]}
          onPress={() => setTransactionType('expense')}
        >
          <Icon
            name="arrow-down"
            size={20}
            color={transactionType === 'expense' ? colors.error : colors.text.secondary}
          />
          <Text
            style={[
              styles.typeText,
              {
                color: transactionType === 'expense'
                  ? colors.error
                  : colors.text.secondary,
              },
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === 'income' && {
              backgroundColor: colors.success + '20',
            },
          ]}
          onPress={() => setTransactionType('income')}
        >
          <Icon
            name="arrow-up"
            size={20}
            color={transactionType === 'income' ? colors.success : colors.text.secondary}
          />
          <Text
            style={[
              styles.typeText,
              {
                color: transactionType === 'income'
                  ? colors.success
                  : colors.text.secondary,
              },
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount Input - с нативной клавиатурой */}
        <View style={[styles.amountContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.amountLabel, { color: colors.text.secondary }]}>
            Amount
          </Text>
          <TextInput
            style={[
              styles.amountInput,
              { 
                color: colors.text.primary,
                fontFamily: 'monospace',
              }
            ]}
            placeholder="0.00"
            placeholderTextColor={colors.text.secondary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
            autoFocus
            editable={!isLoading}
          />
          <Text style={[styles.amountPreview, { color: colors.text.secondary }]}>
            {formatDisplayAmount()}
          </Text>
        </View>

        {/* Note Input */}
        <View style={[styles.noteContainer, { backgroundColor: colors.surface }]}>
          <Icon name="pencil" size={20} color={colors.text.secondary} />
          <TextInput
            style={[styles.noteInput, { color: colors.text.primary }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.text.secondary}
            value={note}
            onChangeText={setNote}
            maxLength={50}
          />
        </View>

        {/* Category Selector */}
        <CategorySelector
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          type={transactionType}
        />

        {/* Date Picker */}
        <TouchableOpacity
          style={[styles.dateContainer, { backgroundColor: colors.surface }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar" size={20} color={colors.text.secondary} />
          <Text style={[styles.dateText, { color: colors.text.primary }]}>
            {date.toLocaleDateString()}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleDonePress}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Transaction'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  amountContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  amountPreview: {
    fontSize: 14,
    marginTop: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});