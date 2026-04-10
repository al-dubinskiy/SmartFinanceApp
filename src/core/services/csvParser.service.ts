import Papa from 'papaparse';
import RNFS from 'react-native-fs';

export interface ParsedTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category?: string;
  merchantName?: string;
  rawData: any;
}

export interface CSVColumnMapping {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  typeColumn?: string;
  timeColumn?: string;
  categoryColumn?: string;
}

export interface CSVPreviewData {
  headers: string[];
  rows: any[];
  totalRows: number;
}

class CSVParserService {
  private static instance: CSVParserService;
  
  static getInstance(): CSVParserService {
    if (!CSVParserService.instance) {
      CSVParserService.instance = new CSVParserService();
    }
    return CSVParserService.instance;
  }

  // Чтение и парсинг CSV файла
  async parseCSVFile(fileUri: string): Promise<{ headers: string[]; data: any[] }> {
    try {
      const fileContent = await RNFS.readFile(fileUri, 'utf8');
      const parsed = Papa.parse(fileContent, { 
        header: true, 
        skipEmptyLines: true,
        encoding: 'UTF-8'
      });
      
      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }
      
      const headers = parsed.meta.fields || [];
      const data = parsed.data;
      
      return { headers, data };
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw error;
    }
  }

  // Применение маппинга к данным
  applyMapping(
    rawData: any[],
    mapping: CSVColumnMapping,
    bankName?: string
  ): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        // Парсим дату и время
        let date = this.parseDateFromRow(row, mapping);
        if (!date) continue;
        
        // Парсим сумму и определяем тип
        const amountResult = this.parseAmountFromRow(row, mapping);
        if (!amountResult.success) continue;
        
        const { amount, type } = amountResult;
        
        // Парсим описание
        let description = row[mapping.descriptionColumn] || '';
        description = this.cleanDescription(description);
        
        // Определяем категорию (если есть)
        let category = mapping.categoryColumn ? row[mapping.categoryColumn] : undefined;
        
        transactions.push({
          id: `csv_${Date.now()}_${i}`,
          date,
          amount,
          description,
          type,
          category: this.detectCategory(description, category),
          merchantName: this.extractMerchantName(description),
          rawData: row,
        });
      } catch (error) {
        console.warn(`Error parsing row ${i}:`, error);
      }
    }
    
    return transactions;
  }

  private parseDateFromRow(row: any, mapping: CSVColumnMapping): Date | null {
    const dateStr = row[mapping.dateColumn];
    if (!dateStr) return null;
    
    // Если дата и время в одной колонке (например: "05.04.2026 20:22:23")
    const dateTimeMatch = dateStr.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (dateTimeMatch) {
      const date = this.parseDate(dateTimeMatch[1]);
      const [hours, minutes, seconds] = dateTimeMatch[2].split(':');
      date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
      return date;
    }
    
    return this.parseDate(dateStr);
  }

  private parseAmountFromRow(row: any, mapping: CSVColumnMapping): { success: boolean; amount: number; type: 'income' | 'expense' } {
    let amountStr = row[mapping.amountColumn];
    if (!amountStr) return { success: false, amount: 0, type: 'expense' };
    
    // Приводим к строке и очищаем
    amountStr = amountStr.toString().trim();
    
    // Определяем тип по знаку в строке
    let type: 'income' | 'expense' = 'expense';
    
    // Проверяем наличие знака + или - в начале строки
    if (amountStr.startsWith('+')) {
      type = 'income';
      amountStr = amountStr.substring(1); // Убираем знак +
    } else if (amountStr.startsWith('-')) {
      type = 'expense';
      amountStr = amountStr.substring(1); // Убираем знак -
    } else {
      // Если нет явного знака, проверяем по отдельной колонке типа
      if (mapping.typeColumn && row[mapping.typeColumn]) {
        const typeValue = row[mapping.typeColumn].toLowerCase();
        if (typeValue.includes('доход') || typeValue.includes('income') || typeValue.includes('приход')) {
          type = 'income';
        } else if (typeValue.includes('расход') || typeValue.includes('expense') || typeValue.includes('списание')) {
          type = 'expense';
        }
      } else {
        // Если нет колонки типа, считаем положительные суммы доходами, отрицательные - расходами
        const numericValue = this.parseAmount(amountStr);
        if (numericValue > 0) {
          type = 'income';
        } else {
          type = 'expense';
        }
      }
    }
    
    // Парсим сумму (убираем все лишние символы)
    let amount = this.parseAmount(amountStr);
    
    return { success: amount > 0, amount, type };
  }

  private parseDate(dateStr: string): Date {
    // Поддерживаемые форматы
    const formats = [
      { regex: /(\d{2})\.(\d{2})\.(\d{4})/, order: ['day', 'month', 'year'] },
      { regex: /(\d{4})-(\d{2})-(\d{2})/, order: ['year', 'month', 'day'] },
      { regex: /(\d{2})\/(\d{2})\/(\d{4})/, order: ['month', 'day', 'year'] },
      { regex: /(\d{4})\/(\d{2})\/(\d{2})/, order: ['year', 'month', 'day'] },
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format.regex);
      if (match) {
        let day: number, month: number, year: number;
        
        if (format.order[0] === 'day') {
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = parseInt(match[3]);
        } else if (format.order[0] === 'month') {
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        }
        
        if (year && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          if (year < 100) year = 2000 + year;
          return new Date(year, month, day);
        }
      }
    }
    
    return new Date();
  }

  private parseAmount(amountStr: string): number {
    let cleaned = amountStr.toString().trim();
    // Убираем пробелы
    cleaned = cleaned.replace(/\s/g, '');
    // Заменяем запятую на точку
    cleaned = cleaned.replace(',', '.');
    // Убираем все символы, кроме цифр, точки и минуса
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    
    let amount = parseFloat(cleaned);
    if (isNaN(amount)) amount = 0;
    
    return Math.abs(amount);
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 200);
  }

  private detectCategory(description: string, predefinedCategory?: string): string {
    if (predefinedCategory) return predefinedCategory;
    
    const lowerDesc = description.toLowerCase();
    
    const categories: Record<string, string[]> = {
      'Супермаркеты': ['продукты', 'супермаркет', 'магазин', 'market', 'okey', 'ашан', 'пятёрочка', 'магнит', 'окей'],
      'Кафе и рестораны': ['кафе', 'ресторан', 'кофе', 'starbucks', 'макдоналдс', 'kfc', 'бургер', 'пицца', 'суши'],
      'Транспорт': ['такси', 'uber', 'яндекс', 'метро', 'автобус', 'бензин', 'заправка', 'газон'],
      'Связь': ['мтс', 'билайн', 'мегафон', 'tele2', 'интернет', 'wifi'],
      'Развлечения': ['кино', 'театр', 'концерт', 'steam', 'playstation', 'xbox', 'игры'],
      'Одежда': ['одежда', 'обувь', 'wildberries', 'ozon', 'lamoda', 'кроссовки'],
      'Здоровье': ['аптека', 'лекарство', 'врач', 'стоматолог', 'больница'],
      'Переводы': ['перевод клиенту', 'перевод средств', 'сбербанк онлайн'],
      'Кешбэк': ['кешбэк', 'cashback', 'бонус', 'кэшбэк'],
      'Комиссия': ['комиссия', 'обслуживание'],
      'Наличные': ['снятие наличных', 'снятие денежных средств'],
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword)) {
          return category;
        }
      }
    }
    
    return 'Прочее';
  }

  private extractMerchantName(description: string): string {
    const patterns = [
      /в\s+([А-Я][А-Я\s]+?)(?:\s+RU|\s+дата|$)/i,
      /IP\s+([А-Я][А-Я\s]+?)(?:\s+RU|\s+дата|$)/i,
      /ООО\s+([А-Я][А-Я\s]+?)(?:\s+RU|\s+дата|$)/i,
      /Bank\s+"([^"]+)"/i,
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return description.substring(0, 30);
  }

  getStatistics(transactions: ParsedTransaction[]) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const byCategory: Record<string, number> = {};
    
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        byCategory[tx.category || 'Прочее'] = (byCategory[tx.category || 'Прочее'] || 0) + tx.amount;
      }
    }
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      byCategory,
      topCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }
}

export default CSVParserService.getInstance();