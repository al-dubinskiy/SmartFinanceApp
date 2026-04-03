import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import categoryService from '../../../core/services/category.service';
import budgetService from '../../../core/services/budget.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Включаем LayoutAnimation для Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EditBudgetModalProps {
  visible: boolean;
  budget: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  visible,
  budget,
  onClose,
  onSuccess,
}) => {
  const budgetData = budget?.budget;
  const { colors } = useTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (budgetData) {
        setSelectedCategoryId(budgetData.categoryId);
        setAmount(budgetData.amount?.toString() || '');
      }
    }
  }, [visible, budgetData]);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoriesByTypeWithTree('expense');
      setCategories(cats);
    } catch (error) {
      console.error('Не удалось загрузить категории:', error);
    }
  };

  // Функция для построения дерева категорий
  const buildCategoryTree = (flatCategories: any[]): any[] => {
    const parseCategory = (item: any): any => ({
      ...item._raw,
      children: item.children?.map((child: any) => parseCategory(child)) || [],
    });

    const parseCategoriesRecursive = (items: any[]): any[] =>
      items.map(item => parseCategory(item));

    const parsedCategories = parseCategoriesRecursive(flatCategories);

    const sortByOrder = (items: any[]): any[] => {
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    };

    const sortRecursive = (items: any[]): any[] => {
      const sorted = sortByOrder(items);
      sorted.forEach(item => {
        if (item.children && item.children.length > 0) {
          item.children = sortRecursive(item.children);
        }
      });
      return sorted;
    };

    return sortRecursive(parsedCategories);
  };

  // Функция для фильтрации дерева по поисковому запросу
  const filterTreeBySearch = (tree: any[], query: string): any[] => {
    if (!query.trim()) return tree;

    const lowerQuery = query.toLowerCase().trim();

    const filterNode = (node: any): any | null => {
      const matchesNode = node.name.toLowerCase().includes(lowerQuery);
      const filteredChildren = node.children
        ? node.children
            .map((child: any) => filterNode(child))
            .filter((child: any) => child !== null)
        : [];

      if (matchesNode || filteredChildren.length > 0) {
        if (matchesNode && node.children) {
          return { ...node, children: [...node.children] };
        }
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return tree
      .map((node: any) => filterNode(node))
      .filter((node: any) => node !== null);
  };

  // Функция для автоматического раскрытия категорий, содержащих совпадения
  const getExpandedFromFilteredTree = (
    filteredTree: any[],
    originalExpanded: Set<string>,
  ): Set<string> => {
    const newExpanded = new Set<string>();

    const collectExpanded = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          newExpanded.add(node.id);
          collectExpanded(node.children);
        }
      }
    };

    collectExpanded(filteredTree);

    for (const id of originalExpanded) {
      newExpanded.add(id);
    }

    return newExpanded;
  };

  const categoryTree = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return buildCategoryTree(categories);
  }, [categories]);

  const filteredTree = useMemo(() => {
    return filterTreeBySearch(categoryTree, searchQuery);
  }, [categoryTree, searchQuery]);

  const displayExpanded = useMemo(() => {
    if (searchQuery.trim()) {
      return getExpandedFromFilteredTree(filteredTree, expandedCategories);
    }
    return expandedCategories;
  }, [filteredTree, searchQuery, expandedCategories]);

  const toggleExpand = (categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setModalVisible(false);
    setSearchQuery('');
  };

  const getSearchResultCount = (): number => {
    const countNodes = (nodes: any[]): number => {
      let count = 0;
      for (const node of nodes) {
        count += 1;
        if (node.children && node.children.length > 0) {
          count += countNodes(node.children);
        }
      }
      return count;
    };
    return countNodes(filteredTree);
  };

  const currentTree = searchQuery.trim() ? filteredTree : categoryTree;
  const resultCount = searchQuery.trim() ? getSearchResultCount() : 0;

  // Рекурсивный рендер категорий
  const renderCategoryItem = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = displayExpanded.has(category.id);
    const paddingLeft = 16 + level * 24;
    const isSelected = selectedCategoryId === category.id;

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            {
              paddingLeft,
              backgroundColor: isSelected
                ? category.color + '20'
                : 'transparent',
            },
          ]}
          onPress={() => handleSelectCategory(category.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: category.color + '20' },
            ]}
          >
            <Icon name={category.icon} size={22} color={category.color} />
          </View>

          <Text style={[styles.categoryName, { color: colors.text.primary }]}>
            {category.name}
          </Text>

          {hasChildren ? (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              style={styles.expandButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.expandPlaceholder} />
          )}
        </TouchableOpacity>

        {isExpanded && hasChildren && (
          <View style={styles.childrenContainer}>
            {category.children?.map((child: any) =>
              renderCategoryItem(child, level + 1),
            )}
          </View>
        )}
      </View>
    );
  };

  const handleSave = async () => {
    if (!selectedCategoryId) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите категорию');
      return;
    }

    const budgetAmount = parseFloat(amount);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    setIsLoading(true);
    try {
      await budgetService.updateBudget(budgetData.id, {
        categoryId: selectedCategoryId,
        amount: budgetAmount,
      });

      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить бюджет');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCategory =
    categories.length > 0 && selectedCategoryId
      ? (() => {
          const findCategory = (items: any[]): any => {
            for (const item of items) {
              if (item._raw.id === selectedCategoryId) return item._raw;
              if (item.children) {
                const found = findCategory(item.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findCategory(categories);
        })()
      : null;

  if (!budgetData) return null;

  return (
    <>
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
                  Редактировать бюджет
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Выбор категории */}
                <Text style={[styles.label, { color: colors.text.secondary }]}>
                  Категория
                </Text>

                <TouchableOpacity
                  style={[
                    styles.categorySelector,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setModalVisible(true)}
                >
                  {selectedCategory ? (
                    <>
                      <View
                        style={[
                          styles.selectedIcon,
                          { backgroundColor: selectedCategory.color + '20' },
                        ]}
                      >
                        <Icon
                          name={selectedCategory.icon}
                          size={20}
                          color={selectedCategory.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.selectedCategoryText,
                          { color: colors.text.primary },
                        ]}
                      >
                        {selectedCategory.name}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.placeholderText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Выберите категорию
                    </Text>
                  )}
                  <Icon
                    name="chevron-down"
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>

                {/* Сумма бюджета */}
                <Text style={[styles.label, { color: colors.text.secondary }]}>
                  Сумма бюджета
                </Text>
                <View
                  style={[
                    styles.amountInputContainer,
                    { borderColor: colors.border },
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
                    style={[styles.amountInput, { color: colors.text.primary }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.secondary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                  />
                </View>

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
                      style={[
                        styles.buttonText,
                        { color: colors.text.secondary },
                      ]}
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
                    onPress={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                        Сохранить
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* Модалка выбора категории */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setModalVisible(false);
            setSearchQuery('');
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { color: colors.text.primary }]}
                >
                  Выберите категорию
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Icon name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Поле поиска */}
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <Icon name="magnify" size={20} color={colors.text.secondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text.primary }]}
                  placeholder="Поиск категории..."
                  placeholderTextColor={colors.text.secondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon
                      name="close-circle"
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Информация о результатах поиска */}
              {searchQuery.length > 0 && (
                <Text
                  style={[styles.searchInfo, { color: colors.text.secondary }]}
                >
                  Найдено: {resultCount}{' '}
                  {resultCount === 1 ? 'категория' : 'категорий'}
                </Text>
              )}

              {/* Дерево категорий */}
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.categoryList}
              >
                {currentTree.length > 0 ? (
                  currentTree.map((cat: any) => renderCategoryItem(cat, 0))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Icon
                      name="magnify-off"
                      size={48}
                      color={colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Ничего не найдено
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtext,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Попробуйте изменить поисковый запрос
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    // marginTop: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    height: 50,
  },
  selectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCategoryText: {
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  // Стили для модалки выбора категории
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  searchInfo: {
    fontSize: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    borderRadius: 8,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
  },
  expandButton: {
    padding: 4,
  },
  expandPlaceholder: {
    width: 28,
  },
  childrenContainer: {},
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
