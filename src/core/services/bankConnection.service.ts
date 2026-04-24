// bankConnection.service.ts - полное обновление

import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import axios from 'axios';
import { getTransactionsCollection } from '../../database';
import transactionService from './transaction.service';

export interface BankAccount {
  id: string;
  name: string;
  number: string;
  type: 'card' | 'account';
  currency: string;
  balance: number;
}

export interface SyncConfig {
  period: '1day' | '1week' | '1month' | '3months' | '6months' | '1year' | 'all';
  accountsToSync: string[]; // ID счетов для синхронизации
  autoSync: boolean;
  syncPeriod: 'daily' | 'weekly' | 'manual';
}

export interface BankConnection {
  id: string;
  bankId: 'tinkoff' | 'ozon';
  bankName: string;
  icon: string,
  accounts: BankAccount[];
  phoneNumber: string;
  cardNumber?: string;
  isActive: boolean;
  lastSync: Date;
  syncConfig: SyncConfig;
  syncSettings: {
    lastSyncStatus: 'success' | 'failed' | 'pending';
  };
}

class BankConnectionService {
  private static instance: BankConnectionService;
  private connections: Map<string, BankConnection> = new Map();
  private tokens: Map<string, string> = new Map();

  static getInstance(): BankConnectionService {
    if (!BankConnectionService.instance) {
      BankConnectionService.instance = new BankConnectionService();
    }
    return BankConnectionService.instance;
  }

  // ============ МЕТОДЫ ДЛЯ РАБОТЫ С ПОДКЛЮЧЕНИЯМИ ============

  private async saveConnection(connection: BankConnection): Promise<void> {
    this.connections.set(connection.id, connection);
    await Keychain.setGenericPassword(
      `bank_connection_${connection.id}`,
      JSON.stringify(connection),
      { service: 'com.smartfinance.banks' }
    );
  }

  private async saveToken(bankId: string, token: string): Promise<void> {
    this.tokens.set(bankId, token);
    await Keychain.setGenericPassword(
      `bank_token_${bankId}`,
      token,
      { service: 'com.smartfinance.tokens' }
    );
  }

  async getConnections(): Promise<BankConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: string): Promise<BankConnection | null> {
    return this.connections.get(id) || null;
  }

  async updateConnection(id: string, updates: Partial<BankConnection>): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      Object.assign(connection, updates);
      await this.saveConnection(connection);
    }
  }

  async removeConnection(id: string): Promise<void> {
    this.connections.delete(id);
    await Keychain.resetGenericPassword({ service: `com.smartfinance.banks_${id}` });
  }

  // ============ НОВЫЙ МЕТОД: ОБНОВЛЕНИЕ КОНФИГУРАЦИИ СИНХРОНИЗАЦИИ ============
  
  async updateSyncConfig(connectionId: string, config: Partial<SyncConfig>): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.syncConfig = { ...connection.syncConfig, ...config };
      await this.saveConnection(connection);
      console.log(`✅ Sync config updated for connection ${connectionId}:`, config);
    } else {
      console.warn(`⚠️ Connection ${connectionId} not found`);
    }
  }

  // ============ TINKOFF БАНК ============
  
  async connectTinkoff(
    phoneNumber: string,
    smsCode: string,
    cardNumber: string
  ): Promise<{ success: boolean; accounts?: BankAccount[]; error?: string }> {
    try {
      console.log('🔐 Подключение к Т-Банку...');
      
      // Имитация успешного подключения
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Тестовые счета
      const accounts: BankAccount[] = [
        {
          id: `tinkoff_card_${Date.now()}`,
          name: 'Дебетовая карта',
          number: '**** 1234',
          type: 'card',
          currency: 'RUB',
          balance: 50000,
        },
        {
          id: `tinkoff_account_${Date.now()}`,
          name: 'Накопительный счет',
          number: '**** 5678',
          type: 'account',
          currency: 'RUB',
          balance: 100000,
        },
      ];
      
      const connection: BankConnection = {
        id: `tinkoff_${Date.now()}`,
        bankId: 'tinkoff',
        bankName: 'Т-Банк',
        icon: require("./../../assets/tbank-logo.png"),
        accounts,
        phoneNumber,
        cardNumber,
        isActive: true,
        lastSync: new Date(),
        syncConfig: {
          period: '1month',
          accountsToSync: accounts.map(a => a.id),
          autoSync: true,
          syncPeriod: 'daily',
        },
        syncSettings: {
          lastSyncStatus: 'success',
        },
      };
      
      await this.saveConnection(connection);
      await this.saveToken('tinkoff', `mock_token_${Date.now()}`);
      
      return { success: true, accounts };
    } catch (error) {
      console.error('Tinkoff connection failed:', error);
      return { success: false, error: 'Не удалось подключиться к банку' };
    }
  }

  // ============ OZON БАНК ============
  
  async connectOzonBank(
    phoneNumber: string,
    smsCode: string,
    cardDigits: string
  ): Promise<{ success: boolean; accounts?: BankAccount[]; error?: string }> {
    try {
      console.log('🔐 Подключение к Ozon Банку...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const accounts: BankAccount[] = [
        {
          id: `ozon_card_${Date.now()}`,
          name: 'Ozon Карта',
          number: '**** 9012',
          type: 'card',
          currency: 'RUB',
          balance: 25000,
        },
        {
          id: `ozon_account_${Date.now()}`,
          name: 'Ozon Счет',
          number: '**** 3456',
          type: 'account',
          currency: 'RUB',
          balance: 30000,
        },
      ];
      
      const connection: BankConnection = {
        id: `ozon_${Date.now()}`,
        bankId: 'ozon',
        bankName: 'Ozon Банк',
        icon: require("./../../assets/ozonbank-logo.png"),
        accounts,
        phoneNumber,
        cardNumber: cardDigits,
        isActive: true,
        lastSync: new Date(),
        syncConfig: {
          period: '1month',
          accountsToSync: accounts.map(a => a.id),
          autoSync: true,
          syncPeriod: 'daily',
        },
        syncSettings: {
          lastSyncStatus: 'success',
        },
      };
      
      await this.saveConnection(connection);
      await this.saveToken('ozon', `mock_token_${Date.now()}`);
      
      return { success: true, accounts };
    } catch (error) {
      console.error('Ozon connection failed:', error);
      return { success: false, error: 'Не удалось подключиться к банку' };
    }
  }

  // ============ СИНХРОНИЗАЦИЯ ТРАНЗАКЦИЙ ============

  private getStartDateForPeriod(period: SyncConfig['period']): Date {
    const date = new Date();
    switch (period) {
      case '1day': date.setDate(date.getDate() - 1); break;
      case '1week': date.setDate(date.getDate() - 7); break;
      case '1month': date.setMonth(date.getMonth() - 1); break;
      case '3months': date.setMonth(date.getMonth() - 3); break;
      case '6months': date.setMonth(date.getMonth() - 6); break;
      case '1year': date.setFullYear(date.getFullYear() - 1); break;
      case 'all': date.setFullYear(date.getFullYear() - 5); break;
    }
    return date;
  }

  private getRandomDescription(bankId: string): string {
    const tinkoffDescriptions = [
      'Перевод клиенту Банка',
      'Оплата в Магнит',
      'Пятерочка Продукты',
      'Ашан Гипермаркет',
      'Яндекс.Такси',
      'МТС Мобильная связь',
      'Кешбэк за покупки',
      'Перевод с карты на карту',
      'Оплата ЖКУ',
    ];
    
    const ozonDescriptions = [
      'Ozon Покупка',
      'Ozon Кешбэк',
      'Возврат за товар',
      'Ozon Карта пополнение',
      'Оплата в Ozon Fresh',
    ];
    
    const descriptions = bankId === 'tinkoff' ? tinkoffDescriptions : ozonDescriptions;
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private getAccountById(accountId: string): BankAccount | null {
    for (const connection of this.connections.values()) {
      const account = connection.accounts.find(a => a.id === accountId);
      if (account) return account;
    }
    return null;
  }

  private async checkDuplicateTransaction(transaction: any): Promise<boolean> {
    const existingTransactions = await transactionService.getAllTransactions();
    return existingTransactions.some(t => {
      const raw = t._raw || t;
      const txDate = new Date(raw.date);
      const isSameDay = txDate.toDateString() === transaction.date.toDateString();
      const isSameAmount = Math.abs(raw.amount - transaction.amount) < 0.01;
      const isSameDescription = raw.note?.includes(transaction.description?.substring(0, 30) || '');
      return isSameDay && isSameAmount && isSameDescription;
    });
  }

  private async fetchTransactions(
    bankId: string, 
    token: string, 
    period: SyncConfig['period'], 
    accountIds: string[]
  ): Promise<any[]> {
    const startDate = this.getStartDateForPeriod(period);
    const mockTransactions: any[] = [];
    
    for (const accountId of accountIds) {
      const account = this.getAccountById(accountId);
      if (!account) continue;
      
      // Генерация разного количества транзакций в зависимости от периода
      let count = 0;
      switch (period) {
        case '1day': count = 2; break;
        case '1week': count = 5; break;
        case '1month': count = 10; break;
        case '3months': count = 15; break;
        case '6months': count = 20; break;
        case '1year': count = 25; break;
        case 'all': count = 30; break;
      }
      
      for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        if (date > new Date()) continue;
        
        const isIncome = Math.random() > 0.7;
        const amount = isIncome 
          ? Math.random() * 50000 + 5000 
          : Math.random() * 10000 + 500;
        
        mockTransactions.push({
          id: `${bankId}_${accountId}_${Date.now()}_${i}`,
          date: date,
          amount: Math.round(amount),
          description: this.getRandomDescription(bankId),
          type: isIncome ? 'income' : 'expense',
          accountId: accountId,
          accountName: account.name,
        });
      }
    }
    
    return mockTransactions.sort((a, b) => b.date - a.date);
  }

  async syncTransactions(connectionId: string, customPeriod?: SyncConfig['period']): Promise<{ success: boolean; count: number }> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false, count: 0 };
    }

    try {
      const period = customPeriod || connection.syncConfig.period;
      const accountsToSync = connection.syncConfig.accountsToSync;
      
      console.log(`🔄 Синхронизация банка ${connection.bankName}`);
      console.log(`   📅 Период: ${period}`);
      console.log(`   💳 Счетов: ${accountsToSync.length}`);
      
      // Имитация задержки запроса
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const token = this.tokens.get(connection.bankId);
      if (!token) {
        return { success: false, count: 0 };
      }

      const transactions = await this.fetchTransactions(connection.bankId, token, period, accountsToSync);
      
      let imported = 0;
      for (const transaction of transactions) {
        const existing = await this.checkDuplicateTransaction(transaction);
        if (!existing) {
          await transactionService.createTransaction({
            amount: transaction.amount,
            type: transaction.type,
            categoryId: 'default-category-id',
            note: `${transaction.description}\nБанк: ${connection.bankName}\nСчет: ${transaction.accountName}`,
            date: transaction.date.getTime(),
            isRecurring: false,
          });
          imported++;
        }
      }
      
      connection.lastSync = new Date();
      connection.syncSettings.lastSyncStatus = 'success';
      await this.saveConnection(connection);
      
      console.log(`✅ Синхронизация завершена. Импортировано: ${imported} транзакций`);
      
      return { success: true, count: imported };
    } catch (error) {
      console.error('Sync failed:', error);
      connection.syncSettings.lastSyncStatus = 'failed';
      await this.saveConnection(connection);
      return { success: false, count: 0 };
    }
  }
}

export default BankConnectionService.getInstance();