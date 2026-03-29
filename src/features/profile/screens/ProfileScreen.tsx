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
      'Remove PIN',
      'Are you sure you want to remove PIN protection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await pinService.removePin();
            if (result.success) {
              setHasPin(false);
              Alert.alert('Success', 'PIN code has been removed.');
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
      Alert.alert('Error', 'Failed to export data');
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
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    // Будет реализован выбор файла и импорт
    Alert.alert(
      'Import Backup',
      'This will replace all existing data. Make sure you have a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            // TODO: Реализовать выбор JSON файла
            Alert.alert('Info', 'Feature coming soon');
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
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
        {/* User Info */}
        <View style={[styles.userInfo, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {user?.displayName || 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.text.secondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* Appearance Section */}
        {renderSection(
          'Appearance',
          renderSettingItem(
            'theme-light-dark',
            'Theme',
            <Text
              style={[styles.settingValue, { color: colors.text.secondary }]}
            >
              {theme === 'light'
                ? 'Light'
                : theme === 'dark'
                ? 'Dark'
                : 'System'}
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

        {/* Security Section */}
        {renderSection(
          'Security',
          <>
            {renderSettingItem(
              'pin',
              'PIN Code',
              hasPin ? (
                <TouchableOpacity onPress={handleRemovePin}>
                  <Text
                    style={[styles.settingValue, { color: colors.success }]}
                  >
                    Enabled
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => navigation.navigate('SetupPin')}
                >
                  <Text
                    style={[styles.settingValue, { color: colors.primary }]}
                  >
                    Setup
                  </Text>
                </TouchableOpacity>
              ),
            )}
            {/* {renderSettingItem(
              'fingerprint',
              'Biometrics',
              <Switch
                value={isBiometricsEnabled}
                onValueChange={(value) => dispatch(setBiometricsEnabled(value))}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor="#FFFFFF"
              />
            )} */}
          </>,
        )}

        {/* Preferences Section */}
        {renderSection(
          'Preferences',
          <>
            {renderSettingItem(
              'currency-usd',
              'Currency',
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
              'Language',
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
              'Notifications',
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

        {/* Data Management Section */}
        {renderSection(
          'Data Management',
          <>
            {renderSettingItem(
              'download',
              'Export as JSON (Backup)',
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
              'Export as CSV',
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
              'Import CSV from Bank',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => setShowCSVImport(true),
            )}
            {renderSettingItem(
              'restore',
              'Restore from Backup',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              handleImportBackup,
            )}
            {renderSettingItem(
              'format-list-bulleted',
              'Manage Categories',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => navigation.navigate('Categories'),
            )}
            {renderSettingItem(
              'file-chart',
              'Detailed Reports',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => navigation.navigate('Reports'),
            )}
            {renderSettingItem(
              'database-refresh',
              'Reset to Test Data',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => {
                Alert.alert(
                  'Reset Data',
                  'This will replace all your data with test data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        await seedTestData();
                        Alert.alert('Success', 'Test data has been loaded');
                      },
                    },
                  ],
                );
              },
            )}
          </>,
        )}

        {/* About Section */}
        {renderSection(
          'About',
          <>
            {renderSettingItem(
              'information',
              'Version',
              <Text
                style={[styles.settingValue, { color: colors.text.secondary }]}
              >
                1.0.0
              </Text>,
            )}
            {renderSettingItem(
              'shield-check',
              'Privacy Policy',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => Alert.alert('Privacy Policy', 'Coming soon'),
            )}
            {renderSettingItem(
              'file-document',
              'Terms of Service',
              <Icon
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />,
              () => Alert.alert('Terms of Service', 'Coming soon'),
            )}
          </>,
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Logout
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <CSVImportModal
        visible={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={() => {
          // Обновляем данные после импорта
          Alert.alert('Success', 'CSV imported successfully');
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
