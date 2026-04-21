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
  Modal,
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
import { useNavigation } from '@react-navigation/native';
import { seedCategoriesData, seedTestData } from '../../../database/seedData';
import { CSVImportWizard } from '../components/CSVImportWizard';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { database } from '../../../database';

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

  // Cloud backup states
  const [isCloudBackupModalVisible, setIsCloudBackupModalVisible] =
    useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [isDownloadingFromCloud, setIsDownloadingFromCloud] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

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

  // ============ ФУНКЦИИ ЭКСПОРТА В FIRESTORE ============

  const getCurrentFirebaseUser = () => {
    const firebaseUser = auth().currentUser;
    if (!firebaseUser) {
      Alert.alert('Ошибка', 'Пользователь не авторизован в Firebase');
      return null;
    }
    return firebaseUser;
  };

  // Экспорт данных в Firestore
  const handleExportToCloud = async () => {
    const firebaseUser = getCurrentFirebaseUser();
    if (!firebaseUser) return;

    Alert.alert(
      'Экспорт в облако',
      'Экспортировать все данные в Firebase Cloud?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Экспортировать',
          onPress: async () => {
            setIsUploadingToCloud(true);

            try {
              // Получаем все данные из БД
              const categories = await database
                .get('categories')
                .query()
                .fetch();
              const transactions = await database
                .get('transactions')
                .query()
                .fetch();
              const budgets = await database.get('budgets').query().fetch();
              const goals = await database.get('goals').query().fetch();

              // Очищаем транзакции от undefined значений
              const cleanedTransactions = transactions.map(t => {
                const raw = t._raw || t;
                return raw;
                // return {
                //   id: raw.id || '',
                //   amount: raw.amount || 0,
                //   type: raw.type || 'expense',
                //   categoryId: raw.categoryId || '',
                //   note: raw.note || '',
                //   date: raw.date || Date.now(),
                //   isRecurring: raw.isRecurring || false,
                //   recurringType: raw.recurringType || null,
                //   location: raw.location || null,
                //   createdAt: raw.createdAt || Date.now(),
                //   updatedAt: raw.updatedAt || Date.now(),
                // };
              });

              // Очищаем категории от undefined значений
              const cleanedCategories = categories.map(c => {
                const raw = c._raw || c;
                return raw;
                // return {
                //   id: raw.id || '',
                //   name: raw.name || '',
                //   type: raw.type || 'expense',
                //   icon: raw.icon || 'help',
                //   color: raw.color || '#95A5A6',
                //   order: raw.order || 0,
                //   isActive: raw.isActive !== false,
                //   parentId: raw.parentId || '',
                //   createdAt: raw.createdAt || Date.now(),
                //   updatedAt: raw.updatedAt || Date.now(),
                // };
              });

              // Очищаем бюджеты от undefined значений
              const cleanedBudgets = budgets.map(b => {
                const raw = b._raw || b;
                return raw;
                // return {
                //   id: raw.id || '',
                //   categoryId: raw.categoryId || '',
                //   amount: raw.amount || 0,
                //   period: raw.period || 'monthly',
                //   month:
                //     raw.month !== undefined ? raw.month : new Date().getMonth(),
                //   year: raw.year || new Date().getFullYear(),
                //   isActive: raw.isActive !== false,
                //   createdAt: raw.createdAt || Date.now(),
                //   updatedAt: raw.updatedAt || Date.now(),
                // };
              });

              // Очищаем цели от undefined значений
              const cleanedGoals = goals.map(g => {
                const raw = g._raw || g;
                return raw;
                // return {
                //   id: raw.id || '',
                //   name: raw.name || '',
                //   targetAmount: raw.targetAmount || 0,
                //   currentAmount: raw.currentAmount || 0,
                //   deadline:
                //     raw.deadline || Date.now() + 365 * 24 * 60 * 60 * 1000,
                //   icon: raw.icon || 'flag',
                //   color: raw.color || '#4CAF50',
                //   isCompleted: raw.isCompleted || false,
                //   createdAt: raw.createdAt || Date.now(),
                //   updatedAt: raw.updatedAt || Date.now(),
                // };
              });

              // Формируем данные для экспорта
              const exportData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                userId: firebaseUser.uid,
                userEmail: firebaseUser.email || '',
                stats: {
                  transactionCount: cleanedTransactions.length,
                  categoryCount: cleanedCategories.length,
                  budgetCount: cleanedBudgets.length,
                  goalCount: cleanedGoals.length,
                },
                data: {
                  transactions: cleanedTransactions,
                  categories: cleanedCategories,
                  budgets: cleanedBudgets,
                  goals: cleanedGoals,
                },
              };

              // Создаем ID для бэкапа
              const backupId = `${firebaseUser.uid}_${Date.now()}`;

              // Сохраняем в Firestore
              await firestore()
                .collection('user_backups')
                .doc(backupId)
                .set({
                  backupId,
                  userId: firebaseUser.uid,
                  userEmail: firebaseUser.email || '',
                  createdAt: firestore.FieldValue.serverTimestamp(),
                  timestamp: Date.now(),
                  version: '1.0.0',
                  transactionCount: cleanedTransactions.length,
                  categoryCount: cleanedCategories.length,
                  budgetCount: cleanedBudgets.length,
                  goalCount: cleanedGoals.length,
                  backupData: exportData,
                  fileSize: JSON.stringify(exportData).length,
                });

              Alert.alert(
                '✅ Экспорт завершен',
                `Данные успешно сохранены в облаке!\n\n` +
                  `📊 Транзакций: ${cleanedTransactions.length}\n` +
                  `📁 Категорий: ${cleanedCategories.length}\n` +
                  `💰 Бюджетов: ${cleanedBudgets.length}\n` +
                  `🎯 Целей: ${cleanedGoals.length}\n` +
                  `🕐 Дата: ${new Date().toLocaleString('ru-RU')}`,
              );

              // Обновляем список бэкапов
              await loadCloudBackups();
            } catch (error: any) {
              console.error('Cloud export error:', error);
              Alert.alert(
                'Ошибка',
                error?.message || 'Не удалось экспортировать данные',
              );
            } finally {
              setIsUploadingToCloud(false);
            }
          },
        },
      ],
    );
  };

  // Загрузка списка облачных резервных копий
 const loadCloudBackups = async () => {
  const firebaseUser = getCurrentFirebaseUser();
  if (!firebaseUser) return;

  setIsLoadingBackups(true);
  try {
    // Сначала получаем все бэкапы пользователя без сортировки
    const backupsSnapshot = await firestore()
      .collection('user_backups')
      .where('userId', '==', firebaseUser.uid)
      .get();

    // Сортируем на клиенте
    const backups = backupsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20); // Ограничиваем 20 последними

    setCloudBackups(backups);
    setIsCloudBackupModalVisible(true);
  } catch (error) {
    console.error('Error loading cloud backups:', error);
    Alert.alert('Ошибка', 'Не удалось загрузить список резервных копий');
  } finally {
    setIsLoadingBackups(false);
  }
};

  // Восстановление из облака
  // Восстановление из облака
const handleRestoreFromCloud = async (backup: any) => {
  Alert.alert(
    'Восстановление из облака',
    `Вы уверены, что хотите восстановить данные из резервной копии от ${new Date(backup.timestamp).toLocaleString('ru-RU')}?\n\n` +
    `📊 Транзакций в бэкапе: ${backup.transactionCount || 0}\n` +
    `📁 Категорий: ${backup.categoryCount || 0}\n` +
    `💰 Бюджетов: ${backup.budgetCount || 0}\n` +
    `🎯 Целей: ${backup.goalCount || 0}\n` +
    `⚠️ ВНИМАНИЕ: Все текущие данные будут заменены!`,
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Восстановить',
        style: 'destructive',
        onPress: async () => {
          setIsDownloadingFromCloud(true);
          
          try {
            const backupData = backup.backupData;
            
            console.log('=== ДИАГНОСТИКА ВОССТАНОВЛЕНИЯ ===');
            console.log('backup.id:', backup.id);
            console.log('backup.transactionCount:', backup.transactionCount);
            console.log('backup.categoryCount:', backup.categoryCount);
            console.log('backup.budgetCount:', backup.budgetCount);
            console.log('backup.goalCount:', backup.goalCount);
            
            if (!backupData) {
              throw new Error('Неверный формат резервной копии: backupData отсутствует');
            }
            
            // Проверяем разные возможные структуры данных
            let transactions = [];
            let categories = [];
            let budgets = [];
            let goals = [];
            
            // Вариант 1: backupData.data.transactions
            if (backupData.data && backupData.data.transactions) {
              transactions = backupData.data.transactions;
              categories = backupData.data.categories || [];
              budgets = backupData.data.budgets || [];
              goals = backupData.data.goals || [];
              console.log('Структура 1: backupData.data');
            }
            // Вариант 2: backupData.transactions
            else if (backupData.transactions) {
              transactions = backupData.transactions;
              categories = backupData.categories || [];
              budgets = backupData.budgets || [];
              goals = backupData.goals || [];
              console.log('Структура 2: backupData');
            }
            // Вариант 3: backupData.data
            else if (backupData.data) {
              if (Array.isArray(backupData.data)) {
                transactions = backupData.data;
              } else {
                transactions = backupData.data.transactions || [];
                categories = backupData.data.categories || [];
                budgets = backupData.data.budgets || [];
                goals = backupData.data.goals || [];
              }
              console.log('Структура 3: backupData.data');
            }
            
            console.log(`Найдено транзакций: ${transactions.length}`);
            console.log(`Найдено категорий: ${categories.length}`);
            console.log(`Найдено бюджетов: ${budgets.length}`);
            console.log(`Найдено целей: ${goals.length}`);
            
            if (transactions.length === 0 && categories.length === 0 && budgets.length === 0 && goals.length === 0) {
              throw new Error('Нет данных для восстановления');
            }
            
            // Получаем существующие данные
            const existingCategories = await database.get('categories').query().fetch();
            const existingTransactions = await database.get('transactions').query().fetch();
            const existingBudgets = await database.get('budgets').query().fetch();
            const existingGoals = await database.get('goals').query().fetch();
            
            console.log(`Существующих категорий: ${existingCategories.length}`);
            console.log(`Существующих транзакций: ${existingTransactions.length}`);
            console.log(`Существующих бюджетов: ${existingBudgets.length}`);
            console.log(`Существующих целей: ${existingGoals.length}`);
            
            // Удаляем существующие данные (в правильном порядке - сначала зависимые)
            await database.write(async () => {
              console.log('Удаление существующих транзакций...');
              for (const tx of existingTransactions) {
                await tx.destroyPermanently();
              }
              console.log('Удаление существующих бюджетов...');
              for (const budget of existingBudgets) {
                await budget.destroyPermanently();
              }
              console.log('Удаление существующих целей...');
              for (const goal of existingGoals) {
                await goal.destroyPermanently();
              }
              console.log('Удаление существующих категорий...');
              for (const category of existingCategories) {
                await category.destroyPermanently();
              }
            });
            
            console.log('Существующие данные удалены');
            
            // Создаем карту старых ID -> новых ID для категорий
            const categoryIdMap = new Map();
            
            // Восстанавливаем категории
            let restoredCategories = 0;
            if (categories.length > 0) {
              await database.write(async () => {
                const categoriesCollection = database.get('categories');
                for (const cat of categories) {
                  try {
                    if (cat && cat.name) {
                      const oldId = cat.id || cat._raw?.id;
                      const newCategory = await categoriesCollection.create((record: any) => {
                        record.name = cat.name || '';
                        record.type = cat.type || 'expense';
                        record.icon = cat.icon || 'help';
                        record.color = cat.color || '#95A5A6';
                        record.order = cat.order || 0;
                        record.isActive = cat.isActive !== false;
                        record.parentId = ''; // Сначала пусто, потом обновим
                        record.createdAt = cat.createdAt || cat.created_at || Date.now();
                        record.updatedAt = cat.updatedAt || cat.updated_at || Date.now();
                      });
                      // Сохраняем соответствие старого ID новому ID
                      if (oldId) {
                        categoryIdMap.set(oldId, newCategory.id);
                      }
                      restoredCategories++;
                    } else {
                      console.warn('Пропущена категория с некорректными данными:', cat);
                    }
                  } catch (catError) {
                    console.error('Ошибка при создании категории:', catError);
                  }
                }
              });
            }
            
            console.log(`Восстановлено категорий: ${restoredCategories}`);
            console.log('Карта соответствия ID категорий:', Array.from(categoryIdMap.entries()));
            
            // Обновляем parentId для подкатегорий
            if (categories.length > 0 && categoryIdMap.size > 0) {
              await database.write(async () => {
                const categoriesCollection = database.get('categories');
                for (const cat of categories) {
                  if (cat && cat.parent_id && cat.parent_id !== '') {
                    const newParentId = categoryIdMap.get(cat.parent_id);
                    if (newParentId) {
                      const oldId = cat.id || cat._raw?.id;
                      const newId = categoryIdMap.get(oldId);
                      if (newId) {
                        const categoryToUpdate = await categoriesCollection.find(newId);
                        await categoryToUpdate.update((record: any) => {
                          record.parentId = newParentId;
                        });
                        console.log(`Обновлен parentId для категории ${cat.name}: ${newParentId}`);
                      }
                    }
                  }
                }
              });
            }
            
            // Восстанавливаем транзакции
            let restoredTransactions = 0;
            if (transactions.length > 0) {
              await database.write(async () => {
                const transactionsCollection = database.get('transactions');
                for (const tx of transactions) {
                  try {
                    if (tx && tx.amount && tx.type) {
                      // Получаем новый ID категории
                      let categoryId = tx.categoryId || tx.category_id || '';
                      const mappedCategoryId = categoryIdMap.get(categoryId);
                      
                      await transactionsCollection.create((record: any) => {
                        record.amount = tx.amount || 0;
                        record.type = tx.type || 'expense';
                        record.categoryId = mappedCategoryId || categoryId || '';
                        record.note = tx.note || '';
                        record.date = tx.date || Date.now();
                        record.isRecurring = tx.isRecurring || tx.is_recurring || false;
                        record.recurringType = tx.recurringType || tx.recurring_type || null;
                        record.location = tx.location || null;
                        record.createdAt = tx.createdAt || tx.created_at || Date.now();
                        record.updatedAt = tx.updatedAt || tx.updated_at || Date.now();
                      });
                      restoredTransactions++;
                    } else {
                      console.warn('Пропущена транзакция с некорректными данными:', tx);
                    }
                  } catch (txError) {
                    console.error('Ошибка при создании транзакции:', txError);
                  }
                }
              });
            }
            
            // Восстанавливаем бюджеты
            let restoredBudgets = 0;
            if (budgets.length > 0) {
              await database.write(async () => {
                const budgetsCollection = database.get('budgets');
                for (const budget of budgets) {
                  try {
                    if (budget) {
                      // Получаем новый ID категории
                      let categoryId = budget.categoryId || budget.category_id || '';
                      const mappedCategoryId = categoryIdMap.get(categoryId);
                      
                      if (mappedCategoryId) {
                        await budgetsCollection.create((record: any) => {
                          record.categoryId = mappedCategoryId;
                          record.amount = budget.amount || 0;
                          record.period = budget.period || 'monthly';
                          record.month = budget.month !== undefined ? budget.month : new Date().getMonth();
                          record.year = budget.year || new Date().getFullYear();
                          record.isActive = budget.isActive !== false;
                          record.createdAt = budget.createdAt || budget.created_at || Date.now();
                          record.updatedAt = budget.updatedAt || budget.updated_at || Date.now();
                        });
                        restoredBudgets++;
                      } else {
                        console.warn('Пропущен бюджет: не найдена категория для', categoryId);
                      }
                    } else {
                      console.warn('Пропущен бюджет с некорректными данными:', budget);
                    }
                  } catch (budgetError) {
                    console.error('Ошибка при создании бюджета:', budgetError);
                  }
                }
              });
            }
            
            // Восстанавливаем цели
            let restoredGoals = 0;
            if (goals.length > 0) {
              await database.write(async () => {
                const goalsCollection = database.get('goals');
                for (const goal of goals) {
                  try {
                    if (goal && goal.name) {
                      await goalsCollection.create((record: any) => {
                        record.name = goal.name || '';
                        record.targetAmount = goal.targetAmount || goal.target_amount || 0;
                        record.currentAmount = goal.currentAmount || goal.current_amount || 0;
                        record.deadline = goal.deadline || Date.now() + 365 * 24 * 60 * 60 * 1000;
                        record.icon = goal.icon || 'flag';
                        record.color = goal.color || '#4CAF50';
                        record.isCompleted = goal.isCompleted || goal.is_completed || false;
                        record.createdAt = goal.createdAt || goal.created_at || Date.now();
                        record.updatedAt = goal.updatedAt || goal.updated_at || Date.now();
                      });
                      restoredGoals++;
                    } else {
                      console.warn('Пропущена цель с некорректными данными:', goal);
                    }
                  } catch (goalError) {
                    console.error('Ошибка при создании цели:', goalError);
                  }
                }
              });
            }
            
            await loadTransactionCount();
            
            console.log('=== ИТОГИ ВОССТАНОВЛЕНИЯ ===');
            console.log(`Восстановлено категорий: ${restoredCategories}`);
            console.log(`Восстановлено транзакций: ${restoredTransactions}`);
            console.log(`Восстановлено бюджетов: ${restoredBudgets}`);
            console.log(`Восстановлено целей: ${restoredGoals}`);
            
            Alert.alert(
              '✅ Восстановление завершено',
              `Восстановлено:\n` +
              `📁 Категорий: ${restoredCategories}\n` +
              `📊 Транзакций: ${restoredTransactions}\n` +
              `💰 Бюджетов: ${restoredBudgets}\n` +
              `🎯 Целей: ${restoredGoals}\n\n` +
              `Приложение будет перезапущено`
            );
            
            navigation.replace('Main');
            
          } catch (error: any) {
            console.error('Cloud restore error:', error);
            Alert.alert('Ошибка', error?.message || 'Не удалось восстановить данные из облака');
          } finally {
            setIsDownloadingFromCloud(false);
            setIsCloudBackupModalVisible(false);
          }
        },
      },
    ],
  );
};
  // Удаление облачной резервной копии
  const handleDeleteCloudBackup = async (backup: any) => {
    Alert.alert(
      'Удаление резервной копии',
      `Удалить резервную копию от ${new Date(backup.timestamp).toLocaleString(
        'ru-RU',
      )}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('user_backups')
                .doc(backup.id)
                .delete();
              await loadCloudBackups();
              Alert.alert('✅ Готово', 'Резервная копия удалена');
            } catch (error) {
              console.error('Error deleting cloud backup:', error);
              Alert.alert('Ошибка', 'Не удалось удалить резервную копию');
            }
          },
        },
      ],
    );
  };

  // Модальное окно с облачными бэкапами
  const renderCloudBackupModal = () => (
    <Modal
      visible={isCloudBackupModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setIsCloudBackupModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Облачные резервные копии
            </Text>
            <TouchableOpacity
              onPress={() => setIsCloudBackupModalVisible(false)}
            >
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {isLoadingBackups ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[
                  styles.modalLoadingText,
                  { color: colors.text.secondary },
                ]}
              >
                Загрузка списка...
              </Text>
            </View>
          ) : cloudBackups.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Icon
                name="cloud-off-outline"
                size={64}
                color={colors.text.secondary}
              />
              <Text
                style={[
                  styles.modalEmptyText,
                  { color: colors.text.secondary },
                ]}
              >
                Нет резервных копий
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleExportToCloud}
              >
                <Text style={styles.modalButtonText}>Создать первую копию</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.modalList}>
              {cloudBackups.map((backup, index) => (
                <View
                  key={backup.id}
                  style={[
                    styles.backupItem,
                    { borderBottomColor: colors.border },
                    index === cloudBackups.length - 1 && styles.lastBackupItem,
                  ]}
                >
                  <View style={styles.backupInfo}>
                    <Icon name="cloud-check" size={24} color={colors.success} />
                   <View style={styles.backupDetails}>
  <Text style={[styles.backupDate, { color: colors.text.primary }]}>
    {new Date(backup.timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}
  </Text>
  <Text style={[styles.backupMeta, { color: colors.text.secondary }]}>
    📁 {backup.categoryCount || 0} категорий
  </Text>
  <Text style={[styles.backupMeta, { color: colors.text.secondary }]}>
    📊 {backup.transactionCount || 0} транзакций
  </Text>
  <Text style={[styles.backupMeta, { color: colors.text.secondary }]}>
    💰 {backup.budgetCount || 0} бюджетов • 🎯 {backup.goalCount || 0} целей
  </Text>
  <Text style={[styles.backupSize, { color: colors.text.secondary }]}>
    Размер: {((backup.fileSize || 0) / 1024).toFixed(2)} KB
  </Text>
</View>
                  </View>
                  <View style={styles.backupActions}>
                    <TouchableOpacity
                      style={[
                        styles.backupActionButton,
                        { backgroundColor: colors.primary + '20' },
                      ]}
                      onPress={() => handleRestoreFromCloud(backup)}
                    >
                      <Icon name="restore" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.backupActionButton,
                        { backgroundColor: colors.error + '20' },
                      ]}
                      onPress={() => handleDeleteCloudBackup(backup)}
                    >
                      <Icon name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

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

      Alert.alert(
        '✅ Резервная копия создана',
        `Файл сохранен в папку ${
          Platform.OS === 'android' ? 'Download' : 'Documents'
        }:\n${fileName}`,
        [
          {
            text: 'Отправить файл',
            onPress: async () => {
              try {
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
                    `Файл находится по пути:\n${savePath}`,
                  );
                }
              }
            },
          },
          { text: 'OK' },
        ],
      );
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleImportJSON = async () => {
    Alert.alert(
      'Восстановление из резервной копии',
      'Это действие заменит все текущие данные. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выбрать файл',
          onPress: async () => {
            try {
              const result = await pick({ type: [types.allFiles] });
              const fileUri = result[0].uri;

              setIsImporting(true);
              const importResult = await backupService.importFromJSON(fileUri);

              if (importResult.success) {
                await loadTransactionCount();
                Alert.alert('Успешно', importResult.message);
                navigation.replace('Main');
              } else {
                Alert.alert('Ошибка', importResult.message);
              }
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось выбрать файл');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ],
    );
  };

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
              const result = await backupService.clearAllTransactions();
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
                    onPress: () => {},
                  },
                ],
              );
            } catch (error) {
              Alert.alert('❌ Ошибка', 'Не удалось удалить транзакции');
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
          renderSettingItem(
            'pin',
            'PIN-код',
            hasPin ? (
              <TouchableOpacity onPress={handleRemovePin}>
                <Text style={[styles.settingValue, { color: colors.success }]}>
                  Включён
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('SetupPin')}>
                <Text style={[styles.settingValue, { color: colors.primary }]}>
                  Настроить
                </Text>
              </TouchableOpacity>
            ),
          ),
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
              'cloud-upload',
              'Экспорт в облако (Firebase)',
              isUploadingToCloud ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              handleExportToCloud,
              false,
              'Сохранить данные в Firebase Cloud',
            )}

            {renderSettingItem(
              'cloud-download',
              'Восстановить из облака',
              isDownloadingFromCloud ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              ),
              loadCloudBackups,
              false,
              'Восстановить данные из облачных копий',
            )}

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

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
              'Экспорт на устройство',
            )}
            {renderSettingItem(
              'restore',
              'Восстановить из JSON',
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
              'Восстановить из файла на устройстве',
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
                  'Все текущие данные будут заменены тестовыми.',
                  [
                    { text: 'Отмена', style: 'cancel' },
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
              `Удалить ${transactionCount} транзакций (категории сохранятся)`,
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
                                    seedCategoriesData()
                                    Alert.alert('✅ Готово', result.message);
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

      {/* Модальное окно облачных бэкапов */}
      {renderCloudBackupModal()}

      <CSVImportWizard
        visible={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={() => {
          Alert.alert('Успешно', 'Транзакции импортированы');
          loadTransactionCount();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  userInfo: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  userEmail: { fontSize: 14 },
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
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingText: { fontSize: 16, fontWeight: '500' },
  settingDescription: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { fontSize: 14 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 12 },
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
  logoutText: { fontSize: 16, fontWeight: '600' },
  bottomSpacing: { height: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '70%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  modalLoadingText: { fontSize: 14 },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  modalEmptyText: { fontSize: 16, textAlign: 'center' },
  modalButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  modalButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalList: { flex: 1 },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastBackupItem: { borderBottomWidth: 0 },
  backupInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backupDetails: { flex: 1 },
  backupDate: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  backupMeta: { fontSize: 12 },
  backupSize: { fontSize: 11, marginTop: 2 },
  backupActions: { flexDirection: 'row', gap: 8 },
  backupActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
