// BankConnectionWizard.tsx - обновленный компонент

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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../core/hooks/useTheme';
import bankConnectionService from '../../../core/services/bankConnection.service';
import { BankSelector } from './BankSelector';

interface BankConnectionWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step =
  | 'select'
  | 'phone'
  | 'sms'
  | 'card'
  | 'accounts'
  | 'period'
  | 'loading';
type PeriodType =
  | '1day'
  | '1week'
  | '1month'
  | '3months'
  | '6months'
  | '1year'
  | 'all';

const PERIOD_OPTIONS = [
  //   { value: '1day', label: 'За последний день', icon: 'calendar-today' },
  //   { value: '1week', label: 'За последнюю неделю', icon: 'calendar-week' },
  //   { value: '1month', label: 'За последний месяц', icon: 'calendar-month' },
  { value: '3months', label: 'За последние 3 месяца', icon: 'calendar-range' },
  { value: '6months', label: 'За последние 6 месяцев', icon: 'calendar-range' },
  { value: '1year', label: 'За последний год', icon: 'calendar-multiselect' },
  { value: 'all', label: 'За все время', icon: 'infinite' },
];

export const BankConnectionWizard: React.FC<BankConnectionWizardProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('select');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1month');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const handleSelectBank = (bankId: string) => {
    setSelectedBank(bankId);
    setStep('phone');
  };

  const handleSendSms = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона');
      return;
    }

    setIsLoading(true);
    try {
      // Имитация отправки SMS
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('sms');
      setResendTimer(60);
      startTimer();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = () => {
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifySms = async () => {
    if (smsCode.length < 4) {
      Alert.alert('Ошибка', 'Введите код из SMS');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedBank === 'tinkoff') {
        setStep('card');
      } else {
        await loadAccounts();
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Неверный код подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCard = async () => {
    if (cardNumber.length < 4) {
      Alert.alert('Ошибка', 'Введите последние 4 цифры карты');
      return;
    }

    setIsLoading(true);
    setStep('loading');
    try {
      await loadAccounts();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подтвердить карту');
      setStep('card');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    setIsLoading(true);
    setStep('loading');

    try {
      let result;
      if (selectedBank === 'tinkoff') {
        result = await bankConnectionService.connectTinkoff(
          phoneNumber,
          smsCode,
          cardNumber,
        );
      } else {
        result = await bankConnectionService.connectOzonBank(
          phoneNumber,
          smsCode,
          cardNumber,
        );
      }

      if (result.success && result.accounts) {
        setAccounts(result.accounts);
        setSelectedAccounts(new Set(result.accounts.map(a => a.id)));
        setStep('accounts');
      } else {
        Alert.alert(
          'Ошибка',
          result.error || 'Не удалось подключиться к банку',
        );
        setStep('select');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подключиться к банку');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const toggleAllAccounts = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map(a => a.id)));
    }
  };

  const handleProceedToPeriod = () => {
    if (selectedAccounts.size === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы один счет для импорта');
      return;
    }
    setStep('period');
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      const connection = await bankConnectionService.getConnections();
      const lastConnection = connection[connection.length - 1];

      if (lastConnection) {
        // Обновляем конфигурацию синхронизации
        await bankConnectionService.updateSyncConfig(lastConnection.id, {
          period: selectedPeriod,
          accountsToSync: Array.from(selectedAccounts),
          autoSync: true,
          syncPeriod: 'daily',
        });

        // Выполняем первую синхронизацию с выбранным периодом
        const syncResult = await bankConnectionService.syncTransactions(
          lastConnection.id,
          selectedPeriod,
        );

        Alert.alert(
          '✅ Банк подключен',
          `Банк успешно подключен!\n\n` +
            `📊 Импортировано транзакций: ${syncResult.count}\n` +
            `📁 Выбрано счетов: ${selectedAccounts.size}\n` +
            `📅 Период загрузки: ${
              PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label
            }\n\n` +
            `Вы можете настроить автосинхронизацию в управлении банками`,
        );
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось завершить подключение');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedBank(null);
    setPhoneNumber('');
    setSmsCode('');
    setCardNumber('');
    setAccounts([]);
    setSelectedAccounts(new Set());
    setSelectedPeriod('1month');
    setResendTimer(0);
  };

  // Рендер шага выбора периода загрузки
  const renderPeriodStep = () => (
    <View style={styles.periodContainer}>
      {/* <Icon name="calendar-clock" size={48} color={colors.primary} /> */}
      {/* <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Период загрузки операций
      </Text> */}
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Выберите, за какой период загрузить операции с ваших счетов
      </Text>

      <ScrollView
        style={styles.periodList}
        showsVerticalScrollIndicator={false}
      >
        {PERIOD_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.periodOption,
              {
                backgroundColor:
                  selectedPeriod === option.value
                    ? colors.primary + '20'
                    : colors.surface,
                borderColor:
                  selectedPeriod === option.value
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={() => setSelectedPeriod(option.value as PeriodType)}
          >
            <View
              style={[
                styles.periodIcon,
                { backgroundColor: colors.primary + '10' },
              ]}
            >
              {option.icon === 'infinite' ? (
                <Ionicons name={option.icon} size={24} color={colors.primary} />
              ) : (
                <Icon name={option.icon} size={24} color={colors.primary} />
              )}
            </View>
            <View style={styles.periodInfo}>
              <Text
                style={[styles.periodLabel, { color: colors.text.primary }]}
              >
                {option.label}
              </Text>
              <Text
                style={[styles.periodHint, { color: colors.text.secondary }]}
              >
                {option.value === '1day' &&
                  'Загрузит операции за последние 24 часа'}
                {option.value === '1week' &&
                  'Загрузит операции за последние 7 дней'}
                {option.value === '1month' &&
                  'Загрузит операции за последние 30 дней'}
                {option.value === '3months' &&
                  'Загрузит операции за последние 90 дней'}
                {option.value === '6months' &&
                  'Загрузит операции за последние 180 дней'}
                {option.value === '1year' &&
                  'Загрузит операции за последние 365 дней'}
                {option.value === 'all' && 'Загрузит все доступные операции'}
              </Text>
            </View>
            {selectedPeriod === option.value && (
              <Icon name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.completeButton, { backgroundColor: colors.primary }]}
        onPress={handleComplete}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.completeButtonText}>
            Подключить и загрузить операции
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Рендер шага выбора счетов (обновленный)
  const renderAccountsStep = () => (
    <View style={styles.accountsContainer}>
      <View style={styles.accountsHeader}>
        <Text style={[styles.accountsTitle, { color: colors.text.primary }]}>
          Выберите счета для импорта
        </Text>
        <TouchableOpacity onPress={toggleAllAccounts}>
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selectedAccounts.size === accounts.length
              ? 'Отменить все'
              : 'Выбрать все'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.accountsList}>
        {accounts.map(account => (
          <TouchableOpacity
            key={account.id}
            style={[styles.accountCard, { backgroundColor: colors.surface }]}
            onPress={() => toggleAccount(account.id)}
          >
            <View style={styles.accountCheck}>
              <Icon
                name={
                  selectedAccounts.has(account.id)
                    ? 'checkbox-marked'
                    : 'checkbox-blank-outline'
                }
                size={24}
                color={
                  selectedAccounts.has(account.id)
                    ? colors.primary
                    : colors.text.secondary
                }
              />
            </View>
            <View
              style={[
                styles.accountIcon,
                { backgroundColor: colors.primary + '10' },
              ]}
            >
              <Icon
                name={account.type === 'card' ? 'credit-card' : 'bank'}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.accountInfo}>
              <Text
                style={[styles.accountName, { color: colors.text.primary }]}
              >
                {account.name}
              </Text>
              {account.type === 'card' && (
                <Text
                  style={[
                    styles.accountNumber,
                    { color: colors.text.secondary },
                  ]}
                >
                  {account.number}
                </Text>
              )}
              <Text
                style={[
                  styles.accountBalanceHint,
                  { color: colors.text.secondary },
                ]}
              >
                Баланс: {account.balance.toLocaleString()} ₽
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.accountFooter}>
        <Text style={[styles.selectedCount, { color: colors.text.secondary }]}>
          Выбрано счетов: {selectedAccounts.size}
        </Text>
        <TouchableOpacity
          style={[styles.nextPeriodButton, { backgroundColor: colors.primary }]}
          onPress={handleProceedToPeriod}
        >
          <Text style={styles.nextPeriodButtonText}>Далее →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Рендер остальных шагов (select, phone, sms, card, loading) остаются без изменений
  const renderSelectStep = () => (
    <BankSelector onSelectBank={handleSelectBank} />
  );

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="cellphone" size={48} color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Введите номер телефона
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Номер телефона, привязанный к вашему аккаунту{' '}
        {selectedBank === 'tinkoff' ? 'Т-Банка' : 'Ozon Банка'}
      </Text>

      <View style={[styles.inputContainer, { borderColor: colors.border }]}>
        <Text style={[styles.countryCode, { color: colors.text.primary }]}>
          +7
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text.primary }]}
          placeholder="XXX XXX XX XX"
          placeholderTextColor={colors.text.secondary}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={10}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleSendSms}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.nextButtonText}>Продолжить</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSmsStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="message-text" size={48} color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Введите код из SMS
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Мы отправили SMS с кодом на номер +7 {phoneNumber}
      </Text>

      <TextInput
        style={[
          styles.codeInput,
          { borderColor: colors.border, color: colors.text.primary },
        ]}
        placeholder="XXXXXX"
        placeholderTextColor={colors.text.secondary}
        keyboardType="number-pad"
        value={smsCode}
        onChangeText={setSmsCode}
        maxLength={6}
        textAlign="center"
      />

      {resendTimer > 0 ? (
        <Text style={[styles.timerText, { color: colors.text.secondary }]}>
          Повторно отправить через {resendTimer} сек
        </Text>
      ) : (
        <TouchableOpacity onPress={handleSendSms}>
          <Text style={[styles.resendText, { color: colors.primary }]}>
            Отправить код повторно
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleVerifySms}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.nextButtonText}>Подтвердить</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCardStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="credit-card" size={48} color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Подтверждение карты
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Введите последние 4 цифры вашей карты{' '}
        {selectedBank === 'tinkoff' ? 'Т-Банка' : 'Ozon Банка'}
      </Text>

      <TextInput
        style={[
          styles.cardInput,
          { borderColor: colors.border, color: colors.text.primary },
        ]}
        placeholder="XXXX"
        placeholderTextColor={colors.text.secondary}
        keyboardType="number-pad"
        value={cardNumber}
        onChangeText={setCardNumber}
        maxLength={4}
        textAlign="center"
      />

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleVerifyCard}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.nextButtonText}>Подтвердить</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLoadingStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Подключение к банку
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Пожалуйста, подождите...
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              {step === 'select'
                ? 'Подключить банк'
                : step === 'phone'
                ? 'Номер телефона'
                : step === 'sms'
                ? 'Код подтверждения'
                : step === 'card'
                ? 'Данные карты'
                : step === 'accounts'
                ? 'Выбор счетов'
                : step === 'period'
                ? 'Период загрузки'
                : 'Подключение'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {step === 'select' && renderSelectStep()}
          {step === 'phone' && renderPhoneStep()}
          {step === 'sms' && renderSmsStep()}
          {step === 'card' && renderCardStep()}
          {step === 'accounts' && renderAccountsStep()}
          {step === 'period' && renderPeriodStep()}
          {step === 'loading' && renderLoadingStep()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Обновленные стили
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '80%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 4 },
  stepContainer: { alignItems: 'center', paddingVertical: 20 },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
  },
  countryCode: { fontSize: 16, fontWeight: '500', marginRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    width: '80%',
    marginBottom: 16,
  },
  cardInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    width: '50%',
    marginBottom: 20,
    letterSpacing: 4,
  },
  nextButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  timerText: { fontSize: 13, marginBottom: 16 },
  resendText: { fontSize: 14, fontWeight: '500', marginBottom: 16 },

  // Стили для выбора счетов
  accountsContainer: { flex: 1 },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountsTitle: { fontSize: 16, fontWeight: '600' },
  selectAllText: { fontSize: 14, fontWeight: '500' },
  accountsList: { maxHeight: 400 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  accountCheck: { width: 32 },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  accountNumber: { fontSize: 12 },
  accountBalanceHint: { fontSize: 11, marginTop: 2 },
  accountFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  selectedCount: { fontSize: 13 },
  nextPeriodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextPeriodButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Стили для выбора периода
  periodContainer: { flex: 1 },
  periodList: { maxHeight: 400, marginBottom: 20 },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  periodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  periodInfo: { flex: 1 },
  periodLabel: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  periodHint: { fontSize: 12 },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  completeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
