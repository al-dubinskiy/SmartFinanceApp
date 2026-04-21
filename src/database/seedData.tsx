import { database } from './index';

// ============ КАТЕГОРИИ С ПОДКАТЕГОРИЯМИ ============
const EXPENSE_CATEGORIES = [
  { name: 'Еда и рестораны', icon: 'food', color: '#FF6B6B', type: 'expense', order: 1 },
  { name: 'Продукты', icon: 'cart', color: '#4ECDC4', type: 'expense', order: 2 },
  { name: 'Транспорт', icon: 'car', color: '#45B7D1', type: 'expense', order: 3 },
  { name: 'Развлечения', icon: 'movie', color: '#96CEB4', type: 'expense', order: 4 },
  { name: 'Шопинг', icon: 'shopping', color: '#FFEAA7', type: 'expense', order: 5 },
  { name: 'Коммунальные услуги', icon: 'flash', color: '#DDA0DD', type: 'expense', order: 6 },
  { name: 'Медицина', icon: 'hospital', color: '#98D8C8', type: 'expense', order: 7 },
  { name: 'Образование', icon: 'school', color: '#F7DC6F', type: 'expense', order: 8 },
  { name: 'Подарки', icon: 'gift', color: '#E67E22', type: 'expense', order: 9 },
  { name: 'Кафе и кофейни', icon: 'coffee', color: '#A0522D', type: 'expense', order: 10 },
  { name: 'Связь и интернет', icon: 'wifi', color: '#4682B4', type: 'expense', order: 11 },
  { name: 'Аренда', icon: 'home', color: '#2F4F4F', type: 'expense', order: 12 },
  { name: 'Одежда', icon: 'tshirt-crew', color: '#DB7093', type: 'expense', order: 13 },
  { name: 'Спорт и хобби', icon: 'basketball', color: '#228B22', type: 'expense', order: 14 },
  { name: 'Путешествия', icon: 'airplane', color: '#1E90FF', type: 'expense', order: 15 },
  { name: 'Накопления', icon: 'piggy-bank', color: '#9B59B6', type: 'expense', order: 18 },
];

const INCOME_CATEGORIES = [
  { name: 'Зарплата', icon: 'cash', color: '#2ECC71', type: 'income', order: 1 },
  { name: 'Аванс', icon: 'cash-refund', color: '#3498DB', type: 'income', order: 2 },
  { name: 'Фриланс', icon: 'laptop', color: '#9B59B6', type: 'income', order: 3 },
  { name: 'Подарки', icon: 'gift', color: '#E67E22', type: 'income', order: 4 },
  { name: 'Возвраты', icon: 'cash-refund', color: '#E74C3C', type: 'income', order: 5 },
  { name: 'Премия', icon: 'trophy', color: '#F39C12', type: 'income', order: 6 },
  { name: 'Дивиденды', icon: 'chart-line', color: '#1ABC9C', type: 'income', order: 7 },
  { name: 'Проценты по вкладу', icon: 'bank', color: '#27AE60', type: 'income', order: 8 },
];

// ПОДКАТЕГОРИИ
const SUBCATEGORIES = [
  { name: 'Рестораны', icon: 'silverware-fork-knife', color: '#FF6B6B', parentName: 'Еда и рестораны' },
  { name: 'Фастфуд', icon: 'hamburger', color: '#FF8C69', parentName: 'Еда и рестораны' },
  { name: 'Доставка', icon: 'food-takeout-box', color: '#FFA07A', parentName: 'Еда и рестораны' },
  { name: 'Фрукты и овощи', icon: 'fruit-cherries', color: '#4ECDC4', parentName: 'Продукты' },
  { name: 'Мясо и рыба', icon: 'food-steak', color: '#5D9B9B', parentName: 'Продукты' },
  { name: 'Молочные продукты', icon: 'cheese', color: '#6EB5A5', parentName: 'Продукты' },
  { name: 'Бакалея', icon: 'basket', color: '#7FCDCD', parentName: 'Продукты' },
  { name: 'Общественный транспорт', icon: 'bus', color: '#45B7D1', parentName: 'Транспорт' },
  { name: 'Такси', icon: 'taxi', color: '#5AC8FA', parentName: 'Транспорт' },
  { name: 'Бензин', icon: 'gas-station', color: '#6FD8FF', parentName: 'Транспорт' },
  { name: 'Парковка', icon: 'parking', color: '#85E4FF', parentName: 'Транспорт' },
  { name: 'Кино', icon: 'movie', color: '#96CEB4', parentName: 'Развлечения' },
  { name: 'Концерты', icon: 'music', color: '#A8DBC9', parentName: 'Развлечения' },
  { name: 'Игры', icon: 'gamepad-variant', color: '#BAE8DE', parentName: 'Развлечения' },
  { name: 'Хобби', icon: 'palette', color: '#CCF5F3', parentName: 'Развлечения' },
  { name: 'Одежда', icon: 'tshirt-crew', color: '#FFEAA7', parentName: 'Шопинг' },
  { name: 'Обувь', icon: 'shoe-print', color: '#FFF0BB', parentName: 'Шопинг' },
  { name: 'Электроника', icon: 'cellphone', color: '#FFF6CF', parentName: 'Шопинг' },
];

// ============ ФУНКЦИИ ДЛЯ ГЕНЕРАЦИИ ДАННЫХ ============

const getDateForMonth = (year: number, month: number, day: number): number => {
  return new Date(year, month, day).getTime();
};

// Регулярные дополнительные доходы (ежемесячные)
const getRegularExtraIncome = (month: number, year: number): any[] => {
  const regularIncomes = [];
  
  // Фриланс - регулярный доход, но с переменной суммой
  const freelanceAmount = 15000 + Math.random() * 10000;
  regularIncomes.push({
    amount: Math.round(freelanceAmount),
    category: 'Фриланс',
    note: 'Регулярный проект',
    day: 15,
    isRecurring: true,
  });
  
  // Проценты по вкладу (ежемесячно)
  regularIncomes.push({
    amount: 3500,
    category: 'Проценты по вкладу',
    note: 'Ежемесячная капитализация',
    day: 28,
    isRecurring: true,
  });
  
  return regularIncomes;
};

// Нерегулярные дополнительные доходы (разовые)
const getIrregularExtraIncome = (month: number, year: number): any[] => {
  const irregularIncomes = [];
  const randomChance = Math.random();
  
  // 80% вероятность хотя бы одного нерегулярного дохода в месяце
  if (randomChance < 0.8) {
    const irregularTypes = [
      { category: 'Подарки', minAmount: 3000, maxAmount: 15000, note: 'Подарок на день рождения' },
      { category: 'Возвраты', minAmount: 2000, maxAmount: 12000, note: 'Возврат долга' },
      { category: 'Премия', minAmount: 25000, maxAmount: 60000, note: 'Квартальная премия' },
      { category: 'Дивиденды', minAmount: 5000, maxAmount: 25000, note: 'Дивиденды по акциям' },
      { category: 'Продажа вещей', minAmount: 2000, maxAmount: 15000, note: 'Продажа на Avito' },
    ];
    
    // 1-2 нерегулярных дохода в месяц
    const incomesCount = Math.random() < 0.5 ? 1 : 2;
    
    for (let i = 0; i < incomesCount; i++) {
      const selected = irregularTypes[Math.floor(Math.random() * irregularTypes.length)];
      const amount = selected.minAmount + Math.random() * (selected.maxAmount - selected.minAmount);
      const randomDay = Math.floor(Math.random() * 28) + 1;
      
      irregularIncomes.push({
        amount: Math.round(amount),
        category: selected.category,
        note: selected.note,
        day: randomDay,
        isRecurring: false,
      });
    }
  }
  
  return irregularIncomes;
};

// Сезонные доходы (раз в квартал/год)
const getSeasonalIncome = (month: number, year: number): any[] => {
  const seasonalIncomes = [];
  
  // Премия в декабре
  if (month === 11) { // декабрь (месяц 11)
    seasonalIncomes.push({
      amount: 80000,
      category: 'Премия',
      note: 'Годовая премия',
      day: 20,
      isRecurring: false,
    });
  }
  
  // Дивиденды в марте и сентябре
  if (month === 2 || month === 8) { // март или сентябрь
    seasonalIncomes.push({
      amount: 25000,
      category: 'Дивиденды',
      note: 'Квартальные дивиденды',
      day: 15,
      isRecurring: true,
    });
  }
  
  // Налоговый вычет в апреле
  if (month === 3) { // апрель
    seasonalIncomes.push({
      amount: 15000,
      category: 'Возвраты',
      note: 'Налоговый вычет',
      day: 10,
      isRecurring: false,
    });
  }
  
  return seasonalIncomes;
};

// Генерация транзакций по месяцам
const generateTransactionsByMonth = (categories: any[]) => {
  const transactions = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  // Функция для получения ID категории по имени
  const getCategoryId = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return cat?.id;
  };
  
  // Массив месяцев для генерации (текущий и 3 прошлых)
  const months = [];
  for (let i = 0; i < 4; i++) {
    const month = currentMonth - i;
    const year = month < 0 ? currentYear - 1 : currentYear;
    const actualMonth = month < 0 ? month + 12 : month;
    months.push({ year, month: actualMonth, offset: i });
  }
  
  // Генерация для каждого месяца
  for (const { year, month: monthIndex, offset } of months) {
    const isCurrentMonth = offset === 0;
    
    // ===== РЕГУЛЯРНЫЕ ДОХОДЫ (каждый месяц) =====
    
    // 1. Аванс (10 число)
    const advanceDate = 10;
    if (!isCurrentMonth || (isCurrentMonth && currentDay >= advanceDate)) {
      transactions.push({
        amount: 80000,
        type: 'income',
        categoryId: getCategoryId('Аванс'),
        note: 'Аванс за месяц',
        date: getDateForMonth(year, monthIndex, advanceDate),
        isRecurring: true,
        recurringType: 'monthly',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // 2. Зарплата (25 число)
    const salaryDate = 25;
    if (!isCurrentMonth || (isCurrentMonth && currentDay >= salaryDate)) {
      transactions.push({
        amount: 120000,
        type: 'income',
        categoryId: getCategoryId('Зарплата'),
        note: 'Зарплата за месяц',
        date: getDateForMonth(year, monthIndex, salaryDate),
        isRecurring: true,
        recurringType: 'monthly',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // 3. Регулярные дополнительные доходы (фриланс, проценты)
    const regularExtra = getRegularExtraIncome(monthIndex, year);
    for (const extra of regularExtra) {
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= extra.day)) {
        transactions.push({
          amount: extra.amount,
          type: 'income',
          categoryId: getCategoryId(extra.category),
          note: extra.note,
          date: getDateForMonth(year, monthIndex, extra.day),
          isRecurring: extra.isRecurring,
          recurringType: extra.isRecurring ? 'monthly' : null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    
    // ===== НЕРЕГУЛЯРНЫЕ ДОХОДЫ =====
    
    // 4. Нерегулярные дополнительные доходы
    const irregularExtra = getIrregularExtraIncome(monthIndex, year);
    for (const extra of irregularExtra) {
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= extra.day)) {
        transactions.push({
          amount: extra.amount,
          type: 'income',
          categoryId: getCategoryId(extra.category),
          note: extra.note,
          date: getDateForMonth(year, monthIndex, extra.day),
          isRecurring: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    
    // 5. Сезонные доходы
    const seasonalIncome = getSeasonalIncome(monthIndex, year);
    for (const extra of seasonalIncome) {
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= extra.day)) {
        transactions.push({
          amount: extra.amount,
          type: 'income',
          categoryId: getCategoryId(extra.category),
          note: extra.note,
          date: getDateForMonth(year, monthIndex, extra.day),
          isRecurring: extra.isRecurring,
          recurringType: extra.isRecurring ? 'yearly' : null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    
    // ===== РАСХОДЫ =====
    
    // Регулярные платежи
    const recurringExpenses = [
      { amount: 45000, category: 'Аренда', day: 1, note: 'Аренда квартиры' },
      { amount: 1500, category: 'Связь и интернет', day: 5, note: 'Мобильная связь' },
      { amount: 2000, category: 'Связь и интернет', day: 10, note: 'Интернет' },
      { amount: 3500, category: 'Коммунальные услуги', day: 15, note: 'Электричество' },
      { amount: 1500, category: 'Коммунальные услуги', day: 15, note: 'Вода' },
      { amount: 5000, category: 'Спорт и хобби', day: 20, note: 'Спортзал' },
      { amount: 799, category: 'Развлечения', day: 25, note: 'Netflix' },
      { amount: 299, category: 'Развлечения', day: 25, note: 'Spotify' },
    ];
    
    for (const exp of recurringExpenses) {
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= exp.day)) {
        transactions.push({
          amount: exp.amount,
          type: 'expense',
          categoryId: getCategoryId(exp.category),
          note: exp.note,
          date: getDateForMonth(year, monthIndex, exp.day),
          isRecurring: true,
          recurringType: 'monthly',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    
    // Повседневные расходы
    const dailyExpenses = [
      { category: 'Продукты', amount: 1500 + Math.random() * 2000, day: 3, note: 'Закупка продуктов' },
      { category: 'Продукты', amount: 1200 + Math.random() * 1500, day: 8, note: 'Продукты на неделю' },
      { category: 'Продукты', amount: 2000 + Math.random() * 2500, day: 18, note: 'Продукты' },
      { category: 'Продукты', amount: 1800 + Math.random() * 2000, day: 22, note: 'Продукты' },
      { category: 'Кафе и кофейни', amount: 350 + Math.random() * 400, day: 2, note: 'Кофе' },
      { category: 'Кафе и кофейни', amount: 450 + Math.random() * 500, day: 7, note: 'Обед' },
      { category: 'Кафе и кофейни', amount: 800 + Math.random() * 700, day: 14, note: 'Ужин в кафе' },
      { category: 'Кафе и кофейни', amount: 400 + Math.random() * 500, day: 21, note: 'Кофе с друзьями' },
      { category: 'Кафе и кофейни', amount: 600 + Math.random() * 600, day: 28, note: 'Завтрак' },
      { category: 'Транспорт', amount: 100 + Math.random() * 200, day: 4, note: 'Метро' },
      { category: 'Транспорт', amount: 500 + Math.random() * 400, day: 9, note: 'Такси' },
      { category: 'Транспорт', amount: 200 + Math.random() * 300, day: 16, note: 'Проездной' },
      { category: 'Транспорт', amount: 800 + Math.random() * 500, day: 23, note: 'Такси' },
    ];
    
    for (const exp of dailyExpenses) {
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= exp.day)) {
        transactions.push({
          amount: Math.round(exp.amount),
          type: 'expense',
          categoryId: getCategoryId(exp.category),
          note: exp.note,
          date: getDateForMonth(year, monthIndex, exp.day),
          isRecurring: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    
    // Крупные покупки (раз в 1-2 месяца)
    if (offset === 0 || offset === 2) {
      const bigPurchases = [
        { category: 'Одежда', amount: 5000 + Math.random() * 10000, day: 12, note: 'Покупка одежды' },
        { category: 'Шопинг', amount: 8000 + Math.random() * 12000, day: 19, note: 'Шопинг' },
        { category: 'Развлечения', amount: 3000 + Math.random() * 7000, day: 24, note: 'Концерт' },
        { category: 'Путешествия', amount: 15000 + Math.random() * 25000, day: 27, note: 'Бронирование отеля' },
      ];
      
      const purchase = bigPurchases[Math.floor(Math.random() * bigPurchases.length)];
      if (!isCurrentMonth || (isCurrentMonth && currentDay >= purchase.day)) {
        transactions.push({
          amount: Math.round(purchase.amount),
          type: 'expense',
          categoryId: getCategoryId(purchase.category),
          note: purchase.note,
          date: getDateForMonth(year, monthIndex, purchase.day),
          isRecurring: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  }
  
  return transactions.sort((a, b) => b.date - a.date);
};

// Бюджеты для демонстрации
const generateBudgets = (categories: any[]) => {
  const budgets = [];
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  const budgetItems = [
    { name: 'Еда и рестораны', amount: 30000 },
    { name: 'Продукты', amount: 25000 },
    { name: 'Транспорт', amount: 10000 },
    { name: 'Развлечения', amount: 20000 },
    { name: 'Шопинг', amount: 30000 },
    { name: 'Коммунальные услуги', amount: 15000 },
    { name: 'Аренда', amount: 45000 },
    { name: 'Кафе и кофейни', amount: 10000 },
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

// Финансовые цели
const generateGoals = () => {
  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);
  const sixMonths = new Date();
  sixMonths.setMonth(now.getMonth() + 6);
  
  return [
    {
      name: '✈️ Путешествие в Японию',
      targetAmount: 300000,
      currentAmount: 120000,
      deadline: sixMonths.getTime(),
      icon: 'airplane',
      color: '#1E90FF',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '💻 Новый MacBook Pro',
      targetAmount: 200000,
      currentAmount: 80000,
      deadline: new Date(now.getFullYear(), now.getMonth() + 3, 1).getTime(),
      icon: 'laptop',
      color: '#9B59B6',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      name: '🏠 Финансовая подушка',
      targetAmount: 500000,
      currentAmount: 150000,
      deadline: nextYear.getTime(),
      icon: 'shield-home',
      color: '#2ECC71',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
};

// ============ ОСНОВНАЯ ФУНКЦИЯ ЗАПОЛНЕНИЯ ============
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
    
    // Создаем категории
    console.log('📁 Создание категорий...');
    const categoryIds: Record<string, string> = {};
    
    await database.write(async () => {
      for (const cat of EXPENSE_CATEGORIES) {
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
    
    console.log(`✅ Создано ${Object.keys(categoryIds).length} категорий`);
    
    // Создаем подкатегории
    console.log('📁 Создание подкатегорий...');
    let subcategoryCount = 0;
    
    await database.write(async () => {
      for (const sub of SUBCATEGORIES) {
        const parentId = categoryIds[sub.parentName];
        if (parentId) {
          await categoriesCollection.create((record: any) => {
            record.name = sub.name;
            record.type = 'expense';
            record.icon = sub.icon;
            record.color = sub.color;
            record.order = 999;
            record.isActive = true;
            record.parentId = parentId;
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });
          subcategoryCount++;
        }
      }
    });
    
    console.log(`✅ Создано ${subcategoryCount} подкатегорий`);
    
    // Получаем все категории для создания транзакций
    const allCategories = await categoriesCollection.query().fetch();
    
    // Создаем транзакции
    console.log('💰 Генерация транзакций...');
    const transactions = generateTransactionsByMonth(allCategories);
    
    await database.write(async () => {
      const transactionsCollection = database.get('transactions');
      for (const t of transactions) {
        await transactionsCollection.create((record: any) => {
          record.amount = t.amount;
          record.type = t.type;
          record.categoryId = t.categoryId;
          record.note = t.note;
          record.date = t.date;
          record.isRecurring = t.isRecurring || false;
          record.recurringType = t.recurringType || null;
          record.location = null;
          record.createdAt = t.createdAt;
          record.updatedAt = t.updatedAt;
        });
      }
    });
    
    console.log(`✅ Создано ${transactions.length} транзакций`);
    
    // Создаем бюджеты
    console.log('📊 Создание бюджетов...');
    const budgets = generateBudgets(allCategories);
    
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
    const goals = generateGoals();
    
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
    const currentBalance = totalIncome - totalExpense;
    
    console.log('\n🎉 ЗАПОЛНЕНИЕ ЗАВЕРШЕНО!');
    console.log('====================================================');
    console.log(`📁 Всего категорий: ${allCategories.length}`);
    console.log(`   ├─ Корневых: ${Object.keys(categoryIds).length}`);
    console.log(`   └─ Подкатегорий: ${subcategoryCount}`);
    console.log(`💰 Транзакции: ${transactions.length}`);
    console.log(`   ├─ Доходы: ${totalIncome.toLocaleString()} ₽`);
    console.log(`   └─ Расходы: ${totalExpense.toLocaleString()} ₽`);
    console.log(`   └─ ТЕКУЩИЙ БАЛАНС: ${currentBalance.toLocaleString()} ₽`);
    console.log(`📊 Бюджеты: ${budgets.length}`);
    console.log(`🎯 Цели: ${goals.length}`);
    console.log('====================================================');
    console.log('\n📊 СТРУКТУРА ДОХОДОВ:');
    console.log('   📅 Аванс (10 число): 80 000 ₽');
    console.log('   📅 Зарплата (25 число): 120 000 ₽');
    console.log('   💻 Фриланс: 15 000-25 000 ₽ (регулярно)');
    console.log('   📈 Проценты по вкладу: 3 500 ₽ (регулярно)');
    console.log('   🎲 Нерегулярные доходы: подарки, возвраты, премии, дивиденды');
    console.log('   🎄 Сезонные доходы: годовая премия (декабрь), налоговый вычет (апрель)');
    console.log('\n📱 ДЕМОНСТРАЦИОННЫЕ СЦЕНАРИИ:');
    console.log('   1. Категории с подкатегориями - в модалке выбора категории');
    console.log('   2. Бюджеты с прогрессом - на экране планирования');
    console.log('   3. Финансовые цели - там же');
    console.log('   4. Прогноз кассовых разрывов - в аналитике');
    console.log('   5. Ежедневные лимиты - на главном экране');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}

export async function seedCategoriesData() {
  try {
    const categoriesCollection = database.get('categories');
    const existingCount = await categoriesCollection.query().fetchCount();
    
    if (existingCount > 0) {
      console.log('🗑️ Очистка категорий...');
      await database.write(async () => {
        const allCategories = await categoriesCollection.query().fetch();
        for (const c of allCategories) await c.destroyPermanently();
      });
      console.log('✅ Существующий список категорий очищен');
    }
    
    // Создаем категории
    console.log('📁 Создание категорий...');
    const categoryIds: Record<string, string> = {};
    
    await database.write(async () => {
      for (const cat of EXPENSE_CATEGORIES) {
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
    
    console.log(`✅ Создано ${Object.keys(categoryIds).length} категорий`);
  } catch (error) {
    console.error('❌ Ошибка во время создания категорий по умолчанию:', error);
    throw error;
  }
}