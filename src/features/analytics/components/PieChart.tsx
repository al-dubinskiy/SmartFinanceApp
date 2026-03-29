import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart as GiftedPieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../../core/hooks/useTheme';

interface PieChartData {
  value: number;
  color: string;
  label: string;
  text?: string;
}

interface PieChartProps {
  data: PieChartData[];
  totalAmount: number;
  title: string;
  currency?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  totalAmount,
  title,
  currency = 'RUB',
}) => {
  const { colors } = useTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          Нет данных для выбранного периода
        </Text>
      </View>
    );
  }

  const chartData = data.map(item => ({
    value: item.value,
    color: item.color,
    text: `${item.label}\n${((item.value / totalAmount) * 100).toFixed(1)}%`,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      
      <View style={styles.chartContainer}>
        <GiftedPieChart
          data={chartData}
          donut
          // showText
          textColor={colors.text.primary}
          textSize={12}
          showTextBackground={false}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={[styles.centerLabelTotal, { color: colors.text.primary }]}>
                {totalAmount.toFixed(0)}
              </Text>
              <Text style={[styles.centerLabelCurrency, { color: colors.text.secondary }]}>
                {currency}
              </Text>
              <Text style={[styles.centerLabelTotal, { color: colors.text.secondary, fontSize: 12 }]}>
                Всего
              </Text>
            </View>
          )}
          radius={100}
          innerRadius={60}
        />
      </View>

      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={[styles.legendLabel, { color: colors.text.primary }]}>
              {item.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.text.secondary }]}>
              {((item.value / totalAmount) * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelTotal: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerLabelCurrency: {
    fontSize: 12,
    marginTop: 4,
  },
  legendContainer: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});