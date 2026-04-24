import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';

interface Bank {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const BANKS: Bank[] = [
  {
    id: 'tinkoff',
    name: 'Т-Банк',
    icon: require("./../../../assets/tbank-logo.png"),
    color: '#FFDD2D',
    description: 'Быстрое подключение через номер телефона и карту',
  },
  {
    id: 'ozon',
    name: 'Ozon Банк',
    icon: require("./../../../assets/ozonbank-logo.png"),
    color: '#005BFF',
    description: 'Подключение через номер телефона и SMS',
  },
];

interface BankSelectorProps {
  onSelectBank: (bankId: string) => void;
}

export const BankSelector: React.FC<BankSelectorProps> = ({ onSelectBank }) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Выберите банк для подключения
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        Мы используем защищенное соединение для импорта ваших транзакций
      </Text>

      {BANKS.map((bank) => (
        <TouchableOpacity
          key={bank.id}
          style={[styles.bankCard, { backgroundColor: colors.surface }]}
          onPress={() => onSelectBank(bank.id)}
        >
          <View style={[styles.bankIcon, { backgroundColor: bank.color + '20' }]}>
            {/* <Icon name={bank.icon} size={32} color={bank.color} /> */}
            <Image source={bank.icon} style={styles.bankLogo} />
          </View>
          <View style={styles.bankInfo}>
            <Text style={[styles.bankName, { color: colors.text.primary }]}>
              {bank.name}
            </Text>
            <Text style={[styles.bankDescription, { color: colors.text.secondary }]}>
              {bank.description}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  bankIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bankDescription: {
    fontSize: 12,
  },
  bankLogo: {
    width: 32,
    height: 32,
    borderRadius: 8
  }
});