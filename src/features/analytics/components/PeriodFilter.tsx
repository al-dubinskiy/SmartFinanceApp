import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/hooks/useTheme';

export type PeriodType = 'week' | 'month' | 'year';

interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const { colors } = useTheme();

  const periods: { value: PeriodType; label: string }[] = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'year', label: 'Год' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodButton,
            selectedPeriod === period.value && {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => onPeriodChange(period.value)}
        >
          <Text
            style={[
              styles.periodText,
              {
                color: selectedPeriod === period.value
                  ? '#FFFFFF'
                  : colors.text.secondary,
              },
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 4,
    borderRadius: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
});