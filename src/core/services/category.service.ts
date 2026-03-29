import { database, getCategoriesCollection } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { Category } from '../../database/models/Category';

export interface CreateCategoryDTO {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  parentId?: string;
  order?: number;
}

class CategoryService {
  // Создать категорию
  async createCategory(data: CreateCategoryDTO): Promise<Category> {
    return await database.write(async () => {
      const categories = getCategoriesCollection();

      const existing = await categories
        .query(Q.where('type', data.type))
        .fetch();

      const maxOrder = Math.max(...existing.map((c: any) => c.order || 0), 0);

      return await categories.create((category: any) => {
        category.name = data.name;
        category.type = data.type;
        category.icon = data.icon;
        category.color = data.color;
        category.parentId = data.parentId || null;   // важно: null, а не ''
        category.order = data.order || maxOrder + 1;
        category.isActive = true;
        category.createdAt = Date.now();
        category.updatedAt = Date.now();
      });
    });
  }

  // Получить дерево категорий (улучшенная версия)
  async getCategoryTree(type: 'income' | 'expense') {
    const categories = await this.getCategoriesByType(type);
    
    const map: Record<string, any> = {};
    const tree: any[] = [];

    // Создаём маппинг
    categories.forEach((cat: any) => {
      map[cat.id] = {
        ...cat._raw,           // важно брать _raw
        children: [],
      };
    });

    // Строим дерево
    categories.forEach((cat: any) => {
      const catData = map[cat.id];
      if (cat.parentId && map[cat.parentId]) {
        map[cat.parentId].children.push(catData);
      } else {
        tree.push(catData);
      }
    });

    // Сортируем детей
    const sortChildren = (node: any) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        node.children.forEach(sortChildren);
      }
    };

    tree.forEach(sortChildren);
    return tree;
  }

  // Получить все активные категории по типу (плоско)
  async getCategoriesByType(type: 'income' | 'expense') {
    const categories = getCategoriesCollection();
    return await categories
      .query(
        Q.where('type', type),
        Q.where('is_active', true),
        Q.sortBy('order', Q.asc)
      )
      .fetch();
  }

  // УДАЛЕНИЕ категории (полное + каскадное)
  async deleteCategory(id: string): Promise<void> {
    return await database.write(async () => {
      const categories = getCategoriesCollection();
      const category = await categories.find(id);

      // Рекурсивно удаляем всех детей
      const deleteChildren = async (catId: string) => {
        const children = await categories
          .query(Q.where('parent_id', catId))
          .fetch();

        for (const child of children) {
          await deleteChildren(child.id);
          await child.destroyPermanently();
        }
      };

      await deleteChildren(id);
      await category.destroyPermanently();
    });
  }

  // Обновить категорию
  async updateCategory(id: string, data: Partial<CreateCategoryDTO>) {
    return await database.write(async () => {
      const categories = getCategoriesCollection();
      const category = await categories.find(id);

      return await category.update((record: any) => {
        if (data.name !== undefined) record.name = data.name;
        if (data.icon !== undefined) record.icon = data.icon;
        if (data.color !== undefined) record.color = data.color;
        if (data.parentId !== undefined) record.parentId = data.parentId || null;
        if (data.order !== undefined) record.order = data.order;
        record.updatedAt = Date.now();
      });
    });
  }
}

export default new CategoryService();