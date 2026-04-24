import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import categoryService from '../../../core/services/category.service';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_NESTING_LEVEL = 3; // Максимальная глубина вложенности: 0-2 (3 уровня: корень -> подкатегория -> подподкатегория)

// Предопределенные иконки из MaterialCommunityIcons
const AVAILABLE_ICONS = [
  'food',
  'cart',
  'car',
  'movie',
  'shopping',
  'flash',
  'hospital',
  'school',
  'gift',
  'coffee',
  'wifi',
  'home',
  'tshirt-crew',
  'basketball',
  'airplane',
  'face-woman',
  'dog',
  'cash',
  'laptop',
  'trending-up',
  'store',
  'cash-refund',
  'trophy',
  'bank',
  'piggy-bank',
  'crown',
  'phone',
  'tablet',
  'watch',
  'headphones',
  'camera',
  'gamepad',
  'book',
  'music',
  'gym',
  'bike',
  'bus',
  'train',
  'subway',
  'taxi',
  'gas-station',
  'parking',
  'restaurant',
  'beer',
  'wine',
  'cake',
  'candy',
  'flower',
  'ring',
  'heart',
  'star',
  'smiley',
  'fruit-cherries',
  'fish',
  'egg',
  'milk',
  'bread-slice',
  'cheese',
];

// Предопределенные цвета
const AVAILABLE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#1E90FF',
  '#DB7093',
  '#228B22',
  '#FF69B4',
  '#CD853F',
  '#95A5A6',
  '#607D8B',
  '#FF9800',
  '#8BC34A',
  '#00BCD4',
  '#FF4081',
  '#7C4DFF',
];

export const CategoriesScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  const [expenseTree, setExpenseTree] = useState<any[]>([]);
  const [incomeTree, setIncomeTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [parentExpanded, setParentExpanded] = useState<Set<string>>(new Set());

  const [modalVisible, setModalVisible] = useState(false);
  const [parentModalVisible, setParentModalVisible] = useState(false);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>(
    'expense',
  );
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState('folder-outline');
  const [selectedColor, setSelectedColor] = useState('#95A5A6');
  const [parentSearch, setParentSearch] = useState('');

  const loadTrees = async () => {
    setLoading(true);
    try {
      const [expense, income] = await Promise.all([
        categoryService.getCategoryTree('expense'),
        categoryService.getCategoryTree('income'),
      ]);
      setExpenseTree(expense || []);
      setIncomeTree(income || []);
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки дерева категорий:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrees();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleParentExpand = (id: string) => {
    setParentExpanded(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  // Рекурсивное определение уровня вложенности категории
  const getCategoryLevel = (
    categoryId: string,
    tree: any[],
    currentLevel = 0,
  ): number => {
    for (const cat of tree) {
      if (cat.id === categoryId) return currentLevel;
      if (cat.children?.length > 0) {
        const level = getCategoryLevel(
          categoryId,
          cat.children,
          currentLevel + 1,
        );
        if (level !== -1) return level;
      }
    }
    return -1;
  };

  // Получение уровня для отображения
  const getCategoryLevelDisplay = (categoryId: string): number => {
    const level = getCategoryLevel(categoryId, [...expenseTree, ...incomeTree]);
    return level !== -1 ? level : 0;
  };

  const handleDeleteCategory = async (category: any) => {
    const hasChildren = category.children?.length > 0;

    Alert.alert(
      'Удаление категории',
      hasChildren
        ? `Категория «${category.name}» содержит ${category.children.length} подкатегорий.\nОни тоже будут удалены.`
        : `Удалить категорию «${category.name}»?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(category.id);
              await loadTrees();
            } catch (error: any) {
              Alert.alert(
                'Ошибка',
                error.message || 'Не удалось удалить категорию',
              );
            }
          },
        },
      ],
    );
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryName(category.name || '');
    setCategoryType(category.type || 'expense');
    setSelectedParentId(category.parentId || null);
    setSelectedIcon(category.icon || 'folder-outline');
    setSelectedColor(category.color || '#95A5A6');
    setModalVisible(true);
  };

  const openAddModal = (
    type: 'income' | 'expense' | null,
    parentCategory?: any,
  ) => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType(type ? type : 'expense');
    setSelectedParentId(parentCategory?.id || null);
    setSelectedIcon(parentCategory?.icon || 'folder-outline');
    setSelectedColor(parentCategory?.color || '#95A5A6');

    // Если добавляем подкатегорию, раскрываем родителя
    if (parentCategory) {
      setExpandedCategories(prev => new Set([...prev, parentCategory.id]));
    }

    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Ошибка', 'Введите название категории');
      return;
    }

    // Проверка максимальной вложенности
    if (selectedParentId) {
      const tree = categoryType === 'expense' ? expenseTree : incomeTree;
      const parentLevel = getCategoryLevel(selectedParentId, tree);
      if (parentLevel >= MAX_NESTING_LEVEL - 1) {
        Alert.alert(
          'Ошибка',
          `Максимальная вложенность — ${MAX_NESTING_LEVEL} уровня.\n` +
            `Вы не можете создать подкатегорию для элемента ${
              parentLevel + 1
            }-го уровня.`,
        );
        return;
      }
    }

    try {
      const payload = {
        name: categoryName.trim(),
        type: categoryType,
        parentId: selectedParentId || undefined,
        icon: selectedIcon,
        color: selectedColor,
      };

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, payload);
      } else {
        await categoryService.createCategory(payload);
      }

      await loadTrees();

      // Раскрываем родительскую категорию если она была выбрана
      if (selectedParentId) {
        setExpandedCategories(prev => new Set([...prev, selectedParentId]));
      }

      setModalVisible(false);
      resetForm();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить категорию');
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType('expense');
    setSelectedParentId(null);
    setSelectedIcon('folder-outline');
    setSelectedColor('#95A5A6');
    setParentSearch('');
  };

  const selectParent = (parentId: string | null) => {
    setSelectedParentId(parentId);
    setParentModalVisible(false);
    setParentSearch('');
  };

  // Рекурсивный рендер для модалки выбора родителя
  const renderParentItem = (category: any, level: number = 0) => {
    const hasChildren = category.children?.length > 0;
    const canBeParent = level < MAX_NESTING_LEVEL - 1; // Может ли эта категория быть родителем
    const isExpanded = parentExpanded.has(category.id);

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[styles.parentItem, { paddingLeft: 16 + level * 24 }]}
          onPress={() => canBeParent && selectParent(category.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.smallIcon,
              { backgroundColor: (category.color || '#95A5A6') + '20' },
            ]}
          >
            <Icon
              name={category.icon || 'folder-outline'}
              size={20}
              color={category.color || '#95A5A6'}
            />
          </View>
          <Text
            style={[
              styles.parentItemText,
              { color: colors.text.primary, flex: 1 },
            ]}
          >
            {category.name}
            {!canBeParent && (
              <Text
                style={[styles.levelHint, { color: colors.text.secondary }]}
              >
                {' '}
                (макс. вложенность)
              </Text>
            )}
          </Text>
          {hasChildren && (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                toggleParentExpand(category.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isExpanded &&
          hasChildren &&
          category.children.map((child: any) =>
            renderParentItem(child, level + 1),
          )}
      </View>
    );
  };

  // Рекурсивный рендер категории в основном списке
  const renderCategoryItem = (category: any, level: number = 0) => {
    if (level >= MAX_NESTING_LEVEL) return null;

    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children?.length > 0;
    const canHaveChildren = level < MAX_NESTING_LEVEL - 1;

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            { paddingLeft: 16 + level * 24, backgroundColor: colors.surface },
          ]}
          onPress={() => hasChildren && toggleExpand(category.id)}
          onLongPress={() => handleEditCategory(category)}
        >
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: (category.color || '#95A5A6') + '20' },
            ]}
          >
            <Icon
              name={category.icon || 'folder-outline'}
              size={22}
              color={category.color || '#95A5A6'}
            />
          </View>

          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: colors.text.primary }]}>
              {category.name}
            </Text>
            <Text
              style={[styles.categoryType, { color: colors.text.secondary }]}
            >
              {category.type === 'expense' ? 'Расход' : 'Доход'}
              {level > 0 && ` • Уровень ${level}`}
              {!canHaveChildren &&
                level === MAX_NESTING_LEVEL - 1 &&
                ' • Макс. вложенность'}
            </Text>
          </View>

          <View style={styles.actions}>
            {hasChildren && (
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text.secondary}
                style={{ marginRight: 12 }}
              />
            )}
            {/* Кнопка добавления подкатегории */}
            {canHaveChildren && (
              <TouchableOpacity
                onPress={() => openAddModal(category.type, category)}
                style={{ marginRight: 12 }}
              >
                <Icon
                  name="plus-circle-outline"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDeleteCategory(category)}>
              <Icon name="trash-can-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isExpanded && hasChildren && (
          <View>
            {category.children.map((child: any) =>
              renderCategoryItem(child, level + 1),
            )}
          </View>
        )}
      </View>
    );
  };

  const renderIconItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        {
          backgroundColor:
            selectedIcon === item ? selectedColor + '30' : colors.background,
        },
        { borderColor: selectedIcon === item ? selectedColor : colors.border },
      ]}
      onPress={() => {
        setSelectedIcon(item);
        setIconModalVisible(false);
      }}
    >
      <Icon
        name={item}
        size={32}
        color={selectedIcon === item ? selectedColor : colors.text.primary}
      />
    </TouchableOpacity>
  );

  const renderColorItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorItem,
        {
          backgroundColor: item,
          borderWidth: selectedColor === item ? 3 : 0,
          borderColor: '#FFFFFF',
        },
      ]}
      onPress={() => {
        setSelectedColor(item);
        setColorModalVisible(false);
      }}
    />
  );

  if (loading && isFirstLoad) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Категории
          </Text>
          <TouchableOpacity onPress={() => openAddModal(null)}>
            <Icon name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            Расходы
          </Text>
          {expenseTree.length > 0 ? (
            expenseTree.map((c: any) => renderCategoryItem(c, 0))
          ) : (
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Пока нет категорий расходов
            </Text>
          )}

          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text.secondary, marginTop: 24 },
            ]}
          >
            Доходы
          </Text>
          {incomeTree.length > 0 ? (
            incomeTree.map((c: any) => renderCategoryItem(c, 0))
          ) : (
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Пока нет категорий доходов
            </Text>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Модалка создания/редактирования */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {editingCategory
                  ? 'Редактировать категорию'
                  : 'Новая категория'}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="Название категории"
                placeholderTextColor={colors.text.secondary}
                value={categoryName}
                onChangeText={setCategoryName}
              />

              {!editingCategory && (
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      categoryType === 'expense' && {
                        backgroundColor: colors.error + '25',
                      },
                    ]}
                    onPress={() => setCategoryType('expense')}
                  >
                    <Text
                      style={{
                        color:
                          categoryType === 'expense'
                            ? colors.error
                            : colors.text.secondary,
                      }}
                    >
                      Расход
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      categoryType === 'income' && {
                        backgroundColor: colors.success + '25',
                      },
                    ]}
                    onPress={() => setCategoryType('income')}
                  >
                    <Text
                      style={{
                        color:
                          categoryType === 'income'
                            ? colors.success
                            : colors.text.secondary,
                      }}
                    >
                      Доход
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Выбор иконки */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Иконка
              </Text>
              <TouchableOpacity
                style={[
                  styles.iconSelector,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setIconModalVisible(true)}
              >
                <View
                  style={[
                    styles.iconPreview,
                    { backgroundColor: selectedColor + '20' },
                  ]}
                >
                  <Icon name={selectedIcon} size={28} color={selectedColor} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text.primary,
                    marginLeft: 12,
                  }}
                >
                  {selectedIcon}
                </Text>
                <Icon
                  name="chevron-down"
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Выбор цвета */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Цвет
              </Text>
              <TouchableOpacity
                style={[
                  styles.colorSelector,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setColorModalVisible(true)}
              >
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: selectedColor },
                  ]}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.text.primary,
                    marginLeft: 12,
                  }}
                >
                  {selectedColor}
                </Text>
                <Icon
                  name="chevron-down"
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Родительская категория */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Родительская категория
                <Text style={{ fontSize: 11, color: colors.text.secondary }}>
                  {' '}
                  (макс. {MAX_NESTING_LEVEL} уровня)
                </Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.parentSelector,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setParentModalVisible(true)}
              >
                <Text style={{ color: colors.text.primary, flex: 1 }}>
                  {selectedParentId
                    ? [...expenseTree, ...incomeTree]
                        .flatMap((cat: any) => [cat, ...(cat.children || [])])
                        .find((c: any) => c?.id === selectedParentId)?.name ||
                      'Неизвестная'
                    : 'Без родителя (основная категория)'}
                </Text>
                <Icon
                  name="chevron-down"
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Подсказка об уровне вложенности */}
              {selectedParentId && (
                <Text
                  style={[
                    styles.levelHint,
                    {
                      color: colors.text.secondary,
                      fontSize: 11,
                      marginTop: -12,
                      marginBottom: 12,
                    },
                  ]}
                >
                  Уровень вложенности:{' '}
                  {getCategoryLevelDisplay(selectedParentId) + 1}
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={{ color: colors.text.secondary }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSaveCategory}
                >
                  <Text style={{ color: '#FFFFFF' }}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Модалка выбора родителя */}
        <Modal visible={parentModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.parentModalContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Выберите родителя
                <Text style={{ fontSize: 12 }}>
                  {' '}
                  (макс. {MAX_NESTING_LEVEL} уровня)
                </Text>
              </Text>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="Поиск категории..."
                placeholderTextColor={colors.text.secondary}
                value={parentSearch}
                onChangeText={setParentSearch}
              />

              <ScrollView
                style={{ maxHeight: '68%' }}
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={styles.parentItem}
                  onPress={() => selectParent(null)}
                >
                  <Icon
                    name="minus-circle-outline"
                    size={22}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.parentItemText,
                      { color: colors.text.secondary, fontStyle: 'italic' },
                    ]}
                  >
                    Без родителя (основная категория)
                  </Text>
                </TouchableOpacity>
                {/* Используем правильное дерево в зависимости от типа категории */}
                {(categoryType === 'expense' ? expenseTree : incomeTree).map(
                  (cat: any) => renderParentItem(cat, 0),
                )}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  setParentModalVisible(false);
                  setParentSearch('');
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Модалка выбора иконки */}
        <Modal visible={iconModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.iconModalContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Выберите иконку
              </Text>
              <FlatList
                data={AVAILABLE_ICONS}
                numColumns={5}
                renderItem={renderIconItem}
                keyExtractor={item => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.iconGrid}
              />
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setIconModalVisible(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Модалка выбора цвета */}
        <Modal visible={colorModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.colorModalContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Выберите цвет
              </Text>
              <FlatList
                data={AVAILABLE_COLORS}
                numColumns={6}
                renderItem={renderColorItem}
                keyExtractor={item => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.colorGrid}
              />
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setColorModalVisible(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyText: { padding: 30, textAlign: 'center' },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '500' },
  categoryType: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '88%', borderRadius: 16, padding: 20 },
  parentModalContent: {
    width: '90%',
    height: '78%',
    borderRadius: 16,
    padding: 20,
  },
  iconModalContent: {
    width: '90%',
    height: '70%',
    borderRadius: 16,
    padding: 20,
  },
  colorModalContent: {
    width: '90%',
    height: '60%',
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  input: { borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  searchInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, marginBottom: 6, marginTop: 8 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },

  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  iconPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  parentSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },

  parentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parentItemText: { fontSize: 16 },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: { borderWidth: 1, borderColor: '#888' },
  saveButton: {},
  closeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },

  iconGrid: { paddingVertical: 10 },
  iconItem: {
    width: '18%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  colorGrid: { paddingVertical: 10 },
  colorItem: { width: '14%', aspectRatio: 1, margin: '1.5%', borderRadius: 30 },
  levelHint: { fontSize: 11 },
});
