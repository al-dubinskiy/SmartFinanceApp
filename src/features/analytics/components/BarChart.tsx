import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../../core/hooks/useTheme';

interface BarChartData {
  value: number;
  label: string;
  frontColor?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  currency?: string;
}

const { width } = Dimensions.get('window');

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  currency = 'USD',
}) => {
  const { colors } = useTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          No data available for this period
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value), 0);
  const chartData = data.map((item, index) => ({
    ...item,
    frontColor: item.frontColor || colors.primary,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      
      <GiftedBarChart
        data={chartData}
        width={width - 64}
        height={220}
        barWidth={40}
        spacing={16}
        roundedTop
        roundedBottom={false}
        showGradient
        gradientColor={colors.primary}
        yAxisTextStyle={{ color: colors.text.secondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.text.secondary, fontSize: 12 }}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        isAnimated
        animationDuration={500}
        renderTooltip={(item: any) => (
          <View style={[styles.tooltip, { backgroundColor: colors.primary }]}>
            <Text style={styles.tooltipText}>
              {item.value.toFixed(2)} {currency}
            </Text>
          </View>
        )}
      />
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
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
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