export const formatCurrency = (
  amount: number,
  currency: string = 'RUB',
  locale: string = 'ru-RU'
): string => {
  if (!amount || isNaN(amount)) {
    return `0 ₽`;
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (timestamp: number, format: 'short' | 'long' = 'short'): string => {
  if (!timestamp || isNaN(timestamp)) {
    return 'Дата не указана';
  }
  
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Неверная дата';
  }
  
  if (format === 'short') {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  }
  
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};


export const formatMonthYear = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
};