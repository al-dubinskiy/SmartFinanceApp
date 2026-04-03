import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  parentId?: string | null;
  children?: Category[];
  order?: number;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedCategoryName: string | null;
  onSelectCategory: (categoryId: string) => void;
  type: 'income' | 'expense';
  selectable?: boolean;
}

// Включаем LayoutAnimation для Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  selectedCategoryName,
  onSelectCategory,
  type,
  selectable = true,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<Map<string, View>>(new Map());

  // Функция для получения всех родительских ID категории
  const getParentIds = (
    categoryId: string,
    categoryMap: Map<string, any>,
  ): string[] => {
    const parents: string[] = [];
    let currentId = categoryId;

    while (currentId) {
      const category = categoryMap.get(currentId);
      if (!category) break;

      const parentId = category._raw?.parentId || category.parentId;
      if (parentId && parentId !== '' && parentId !== 'null') {
        parents.unshift(parentId);
        currentId = parentId;
      } else {
        break;
      }
    }

    return parents;
  };

  // Создаем карту всех категорий по ID
  const buildCategoryMap = (
    categories: any[],
    map: Map<string, any> = new Map(),
  ): Map<string, any> => {
    for (const category of categories) {
      const categoryData = category._raw || category;
      map.set(categoryData.id, category);

      const children = category.children || category._raw?.children || [];
      if (children.length > 0) {
        buildCategoryMap(children, map);
      }
    }
    return map;
  };

  const categoryMap = buildCategoryMap(categories);
  const selectedCategory = selectedCategoryId
    ? categoryMap.get(selectedCategoryId)?._raw
    : null;

  // Функция для раскрытия всех родителей выбранной категории
  const expandParents = (categoryId: string) => {
    const parents = getParentIds(categoryId, categoryMap);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      parents.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  // Прокрутка к выбранной категории
  const scrollToSelectedCategory = () => {
    if (!selectedCategoryId) return;

    // Немного задерживаем, чтобы анимация раскрытия успела завершиться
    setTimeout(() => {
      const ref = categoryRefs.current.get(selectedCategoryId);
      if (ref && scrollViewRef.current) {
        ref.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: y - 100, // Отступ сверху
              animated: true,
            });
          },
          () => {
            console.log('Failed to measure layout');
          },
        );
      }
    }, 300);
  };

  // При открытии модалки раскрываем родителей и прокручиваем к выбранной категории
  useEffect(() => {
    if (modalVisible && selectedCategoryId) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      expandParents(selectedCategoryId);
      scrollToSelectedCategory();
    }
  }, [modalVisible, selectedCategoryId]);

  // Функция для построения дерева категорий из плоского списка
  const buildCategoryTree = (flatCategories: any[]): any[] => {
    const parseCategory = (item: any): any => ({
      ...item._raw,
      children: item.children?.map((child: any) => parseCategory(child)) || [],
    });

    const parseCategoriesRecursive = (items: any[]): any[] =>
      items.map(item => parseCategory(item));

    const parsedCategories = parseCategoriesRecursive(flatCategories);

    const sortByOrder = (items: Category[]): Category[] => {
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    };

    const sortRecursive = (items: Category[]): Category[] => {
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
  const filterTreeBySearch = (tree: Category[], query: string): Category[] => {
    if (!query.trim()) return tree;

    const lowerQuery = query.toLowerCase().trim();

    const filterNode = (node: Category): Category | null => {
      const matchesNode = node.name.toLowerCase().includes(lowerQuery);
      const filteredChildren = node.children
        ? node.children
            .map(child => filterNode(child))
            .filter((child): child is Category => child !== null)
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
      .map(node => filterNode(node))
      .filter((node): node is Category => node !== null);
  };

  // Функция для автоматического раскрытия категорий, содержащих совпадения
  const getExpandedFromFilteredTree = (
    filteredTree: Category[],
    originalExpanded: Set<string>,
  ): Set<string> => {
    const newExpanded = new Set<string>();

    const collectExpanded = (nodes: Category[]) => {
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
    onSelectCategory(categoryId);
    setModalVisible(false);
    setSearchQuery('');
  };

  // Рекурсивный рендер категорий с отступами и стрелочками
  const renderCategoryItem = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = displayExpanded.has(category.id);
    const paddingLeft = 16 + level * 24;
    const isSelected = selectedCategoryId === category.id;

    return (
      <View
        key={category.id}
        ref={ref => {
          if (ref && category.id === selectedCategoryId) {
            categoryRefs.current.set(category.id, ref);
          }
        }}
        collapsable={false}
      >
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
            {category.children?.map(child =>
              renderCategoryItem(child, level + 1),
            )}
          </View>
        )}
      </View>
    );
  };

  const getSearchResultCount = (): number => {
    const countNodes = (nodes: Category[]): number => {
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

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface }]}
        onPress={() => setModalVisible(true)}
        disabled={!selectable}
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
            <Text style={[styles.selectedText, { color: colors.text.primary }]}>
              {selectedCategory.name}
            </Text>
          </>
        ) : (
          <Text
            style={[styles.placeholderText, { color: colors.text.secondary }]}
          >
            Выберите категорию
          </Text>
        )}
        {selectable ? (
          <Icon name="chevron-down" size={20} color={colors.text.secondary} />
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
          categoryRefs.current.clear();
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Выберите категорию
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                  categoryRefs.current.clear();
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
                currentTree.map(cat => renderCategoryItem(cat, 0))
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon
                    name="magnify-off"
                    size={48}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.text.secondary }]}
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
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  selectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
  },
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
    // flex: 1,
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
    borderRadius: 20,
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
