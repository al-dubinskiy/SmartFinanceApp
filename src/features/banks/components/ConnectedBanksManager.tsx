import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import bankConnectionService from '../../../core/services/bankConnection.service';
import transactionService from '../../../core/services/transaction.service';

interface ConnectedBanksManagerProps {
  visible: boolean;
  onClose: () => void;
}

type AutoSyncMode =
  | 'disabled'
  | 'manual'
  | 'daily_11am'
  | 'daily_9pm'
  | 'interval_20min';
type PeriodType =
  | '1day'
  | '1week'
  | '1month'
  | '3months'
  | '6months'
  | '1year'
  | 'all';

const PERIOD_OPTIONS = [
  {
    value: '1day',
    label: 'За последний день',
    icon: 'calendar-today',
    description: 'Загрузит операции за последние 24 часа',
  },
  {
    value: '1week',
    label: 'За последнюю неделю',
    icon: 'calendar-week',
    description: 'Загрузит операции за последние 7 дней',
  },
  {
    value: '1month',
    label: 'За последний месяц',
    icon: 'calendar-month',
    description: 'Загрузит операции за последние 30 дней',
  },
  {
    value: '3months',
    label: 'За последние 3 месяца',
    icon: 'calendar-range',
    description: 'Загрузит операции за последние 90 дней',
  },
  {
    value: '6months',
    label: 'За последние 6 месяцев',
    icon: 'calendar-range',
    description: 'Загрузит операции за последние 180 дней',
  },
  {
    value: '1year',
    label: 'За последний год',
    icon: 'calendar-multiselect',
    description: 'Загрузит операции за последние 365 дней',
  },
  {
    value: 'all',
    label: 'За все время',
    icon: 'infinite',
    description: 'Загрузит все доступные операции',
  },
];

const AUTO_SYNC_OPTIONS = [
  {
    value: 'disabled',
    label: 'Отключена',
    icon: 'minus-circle',
    description: 'Синхронизация полностью отключена',
  },
  {
    value: 'manual',
    label: 'Вручную',
    icon: 'gesture-tap',
    description: 'Синхронизация только по кнопке',
  },
  {
    value: 'daily_11am',
    label: 'Каждый день в 11:00',
    icon: 'clock',
    description: 'Автоматическая синхронизация каждый день в 11:00',
  },
  {
    value: 'daily_9pm',
    label: 'Каждый день в 21:00',
    icon: 'clock',
    description: 'Автоматическая синхронизация каждый день в 21:00',
  },
  {
    value: 'interval_20min',
    label: 'Каждые 20 минут с 8:00 до 23:00',
    icon: 'sync',
    description: 'Частая синхронизация в рабочее время',
  },
];

export const ConnectedBanksManager: React.FC<ConnectedBanksManagerProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [connections, setConnections] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [editingAccounts, setEditingAccounts] = useState<string | null>(null);
  const [editingNewAccountPeriod, setEditingNewAccountPeriod] = useState<
    string | null
  >(null);
  const [selectedPeriodForNewAccount, setSelectedPeriodForNewAccount] =
    useState<PeriodType>('1month');
  const [newAccountSyncConfig, setNewAccountSyncConfig] = useState<{
    period: PeriodType;
    accountsToSync: string[];
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadConnections();
    }
  }, [visible]);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const conns = await bankConnectionService.getConnections();
      setConnections(conns);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);

    // Проверяем, включена ли синхронизация
    if (connection?.syncSettings.autoSyncMode === 'disabled') {
      Alert.alert(
        'Синхронизация отключена',
        'Для выполнения синхронизации необходимо включить автосинхронизацию в настройках.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Включить',
            onPress: () => {
              // Предлагаем выбрать режим синхронизации
              Alert.alert(
                'Включение синхронизации',
                'Выберите режим синхронизации',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Вручную',
                    onPress: () =>
                      handleChangeAutoSyncMode(connectionId, 'manual'),
                  },
                  {
                    text: 'Ежедневно',
                    onPress: () =>
                      handleChangeAutoSyncMode(connectionId, 'daily_11am'),
                  },
                ],
              );
            },
          },
        ],
      );
      return;
    }

    setIsSyncing(connectionId);
    try {
      const result = await bankConnectionService.syncTransactions(
        connectionId,
        connection?.syncConfig?.period,
      );

      if (result.success) {
        Alert.alert(
          'Синхронизация завершена',
          `Добавлено ${result.count} новых транзакций`,
        );
        await loadConnections();
      } else {
        Alert.alert('Ошибка', 'Не удалось синхронизировать данные');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось синхронизировать данные');
    } finally {
      setIsSyncing(null);
    }
  };

  // Обновление списка синхронизируемых счетов для нового счета
  const handleToggleAccountForNewAccount = (accountId: string) => {
    if (!newAccountSyncConfig) return;

    const currentAccounts = [...newAccountSyncConfig.accountsToSync];
    let newAccounts: string[];

    if (currentAccounts.includes(accountId)) {
      newAccounts = currentAccounts.filter(id => id !== accountId);
    } else {
      newAccounts = [...currentAccounts, accountId];
    }

    setNewAccountSyncConfig({
      ...newAccountSyncConfig,
      accountsToSync: newAccounts,
    });
  };

  // Установка периода для нового счета
  const handleSetPeriodForNewAccount = (period: PeriodType) => {
    setSelectedPeriodForNewAccount(period);
  };

  // Сохранение настроек для нового счета
  const handleSaveNewAccountConfig = async (connectionId: string) => {
    if (!newAccountSyncConfig) return;

    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      const updatedConfig = {
        ...connection.syncConfig,
        period: newAccountSyncConfig.period,
        accountsToSync: newAccountSyncConfig.accountsToSync,
      };

      await bankConnectionService.updateSyncConfig(connectionId, updatedConfig);
      await loadConnections();
      setEditingNewAccountPeriod(null);
      setNewAccountSyncConfig(null);

      Alert.alert(
        '✅ Настройки сохранены',
        'Настройки синхронизации счетов обновлены',
      );
    }
  };

  // Открытие настройки для нового счета (при первом добавлении или изменении периода)
  const openNewAccountConfig = (connection: any) => {
    setNewAccountSyncConfig({
      period: connection.syncConfig?.period || '1month',
      accountsToSync:
        connection.syncConfig?.accountsToSync ||
        connection.accounts.map((a: any) => a.id),
    });
    setSelectedPeriodForNewAccount(connection.syncConfig?.period || '1month');
    setEditingNewAccountPeriod(connection.id);
  };

  // Обновление режима автосинхронизации
  const handleChangeAutoSyncMode = async (
    connectionId: string,
    mode: AutoSyncMode,
  ) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      connection.syncSettings.autoSyncMode = mode;
      connection.syncSettings.autoSync =
        mode !== 'disabled' && mode !== 'manual';
      await bankConnectionService.updateConnection(connectionId, connection);
      await loadConnections();

      // Показываем уведомление о включении/отключении
      //   if (mode === 'disabled') {
      //     Alert.alert('⏸️ Синхронизация отключена', 'Автоматическая синхронизация выключена. Вы можете включать синхронизацию вручную.');
      //   } else if (mode === 'manual') {
      //     Alert.alert('👆 Ручной режим', 'Синхронизация будет выполняться только по кнопке');
      //   } else {
      //     const option = AUTO_SYNC_OPTIONS.find(o => o.value === mode);
      //     Alert.alert('✅ Автосинхронизация включена', `Установлен режим: ${option?.label}`);
      //   }
    }
  };

  // Выбор всех счетов для нового счета
  const handleSelectAllAccountsForNew = (
    selectAll: boolean,
    accounts: any[],
  ) => {
    if (!newAccountSyncConfig) return;

    setNewAccountSyncConfig({
      ...newAccountSyncConfig,
      accountsToSync: selectAll ? accounts.map((a: any) => a.id) : [],
    });
  };

  // Отключение синхронизации для конкретного счета
  const handleToggleAccountSync = async (
    connectionId: string,
    accountId: string,
    currentStatus: boolean,
  ) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      const currentAccounts = connection.syncConfig?.accountsToSync || [];
      let newAccounts: string[];

      if (currentStatus) {
        // Отключаем синхронизацию счета
        newAccounts = currentAccounts.filter(id => id !== accountId);
      } else {
        // Включаем синхронизацию счета
        newAccounts = [...currentAccounts, accountId];
      }

      const updatedConfig = {
        ...connection.syncConfig,
        accountsToSync: newAccounts,
      };

      await bankConnectionService.updateSyncConfig(connectionId, updatedConfig);
      await loadConnections();

      Alert.alert(
        currentStatus
          ? '⏸️ Синхронизация отключена'
          : '✅ Синхронизация включена',
        currentStatus
          ? `Счет больше не будет синхронизироваться с приложением`
          : `Счет будет синхронизироваться с приложением`,
      );
    }
  };

  const handleDisconnect = (connectionId: string, bankName: string) => {
    Alert.alert(
      'Отключение банка',
      `Вы уверены, что хотите отключить ${bankName}? Транзакции останутся в приложении.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отключить',
          style: 'destructive',
          onPress: async () => {
            await bankConnectionService.removeConnection(connectionId);
            await loadConnections();
          },
        },
      ],
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAutoSyncLabel = (mode: string) => {
    const option = AUTO_SYNC_OPTIONS.find(o => o.value === mode);
    return option?.label || 'Отключена';
  };

  const getAutoSyncDescription = (mode: string) => {
    const option = AUTO_SYNC_OPTIONS.find(o => o.value === mode);
    return option?.description || '';
  };

  const getSyncPeriodLabel = (period: string) => {
    const option = PERIOD_OPTIONS.find(p => p.value === period);
    return option?.label || 'За последний месяц';
  };

  // Рендер модального окна настройки периода для нового счета
  const renderNewAccountConfigModal = (connection: any) => (
    <Modal
      visible={editingNewAccountPeriod === connection.id}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setEditingNewAccountPeriod(null);
        setNewAccountSyncConfig(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.configModal, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Счета для синхронизации
            </Text>
            <TouchableOpacity
              onPress={() => {
                setEditingNewAccountPeriod(null);
                setNewAccountSyncConfig(null);
              }}
            >
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              style={[
                styles.configSectionDesc,
                { color: colors.text.secondary },
              ]}
            >
              Выберите какие счета будут синхронизироваться с приложением
            </Text>

            <View style={styles.accountsModalHeader}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() =>
                  handleSelectAllAccountsForNew(true, connection.accounts)
                }
              >
                <Text style={[styles.selectAllText, { color: colors.primary }]}>
                  Выбрать все
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() =>
                  handleSelectAllAccountsForNew(false, connection.accounts)
                }
              >
                <Text style={[styles.selectAllText, { color: colors.error }]}>
                  Снять все
                </Text>
              </TouchableOpacity>
            </View>

            {connection.accounts.map((account: any) => {
              const isSelected = newAccountSyncConfig?.accountsToSync?.includes(
                account.id,
              );
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountSelectItem,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleToggleAccountForNewAccount(account.id)}
                >
                  <View style={styles.accountSelectIcon}>
                    <Icon
                      name={account.type === 'card' ? 'credit-card' : 'bank'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.accountSelectInfo}>
                    <Text
                      style={[
                        styles.accountSelectName,
                        { color: colors.text.primary },
                      ]}
                    >
                      {account.name}
                    </Text>
                    {account.type === 'card' && (
                      <Text
                        style={[
                          styles.accountSelectNumber,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {account.number}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.accountSelectBalance,
                        { color: colors.success },
                      ]}
                    >
                      {account.balance.toLocaleString()} ₽
                    </Text>
                  </View>
                  <Icon
                    name={
                      isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'
                    }
                    size={24}
                    color={isSelected ? colors.primary : colors.text.secondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={() => handleSaveNewAccountConfig(connection.id)}
          >
            <Text style={styles.saveButtonText}>Сохранить настройки</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Подключенные банки
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Подключенные банки
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {connections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="bank-off" size={64} color={colors.text.secondary} />
                <Text
                  style={[styles.emptyText, { color: colors.text.primary }]}
                >
                  Нет подключенных банков
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                  Подключите банк, чтобы автоматически синхронизировать
                  транзакции
                </Text>
              </View>
            ) : (
              connections.map(conn => {
                const isSyncDisabled =
                  conn.syncSettings.autoSyncMode === 'disabled';
                return (
                  <View
                    key={conn.id}
                    style={[
                      styles.bankCard,
                      { backgroundColor: colors.background },
                      isSyncDisabled && { opacity: 0.7 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.bankHeader}
                      onPress={() =>
                        setExpandedBank(
                          expandedBank === conn.id ? null : conn.id,
                        )
                      }
                    >
                      <View
                        style={[
                          styles.bankIcon,
                          { backgroundColor: colors.primary + '20' },
                        ]}
                      >
                        {/* <Icon 
                          name={isSyncDisabled ? "bank-off" : "bank"} 
                          size={24} 
                          color={isSyncDisabled ? colors.text.secondary : colors.primary} 
                        /> */}
                        <Image source={conn.icon} style={styles.bankLogo} />
                      </View>
                      <View style={styles.bankInfo}>
                        <Text
                          style={[
                            styles.bankName,
                            { color: colors.text.primary },
                          ]}
                        >
                          {conn.bankName}
                        </Text>
                        <Text
                          style={[
                            styles.bankStatus,
                            {
                              color: isSyncDisabled
                                ? colors.text.secondary
                                : colors.success,
                            },
                          ]}
                        >
                          {isSyncDisabled
                            ? '● Синхронизация отключена'
                            : conn.syncSettings.lastSyncStatus === 'success'
                            ? '● Синхронизировано'
                            : '● Ошибка синхронизации'}
                        </Text>
                      </View>
                      <Icon
                        name={
                          expandedBank === conn.id
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={24}
                        color={colors.text.secondary}
                      />
                    </TouchableOpacity>

                    {expandedBank === conn.id && (
                      <View style={styles.bankDetails}>
                        {/* Информация о синхронизации */}
                        {!isSyncDisabled && (
                          <>
                            <View style={styles.syncInfoContainer}>
                              <Icon
                                name="sync"
                                size={16}
                                color={colors.success}
                              />
                              <Text
                                style={[
                                  styles.syncInfoText,
                                  { color: colors.text.secondary },
                                ]}
                              >
                                Синхронизирован сегодня в{' '}
                                {new Date(conn.lastSync).toLocaleTimeString(
                                  'ru-RU',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </Text>
                            </View>

                            <View style={styles.syncInfoContainer}>
                              <Icon
                                name="clock-outline"
                                size={16}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.syncInfoText,
                                  { color: colors.text.secondary },
                                ]}
                              >
                                {conn.syncSettings.autoSyncMode ===
                                  'daily_11am' &&
                                  'Синхронизируется каждый день в 11:00'}
                                {conn.syncSettings.autoSyncMode ===
                                  'daily_9pm' &&
                                  'Синхронизируется каждый день в 21:00'}
                                {conn.syncSettings.autoSyncMode ===
                                  'interval_20min' &&
                                  'Синхронизируется каждые 20 минут с 8:00 до 23:00'}
                                {conn.syncSettings.autoSyncMode === 'manual' &&
                                  'Ручная синхронизация'}
                              </Text>
                            </View>
                          </>
                        )}

                        {/* Регистрационные данные */}
                        <View style={styles.registrationData}>
                          <Text
                            style={[
                              styles.registrationTitle,
                              { color: colors.text.primary },
                            ]}
                          >
                            Регистрационные данные
                          </Text>
                          <Text
                            style={[
                              styles.registrationText,
                              { color: colors.text.secondary },
                            ]}
                          >
                            +7 {conn.phoneNumber}
                          </Text>
                          {conn.cardNumber && (
                            <Text
                              style={[
                                styles.registrationText,
                                { color: colors.text.secondary },
                              ]}
                            >
                              Карта •••• {conn.cardNumber}
                            </Text>
                          )}
                        </View>

                        {/* Счета, доступные для синхронизации */}
                        <Text
                          style={[
                            styles.accountsTitle,
                            { color: colors.text.primary },
                          ]}
                        >
                          Счета, доступные для синхронизации
                        </Text>

                        {conn.accounts.map((account: any) => {
                          const isSynced =
                            conn.syncConfig?.accountsToSync?.includes(
                              account.id,
                            ) && !isSyncDisabled;
                          return (
                            <View key={account.id} style={styles.accountItem}>
                              <View style={styles.accountIcon}>
                                <Icon
                                  name={
                                    account.type === 'card'
                                      ? 'credit-card'
                                      : 'bank'
                                  }
                                  size={20}
                                  color={
                                    isSynced
                                      ? colors.primary
                                      : colors.text.secondary
                                  }
                                />
                              </View>
                              <View style={styles.accountInfo}>
                                <Text
                                  style={[
                                    styles.accountName,
                                    { color: colors.text.primary },
                                  ]}
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
                                    styles.accountBalance,
                                    { color: colors.success },
                                  ]}
                                >
                                  {account.balance.toLocaleString()} ₽
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.accountSyncToggle}
                                onPress={() =>
                                  handleToggleAccountSync(
                                    conn.id,
                                    account.id,
                                    isSynced,
                                  )
                                }
                                disabled={isSyncDisabled}
                              >
                                <View
                                  style={[
                                    styles.syncToggle,
                                    {
                                      backgroundColor: isSynced
                                        ? colors.success
                                        : colors.border,
                                      opacity: isSyncDisabled ? 0.5 : 1,
                                    },
                                  ]}
                                >
                                  <Icon
                                    name={isSynced ? 'sync' : 'sync-off'}
                                    size={14}
                                    color="#FFFFFF"
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.syncToggleText,
                                    {
                                      color: isSynced
                                        ? colors.success
                                        : colors.text.secondary,
                                    },
                                  ]}
                                >
                                  {isSynced
                                    ? 'Синхронизируется'
                                    : 'Не синхронизируется'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}

                        {/* Запускать синхронизацию */}
                        <View style={styles.autoSyncSection}>
                          <Text
                            style={[
                              styles.autoSyncTitle,
                              { color: colors.text.primary },
                            ]}
                          >
                            Запускать синхронизацию
                          </Text>

                          {AUTO_SYNC_OPTIONS.map(option => (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.autoSyncOption,
                                {
                                  backgroundColor:
                                    conn.syncSettings.autoSyncMode ===
                                    option.value
                                      ? colors.primary + '10'
                                      : 'transparent',
                                },
                              ]}
                              onPress={() =>
                                handleChangeAutoSyncMode(
                                  conn.id,
                                  option.value as AutoSyncMode,
                                )
                              }
                            >
                              <View style={styles.autoSyncOptionLeft}>
                                <Icon
                                  name={option.icon}
                                  size={22}
                                  color={
                                    option.value === 'disabled'
                                      ? colors.error
                                      : colors.primary
                                  }
                                />
                                <View>
                                  <Text
                                    style={[
                                      styles.autoSyncOptionLabel,
                                      {
                                        color:
                                          option.value === 'disabled'
                                            ? colors.error
                                            : colors.text.primary,
                                      },
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.autoSyncOptionDesc,
                                      { color: colors.text.secondary },
                                    ]}
                                  >
                                    {option.description}
                                  </Text>
                                </View>
                              </View>
                              <View
                                style={[
                                  styles.radioButton,
                                  {
                                    borderColor:
                                      conn.syncSettings.autoSyncMode ===
                                      option.value
                                        ? colors.primary
                                        : colors.border,
                                  },
                                ]}
                              >
                                {conn.syncSettings.autoSyncMode ===
                                  option.value && (
                                  <View
                                    style={[
                                      styles.radioButtonInner,
                                      { backgroundColor: colors.primary },
                                    ]}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Кнопка настройки счетов для синхронизации */}
                        {!isSyncDisabled && (
                          <TouchableOpacity
                            style={[
                              styles.configSyncButton,
                              { borderColor: colors.border },
                            ]}
                            onPress={() => openNewAccountConfig(conn)}
                          >
                            <Icon
                              name="calendar-sync"
                              size={20}
                              color={colors.primary}
                            />
                            <Text
                              style={[
                                styles.configSyncButtonText,
                                { color: colors.primary },
                              ]}
                            >
                              Настроить счета для синхронизации
                            </Text>
                          </TouchableOpacity>
                        )}

                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.syncButton,
                              isSyncDisabled && { opacity: 0.5 },
                            ]}
                            onPress={() => handleSync(conn.id)}
                            disabled={isSyncing === conn.id || isSyncDisabled}
                          >
                            {isSyncing === conn.id ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.primary}
                              />
                            ) : (
                              <>
                                <Icon
                                  name="sync"
                                  size={18}
                                  color={
                                    isSyncDisabled
                                      ? colors.text.secondary
                                      : colors.primary
                                  }
                                />
                                <Text
                                  style={[
                                    styles.actionText,
                                    {
                                      color: isSyncDisabled
                                        ? colors.text.secondary
                                        : colors.primary,
                                    },
                                  ]}
                                >
                                  Синхронизировать
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.disconnectButton,
                            ]}
                            onPress={() =>
                              handleDisconnect(conn.id, conn.bankName)
                            }
                          >
                            <Icon
                              name="link-off"
                              size={18}
                              color={colors.error}
                            />
                            <Text
                              style={[
                                styles.actionText,
                                { color: colors.error },
                              ]}
                            >
                              Отключить
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Модальное окно настройки периода */}
                    {renderNewAccountConfigModal(conn)}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

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
    maxHeight: '90%',
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
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  bankCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  bankStatus: {
    fontSize: 12,
  },
  bankDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  syncInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flex: 1,
    marginRight: 16,
  },
  syncInfoText: {
    fontSize: 13,
  },
  registrationData: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  registrationTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  registrationText: {
    fontSize: 13,
    marginBottom: 2,
  },
  accountsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 84, 200, 0.1)',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 12,
    marginBottom: 2,
  },
  accountBalance: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountSyncToggle: {
    alignItems: 'center',
    gap: 4,
  },
  syncToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncToggleText: {
    fontSize: 10,
  },
  autoSyncSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  autoSyncTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  autoSyncOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 50,
  },
  autoSyncOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  autoSyncOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoSyncOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  configSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  configSyncButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncButton: {
    backgroundColor: 'rgba(78, 84, 200, 0.1)',
  },
  disconnectButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  configModal: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  configSectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  accountsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  selectAllButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  accountSelectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 84, 200, 0.1)',
  },
  accountSelectInfo: {
    flex: 1,
  },
  accountSelectName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  accountSelectNumber: {
    fontSize: 12,
  },
  accountSelectBalance: {
    fontSize: 12,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bankLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
