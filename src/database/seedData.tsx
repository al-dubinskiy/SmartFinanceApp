import { database } from './index';

// ============ КАТЕГОРИИ НА РУССКОМ ============
const EXPENSE_CATEGORIES = [
  {
    name: 'Еда и рестораны',
    icon: 'food',
    color: '#FF6B6B',
    type: 'expense',
    order: 1,
  },
  {
    name: 'Продукты',
    icon: 'cart',
    color: '#4ECDC4',
    type: 'expense',
    order: 2,
  },
  {
    name: 'Транспорт',
    icon: 'car',
    color: '#45B7D1',
    type: 'expense',
    order: 3,
  },
  {
    name: 'Развлечения',
    icon: 'movie',
    color: '#96CEB4',
    type: 'expense',
    order: 4,
  },
  {
    name: 'Шопинг',
    icon: 'shopping',
    color: '#FFEAA7',
    type: 'expense',
    order: 5,
  },
  {
    name: 'Коммунальные услуги',
    icon: 'flash',
    color: '#DDA0DD',
    type: 'expense',
    order: 6,
  },
  {
    name: 'Медицина',
    icon: 'hospital',
    color: '#98D8C8',
    type: 'expense',
    order: 7,
  },
  {
    name: 'Образование',
    icon: 'school',
    color: '#F7DC6F',
    type: 'expense',
    order: 8,
  },
  {
    name: 'Подарки',
    icon: 'gift',
    color: '#E67E22',
    type: 'expense',
    order: 9,
  },
  {
    name: 'Кафе и кофейни',
    icon: 'coffee',
    color: '#A0522D',
    type: 'expense',
    order: 10,
  },
  {
    name: 'Связь и интернет',
    icon: 'wifi',
    color: '#4682B4',
    type: 'expense',
    order: 11,
  },
  {
    name: 'Аренда',
    icon: 'home',
    color: '#2F4F4F',
    type: 'expense',
    order: 12,
  },
  {
    name: 'Одежда',
    icon: 'tshirt-crew',
    color: '#DB7093',
    type: 'expense',
    order: 13,
  },
  {
    name: 'Спорт и хобби',
    icon: 'basketball',
    color: '#228B22',
    type: 'expense',
    order: 14,
  },
  {
    name: 'Путешествия',
    icon: 'airplane',
    color: '#1E90FF',
    type: 'expense',
    order: 15,
  },
  {
    name: 'Косметика',
    icon: 'face-woman',
    color: '#FF69B4',
    type: 'expense',
    order: 16,
  },
  {
    name: 'Домашние животные',
    icon: 'dog',
    color: '#CD853F',
    type: 'expense',
    order: 17,
  },
  {
    name: 'Прочее',
    icon: 'dots-horizontal',
    color: '#95A5A6',
    type: 'expense',
    order: 18,
  },
];

const INCOME_CATEGORIES = [
  {
    name: 'Зарплата',
    icon: 'cash',
    color: '#2ECC71',
    type: 'income',
    order: 1,
  },
  {
    name: 'Фриланс',
    icon: 'laptop',
    color: '#3498DB',
    type: 'income',
    order: 2,
  },
  {
    name: 'Инвестиции',
    icon: 'trending-up',
    color: '#9B59B6',
    type: 'income',
    order: 3,
  },
  { name: 'Подарки', icon: 'gift', color: '#E67E22', type: 'income', order: 4 },
  {
    name: 'Возвраты',
    icon: 'cash-refund',
    color: '#E74C3C',
    type: 'income',
    order: 5,
  },
  {
    name: 'Премия',
    icon: 'trophy',
    color: '#F39C12',
    type: 'income',
    order: 6,
  },
  {
    name: 'Прочее',
    icon: 'dots-horizontal',
    color: '#95A5A6',
    type: 'income',
    order: 7,
  },
];

// Реалистичные цены для каждой категории расходов
const getExpenseAmountByCategory = (
  categoryName: string,
  note?: string,
): number => {
  const prices: Record<string, number[]> = {
    'Еда и рестораны': [850, 1200, 1500, 2000, 3500],
    Продукты: [500, 800, 1200, 1800, 2500, 4000],
    Транспорт: [100, 200, 400, 800, 1500],
    Развлечения: [300, 500, 1000, 2000, 3000],
    Шопинг: [1000, 2000, 3500, 5000, 8000],
    'Коммунальные услуги': [2500, 3500, 4500, 6000],
    Медицина: [500, 1000, 2000, 5000],
    Образование: [3000, 5000, 10000, 15000],
    Подарки: [1000, 2000, 3000, 5000],
    'Кафе и кофейни': [150, 250, 400, 600, 1000],
    'Связь и интернет': [450, 650, 850, 1200],
    Аренда: [15000, 20000, 25000, 35000],
    Одежда: [1500, 3000, 5000, 8000, 12000],
    'Спорт и хобби': [1000, 2000, 3500, 5000],
    Путешествия: [5000, 10000, 15000, 30000],
    Косметика: [500, 1000, 2000, 3500],
    'Домашние животные': [500, 1000, 2000],
    Прочее: [100, 300, 500, 1000],
  };

  const categoryPrices = prices[categoryName] || [500, 1000, 2000];

  // Для некоторых заметок используем специфические цены
  if (note) {
    if (note.includes('Кофе') || note.includes('Starbucks')) return 350;
    if (note.includes('Обед')) return 450;
    if (note.includes('Ужин')) return 1200;
    if (note.includes('Такси')) return 400;
    if (note.includes('Кино')) return 600;
    if (note.includes('Аптека')) return 850;
    if (note.includes('Бензин')) return 2000;
  }

  return categoryPrices[Math.floor(Math.random() * categoryPrices.length)];
};

// Реалистичные суммы доходов
const getIncomeAmountByCategory = (categoryName: string): number => {
  const incomes: Record<string, number[]> = {
    Зарплата: [80000, 100000, 120000, 150000],
    Фриланс: [10000, 20000, 35000, 50000],
    Инвестиции: [3000, 5000, 10000, 20000],
    Подарки: [3000, 5000, 10000],
    Возвраты: [1000, 2000, 5000],
    Премия: [20000, 35000, 50000],
    Прочее: [1000, 3000, 5000],
  };

  const categoryIncomes = incomes[categoryName] || [5000, 10000, 20000];
  return categoryIncomes[Math.floor(Math.random() * categoryIncomes.length)];
};

// Функция для получения случайной даты за последние 3 месяца
const getRandomDate = (): number => {
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  return new Date(
    threeMonthsAgo.getTime() +
      Math.random() * (now.getTime() - threeMonthsAgo.getTime()),
  ).getTime();
};

// Описания расходов по категориям
const expenseNotesByCategory: Record<string, string[]> = {
  'Еда и рестораны': [
    'Обед в ресторане',
    'Ужин в ресторане',
    'Бизнес-ланч',
    'Суши',
    'Пицца',
  ],
  Продукты: [
    'Закупка продуктов',
    'Овощи и фрукты',
    'Мясные продукты',
    'Молочные продукты',
  ],
  Транспорт: ['Поездка на такси', 'Метро', 'Бензин', 'Парковка', 'Штраф'],
  Развлечения: ['Кино с друзьями', 'Боулинг', 'Квест', 'Концерт', 'Театр'],
  Шопинг: ['Покупка одежды', 'Обувь', 'Аксессуары', 'Техника'],
  'Коммунальные услуги': ['Электричество', 'Вода', 'Отопление', 'Вывоз мусора'],
  Медицина: ['Аптека', 'Прием врача', 'Анализы', 'Стоматология'],
  Образование: ['Курсы', 'Учебники', 'Тренинг', 'Вебинар'],
  Подарки: ['Подарок на день рождения', 'Новогодний подарок', 'Сюрприз'],
  'Кафе и кофейни': ['Кофе с собой', 'Десерт', 'Завтрак в кафе', 'Чай'],
  'Связь и интернет': [
    'Мобильная связь',
    'Домашний интернет',
    'Подписка Netflix',
  ],
  Аренда: ['Аренда квартиры', 'Аренда комнаты', 'Коммуналка'],
  Одежда: ['Джинсы', 'Куртка', 'Свитер', 'Платье', 'Рубашка'],
  'Спорт и хобби': ['Абонемент в спортзал', 'Экипировка', 'Тренировка'],
  Путешествия: ['Авиабилеты', 'Отель', 'Экскурсии', 'Трансфер'],
  Косметика: ['Крем', 'Парфюм', 'Макияж', 'Уход'],
  'Домашние животные': ['Корм', 'Наполнитель', 'Игрушки', 'Ветеринар'],
  Прочее: ['Прочие расходы', 'Мелочи', 'Непредвиденное'],
};

// Генерация тестовых транзакций с реалистичными ценами
const generateTestTransactions = (categories: any[]) => {
  const transactions = [];
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  // Расходы по каждой категории (по 3-5 транзакций на категорию)
  for (const category of expenseCategories) {
    const notes = expenseNotesByCategory[category.name] || ['Расход'];
    const transactionCount = Math.floor(Math.random() * 5) + 3; // 3-7 транзакций на категорию

    for (let i = 0; i < transactionCount; i++) {
      const note = notes[Math.floor(Math.random() * notes.length)];
      const amount = getExpenseAmountByCategory(category.name, note);

      transactions.push({
        amount,
        type: 'expense',
        categoryId: category.id,
        note,
        date: getRandomDate(),
        isRecurring: false,
        recurringType: null,
        location: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  // Доходы (регулярные и дополнительные)
  for (const category of incomeCategories) {
    const transactionCount =
      category.name === 'Зарплата'
        ? 3
        : category.name === 'Фриланс'
        ? 4
        : category.name === 'Инвестиции'
        ? 3
        : 2;

    for (let i = 0; i < transactionCount; i++) {
      const amount = getIncomeAmountByCategory(category.name);
      let note = '';

      if (category.name === 'Зарплата') note = 'Зарплата за месяц';
      else if (category.name === 'Фриланс') note = `Проект #${i + 1}`;
      else if (category.name === 'Инвестиции') note = 'Дивиденды';
      else if (category.name === 'Премия') note = 'Годовая премия';
      else if (category.name === 'Подарки') note = 'Подарок';
      else if (category.name === 'Возвраты') note = 'Возврат долга';

      transactions.push({
        amount,
        type: 'income',
        categoryId: category.id,
        note,
        date: getRandomDate(),
        isRecurring: category.name === 'Зарплата',
        recurringType: category.name === 'Зарплата' ? 'monthly' : null,
        location: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  // Добавляем регулярные платежи с реалистичными суммами
  const recurringPayments = [
    { name: 'Аренда квартиры', amount: 25000, categoryName: 'Аренда', day: 1 },
    {
      name: 'Интернет',
      amount: 850,
      categoryName: 'Связь и интернет',
      day: 10,
    },
    {
      name: 'Мобильная связь',
      amount: 450,
      categoryName: 'Связь и интернет',
      day: 15,
    },
    { name: 'Спортзал', amount: 2500, categoryName: 'Спорт и хобби', day: 8 },
    { name: 'Netflix', amount: 499, categoryName: 'Развлечения', day: 5 },
    {
      name: 'Электричество',
      amount: 1200,
      categoryName: 'Коммунальные услуги',
      day: 20,
    },
    { name: 'Вода', amount: 800, categoryName: 'Коммунальные услуги', day: 20 },
  ];

  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  for (const payment of recurringPayments) {
    const category = categories.find(c => c.name === payment.categoryName);
    if (category) {
      for (let m = 0; m < 3; m++) {
        const date = new Date(threeMonthsAgo);
        date.setMonth(threeMonthsAgo.getMonth() + m);
        date.setDate(payment.day);

        if (date <= now) {
          transactions.push({
            amount: payment.amount,
            type: 'expense',
            categoryId: category.id,
            note: payment.name,
            date: date.getTime(),
            isRecurring: true,
            recurringType: 'monthly',
            location: null,
            createdAt: date.getTime(),
            updatedAt: date.getTime(),
          });
        }
      }
    }
  }

  return transactions.sort((a, b) => b.date - a.date);
};

// Генерация бюджетов
const generateTestBudgets = (categories: any[]) => {
  const budgets = [];
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const budgetItems = [
    { name: 'Еда и рестораны', amount: 15000 },
    { name: 'Продукты', amount: 12000 },
    { name: 'Транспорт', amount: 5000 },
    { name: 'Развлечения', amount: 8000 },
    { name: 'Шопинг', amount: 10000 },
    { name: 'Коммунальные услуги', amount: 7000 },
    { name: 'Кафе и кофейни', amount: 3000 },
    { name: 'Спорт и хобби', amount: 4000 },
  ];

  for (const item of budgetItems) {
    const category = categories.find(c => c.name === item.name);
    if (category) {
      budgets.push({
        categoryId: category.id,
        amount: item.amount,
        period: 'monthly',
        month,
        year,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  return budgets;
};

// Генерация целей с реалистичными суммами
const generateTestGoals = () => {
  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);
  const sixMonths = new Date();
  sixMonths.setMonth(now.getMonth() + 6);
  const threeMonths = new Date();
  threeMonths.setMonth(now.getMonth() + 3);

  return [
    {
      name: '🏖️ Путешествие на Бали',
      targetAmount: 150000,
      currentAmount: 45000,
      deadline: sixMonths.getTime(),
      icon: 'beach',
      color: '#1E90FF',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '💻 MacBook Pro',
      targetAmount: 150000,
      currentAmount: 89000,
      deadline: threeMonths.getTime(),
      icon: 'laptop',
      color: '#9B59B6',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '🏠 Финансовая подушка',
      targetAmount: 300000,
      currentAmount: 125000,
      deadline: null,
      icon: 'shield-home',
      color: '#2ECC71',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '🚗 Новая машина',
      targetAmount: 1000000,
      currentAmount: 250000,
      deadline: nextYear.getTime(),
      icon: 'car',
      color: '#E74C3C',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '🎓 Курс по React Native',
      targetAmount: 25000,
      currentAmount: 25000,
      deadline: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      icon: 'school',
      color: '#F39C12',
      isCompleted: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
};

// ОСНОВНАЯ ФУНКЦИЯ ЗАПОЛНЕНИЯ
export async function seedTestData() {
  console.log('🌱 Начало заполнения тестовыми данными...');
  
  try {
    const categoriesCollection = database.get('categories');
    const existingCount = await categoriesCollection.query().fetchCount();
    
    if (existingCount > 0) {
      console.log('🗑️ Очистка существующих данных...');
      
      await database.write(async () => {
        const transactions = await database.get('transactions').query().fetch();
        for (const t of transactions) await t.destroyPermanently();
        
        const budgets = await database.get('budgets').query().fetch();
        for (const b of budgets) await b.destroyPermanently();
        
        const goals = await database.get('goals').query().fetch();
        for (const g of goals) await g.destroyPermanently();
        
        const allCategories = await categoriesCollection.query().fetch();
        for (const c of allCategories) await c.destroyPermanently();
      });
      
      console.log('✅ Существующие данные очищены');
    }
    
    // Создаем корневые категории и сразу сохраняем их ID
    console.log('📁 Создание корневых категорий...');
    const categoryIds: Record<string, string> = {};
    
    await database.write(async () => {
      // Создаем категории расходов и сохраняем их ID
      for (const cat of EXPENSE_CATEGORIES) {
        const newCat = await categoriesCollection.create((record: any) => {
          record.name = cat.name;
          record.type = cat.type;
          record.icon = cat.icon;
          record.color = cat.color;
          record.order = cat.order;
          record.isActive = true;
          record.parentId = ''; // Пустая строка для корневых категорий
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
        categoryIds[cat.name] = newCat.id;
      }
      
      // Создаем категории доходов и сохраняем их ID
      for (const cat of INCOME_CATEGORIES) {
        const newCat = await categoriesCollection.create((record: any) => {
          record.name = cat.name;
          record.type = cat.type;
          record.icon = cat.icon;
          record.color = cat.color;
          record.order = cat.order;
          record.isActive = true;
          record.parentId = '';
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        });
        categoryIds[cat.name] = newCat.id;
      }
    });
    
    console.log(`✅ Создано ${Object.keys(categoryIds).length} корневых категорий`);
    
    // Создаем подкатегории, используя ID из categoryIds
    console.log('📁 Создание подкатегорий...');
    
    // Подкатегории с указанием родительской категории по имени (для удобства чтения)
    // Внутри мы используем сохраненные ID
    const subcategories = [
      // Подкатегории для "Еда и рестораны"
      { name: 'Рестораны', icon: 'silverware-fork-knife', color: '#FF6B6B', parentName: 'Еда и рестораны' },
      { name: 'Фастфуд', icon: 'hamburger', color: '#FF8C69', parentName: 'Еда и рестораны' },
      { name: 'Доставка', icon: 'food-takeout-box', color: '#FFA07A', parentName: 'Еда и рестораны' },
      
      // Подкатегории для "Продукты"
      { name: 'Фрукты и овощи', icon: 'fruit-cherries', color: '#4ECDC4', parentName: 'Продукты' },
      { name: 'Мясо и рыба', icon: 'food-steak', color: '#5D9B9B', parentName: 'Продукты' },
      { name: 'Молочные продукты', icon: 'cheese', color: '#6EB5A5', parentName: 'Продукты' },
      { name: 'Бакалея', icon: 'basket', color: '#7FCDCD', parentName: 'Продукты' },
      
      // Подкатегории для "Транспорт"
      { name: 'Общественный транспорт', icon: 'bus', color: '#45B7D1', parentName: 'Транспорт' },
      { name: 'Такси', icon: 'taxi', color: '#5AC8FA', parentName: 'Транспорт' },
      { name: 'Бензин', icon: 'gas-station', color: '#6FD8FF', parentName: 'Транспорт' },
      { name: 'Парковка', icon: 'parking', color: '#85E4FF', parentName: 'Транспорт' },
      
      // Подкатегории для "Развлечения"
      { name: 'Кино', icon: 'movie', color: '#96CEB4', parentName: 'Развлечения' },
      { name: 'Концерты', icon: 'music', color: '#A8DBC9', parentName: 'Развлечения' },
      { name: 'Игры', icon: 'gamepad-variant', color: '#BAE8DE', parentName: 'Развлечения' },
      
      // Подкатегории для "Шопинг"
      { name: 'Одежда', icon: 'tshirt-crew', color: '#FFEAA7', parentName: 'Шопинг' },
      { name: 'Обувь', icon: 'shoe-print', color: '#FFF0BB', parentName: 'Шопинг' },
      { name: 'Электроника', icon: 'cellphone', color: '#FFF6CF', parentName: 'Шопинг' },
      
      // Подкатегории для "Спорт и хобби"
      { name: 'Фитнес', icon: 'dumbbell', color: '#228B22', parentName: 'Спорт и хобби' },
      { name: 'Тренировки', icon: 'run', color: '#32CD32', parentName: 'Спорт и хобби' },
      { name: 'Экипировка', icon: 'shoe-sneaker', color: '#42DC42', parentName: 'Спорт и хобби' },
      
      // Подкатегории для "Кафе и кофейни"
      { name: 'Кофе с собой', icon: 'coffee-to-go', color: '#A0522D', parentName: 'Кафе и кофейни' },
      { name: 'Десерты', icon: 'cake', color: '#B86F3A', parentName: 'Кафе и кофейни' },
      { name: 'Завтраки', icon: 'breakfast', color: '#D08C5C', parentName: 'Кафе и кофейни' },
      
      // Подкатегории для "Путешествия"
      { name: 'Авиабилеты', icon: 'airplane-takeoff', color: '#1E90FF', parentName: 'Путешествия' },
      { name: 'Отели', icon: 'hotel', color: '#3AA8FF', parentName: 'Путешествия' },
      { name: 'Экскурсии', icon: 'camera', color: '#56B6FF', parentName: 'Путешествия' },
    ];
    
    let subcategoryCount = 0;
    
    await database.write(async () => {
      for (const sub of subcategories) {
        // Получаем ID родительской категории по имени
        const parentId = categoryIds[sub.parentName];
        
        if (parentId) {
          await categoriesCollection.create((record: any) => {
            record.name = sub.name;
            record.type = 'expense';
            record.icon = sub.icon;
            record.color = sub.color;
            record.order = 999;
            record.isActive = true;
            record.parentId = parentId; // Здесь используем реальный ID родителя
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });
          subcategoryCount++;
        } else {
          console.warn(`⚠️ Родительская категория не найдена: ${sub.parentName}`);
        }
      }
    });
    
    console.log(`✅ Создано ${subcategoryCount} подкатегорий`);
    
    // ... продолжение создания транзакций, бюджетов, целей ...
    
    // Создаем транзакции
    console.log('💰 Генерация транзакций...');
    
    // Собираем все категории (включая подкатегории) для генерации транзакций
    const allCategories = await categoriesCollection.query().fetch();
    const transactions = generateTestTransactions(allCategories);
    
    await database.write(async () => {
      const transactionsCollection = database.get('transactions');
      for (const t of transactions) {
        await transactionsCollection.create((record: any) => {
          record.amount = t.amount;
          record.type = t.type;
          record.categoryId = t.categoryId;
          record.note = t.note;
          record.date = t.date;
          record.isRecurring = t.isRecurring;
          record.recurringType = t.recurringType;
          record.location = t.location;
          record.createdAt = t.createdAt;
          record.updatedAt = t.updatedAt;
        });
      }
    });
    
    console.log(`✅ Создано ${transactions.length} транзакций`);
    
    // Создаем бюджеты (только для корневых категорий)
    console.log('📊 Создание бюджетов...');
    const rootCategories = allCategories.filter(c => !c.parentId || c.parentId === '');
    const budgets = generateTestBudgets(rootCategories);
    
    await database.write(async () => {
      const budgetsCollection = database.get('budgets');
      for (const b of budgets) {
        await budgetsCollection.create((record: any) => {
          record.categoryId = b.categoryId;
          record.amount = b.amount;
          record.period = b.period;
          record.month = b.month;
          record.year = b.year;
          record.isActive = b.isActive;
          record.createdAt = b.createdAt;
          record.updatedAt = b.updatedAt;
        });
      }
    });
    
    console.log(`✅ Создано ${budgets.length} бюджетов`);
    
    // Создаем цели
    console.log('🎯 Создание целей...');
    const goals = generateTestGoals();
    
    await database.write(async () => {
      const goalsCollection = database.get('goals');
      for (const g of goals) {
        await goalsCollection.create((record: any) => {
          record.name = g.name;
          record.targetAmount = g.targetAmount;
          record.currentAmount = g.currentAmount;
          record.deadline = g.deadline;
          record.icon = g.icon;
          record.color = g.color;
          record.isCompleted = g.isCompleted;
          record.createdAt = g.createdAt;
          record.updatedAt = g.updatedAt;
        });
      }
    });
    
    console.log(`✅ Создано ${goals.length} целей`);
    
    // Статистика
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    console.log('\n🎉 ЗАПОЛНЕНИЕ ЗАВЕРШЕНО!');
    console.log('====================================================');
    console.log(`📁 Категории: ${allCategories.length}`);
    console.log(`   ├─ Корневых: ${rootCategories.length}`);
    console.log(`   └─ Подкатегорий: ${allCategories.length - rootCategories.length}`);
    console.log(`💰 Транзакции: ${transactions.length}`);
    console.log(`   ├─ Доходы: ${totalIncome.toLocaleString()} ₽`);
    console.log(`   └─ Расходы: ${totalExpense.toLocaleString()} ₽`);
    console.log(`   └─ Баланс: ${(totalIncome - totalExpense).toLocaleString()} ₽`);
    console.log(`📊 Бюджеты: ${budgets.length}`);
    console.log(`🎯 Цели: ${goals.length}`);
    console.log('====================================================');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}
