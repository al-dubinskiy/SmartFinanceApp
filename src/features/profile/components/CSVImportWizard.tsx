import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { pick, types } from '@react-native-documents/picker'
import RNFS from 'react-native-fs';
import Papa from 'papaparse';
import { useTheme } from '../../../core/hooks/useTheme';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import { formatCurrency } from '../../../core/utils/formatters';

interface CSVImportWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select' | 'mapping' | 'preview' | 'importing';

interface CSVColumnMapping {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  typeColumn?: string;
  timeColumn?: string;
  categoryColumn?: string;
}

interface TransactionDuplicateInfo {
  isDuplicate: boolean;
  existingTransactionId?: string;
  existingTransactionDate?: number;
  existingTransactionAmount?: number;
}

export const CSVImportWizard: React.FC<CSVImportWizardProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('select');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [duplicateMap, setDuplicateMap] = useState<Map<string, TransactionDuplicateInfo>>(new Map());
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    dateColumn: '',
    amountColumn: '',
    descriptionColumn: '',
    typeColumn: '',
    timeColumn: '',
    categoryColumn: '',
  });

  // ============ ФУНКЦИИ ПАРСИНГА ============

  const parseDate = (dateStr: string): Date => {
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
  };

  const parseAmount = (amountStr: string): number => {
    let cleaned = amountStr.toString().trim();
    cleaned = cleaned.replace(/\s/g, '');
    cleaned = cleaned.replace(',', '.');
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    
    let amount = parseFloat(cleaned);
    if (isNaN(amount)) amount = 0;
    
    return Math.abs(amount);
  };

  const parseDateFromRow = (row: any, mapping: CSVColumnMapping): Date | null => {
    const dateStr = row[mapping.dateColumn];
    if (!dateStr) return null;
    
    const dateTimeMatch = dateStr.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (dateTimeMatch) {
      const date = parseDate(dateTimeMatch[1]);
      const [hours, minutes, seconds] = dateTimeMatch[2].split(':');
      date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
      return date;
    }
    
    return parseDate(dateStr);
  };

  const parseAmountFromRow = (row: any, mapping: CSVColumnMapping): { success: boolean; amount: number; type: 'income' | 'expense' } => {
    let amountStr = row[mapping.amountColumn];
    if (!amountStr) return { success: false, amount: 0, type: 'expense' };
    
    amountStr = amountStr.toString().trim();
    
    let type: 'income' | 'expense' = 'expense';
    
    if (amountStr.startsWith('+')) {
      type = 'income';
      amountStr = amountStr.substring(1);
    } else if (amountStr.startsWith('-')) {
      type = 'expense';
      amountStr = amountStr.substring(1);
    } else if (mapping.typeColumn && row[mapping.typeColumn]) {
      const typeValue = row[mapping.typeColumn].toLowerCase();
      if (typeValue.includes('доход') || typeValue.includes('income') || typeValue.includes('приход')) {
        type = 'income';
      } else if (typeValue.includes('расход') || typeValue.includes('expense') || typeValue.includes('списание')) {
        type = 'expense';
      }
    } else {
      const numericValue = parseAmount(amountStr);
      type = numericValue > 0 ? 'income' : 'expense';
    }
    
    const amount = parseAmount(amountStr);
    
    return { success: amount > 0, amount, type };
  };

  const cleanDescription = (description: string): string => {
    return description
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 200);
  };

  const detectCategory = (description: string, predefinedCategory?: string): string => {
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
  };

  const extractMerchantName = (description: string): string => {
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
  };

  // ============ ФУНКЦИИ ДЛЯ ПРОВЕРКИ ДУБЛИКАТОВ ============

  const generateTransactionFingerprint = (transaction: any): string => {
    // Создаем уникальный fingerprint транзакции на основе ключевых полей
    const date = transaction.date instanceof Date ? transaction.date.getTime() : transaction.date;
    const amount = Math.round(transaction.amount * 100); // Избегаем проблем с плавающей точкой
    const description = transaction.description.trim().toLowerCase();
    
    // Берем первые 50 символов описания для сравнения
    const shortDescription = description// ?.substring(0, 50);
    return `${date}_${amount}_${shortDescription}_${transaction.type}`;
  };

  const checkForDuplicates = async (transactions: any[]): Promise<Map<string, TransactionDuplicateInfo>> => {
    try {
      // Получаем все существующие транзакции из базы данных
      const existingTransactions = await transactionService.getAllTransactions();
      
      // Создаем мапу существующих транзакций по fingerprint
      const existingFingerprints = new Map<string, any>();
      console.log('dfdsfdsdf', existingTransactions)
      for (const existingTx of existingTransactions) {
        const raw = existingTx._raw || existingTx;
        const fingerprint = generateTransactionFingerprint({
          date: raw.date,
          amount: raw.amount,
          description: raw.note || '',
          type: raw.type,
        });
        
        if (!existingFingerprints.has(fingerprint)) {
          existingFingerprints.set(fingerprint, {
            id: raw.id,
            date: raw.date,
            amount: raw.amount,
          });
        }
      }

      console.log(Array.from(existingFingerprints))
      
      // Проверяем каждую новую транзакцию на дубликат
      const duplicateInfoMap = new Map<string, TransactionDuplicateInfo>();
      
      for (const transaction of transactions) {
        const fingerprint = generateTransactionFingerprint(transaction);
        const existing = existingFingerprints.get(fingerprint);
        console.log(transaction, fingerprint, existing)
        if (existing) {
          duplicateInfoMap.set(transaction.id, {
            isDuplicate: true,
            existingTransactionId: existing.id,
            existingTransactionDate: existing.date,
            existingTransactionAmount: existing.amount,
          });
        } else {
          duplicateInfoMap.set(transaction.id, {
            isDuplicate: false,
          });
        }
      }
      
      return duplicateInfoMap;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // В случае ошибки возвращаем пустую мапу (все транзакции считаем новыми)
      return new Map();
    }
  };

  const applyMapping = async (rawData: any[], mapping: CSVColumnMapping): Promise<any[]> => {
    const transactions: any[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        const date = parseDateFromRow(row, mapping);
        if (!date) continue;
        
        const amountResult = parseAmountFromRow(row, mapping);
        if (!amountResult.success) continue;
        
        const { amount, type } = amountResult;
        
        let description = row[mapping.descriptionColumn] || '';
        description = cleanDescription(description);
        
        let category = mapping.categoryColumn ? row[mapping.categoryColumn] : undefined;
        
        transactions.push({
          id: `csv_${Date.now()}_${i}`,
          date,
          amount,
          description,
          type,
          category: detectCategory(description, category),
          merchantName: extractMerchantName(description),
          rawData: row,
        });
      } catch (error) {
        console.warn(`Error parsing row ${i}:`, error);
      }
    }
    
    // Проверяем на дубликаты
    const duplicateInfo = await checkForDuplicates(transactions);
    setDuplicateMap(duplicateInfo);
    
    // Автоматически исключаем дубликаты из выбранных
    const newSelectedTransactions = new Set<string>();
    for (const tx of transactions) {
      const dupInfo = duplicateInfo.get(tx.id);
      if (!dupInfo?.isDuplicate) {
        newSelectedTransactions.add(tx.id);
      }
    }
    setSelectedTransactions(newSelectedTransactions);
    
    return transactions;
  };

  const getStatistics = (transactions: any[]) => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const byCategory: Record<string, number> = {};
    
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        byCategory[tx.category || 'Прочее'] = (byCategory[tx.category || 'Прочее'] || 0) + tx.amount;
      }
    }
    
    const duplicateCount = Array.from(duplicateMap.values()).filter(d => d.isDuplicate).length;
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      duplicateCount,
      newCount: transactions.length - duplicateCount,
      byCategory,
      topCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  };

  // ============ ОБРАБОТЧИКИ ============

  const handleSelectFile = async () => {
    try {
      const [result] = await pick({
        type: [types.csv],
      });
      
      setIsLoading(true);
      
      let fileUri = result.uri;
      
      if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.csv`;
        await RNFS.copyFile(fileUri, tempPath);
        fileUri = tempPath;
      }
      
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
      
      setCsvHeaders(headers);
      setCsvData(data);
      
      if (Platform.OS === 'android' && fileUri !== result.uri) {
        await RNFS.unlink(fileUri);
      }
      
      setStep('mapping');
    } catch (err) {
      console.error('File selection error:', err);
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoMapping = () => {
    const newMapping: CSVColumnMapping = { ...mapping };
    
    for (const header of csvHeaders) {
      const lowerHeader = header.toLowerCase();
      
      if (!newMapping.dateColumn && (lowerHeader.includes('дата') || lowerHeader.includes('date'))) {
        newMapping.dateColumn = header;
      }
      if (!newMapping.amountColumn && (lowerHeader.includes('сумм') || lowerHeader.includes('amount') || lowerHeader.includes('стоим'))) {
        newMapping.amountColumn = header;
      }
      if (!newMapping.descriptionColumn && (lowerHeader.includes('опис') || lowerHeader.includes('назнач') || lowerHeader.includes('description') || lowerHeader.includes('комментарий'))) {
        newMapping.descriptionColumn = header;
      }
      if (!newMapping.typeColumn && (lowerHeader.includes('тип') || lowerHeader.includes('type'))) {
        newMapping.typeColumn = header;
      }
      if (!newMapping.timeColumn && (lowerHeader.includes('время') || lowerHeader.includes('time'))) {
        newMapping.timeColumn = header;
      }
      if (!newMapping.categoryColumn && (lowerHeader.includes('катег') || lowerHeader.includes('category'))) {
        newMapping.categoryColumn = header;
      }
    }
    
    setMapping(newMapping);
  };

  const handleMappingChange = (field: keyof CSVColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyMapping = async () => {
    if (!mapping.dateColumn || !mapping.amountColumn || !mapping.descriptionColumn) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите обязательные колонки');
      return;
    }
    
    setIsLoading(true);
    try {
      const transactions = await applyMapping(csvData, mapping);
      setParsedTransactions(transactions);
      setStep('preview');
    } catch (error) {
      console.error('Error applying mapping:', error);
      Alert.alert('Ошибка', 'Не удалось применить маппинг');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTransaction = (id: string) => {
    const dupInfo = duplicateMap.get(id);
    // Не позволяем выбрать дубликат
    if (dupInfo?.isDuplicate) {
      Alert.alert(
        'Дубликат транзакции',
        'Эта транзакция уже существует в базе данных и не может быть импортирована повторно.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllTransactions = () => {
    const nonDuplicateIds = parsedTransactions
      .filter(t => !duplicateMap.get(t.id)?.isDuplicate)
      .map(t => t.id);
    
    const selectedNonDuplicates = Array.from(selectedTransactions).filter(
      id => !duplicateMap.get(id)?.isDuplicate
    );
    
    if (selectedNonDuplicates.length === nonDuplicateIds.length) {
      // Отменяем выбор всех недубликатов
      const newSelected = new Set(selectedTransactions);
      nonDuplicateIds.forEach(id => newSelected.delete(id));
      setSelectedTransactions(newSelected);
    } else {
      // Выбираем все недубликаты
      const newSelected = new Set(selectedTransactions);
      nonDuplicateIds.forEach(id => newSelected.add(id));
      setSelectedTransactions(newSelected);
    }
  };

  const handleImport = async () => {
    const selected = parsedTransactions.filter(t => selectedTransactions.has(t.id));
    
    if (selected.length === 0) {
      Alert.alert('Ошибка', 'Нет транзакций для импорта');
      return;
    }
    
    setIsLoading(true);
    setStep('importing');
    
    let imported = 0;
    let duplicatesSkipped = 0;
    
    try {
      const categories = await categoryService.getAllCategories();
      const categoryMap = new Map<string, string>();
      categories.forEach((cat: any) => {
        const raw = cat._raw || cat;
        categoryMap.set(raw.name.toLowerCase(), raw.id);
      });
      
      const defaultCategoryId = categoryMap.get('прочее') || categoryMap.get('другое');
      
      for (let i = 0; i < selected.length; i++) {
        const tx = selected[i];
        
        // Дополнительная проверка перед импортом
        const fingerprint = generateTransactionFingerprint(tx);
        const existingTransactions = await transactionService.getAllTransactions();
        let isDuplicate = false;
        
        for (const existingTx of existingTransactions) {
          const raw = existingTx._raw || existingTx;
          const existingFingerprint = generateTransactionFingerprint({
            date: raw.date,
            amount: raw.amount,
            description: raw.note || '',
            type: raw.type,
          });
          
          if (fingerprint === existingFingerprint) {
            isDuplicate = true;
            duplicatesSkipped++;
            break;
          }
        }
        
        if (isDuplicate) {
          continue;
        }
        
        let categoryId = defaultCategoryId;
        const categoryName = tx.category?.toLowerCase();
        if (categoryName && categoryMap.has(categoryName)) {
          categoryId = categoryMap.get(categoryName);
        }
        
        await transactionService.createTransaction({
          amount: tx.amount,
          type: tx.type,
          categoryId: categoryId || defaultCategoryId,
          note: `${tx.description}`,
          date: tx.date.getTime(),
          isRecurring: false,
        });
        
        imported++;
        setImportProgress(((i + 1) / selected.length) * 100);
      }
      
      Alert.alert(
        'Импорт завершен',
        `✅ Импортировано: ${imported} транзакций\n` +
        `⏭️ Пропущено дубликатов: ${duplicatesSkipped}\n` +
        `📊 Всего в файле: ${parsedTransactions.length}\n` +
        `🆕 Новых транзакций: ${imported}`,
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
          resetForm();
        }}]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Ошибка', 'Не удалось импортировать транзакции');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setCsvHeaders([]);
    setCsvData([]);
    setParsedTransactions([]);
    setSelectedTransactions(new Set());
    setDuplicateMap(new Map());
    setImportProgress(0);
    setMapping({
      dateColumn: '',
      amountColumn: '',
      descriptionColumn: '',
      typeColumn: '',
      timeColumn: '',
      categoryColumn: '',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============ РЕНДЕР ШАГОВ ============

  const renderSelectStep = () => (
    <View style={styles.stepContainer}>
      <FontAwesome6Icon name="file-csv" size={64} color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Импорт CSV файла
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Выберите CSV файл с выпиской из вашего банка
      </Text>
      
      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: colors.primary }]}
        onPress={handleSelectFile}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="folder-open" size={24} color="#FFFFFF" />
            <Text style={styles.selectButtonText}>Выбрать файл</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMappingStep = () => (
    <View style={styles.mappingContainer}>
      <Text style={[styles.mappingTitle, { color: colors.text.primary }]}>
        Настройка колонок
      </Text>
      <Text style={[styles.mappingSubtitle, { color: colors.text.secondary }]}>
        Укажите, какие колонки соответствуют полям транзакций
      </Text>
      
      <TouchableOpacity
        style={[styles.autoMappingButton, { borderColor: colors.border }]}
        onPress={handleAutoMapping}
      >
        <FontAwesome name="magic" size={20} color={colors.primary} />
        <Text style={[styles.autoMappingText, { color: colors.primary }]}>
          Автоматически определить колонки
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.mappingList}>
        {/* Дата */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Дата операции *
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.dateColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('dateColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.dateColumn && {color: '#fff'}]}>Не выбрано</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.dateColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('dateColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.dateColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Время */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Время (опционально)
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.timeColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('timeColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.timeColumn && {color: '#fff'}]}>Не выбрано</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.timeColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('timeColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.timeColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Сумма */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Сумма *
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.amountColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('amountColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.amountColumn && {color: '#fff'}]}>Не выбрано</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.amountColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('amountColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.amountColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Описание */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Описание / Назначение *
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.descriptionColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('descriptionColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.descriptionColumn && {color: '#fff'}]}>Не выбрано</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.descriptionColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('descriptionColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.descriptionColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Тип */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Тип (Доход/Расход)
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.typeColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('typeColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.typeColumn && {color: '#fff'}]}>Автоопределение</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.typeColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('typeColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.typeColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Категория */}
        <View style={styles.mappingField}>
          <Text style={[styles.mappingLabel, { color: colors.text.primary }]}>
            Категория
          </Text>
          <View style={styles.mappingOptions}>
            <TouchableOpacity
              style={[styles.mappingOption, !mapping.categoryColumn && styles.mappingOptionSelected]}
              onPress={() => handleMappingChange('categoryColumn', '')}
            >
              <Text style={[styles.mappingOptionText, !mapping.categoryColumn && {color: '#fff'}]}>Не выбрано</Text>
            </TouchableOpacity>
            {csvHeaders.map(header => (
              <TouchableOpacity
                key={header}
                style={[styles.mappingOption, mapping.categoryColumn === header && styles.mappingOptionSelected]}
                onPress={() => handleMappingChange('categoryColumn', header)}
              >
                <Text style={[styles.mappingOptionText, mapping.categoryColumn === header && {color: '#fff'}]}>{header}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.mappingButtons}>
        <TouchableOpacity
          style={[styles.mappingButton, styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => setStep('select')}
        >
          <Text style={[styles.mappingButtonText, { color: colors.text.secondary }]}>Назад</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.mappingButton, styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={handleApplyMapping}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.mappingButtonText, { color: '#FFFFFF' }]}>Применить</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewStep = () => {
    const stats = getStatistics(parsedTransactions);
    const selectedCount = selectedTransactions.size;
    const nonDuplicateCount = parsedTransactions.length - stats.duplicateCount;
    
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={[styles.previewTitle, { color: colors.text.primary }]}>
              Найдено транзакций: {parsedTransactions.length}
            </Text>
            {stats.duplicateCount > 0 && (
              <Text style={[styles.duplicateInfo, { color: colors.warning || '#FFA500' }]}>
                ⚠️ Дубликатов: {stats.duplicateCount} (будут пропущены)
              </Text>
            )}
            <Text style={[styles.newInfo, { color: colors.success || '#4CAF50' }]}>
              ✨ Новых: {stats.newCount}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleAllTransactions}>
            <Text style={[styles.selectAllText, { color: colors.primary }]}>
              {selectedCount === nonDuplicateCount ? 'Отменить все' : 'Выбрать все новые'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(stats.totalIncome)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Доходы</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {formatCurrency(stats.totalExpense)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Расходы</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: stats.balance >= 0 ? colors.success : colors.error }]}>
              {formatCurrency(stats.balance)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Баланс</Text>
          </View>
        </View>
        
        <ScrollView style={styles.transactionsList}>
          {parsedTransactions.map((transaction) => {
            const dupInfo = duplicateMap.get(transaction.id);
            const isDuplicate = dupInfo?.isDuplicate || false;
            const isSelected = selectedTransactions.has(transaction.id);
            
            return (
              <TouchableOpacity
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  { 
                    backgroundColor: isSelected 
                      ? colors.primary + '10' 
                      : isDuplicate 
                        ? (colors.error + '08') 
                        : 'transparent',
                    opacity: isDuplicate ? 0.7 : 1,
                  },
                ]}
                onPress={() => toggleTransaction(transaction.id)}
                disabled={isDuplicate}
              >
                <View style={styles.transactionCheck}>
                  <Icon 
                    name={isSelected ? 'checkbox-marked' : (isDuplicate ? 'close-circle' : 'checkbox-blank-outline')} 
                    size={22} 
                    color={isDuplicate ? colors.error : (isSelected ? colors.primary : colors.text.secondary)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <View style={styles.transactionHeader}>
                    <Text style={[styles.transactionDate, { color: colors.text.secondary }]}>
                      {formatDate(transaction.date)}
                    </Text>
                    {isDuplicate && (
                      <View style={[styles.duplicateBadge, { backgroundColor: colors.error + '20' }]}>
                        <Text style={[styles.duplicateBadgeText, { color: colors.error }]}>
                          Дубликат
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.transactionDesc, { color: colors.text.primary }]} numberOfLines={3} selectable={false}>
                    {transaction.description}
                  </Text>
                  {transaction.category && (
                    <Text style={[styles.transactionMerchant, { color: colors.text.secondary }]} numberOfLines={2}>
                      {transaction.category}
                    </Text>
                  )}
                  {isDuplicate && dupInfo?.existingTransactionDate && (
                    <Text style={[styles.existingInfo, { color: colors.text.secondary }]}>
                      Существующая транзакция от {new Date(dupInfo.existingTransactionDate).toLocaleDateString('ru-RU')}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'income' ? colors.success : colors.error },
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelFooterButton, { borderColor: colors.border, flex: 0.4 }]}
            onPress={() => setStep('mapping')}
          >
            <Text style={[styles.footerButtonText, { color: colors.text.secondary }]}>Назад</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.footerButton, styles.importFooterButton, { backgroundColor: colors.primary, flex: 0.6 }]}
            onPress={handleImport}
            disabled={selectedCount === 0}
          >
            <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
              Импортировать ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderImportingStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Импорт транзакций...
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Прогресс: {Math.round(importProgress)}%
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Импорт CSV
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {step === 'select' && renderSelectStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'importing' && renderImportingStep()}
        </View>
      </View>
    </Modal>
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
    padding: 20,
    minHeight: '90%',
    maxHeight: '90%',
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
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mappingContainer: {
    flex: 1,
  },
  mappingTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  mappingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  autoMappingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  autoMappingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mappingList: {
    maxHeight: 400,
  },
  mappingField: {
    marginBottom: 16,
  },
  mappingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  mappingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mappingOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  mappingOptionSelected: {
    backgroundColor: '#4E54C8',
  },
  mappingOptionText: {
    fontSize: 12,
  },
  mappingButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  mappingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  applyButton: {
    borderWidth: 0,
  },
  mappingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  duplicateInfo: {
    fontSize: 12,
    marginBottom: 2,
  },
  newInfo: {
    fontSize: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  transactionsList: {
    maxHeight: 400,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  transactionCheck: {
    width: 32,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
  },
  duplicateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  duplicateBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  transactionDesc: {
    fontSize: 13,
    marginBottom: 2,
  },
  transactionMerchant: {
    fontSize: 11,
  },
  existingInfo: {
    fontSize: 10,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelFooterButton: {
    borderWidth: 1,
  },
  importFooterButton: {
    borderWidth: 0,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});