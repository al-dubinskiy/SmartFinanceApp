import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddFundsModalProps {
  visible: boolean;
  goalName: string;
  goalCurrentAmount: number;
  goalTargetAmount: number;
  currency?: string;
  onClose: () => void;
  onConfirm: (amount: number, note?: string) => Promise<void>;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({
  visible,
  goalName,
  goalCurrentAmount,
  goalTargetAmount,
  currency = 'RUB',
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const { user } = useAppSelector(state => state.auth);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  React.useEffect(() => {
    if (visible) {
      loadCurrentBalance();
    }
  }, [visible]);

  const loadCurrentBalance = async () => {
    try {
      const balance = await transactionService.getTotalBalance();
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const remainingAmount = goalTargetAmount - goalCurrentAmount;
  const maxAvailable = Math.min(currentBalance, remainingAmount);

  // Расчет предложенных сумм с учетом текущего баланса
  const suggestedAmounts = [
    Math.min(Math.round(remainingAmount * 0.1), currentBalance),
    Math.min(Math.round(remainingAmount * 0.25), currentBalance),
    Math.min(Math.round(remainingAmount * 0.5), currentBalance),
    Math.min(Math.round(remainingAmount * 0.75), currentBalance),
  ].filter(
    amount =>
      amount > 0 && amount <= remainingAmount && amount < currentBalance,
  );

  const handleConfirm = async () => {
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    if (numericAmount > currentBalance) {
      Alert.alert(
        'Недостаточно средств',
        `На вашем счету недостаточно средств. Доступно: ${formatCurrency(
          currentBalance,
          currency,
        )}`,
      );
      return;
    }

    if (numericAmount > remainingAmount) {
      Alert.alert(
        'Превышение цели',
        `Вы не можете добавить больше, чем осталось до цели (${formatCurrency(
          remainingAmount,
          currency,
        )})`,
      );
      return;
    }

    setIsLoading(true);
    try {
      const note = `Пополнение цели "${goalName}" на сумму ${formatCurrency(
        numericAmount,
        currency,
      )}`;
      await onConfirm(numericAmount, note);
      setAmount('');
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить средства');
      console.log(error)
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAmount = (suggestedAmount: number) => {
    setAmount(suggestedAmount.toString());
  };

  const handleMaxAmount = () => {
    setAmount(maxAvailable.toString());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            {/* Индикатор свайпа */}
            <View style={styles.swipeIndicatorContainer}>
              <View
                style={[
                  styles.swipeIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Добавить средства
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                {/* Информация о цели */}
                <View
                  style={[
                    styles.goalInfo,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[styles.goalName, { color: colors.text.primary }]}
                  >
                    {goalName}
                  </Text>
                  <View style={styles.goalProgress}>
                    <Text
                      style={[
                        styles.goalProgressText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Накоплено: {formatCurrency(goalCurrentAmount, currency)}{' '}
                      из {formatCurrency(goalTargetAmount, currency)}
                    </Text>
                    <Text
                      style={[
                        styles.goalRemainingText,
                        { color: colors.success },
                      ]}
                    >
                      Осталось: {formatCurrency(remainingAmount, currency)}
                    </Text>
                  </View>
                </View>

                {/* Информация о доступном балансе */}
                <View
                  style={[
                    styles.balanceInfo,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Icon name="wallet" size={16} color={colors.text.secondary} />
                  <Text
                    style={[
                      styles.balanceText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Доступно на счету:{' '}
                    {formatCurrency(currentBalance, currency)}
                  </Text>
                </View>

                {/* Поле ввода суммы */}
                <Text style={[styles.label, { color: colors.text.secondary }]}>
                  Сумма пополнения
                </Text>
                <View
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: colors.text.primary },
                    ]}
                  >
                    ₽
                  </Text>
                  <TextInput
                    style={[styles.amountField, { color: colors.text.primary }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.secondary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                  />
                </View>

                {/* Максимальная доступная сумма */}
                {/* {maxAvailable > 0 && (
                <TouchableOpacity
                  style={[
                    styles.maxButton,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={handleMaxAmount}
                >
                  <Text style={[styles.maxButtonText, { color: colors.primary }]}>
                    Максимум: {formatCurrency(maxAvailable, currency)}
                  </Text>
                </TouchableOpacity>
              )} */}

                {/* Предложенные суммы */}
                {suggestedAmounts.length > 0 && (
                  <View style={styles.suggestedContainer}>
                    <Text
                      style={[
                        styles.suggestedLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Быстрое пополнение:
                    </Text>
                    <View style={styles.suggestedButtons}>
                      {suggestedAmounts.map((suggested, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.suggestedButton,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => handleSuggestedAmount(suggested)}
                        >
                          <Text
                            style={[
                              styles.suggestedButtonText,
                              { color: colors.primary },
                            ]}
                          >
                            {formatCurrency(suggested, currency)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {maxAvailable > 0 && (
                        <TouchableOpacity
                          style={[
                            styles.suggestedButton,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={handleMaxAmount}
                        >
                          <Text
                            style={[
                              styles.suggestedButtonText,
                              { color: colors.success },
                            ]}
                          >
                            Всю сумму
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Предупреждение о недостатке средств */}
                {currentBalance <= 0 && (
                  <View
                    style={[
                      styles.warningContainer,
                      { backgroundColor: colors.error + '20' },
                    ]}
                  >
                    <Icon name="alert" size={16} color={colors.error} />
                    <Text style={[styles.warningText, { color: colors.error }]}>
                      Недостаточно средств на счету
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Кнопки действий */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: colors.border },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[styles.buttonText, { color: colors.text.secondary }]}
                >
                  Отмена
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirm}
                disabled={isLoading || currentBalance <= 0}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                    Добавить
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  goalInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalProgress: {
    gap: 4,
  },
  goalProgressText: {
    fontSize: 13,
  },
  goalRemainingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  balanceText: {
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  amountField: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 12,
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  maxButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestedContainer: {
    marginBottom: 20,
  },
  suggestedLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestedButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
