import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';
import { pick, types } from '@react-native-documents/picker';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import {
  setTheme,
  setCurrency,
  setNotificationsEnabled,
  setLanguage,
} from '../../../store/slices/settingsSlice';
import pinService from '../../../core/services/pin.service';
import backupService from '../../../core/services/backup.service';
import { CSVImportModal } from '../components/CSVImportModal';
import { useNavigation } from '@react-navigation/native';
import { seedTestData } from '../../../database/seedData';
import { CSVImportWizard } from '../components/CSVImportWizard';
import transactionService from '../../../core/services/transaction.service';

export const ProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { theme, currency, notificationsEnabled, language } = useAppSelector(
    state => state.settings,
  );

  const [hasPin, setHasPin] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingTransactions, setIsClearingTransactions] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    checkPinStatus();
    loadTransactionCount();
  }, []);

  const checkPinStatus = async () => {
    const exists = await pinService.hasPin();
    setHasPin(exists);
  };

  const loadTransactionCount = async () => {
    try {
      const transactions = await transactionService.getAllTransactions();
      setTransactionCount(transactions.length);
    } catch (error) {
      console.error('Error loading transaction count:', error);
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Удаление PIN-кода',
      'Вы уверены, что хотите отключить защиту PIN-кодом?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const result = await pinService.removePin();
            if (result.success) {
              setHasPin(false);
              Alert.alert('Готово', 'PIN-код успешно удалён.');
            }
          },
        },
      ],
    );
  };

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const { savePath, fileName } = await backupService.exportToJSON();

      console.log('Файл создан по пути:', savePath);

      // Проверяем существование файла
      const fileExists = await RNFS.exists(savePath);
      console.log('Файл существует:', fileExists);

      if (!fileExists) {
        throw new Error('Файл не был создан');
      }
      console.log('Резервная копия сохранена:', savePath);

      // Показываем диалог с информацией о сохранении
      Alert.alert(
        '✅ Резервная копия создана',
        `Файл сохранен в папку ${
          Platform.OS === 'android' ? 'Download' : 'Documents'
        }:\n${fileName}\n\nВы можете:\n• Отправить файл через мессенджер\n• Сохранить в облачное хранилище\n• Скопировать на компьютер`,
        [
          {
            text: 'Отправить файл',
            onPress: async () => {
              try {
                // Пытаемся отправить через Share
                await Share.open({
                  url:
                    Platform.OS === 'android' ? savePath : `file://${savePath}`,
                  type: 'application/json',
                  title: 'Резервная копия SmartFinance',
                });
              } catch (shareError: any) {
                if (shareError?.message !== 'User did not share') {
                  Alert.alert(
                    'Информация',
                    `Файл находится по пути:\n${savePath}\n\nВы можете найти его в файловом менеджере.`,
                  );
                }
              }
            },
          },
          { text: 'OK' },
        ],
      );
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Export error:', error);
        Alert.alert('Ошибка', 'Не удалось экспортировать данные');
      }
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleImportJSON = async () => {
    Alert.alert(
      'Восстановление из резервной копии',
      'Это действие заменит все текущие данные. Убедитесь, что у вас есть резервная копия.\n\nВосстановление невозможно отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выбрать файл',
          onPress: async () => {
            try {
              const result = await pick({
                type: [types.allFiles],
              });

              const fileUri = result[0].uri;

              Alert.alert(
                'Подтверждение восстановления',
                'Все текущие данные будут заменены данными из резервной копии. Продолжить?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Восстановить',
                    style: 'destructive',
                    onPress: async () => {
                      setIsImporting(true);
                      try {
                        const importResult = await backupService.importFromJSON(
                          fileUri,
                        );
                        if (importResult.success) {
                          Alert.alert('Успешно', importResult.message);
                          // Перезагружаем данные после импорта
                          navigation.replace('Main');
                        } else {
                          Alert.alert('Ошибка', importResult.message);
                        }
                      } catch (error) {
                        Alert.alert(
                          'Ошибка',
                          'Не удалось восстановить данные из резервной копии',
                        );
                      } finally {
                        setIsImporting(false);
                      }
                    },
                  },
                ],
              );
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось выбрать файл');
            }
          },
        },
      ],
    );
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const filePath = await backupService.exportToCSV();

      await Share.open({
        url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
        type: 'text/csv',
        title: 'Экспорт транзакций SmartFinance',
        message: 'Экспорт транзакций в формате CSV',
      });

      Alert.alert('Успешно', 'CSV файл готов к отправке');
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('CSV export error:', error);
        Alert.alert('Ошибка', 'Не удалось экспортировать CSV');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Новая функция: удаление всех транзакций
  const handleClearTransactions = async () => {
    const count = transactionCount;

    if (count === 0) {
      Alert.alert('Информация', 'У вас нет транзакций для удаления.');
      return;
    }

    Alert.alert(
      '🗑️ Удаление всех транзакций',
      `Вы действительно хотите удалить ВСЕ транзакции (${count} шт.)?\n\n` +
        '⚠️ ВНИМАНИЕ:\n' +
        '• Будут удалены ТОЛЬКО транзакции\n' +
        '• Категории, бюджеты и цели сохранятся\n' +
        '• Статистика будет пересчитана\n\n' +
        'Это действие нельзя отменить!',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сделать резервную копию',
          onPress: () => {
            Alert.alert(
              'Создание резервной копии',
              'Рекомендуется сделать резервную копию перед удалением транзакций. Создать копию?',
              [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Создать копию', onPress: handleExportJSON },
                {
                  text: 'Продолжить без копии',
                  style: 'destructive',
                  onPress: () => confirmClearTransactions(),
                },
              ],
            );
          },
        },
        {
          text: `Удалить ${count} транзакций`,
          style: 'destructive',
          onPress: () => confirmClearTransactions(),
        },
      ],
    );
  };

  const confirmClearTransactions = () => {
    Alert.alert(
      'Подтвердите действие',
      'Вы уверены, что хотите безвозвратно удалить все транзакции?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да, удалить всё',
          style: 'destructive',
          onPress: async () => {
            setIsClearingTransactions(true);

            try {
              const result = await backupService.clearAllData();
              if (result.success) {
                Alert.alert('✅ Готово', result.message);
                // Перезагружаем приложение
                navigation.replace('Main');
              } else {
                Alert.alert('❌ Ошибка', result.message);
              }
              await loadTransactionCount(); // Обновляем счетчик

              Alert.alert(
                '✅ Транзакции удалены',
                `Успешно удалено ${transactionCount} транзакций.\n\n` +
                  `Баланс и статистика будут пересчитаны автоматически.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('Error clearing transactions:', error);
              Alert.alert(
                '❌ Ошибка',
                'Не удалось удалить транзакции. Попробуйте позже.',
              );
            } finally {
              setIsClearingTransactions(false);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Выход из аккаунта', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderSettingItem = (
    icon: string,
    label: string,
    rightElement: React.ReactNode,
    onPress?: () => void,
    danger?: boolean,
    description?: string,
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        {
        icon !== 'file-csv' ? (
          <Icon
            name={icon}
            size={24}
            color={danger ? colors.error : colors.primary}
          />
        ) : (
          <FontAwesome6Icon
            name={icon}
            size={20}
            style={{ marginLeft: 4 }}
            color={danger ? colors.error : colors.primary}
          />
        )}

        <View>
          <Text
            style={[
              styles.settingText,
              { color: danger ? colors.error : colors.text.primary },
            ]}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: colors.text.secondary },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>{rightElement}</View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Информация о пользователе */}
        <View style={[styles.userInfo, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {user?.displayName || 'Пользователь'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.text.secondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* Внешний вид */}
        {renderSection(
          'Внешний вид',
          renderSettingItem(
            'theme-light-dark',
            'Тема оформления',
            <Text
              style={[styles.settingValue, { color: colors.text.secondary }]}
            >
              {theme === 'light'
                ? 'Светлая'
                : theme === 'dark'
                ? 'Тёмная'
                : 'Как в системе'}
            </Text>,
            () => {
              const nextTheme =
                theme === 'light'
                  ? 'dark'
                  : theme === 'dark'
                  ? 'system'
                  : 'light';
              dispatch(setTheme(nextTheme));
            },
          ),
        )}

        {/* Безопасность */}
        {renderSection(
          'Безопасность',
          <>
            {renderSettingItem(
              'pin',
              'PIN-код',
              hasPin ? (
                <TouchableOpacity onPress={handleRemovePin}>
                  <Text
                    style={[styles.settingValue, { color: colors.success }]}
                  >
                    Включён
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => navigation.navigate('SetupPin')}
                >
                  <Text
                    style={[styles.settingValue, { color: colors.primary }]}
                  >
                    Настроить
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </>,
        )}

        {/* Настройки */}
        {renderSection(
          'Настройки',
          <>
            {renderSettingItem(
              'currency-usd',
              'Валюта',
              <TouchableOpacity
                onPress={() => {
                  const currencies = ['USD', 'EUR', 'GBP', 'UAH', 'RUB'];
                  const currentIndex = currencies.indexOf(currency);
                  const nextCurrency =
                    currencies[(currentIndex + 1) % currencies.length];
                  dispatch(setCurrency(nextCurrency));
                }}
              >
                <Text
                  style={[styles.settingValue, { color: colors.text.primary }]}
                >
                  {currency}
                </Text>
              </TouchableOpacity>,
            )}
            {renderSettingItem(
              'translate',
              'Язык',
              <TouchableOpacity
                onPress={() => {
                  const languages = ['en', 'ru', 'uk'];
                  const currentIndex = languages.indexOf(language);
                  const nextLanguage = languages[
                    (currentIndex + 1) % languages.length
                  ] as any;
                  dispatch(setLanguage(nextLanguage));
                }}
              >
                <Text
                  style={[styles.settingValue, { color: colors.text.primary }]}
                >
                  {language === 'en'
                    ? 'English'
                    : language === 'ru'
                    ? 'Русский'
                    : 'Українська'}
                </Text>
              </TouchableOpacity>,
            )}
            {renderSettingItem(
              'bell',
              'Уведомления',
              <Switch
                value={notificationsEnabled}
                onValueChange={value =>
                  dispatch(setNotificationsEnabled(value))
                }
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor="#FFFFFF"
              />,
            )}
          </>,
        )}

        {/* Управление данными */}
        {renderSection(
          'Управление данными',
          <>
            {renderSettingItem(
              'download',
              'Резервная копия (JSON)',
              isExportingJSON ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              handleExportJSON,
              false,
              'Полная копия всех данных',
            )}
            {renderSettingItem(
              'restore',
              'Восстановить из резервной копии',
              isImporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              handleImportJSON,
              false,
              'Восстановить все данные из JSON',
            )}
            {renderSettingItem(
              'file-csv',
              'Импорт CSV из банка',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => setShowCSVImport(true),
              false,
              'Импорт выписки из банка',
            )}
            {renderSettingItem(
              'format-list-bulleted',
              'Управление категориями',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => navigation.navigate('Categories'),
              false,
              'Добавление, редактирование категорий',
            )}
            {renderSettingItem(
              'file-chart',
              'Подробные отчёты',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => navigation.navigate('Reports'),
              false,
              'Аналитика доходов и расходов',
            )}
            {renderSettingItem(
              'database-refresh',
              'Загрузить тестовые данные',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => {
                Alert.alert(
                  'Тестовые данные',
                  'Все текущие данные будут заменены тестовыми. Это действие нельзя отменить.\n\nРекомендуется сделать резервную копию.',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Сделать резервную копию',
                      onPress: handleExportJSON,
                    },
                    {
                      text: 'Загрузить',
                      style: 'destructive',
                      onPress: async () => {
                        await seedTestData();
                        await loadTransactionCount();
                        Alert.alert('Готово', 'Тестовые данные загружены');
                        navigation.replace('Main');
                      },
                    },
                  ],
                );
              },
              false,
              '⚠️ Заменит все текущие данные',
            )}

            {/* Разделитель для опасных операций */}
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            {renderSettingItem(
              'delete-sweep',
              'Удалить все транзакции',
              isClearingTransactions ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <View style={styles.badgeContainer}>
                  {transactionCount > 0 && (
                    <View
                      style={[styles.badge, { backgroundColor: colors.error }]}
                    >
                      <Text style={styles.badgeText}>{transactionCount}</Text>
                    </View>
                  )}
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={colors.text.secondary}
                  />
                </View>
              ),
              handleClearTransactions,
              true,
              `Удалить ${transactionCount} транзакций\n(категории сохранятся)`,
            )}

            {renderSettingItem(
              'database-remove',
              'Очистить все данные',
              isClearing ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              () => {
                Alert.alert(
                  '⚠️ Очистка всех данных',
                  'Это действие удалит ВСЕ ваши данные:\n\n' +
                    '• Все транзакции\n' +
                    '• Все бюджеты\n' +
                    '• Все финансовые цели\n' +
                    '• Все категории\n\n' +
                    'Данные будут удалены без возможности восстановления!\n\n' +
                    'Рекомендуется перед очисткой сделать резервную копию.',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Сделать резервную копию',
                      onPress: () => handleExportJSON(),
                    },
                    {
                      text: 'Очистить всё',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Подтвердите действие',
                          'Вы уверены, что хотите безвозвратно удалить все данные?',
                          [
                            { text: 'Отмена', style: 'cancel' },
                            {
                              text: 'Да, удалить всё',
                              style: 'destructive',
                              onPress: async () => {
                                setIsClearing(true);
                                try {
                                  const result =
                                    await backupService.clearAllData();
                                  if (result.success) {
                                    Alert.alert('✅ Готово', result.message);
                                    // Перезагружаем приложение
                                    navigation.replace('Main');
                                  } else {
                                    Alert.alert('❌ Ошибка', result.message);
                                  }
                                } catch (error) {
                                  Alert.alert(
                                    '❌ Ошибка',
                                    'Не удалось очистить данные',
                                  );
                                } finally {
                                  setIsClearing(false);
                                }
                              },
                            },
                          ],
                        );
                      },
                    },
                  ],
                );
              },
              true,
              '⚠️ Полная очистка всех данных',
            )}
          </>,
        )}

        {/* О приложении */}
        {renderSection(
          'О приложении',
          <>
            {renderSettingItem(
              'information',
              'Версия',
              <Text
                style={[styles.settingValue, { color: colors.text.secondary }]}
              >
                1.0.0
              </Text>,
            )}
            {renderSettingItem(
              'shield-check',
              'Политика конфиденциальности',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => Alert.alert('Политика конфиденциальности', 'Скоро'),
            )}
            {renderSettingItem(
              'file-document',
              'Пользовательское соглашение',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => Alert.alert('Пользовательское соглашение', 'Скоро'),
            )}
          </>,
        )}

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Выйти из аккаунта
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <CSVImportWizard
        visible={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={() => {
          Alert.alert('Успешно', 'Транзакции импортированы');
          loadTransactionCount(); // Обновляем счетчик
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
