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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import categoryService from '../../../core/services/category.service';

const MAX_NESTING_LEVEL = 3;

export const CategoriesScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  const [expenseTree, setExpenseTree] = useState<any[]>([]);
  const [incomeTree, setIncomeTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Для основного списка категорий
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Для модалки выбора родителя (отдельное состояние)
  const [parentExpanded, setParentExpanded] = useState<Set<string>>(new Set());

  const [modalVisible, setModalVisible] = useState(false);
  const [parentModalVisible, setParentModalVisible] = useState(false);

  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [parentSearch, setParentSearch] = useState('');

  // Загрузка дерева
  const loadTrees = async () => {
    setLoading(true);
    try {
      const [expense, income] = await Promise.all([
        categoryService.getCategoryTree('expense'),
        categoryService.getCategoryTree('income'),
      ]);

      setExpenseTree(expense || []);
      setIncomeTree(income || []);
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

  // Раскрытие/сворачивание в основном экране
  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  // Раскрытие/сворачивание в модалке выбора родителя
  const toggleParentExpand = (id: string) => {
    setParentExpanded(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  // Рекурсивно определяем уровень категории
  const getCategoryLevel = (categoryId: string, tree: any[], currentLevel = 0): number => {
    for (const cat of tree) {
      if (cat.id === categoryId) return currentLevel;
      if (cat.children?.length > 0) {
        const level = getCategoryLevel(categoryId, cat.children, currentLevel + 1);
        if (level !== -1) return level;
      }
    }
    return -1;
  };

  const handleDeleteCategory = (category: any) => {
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
              Alert.alert('Ошибка', error.message || 'Не удалось удалить категорию');
            }
          },
        },
      ]
    );
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryName(category.name || '');
    setCategoryType(category.type || 'expense');
    setSelectedParentId(category.parentId || null);
    setModalVisible(true);
  };

  const openAddModal = (type: 'income' | 'expense' | null) => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType(type ? type : 'expense');
    setSelectedParentId(null);
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Ошибка', 'Введите название категории');
      return;
    }

    if (selectedParentId) {
      const tree = categoryType === 'expense' ? expenseTree : incomeTree;
      const parentLevel = getCategoryLevel(selectedParentId, tree);
      if (parentLevel >= MAX_NESTING_LEVEL - 1) {
        Alert.alert('Ошибка', `Максимальная вложенность — ${MAX_NESTING_LEVEL} уровня`);
        return;
      }
    }

    try {
      const payload = {
        name: categoryName.trim(),
        type: categoryType,
        parentId: selectedParentId || undefined,
        icon: editingCategory?.icon || 'folder-outline',
        color: editingCategory?.color || '#95A5A6',
      };

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, payload);
      } else {
        await categoryService.createCategory(payload);
      }

      await loadTrees();

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
    setParentSearch('');
  };

  // Рекурсивный рендер для модалки выбора родителя (со сворачиванием)
  const renderParentItem = (category: any, level: number = 0) => {
    const hasChildren = category.children?.length > 0;
    const canHaveChild = level < MAX_NESTING_LEVEL - 1;
    const isExpanded = parentExpanded.has(category.id);

    if (!canHaveChild) return null;

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.parentItem,
            { paddingLeft: 16 + level * 24 }
          ]}
          onPress={() => selectParent(category.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.smallIcon, { backgroundColor: (category.color || '#95A5A6') + '20' }]}>
            <Icon name={category.icon || 'folder-outline'} size={20} color={category.color || '#95A5A6'} />
          </View>

          <Text style={[styles.parentItemText, { color: colors.text.primary, flex: 1 }]}>
            {category.name}
          </Text>

          {hasChildren && (
            <TouchableOpacity 
              onPress={(e) => {
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

        {/* Дети показываются только если категория раскрыта */}
        {isExpanded && hasChildren && (
          category.children.map((child: any) => renderParentItem(child, level + 1))
        )}
      </View>
    );
  };

  const selectParent = (parentId: string | null) => {
    setSelectedParentId(parentId);
    setParentModalVisible(false);
    setParentSearch('');
  };

  const renderCategoryItem = (category: any, level: number = 0) => {
    if (level >= MAX_NESTING_LEVEL) return null;

    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children?.length > 0;

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            { paddingLeft: 16 + level * 24, backgroundColor: colors.surface }
          ]}
          onPress={() => hasChildren && toggleExpand(category.id)}
          onLongPress={() => handleEditCategory(category)}
        >
          <View style={[styles.categoryIcon, { backgroundColor: (category.color || '#95A5A6') + '20' }]}>
            <Icon name={category.icon || 'folder-outline'} size={22} color={category.color || '#95A5A6'} />
          </View>

          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: colors.text.primary }]}>
              {category.name}
            </Text>
            <Text style={[styles.categoryType, { color: colors.text.secondary }]}>
              {category.type === 'expense' ? 'Расход' : 'Доход'}
              {level > 0 && ` • Уровень ${level}`}
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
            <TouchableOpacity onPress={() => handleDeleteCategory(category)}>
              <Icon name="trash-can-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isExpanded && hasChildren && (
          category.children.map((child: any) => renderCategoryItem(child, level + 1))
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentTree = categoryType === 'expense' ? expenseTree : incomeTree;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Категории</Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <TouchableOpacity onPress={() => openAddModal(null)}>
            <Icon name="plus" size={24} color={'#111'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Расходы</Text>
        {expenseTree.length > 0 ? (
          expenseTree.map((c: any) => renderCategoryItem(c, 0))
        ) : (
          <Text style={{ padding: 30, color: colors.text.secondary, textAlign: 'center' }}>
            Пока нет категорий расходов
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text.secondary, marginTop: 24 }]}>Доходы</Text>
        {incomeTree.length > 0 ? (
          incomeTree.map((c: any) => renderCategoryItem(c, 0))
        ) : (
          <Text style={{ padding: 30, color: colors.text.secondary, textAlign: 'center' }}>
            Пока нет категорий доходов
          </Text>
        )}
      </ScrollView>

      {/* Модалка создания/редактирования */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text.primary }]}
              placeholder="Название категории"
              placeholderTextColor={colors.text.secondary}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            {!editingCategory && (
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, categoryType === 'expense' && { backgroundColor: colors.error + '25' }]}
                  onPress={() => {setCategoryType('expense'); selectParent(null)}}
                >
                  <Text style={{ color: categoryType === 'expense' ? colors.error : colors.text.secondary }}>Расход</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, categoryType === 'income' && { backgroundColor: colors.success + '25' }]}
                  onPress={() => {setCategoryType('income'); selectParent(null)}}
                >
                  <Text style={{ color: categoryType === 'income' ? colors.success : colors.text.secondary }}>Доход</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.label, { color: colors.text.secondary }]}>Родительская категория</Text>
            <TouchableOpacity
              style={[styles.parentSelector, { backgroundColor: colors.background }]}
              onPress={() => setParentModalVisible(true)}
            >
              <Text style={{ color: colors.text.primary, flex: 1 }}>
                {selectedParentId
                  ? [...expenseTree, ...incomeTree]
                      .flatMap((cat: any) => [cat, ...(cat.children || [])])
                      .find((c: any) => c?.id === selectedParentId)?.name || 'Неизвестная'
                  : 'Без родителя (основная категория)'}
              </Text>
              <Icon name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setModalVisible(false); resetForm(); }}
              >
                <Text style={{ color: colors.text.secondary }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveCategory}
              >
                <Text style={{ color: '#FFFFFF' }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка выбора родителя — сворачиваемое дерево */}
      <Modal visible={parentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.parentModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Выберите родителя</Text>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text.primary }]}
              placeholder="Поиск категории..."
              placeholderTextColor={colors.text.secondary}
              value={parentSearch}
              onChangeText={setParentSearch}
            />

            <ScrollView style={{ maxHeight: '68%' }} showsVerticalScrollIndicator={false}>
              {/* Без родителя */}
              <TouchableOpacity style={styles.parentItem} onPress={() => selectParent(null)}>
                <Icon name="minus-circle-outline" size={22} color={colors.text.secondary} />
                <Text style={[styles.parentItemText, { color: colors.text.secondary, fontStyle: 'italic' }]}>
                  Без родителя (основная категория)
                </Text>
              </TouchableOpacity>

              {/* Сворачиваемое дерево категорий */}
              {currentTree.map((cat: any) => renderParentItem(cat, 0))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setParentModalVisible(false);
                setParentSearch('');
                // Можно очищать состояние при закрытии:
                // setParentExpanded(new Set());
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  sectionTitle: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },

  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16, gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '500' },
  categoryType: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '88%', borderRadius: 16, padding: 20 },
  parentModalContent: { width: '90%', height: '78%', borderRadius: 16, padding: 20 },

  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  searchInput: { borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 8 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },

  parentSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 20 },
  parentItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 12, 
    borderRadius: 8 
  },
  smallIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  parentItemText: { fontSize: 16 },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: '#888' },
  closeButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
});