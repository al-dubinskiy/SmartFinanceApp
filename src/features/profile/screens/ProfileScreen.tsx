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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import {
  setTheme,
  setCurrency,
  setBiometricsEnabled,
  setNotificationsEnabled,
  setLanguage,
} from '../../../store/slices/settingsSlice';
import pinService from '../../../core/services/pin.service';
import backupService from '../../../core/services/backup.service';
import { CSVImportModal } from '../components/CSVImportModal';
import { useNavigation } from '@react-navigation/native';
import { seedTestData } from '../../../database/seedData';

export const ProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { theme, currency, notificationsEnabled, language } = useAppSelector(
    state => state.settings,
  );

  const [hasPin, setHasPin] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    const exists = await pinService.hasPin();
    setHasPin(exists);
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
    setIsExporting(true);
    try {
      const filePath = await backupService.exportToJSON();
      await backupService.shareFile(filePath);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const filePath = await backupService.exportToCSV();
      await backupService.shareFile(filePath);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось экспортировать CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      'Импорт резервной копии',
      'Это действие заменит все текущие данные. Убедитесь, что у вас есть резервная копия.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Продолжить',
          onPress: async () => {
            Alert.alert('Информация', 'Функция скоро будет доступна');
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
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <Icon
          name={icon}
          size={24}
          color={danger ? colors.error : colors.primary}
        />
        <Text
          style={[
            styles.settingText,
            { color: danger ? colors.error : colors.text.primary },
          ]}
        >
          {label}
        </Text>
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
              'Экспорт в JSON (резервная копия)',
              isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              handleExportJSON,
            )}
            {renderSettingItem(
              'file-csv',
              'Экспорт в CSV',
              isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              handleExportCSV,
            )}
            {renderSettingItem(
              'upload',
              'Импорт CSV из банка',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => setShowCSVImport(true),
            )}
            {renderSettingItem(
              'restore',
              'Восстановить из резервной копии',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              handleImportBackup,
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
                  'Сброс данных',
                  'Все текущие данные будут заменены тестовыми. Это действие нельзя отменить.',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Сбросить',
                      style: 'destructive',
                      onPress: async () => {
                        await seedTestData();
                        Alert.alert('Готово', 'Тестовые данные загружены');
                      },
                    },
                  ],
                );
              },
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

      <CSVImportModal
        visible={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={() => {
          Alert.alert('Готово', 'CSV успешно импортирован');
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
  },
  settingText: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
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