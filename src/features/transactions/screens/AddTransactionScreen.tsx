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
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { CategorySelector } from '../components/CategorySelector';
import { formatCurrency } from '../../../core/utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const { user } = useAppSelector(state => state.auth);

  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    route?.params?.type || 'expense',
  );
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Новые состояния для регулярных транзакций
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<
    'monthly' | 'weekly' | 'yearly'
  >('monthly');

  useEffect(() => {
    loadCategories();
  }, [transactionType]);

  // Сбрасываем переключатель при смене типа транзакции
  useEffect(() => {
    setIsRecurring(false);
  }, [transactionType]);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoriesByTypeWithTree(
        transactionType,
      );
      setCategories(cats);
    } catch (error) {
      console.error('Не удалось загрузить категории:', error);
    }
  };

  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, '');

    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

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
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Ошибка', 'Выберите категорию');
      return;
    }

    // Валидация для регулярных доходов
    if (isRecurring && transactionType === 'income') {
      Alert.alert(
        'Подтверждение',
        'Вы добавляете регулярный доход. Он будет автоматически добавляться каждый месяц. Продолжить?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Продолжить', onPress: saveTransaction },
        ],
      );
    } else {
      saveTransaction();
    }
  };

  const saveTransaction = async () => {
    setIsLoading(true);
    try {
      await transactionService.createTransaction({
        amount: numericAmount,
        type: transactionType,
        categoryId: selectedCategoryId,
        note: note.trim() || undefined,
        date: date.getTime(),
        isRecurring: isRecurring && transactionType === 'income', // Только для доходов
        recurringType:
          isRecurring && transactionType === 'income' ? recurringType : null,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить транзакцию');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayAmount = () => {
    const num = getNumericAmount();
    if (num === 0) return formatCurrency(0, user?.currency || 'RUB');
    return formatCurrency(num, user?.currency || 'RUB');
  };

  // Получаем текущую сумму для отображения
  const numericAmount = getNumericAmount();

  return (
    <SafeAreaView style={{flex: 1}}>
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
            Новая транзакция
          </Text>

          <View style={styles.placeholder} />
        </View>

        {/* Выбор типа транзакции */}
        <View
          style={[styles.typeSelector, { backgroundColor: colors.surface }]}
        >
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
              color={
                transactionType === 'expense'
                  ? colors.error
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    transactionType === 'expense'
                      ? colors.error
                      : colors.text.secondary,
                },
              ]}
            >
              Расход
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
              color={
                transactionType === 'income'
                  ? colors.success
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    transactionType === 'income'
                      ? colors.success
                      : colors.text.secondary,
                },
              ]}
            >
              Доход
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Сумма */}
          <View
            style={[
              styles.amountContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.amountLabel, { color: colors.text.secondary }]}
            >
              Сумма
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  color: colors.text.primary,
                  fontFamily: 'monospace',
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.text.secondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={handleAmountChange}
              autoFocus
              editable={!isLoading}
            />
            <Text
              style={[styles.amountPreview, { color: colors.text.secondary }]}
            >
              {formatDisplayAmount()}
            </Text>
          </View>

          {/* Заметка */}
          <View
            style={[styles.noteContainer, { backgroundColor: colors.surface }]}
          >
            <Icon name="pencil" size={20} color={colors.text.secondary} />
            <TextInput
              style={[styles.noteInput, { color: colors.text.primary }]}
              placeholder="Добавить заметку (необязательно)"
              placeholderTextColor={colors.text.secondary}
              value={note}
              onChangeText={setNote}
              maxLength={50}
            />
          </View>

          {/* Переключатель регулярного дохода - ТОЛЬКО ДЛЯ ДОХОДОВ */}
          {transactionType === 'income' && (
            <View
              style={[
                styles.recurringContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.recurringHeader}>
                <View style={styles.recurringIconContainer}>
                  <Icon
                    name={'calendar-blank'}
                    size={20}
                    color={isRecurring ? colors.success : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.recurringTitle,
                      { color: colors.text.primary },
                    ]}
                  >
                    Регулярный доход
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#767577', true: colors.success }}
                  thumbColor={isRecurring ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>

              {isRecurring && (
                <>
                  <Text
                    style={[
                      styles.recurringDescription,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Регулярные доходы будут автоматически добавляться каждый
                    месяц. Это удобно для зарплаты, аванса и других постоянных
                    поступлений.
                  </Text>

                  {/* Выбор периодичности */}
                  <View style={styles.periodicityContainer}>
                    <Text
                      style={[
                        styles.periodicityLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Периодичность:
                    </Text>
                    <View style={styles.periodicityButtons}>
                      <TouchableOpacity
                        style={[
                          styles.periodicityButton,
                          recurringType === 'monthly' && {
                            backgroundColor: colors.success + '20',
                            borderColor: colors.success,
                          },
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setRecurringType('monthly')}
                      >
                        <Text
                          style={[
                            styles.periodicityText,
                            {
                              color:
                                recurringType === 'monthly'
                                  ? colors.success
                                  : colors.text.secondary,
                            },
                          ]}
                        >
                          Ежемесячно
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.periodicityButton,
                          recurringType === 'weekly' && {
                            backgroundColor: colors.success + '20',
                            borderColor: colors.success,
                          },
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setRecurringType('weekly')}
                      >
                        <Text
                          style={[
                            styles.periodicityText,
                            {
                              color:
                                recurringType === 'weekly'
                                  ? colors.success
                                  : colors.text.secondary,
                            },
                          ]}
                        >
                          Еженедельно
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.periodicityButton,
                          recurringType === 'yearly' && {
                            backgroundColor: colors.success + '20',
                            borderColor: colors.success,
                          },
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setRecurringType('yearly')}
                      >
                        <Text
                          style={[
                            styles.periodicityText,
                            {
                              color:
                                recurringType === 'yearly'
                                  ? colors.success
                                  : colors.text.secondary,
                            },
                          ]}
                        >
                          Ежегодно
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Информация о следующем поступлении */}
                  <View
                    style={[
                      styles.infoBox,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Icon name="information" size={16} color={colors.primary} />
                    <Text
                      style={[
                        styles.infoText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Следующее поступление:{' '}
                      {formatCurrency(numericAmount, user?.currency || 'RUB')}{' '}
                      {recurringType === 'monthly' && 'через месяц'}
                      {recurringType === 'weekly' && 'через неделю'}
                      {recurringType === 'yearly' && 'через год'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Выбор категории */}
          <CategorySelector
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            type={transactionType}
          />

          {/* Дата */}
          <TouchableOpacity
            style={[styles.dateContainer, { backgroundColor: colors.surface }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color={colors.text.secondary} />
            <Text style={[styles.dateText, { color: colors.text.primary }]}>
              {date.toLocaleDateString('ru-RU')}
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
              locale="ru-RU"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Кнопка сохранения */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleDonePress}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Сохранение...' : 'Сохранить транзакцию'}
        </Text>
      </TouchableOpacity>
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
  recurringContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  recurringDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  periodicityContainer: {
    marginTop: 8,
    gap: 8,
  },
  periodicityLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  periodicityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  periodicityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodicityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
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
