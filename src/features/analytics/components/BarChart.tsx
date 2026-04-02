import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
  Modal,
} from 'react-native';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../../core/hooks/useTheme';
import { formatCurrency } from '../../../core/utils/formatters';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface BarChartData {
  value: number;
  label: string;
  shortLabel: string;
  frontColor?: string;
  [key: string]: any;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  currency?: string;
  showAverageLine?: boolean;
  showTrend?: boolean;
  onBarPress?: (item: BarChartData, index: number) => void;
  height?: number;
  barWidth?: number;
  spacing?: number;
}

const { width } = Dimensions.get('window');

// Компонент модального окна с пояснением
const InfoModal = ({ visible, onClose, title, content }: any) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContainer, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.modalText, { color: colors.text.secondary }]}>
              {content}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Понятно</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface Dimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  currency = 'RUB',
  showAverageLine = true,
  showTrend = true,
  onBarPress,
  height = 250,
  barWidth = 50,
  spacing = 24,
}) => {
  const { colors } = useTheme();
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(width - 48);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalContent, setInfoModalContent] = useState('');
  const [chartDimensions, setChartDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  // Тексты для пояснений
  const legendInfoText = `📊 Легенда графика

Цвета столбцов показывают, как расходы соотносятся со средним значением:

🔴 Красный (Выше среднего >20%)
Расходы более чем на 20% превышают средний уровень. Стоит обратить внимание!

🟠 Оранжевый (Выше среднего)
Расходы превышают средний уровень, но менее чем на 20%.

🔵 Синий (Средний уровень)
Расходы находятся на среднем уровне (в пределах ±10% от среднего).

🟢 Светло-зеленый (Ниже среднего)
Расходы ниже среднего уровня, но менее чем на 20%.

⚪ Зеленый (Ниже среднего >20%)
Расходы более чем на 20% ниже среднего уровня. Отличная работа!

💡 Совет: Анализируйте красные и оранжевые столбцы, чтобы найти возможности для оптимизации бюджета.`;
  const statsInfoText = `📈 Статистика периода:

Среднее — средняя сумма расходов за период.
Рассчитывается как: сумма всех расходов / количество дней.

Максимум — наибольшая сумма расходов за один день в выбранном периоде.

Минимум — наименьшая сумма расходов за один день (может быть 0, если не было трат).

📊 Тренд — показывает изменение расходов между последними двумя периодами.

Как рассчитывается тренд:
1. Берутся два последних периода в выбранном интервале:
   • Для недели: последние два дня
   • Для месяца: последние две недели
   • Для года: последние два месяца

2. Сравниваются расходы за эти периоды:
   Тренд (%) = ((Расходы в последнем периоде - Расходы в предыдущем периоде) / Расходы в предыдущем периоде) × 100%

Пример:
• Расходы в марте: 100 000 ₽
• Расходы в апреле: 120 000 ₽
• Тренд = ((120 000 - 100 000) / 100 000) × 100% = +20%

Значение тренда:
📈 ↑ Положительный тренд — расходы выросли
📉 ↓ Отрицательный тренд — расходы снизились

💡 Совет: Сравнивайте свои ежедневные траты с этими показателями, чтобы лучше контролировать бюджет.`;

  if (data.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          📊 Нет данных за этот период
        </Text>
        <Text
          style={[styles.emptySubtext, { color: colors.text.secondary + '80' }]}
        >
          Добавьте транзакции для отображения динамики расходов
        </Text>
      </View>
    );
  }

  // Фильтруем данные с нулевыми значениями для корректного расчета
  const nonZeroData = data.filter(item => item.value > 0);

  // Находим максимальное значение для шкалы Y (с запасом 10%)
  const maxValue = Math.max(
    ...data.filter(item => item.value > 0).map(item => item.value),
    100,
  );
  const yAxisMax = Math.ceil(maxValue * 1.1);

  // Рассчитываем среднее значение (только по ненулевым значениям)
  const averageValue =
    nonZeroData.length > 0
      ? nonZeroData.reduce((sum, item) => sum + item.value, 0) /
        nonZeroData.length
      : 0;

  // Находим минимальное и максимальное значение
  const minValue = Math.min(
    ...data.filter(item => item.value > 0).map(item => item.value),
  );
  const maxValueDisplay = Math.max(
    ...data.filter(item => item.value > 0).map(item => item.value),
  );

  // Рассчитываем тренд (изменение относительно предыдущего периода)
  const calculateTrend = () => {
    if (data.length < 2) return null;

    // Находим последние два ненулевых значения
    const nonZeroValues = data.filter(item => item.value > 0);
    if (nonZeroValues.length < 2) return null;

    const lastValue = nonZeroValues[nonZeroValues.length - 1].value;
    const previousValue = nonZeroValues[nonZeroValues.length - 2].value;

    console.log(lastValue, previousValue)
    if (previousValue === 0) return null;

    const percentChange = ((lastValue - previousValue) / previousValue) * 100;
    return {
      value: lastValue - previousValue,
      percent: Math.abs(percentChange).toFixed(1),
      isUp: lastValue > previousValue,
    };
  };

  const trend = calculateTrend();

  // Динамический расчет ширины графика
  const chartWidth = Math.max(
    containerWidth,
    data.length * (barWidth + spacing),
  );

  // Определяем цвета для столбцов на основе значения
  const getBarColor = (value: number) => {
    if (value === 0) return colors.border;
    if (averageValue === 0) return colors.primary;

    const ratio = value / averageValue;

    // Выше среднего > 20%
    if (ratio > 1.2) return '#E74C3C'; // Красный
    // Выше среднего (10%-20%)
    if (ratio > 1.1) return '#F39C12'; // Оранжевый
    // Средний уровень (-10% до 0%)
    if (ratio > 0.9) return colors.primary; // Синий
    // Ниже среднего (-10% до -0%)
    if (ratio > 0.8) return '#2ECC71'; // Светло-зеленый
    // Ниже среднего (менее -20%)
    return '#27AE60'; // Зеленый
  };
  
  console.log(data)
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        label: item.shortLabel,
        value: item.value || 0,
        frontColor: item.frontColor || getBarColor(item.value),
        // Добавляем метки сверху только для ненулевых значений
        topLabelComponent: () =>
          item.value > 0 ? (
            <Text style={[styles.topLabel, { color: colors.text.secondary }]}>
              {Math.round(item.value)}
            </Text>
          ) : null,
      })),
    [data],
  );

  const handleBarPress = (item: any, index: number) => {
    setSelectedBarIndex(index);
    if (onBarPress) {
      onBarPress(data[index], index);
    }
  };

  const showInfo = (title: string, content: string) => {
    setInfoModalTitle(title);
    setInfoModalContent(content);
    setInfoModalVisible(true);
  };

  // Форматирование оси Y
  const formatYAxisLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}к`;
    }
    return Math.round(value).toString();
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    setChartDimensions({ width, height, x, y });
  };

  const chartHeight = chartDimensions.height > 0 ? chartDimensions.height : 1;

  const chartKey = JSON.stringify(
    data.map(item => ({ label: item.label, value: item.value })),
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }]}
      onLayout={(event: LayoutChangeEvent) => {
        setContainerWidth(event.nativeEvent.layout.width);
      }}
    >
      {/* Заголовок с дополнительной информацией */}
      <View style={styles.header}>
        <View style={{flexDirection: "row", alignItems: 'center', gap: 6}}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {title}
        </Text>
         <TouchableOpacity
          onPress={() => showInfo('Динамика расходов', statsInfoText)}
        >
          <Icon
            name="information-outline"
            size={18}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
        </View>
        {showTrend && trend && (
          <View style={styles.trendContainer}>
            <Text style={[styles.trendLabel, { color: colors.text.secondary }]}>
              Тренд:
            </Text>
            <View
              style={[
                styles.trendValueContainer,
                { backgroundColor: trend.isUp ? '#E74C3C20' : '#2ECC7120' },
              ]}
            >
              <Text
                style={[
                  styles.trendValue,
                  { color: trend.isUp ? '#E74C3C' : '#2ECC71' },
                ]}
              >
                {trend.isUp ? '↑' : '↓'} {trend.percent}%
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Статистическая сводка с кнопкой информации */}
      <View style={styles.statsHeader}>
        <Text style={[styles.statsTitle, { color: colors.text.secondary }]}>
          Статистика периода
        </Text>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Среднее
          </Text>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>
            {formatCurrency(Math.round(averageValue), currency)}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Максимум
          </Text>
          <Text style={[styles.statValue, { color: '#E74C3C' }]}>
            {formatCurrency(maxValueDisplay, currency)}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            Минимум
          </Text>
          <Text style={[styles.statValue, { color: '#2ECC71' }]}>
            {formatCurrency(minValue, currency)}
          </Text>
        </View>
      </View>

      {/* График */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScrollContainer}
      >
        <View onLayout={onLayout}>
          <GiftedBarChart
            key={chartKey}
            data={chartData}
            width={chartWidth}
            height={height}
            barWidth={barWidth}
            spacing={spacing}
            // roundedTop
            roundedBottom={false}
            showGradient={false}
            yAxisTextStyle={{ color: colors.text.secondary, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: colors.text.secondary, fontSize: 12 }}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            // yAxisLabelWidth={30}
            isAnimated
            animationDuration={500}
            // dashWidth={0}
            noOfSections={5}
            maxValue={yAxisMax}
            minValue={0}
            yAxisLabelPrefix=""
            // yAxisLabelSuffix={` ${currency === 'RUB' ? '₽' : currency}`}
            formatYLabel={formatYAxisLabel}
            renderTooltip={(item: any) => (
              <View
                style={[styles.tooltip, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.tooltipText}>
                  {Math.round(item.value)} {currency === 'RUB' ? '₽' : currency}
                </Text>
              </View>
            )}
            onPress={handleBarPress}
          />
          {/* Линия среднего значения */}
          {showAverageLine && averageValue > 0 && averageValue <= yAxisMax && (
            <View
              style={[
                styles.averageLine,
                {
                  top: (chartHeight - (averageValue / yAxisMax) * chartHeight) + 5,
                  borderColor: colors.warning || '#F39C12',
                },
              ]}
            />
          )}
        </View>
      </ScrollView>

       {/* Легенда - 5 уровней */}
      <View style={styles.legendHeader}>
        <Text style={[styles.legendTitle, { color: colors.text.secondary }]}>Значения столбцов</Text>
        <TouchableOpacity onPress={() => showInfo('Легенда графика', legendInfoText)}>
          <Icon name="information-outline" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#E74C3C' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>Выше среднего &gt; 20%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F39C12' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>Выше среднего</Text>
          </View>
        </View>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>Средний уровень</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2ECC71' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>Ниже среднего</Text>
          </View>
        </View>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#27AE60' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>Ниже среднего &gt; 20%</Text>
          </View>
        </View>
      </View>
      
      {/* Выбранная информация */}
      {selectedBarIndex !== null && data[selectedBarIndex] && (
        <View style={[styles.selectedInfo, { backgroundColor: colors.background }]}>
          <Text style={[styles.selectedInfoLabel, { color: colors.text.secondary }]}>
            {data[selectedBarIndex].label}
          </Text>
          <Text style={[styles.selectedInfoValue, { color: colors.text.primary }]}>
            Расходы: {formatCurrency(Math.round(data[selectedBarIndex].value), currency)}
          </Text>
          {averageValue > 0 && data[selectedBarIndex].value > 0 && (
            <Text style={[
              styles.selectedInfoCompare,
              { color: data[selectedBarIndex].value > averageValue ? '#E74C3C' : '#2ECC71' }
            ]}>
              {data[selectedBarIndex].value > averageValue ? '📈' : '📉'} 
              {' '}
              {Math.abs(((data[selectedBarIndex].value - averageValue) / averageValue) * 100).toFixed(1)}% 
              {data[selectedBarIndex].value > averageValue ? ' выше' : ' ниже'} среднего
            </Text>
          )}
        </View>
      )}
      {/* Модальное окно с информацией */}
      <InfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        title={infoModalTitle}
        content={infoModalContent}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendLabel: {
    fontSize: 12,
  },
  trendValueContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  chartScrollContainer: {
    paddingRight: 16,
    position: 'relative',
  },
  topLabel: {
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
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
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
   legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 12,
  },
  legend: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
  },
  selectedInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  selectedInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  selectedInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedInfoCompare: {
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 40,
  },
  modalButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
