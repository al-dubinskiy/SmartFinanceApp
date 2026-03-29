import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { CategorySelector } from '../components/CategorySelector';
import DateTimePicker from '@react-native-community/datetimepicker';

interface EditTransactionScreenProps {
  navigation: any;
  route: {
    params: {
      transactionId: string;
    };
  };
}

export const EditTransactionScreen: React.FC<EditTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { transactionId } = route.params;
  
  const [transaction, setTransaction] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, []);

  useEffect(() => {
    if (transactionType) {
      loadCategories();
    }
  }, [transactionType]);

  const loadTransaction = async () => {
    try {
      const found = await transactionService.getTransactionById(transactionId);
      setTransaction(found);
      
      if (found) {
        const raw = found._raw || found;
        setAmount(raw.amount?.toString() || '0');
        setNote(raw.note || '');
        setSelectedCategoryId(raw.category_id);
        setTransactionType(raw.type || 'expense');
        setDate(new Date(raw.date || Date.now()));
      }
    } catch (error) {
      console.error('Failed to load transaction:', error);
      Alert.alert('Error', 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoriesByType(transactionType);
      setCategories(cats);
      
      // Проверяем, что выбранная категория существует в новом типе
      if (selectedCategoryId) {
        const categoryExists = cats.some(c => c.id === selectedCategoryId);
        if (!categoryExists && cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
      } else if (cats.length > 0) {
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

  const handleTypeChange = (type: 'income' | 'expense') => {
    setTransactionType(type);
  };

  const handleSave = async () => {
    const numericAmount = getNumericAmount();
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSaving(true);
    try {
      await transactionService.updateTransaction(transactionId, {
        amount: numericAmount,
        type: transactionType,
        categoryId: selectedCategoryId,
        note: note.trim() || undefined,
        date: date.getTime(),
      });
      
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      Alert.alert('Error', 'Failed to update transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(transactionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const formatDisplayAmount = () => {
    const num = getNumericAmount();
    if (num === 0) return formatCurrency(0);
    return formatCurrency(num);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Edit Transaction
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteIcon}>
          <Icon name="delete" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Selector */}
        <View style={[styles.typeSelector, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && {
                backgroundColor: colors.error + '20',
              },
            ]}
            onPress={() => handleTypeChange('expense')}
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
            onPress={() => handleTypeChange('income')}
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

        {/* Amount Input */}
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
            editable={!isSaving}
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
            editable={!isSaving}
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
          disabled={isSaving}
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
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="content-save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  deleteIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
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
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});