import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabScreenProps } from '../../../navigation/types';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import transactionService from '../../../core/services/transaction.service';
import categoryService from '../../../core/services/category.service';
import forecastService from '../../../core/services/forecast.service';
import { PeriodFilter, PeriodType } from '../components/PeriodFilter';
import { PieChart } from '../components/PieChart';
import { BarChart } from '../components/BarChart';
import { ABCAnalysis } from '../components/ABCAnalysis';
import { ForecastCard } from '../components/ForecastCard';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from 'date-fns';

interface PeriodStats {
  startDate: number;
  endDate: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: any[];
}

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

export const AnalyticsScreen: React.FC<
  MainTabScreenProps<'Analytics'>
> = () => {
  const { colors } = useTheme();
  const { user } = useAppSelector(state => state.auth);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [abcData, setAbcData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Состояния для модальных окон
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalContent, setInfoModalContent] = useState('');

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (selectedPeriod) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { startDate: start.getTime(), endDate: end.getTime() };
  }, [selectedPeriod]);

  const loadTrendData = useCallback(async () => {
    const { startDate, endDate } = getDateRange();

    if (selectedPeriod === 'week') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = eachDayOfInterval({ start, end });

      const dailyData = await Promise.all(
        days.map(async day => {
          const dayStart = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
          ).getTime();
          const dayEnd = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            23,
            59,
            59,
          ).getTime();
          const statistics = await transactionService.getStatistics(
            dayStart,
            dayEnd,
          );
          return {
            label: format(day, 'EEE'),
            value: statistics.expense,
          };
        }),
      );

      setTrendData(dailyData);
    } else if (selectedPeriod === 'month') {
      const weeks = ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4'];
      const now = new Date();
      const monthStart = startOfMonth(now);
      const weekData = [];

      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(monthStart);
        weekStart.setDate(monthStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (weekStart <= endDate) {
          const statistics = await transactionService.getStatistics(
            weekStart.getTime(),
            weekEnd.getTime(),
          );
          weekData.push({
            label: weeks[i],
            value: statistics.expense,
          });
        }
      }

      setTrendData(weekData);
    } else if (selectedPeriod === 'year') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = eachMonthOfInterval({ start, end });

      const monthlyData = await Promise.all(
        months.map(async month => {
          const monthStart = startOfMonth(month).getTime();
          const monthEnd = endOfMonth(month).getTime();
          const statistics = await transactionService.getStatistics(
            monthStart,
            monthEnd,
          );
          return {
            label: format(month, 'MMM'),
            value: statistics.expense,
          };
        }),
      );

      setTrendData(monthlyData);
    }
  }, [selectedPeriod, getDateRange]);

  const loadAnalytics = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange();

      const statistics = await transactionService.getStatistics(
        startDate,
        endDate,
      );

      setStats({
        startDate,
        endDate,
        totalIncome: statistics.totalIncome,
        totalExpense: statistics.totalExpense,
        balance: statistics.balance,
        byCategory: statistics.byCategory,
      });

      if (statistics.totalExpense > 0) {
        const sortedCategories = [...statistics.byCategory].sort(
          (a, b) => b.amount - a.amount,
        );
        let cumulativePercentage = 0;

        const abcItems = sortedCategories.map(item => {
          const percentage = (item.amount / statistics.totalExpense) * 100;
          cumulativePercentage += percentage;

          let rank: 'A' | 'B' | 'C';
          if (cumulativePercentage <= 70) {
            rank = 'A';
          } else if (cumulativePercentage <= 85) {
            rank = 'B';
          } else {
            rank = 'C';
          }

          return {
            ...item,
            percentage,
            rank,
          };
        });

        setAbcData(abcItems);
      } else {
        setAbcData([]);
      }

      await loadTrendData();
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsFirstLoad(false);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getDateRange, loadTrendData]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  const showInfo = (title: string, content: string) => {
    setInfoModalTitle(title);
    setInfoModalContent(content);
    setInfoModalVisible(true);
  };

  // Тексты для пояснений
  const infoTexts = {
    expectedIncome: `💰 Ожидаемые доходы

Это сумма всех планируемых поступлений до конца текущего месяца.

📐 Алгоритм расчета:

1. Сбор будущих доходов
   • Анализируются все транзакции с типом "Доход" за период от текущей даты до конца месяца
   • Учитываются как регулярные, так и разовые поступления

2. Классификация доходов
   🔄 Регулярные доходы:
   • Транзакции с is_recurring = true
   • Повторяются ежемесячно (зарплата, аванс, подписки)
   • Группируются по датам (если несколько доходов в один день)

   🎁 Разовые доходы:
   • Транзакции с is_recurring = false
   • Единичные поступления (подарки, премии, возвраты)
   • Также группируются по датам

3. Учет распределения во времени
   • Доходы учитываются строго в дату их фактического поступления
   • При расчете прогноза баланса доходы добавляются в день получения
   • Не суммируются все сразу, а распределяются по дням

4. Стабильность дохода
   Анализируются доходы за последние 6 месяцев:
   • Высокая: доходы стабильны, отклонение < 10%
   • Средняя: есть небольшие колебания, отклонение 10-30%
   • Низкая: доходы нестабильны, отклонение > 30%

5. Если нет запланированных доходов
   • Используется среднемесячный доход за последние 6 месяцев
   • Исключаются аномалии (самый большой и маленький доход)
   • Рассчитывается среднее арифметическое оставшихся значений

📊 Пример расчета:

Транзакции до конца месяца:
• 10 апреля: Зарплата (регулярный) — 120 000 ₽
• 15 апреля: Подарок (разовый) — 10 000 ₽
• 25 апреля: Аванс (регулярный) — 80 000 ₽

Итого ожидаемый доход = 210 000 ₽
Регулярные доходы = 200 000 ₽
Разовые доходы = 10 000 ₽

📈 Как интерпретировать:

• Высокая стабильность (зеленый)
  → Доходы предсказуемы, можно уверенно планировать бюджет
  → Рекомендуется откладывать 20-30% в накопления

• Средняя стабильность (желтый)
  → Есть небольшие колебания, стоит иметь запас 1-2 месяца
  → Планируйте бюджет консервативно (по минимальному доходу)

• Низкая стабильность (красный)
  → Доходы непредсказуемы, рекомендуется создать подушку безопасности на 3-6 месяцев
  → Используйте среднемесячный доход для планирования

💡 Советы:
• Регулярно обновляйте информацию о будущих доходах
• Добавляйте разовые поступления как отдельные транзакции
• Сравнивайте ожидаемый доход с прогнозируемыми расходами
• При нестабильных доходах создавайте увеличенную подушку безопасности

⚠️ Важно:
• Ожидаемые доходы — это прогноз, основанный на имеющихся данных
• Реальная сумма может отличаться от прогнозируемой
• Рекомендуется обновлять прогноз при появлении новых данных
• Не учитываются незапланированные поступления`,
    averageDailySpending: `📊 Средние дневные расходы

Это показатель того, сколько в среднем вы тратите за один день.

📐 Формула расчёта:
Средние расходы = Сумма всех расходов за последние 30 дней ÷ 30

📊 На основе каких данных:
• Все операции с типом «Расход» за последние 30 календарных дней
• Регулярные платежи (аренда, подписки, спортзал)
• Разовые покупки
• Дни без трат (учитываются как 0 ₽)

❌ Что НЕ входит в расчёт:
• Доходы (зарплата, подарки, возвраты)
• Будущие или запланированные расходы

📈 Как интерпретировать:
• Если показатель ниже рекомендуемого лимита — вы тратите меньше, чем можете себе позволить
• Если выше — стоит пересмотреть бюджет, чтобы избежать кассовых разрывов

💡 Совет: Сравнивайте этот показатель с рекомендуемым дневным лимитом, чтобы понимать, насколько ваши траты соответствуют финансовым целям.`,

    abcAnalysis: `📊 Что такое ABC-анализ?

ABC-анализ — это метод классификации расходов по степени их важности, основанный на правиле Парето (80/20).

🔴 Категория A (70-80% расходов):
Самые крупные статьи расходов. Именно на них стоит обратить внимание в первую очередь для оптимизации бюджета.

🟠 Категория B (15-20% расходов):
Средние по величине расходы. Их можно оптимизировать, но эффект будет меньше.

🟢 Категория C (5-10% расходов):
Мелкие расходы. Их сокращение даст наименьший эффект.

📈 Как рассчитывается:
1. Все расходы сортируются от самых больших к самым маленьким
2. Суммируются до 70% от общих расходов — это категория A
3. Следующие 15% — категория B
4. Оставшиеся расходы — категория C

💡 Совет: Начните оптимизацию с категории A — это принесёт максимальную экономию.`,

    daysUntilNegative: `⏰ Дней до отрицательного баланса

Этот показатель показывает, через сколько дней ваш баланс может стать отрицательным при текущем уровне расходов.

📐 Формула расчёта:
Количество дней = (Текущий баланс + Ожидаемые доходы) / Средние дневные расходы

📊 На основе каких данных:
• Текущий баланс на счету
• Запланированные доходы (зарплата, подработки)
• Средние расходы за последние 30 дней
• Оставшиеся дни в месяце

🚨 Уровни риска:
• 0-7 дней: 🔴 Высокий риск — срочно сокращайте расходы
• 8-14 дней: 🟠 Средний риск — стоит пересмотреть бюджет
• 15+ дней: 🟢 Низкий риск — вы в безопасности

💡 Совет: Если показатель меньше 14 дней, попробуйте снизить ежедневные траты до рекомендуемого лимита.`,

    dailyLimit: `💰 Рекомендуемый дневной лимит

Это сумма, которую вы можете тратить в день, чтобы:
1. Не уйти в минус до конца месяца
2. Учитывать ваши привычные траты

📐 Формула расчёта:
Лимит = (Базовый лимит × 0.3) + (Исторический лимит × 0.7)

Где:
• Базовый лимит = (Текущий баланс + Ожидаемые доходы) / Оставшиеся дни
• Исторический лимит = Средние расходы за 30 дней × 0.8

🎯 Ограничения:
• Минимальный лимит: 100 ₽
• Максимальный лимит: не ограничен (рассчитывается индивидуально)

💡 Пример:
Если у вас большой доход и баланс, лимит будет соответствующим.
Если у вас скромный бюджет, лимит будет консервативным.

💡 Совет: Старайтесь не превышать этот лимит — это поможет избежать кассовых разрывов и накопить на цели.`,

    dailyForecast: `📅 Прогноз на следующие 14 дней

Это детальный прогноз ваших расходов и лимитов на ближайшие две недели.

📊 Что означают колонки:

1️⃣ Дата — день, на который сделан прогноз
2️⃣ Расходы (красная колонка) — прогнозируемая сумма расходов в этот день на основе вашей истории
3️⃣ Лимит (зелёная колонка) — рекомендуемая максимальная сумма для трат в этот день

📐 Как рассчитывается:
• Расходы = Средние дневные траты за последние 30 дней
• Лимит = Оставшиеся деньги / Оставшиеся дни (с учётом бюджетов)

⚠️ Если Расходы > Лимит:
Знак ⚠️ означает, что вы тратите больше, чем рекомендуется. В таком случае денег до конца месяца может не хватить.

💡 Совет:
• Стремитесь к тому, чтобы Расходы были меньше или равны Лимиту
• Если видите предупреждение, скорректируйте свои траты
• Используйте эту информацию для планирования крупных покупок`,
    predictedBalance: `📈 Прогнозируемый баланс на конец месяца

Это предсказание того, сколько денег останется на счету в последний день текущего месяца, если вы будете придерживаться рекомендуемого дневного лимита.

📐 Формула расчёта:
Прогноз = Текущий баланс + Ожидаемые доходы - (Рекомендуемый лимит × Оставшиеся дни)

Где:
• Рекомендуемый лимит — индивидуальная рекомендация (может быть округлён для удобства)
• Ожидаемые доходы — только регулярные доходы
• Оставшиеся дни — количество дней от завтра до конца месяца

💡 Пример расчёта для ваших данных:
Текущий баланс: 145 528 ₽
Ожидаемые доходы: 275 420 ₽
Рекомендуемый лимит: 12 283 ₽/день
Оставшиеся дни: 29

Прогноз = 145 528 + 275 420 - (12 283 × 29) = 420 948 - 356 207 = 64 741 ₽

⚠️ Небольшое расхождение с отображаемым значением (до ±10 ₽) возможно из-за округления промежуточных вычислений.`,
  };

  if (isLoading && isFirstLoad) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Загрузка аналитики...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Period Filter */}
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Доходы
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {stats?.totalIncome.toFixed(2)} ₽
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Расходы
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {stats?.totalExpense.toFixed(2)} ₽
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.text.secondary }]}
            >
              Баланс
            </Text>
            <Text
              style={[
                styles.summaryAmount,
                {
                  color:
                    (stats?.balance || 0) >= 0 ? colors.success : colors.error,
                },
              ]}
            >
              {stats?.balance.toFixed(2)} ₽
            </Text>
          </View>
        </View>

        {/* Expense Breakdown Pie Chart */}
        <PieChart
          data={
            stats?.byCategory.map(item => ({
              value: item.amount,
              color: item.categoryColor,
              label: item.categoryName,
            })) || []
          }
          totalAmount={stats?.totalExpense || 0}
          title="Структура расходов"
          currency="RUB"
        />

        {/* Expense Trend Bar Chart */}
        <BarChart
          data={trendData.map(item => ({
            value: item.value,
            label: item.label,
          }))}
          title="Динамика расходов"
          currency="RUB"
        />

        {/* ABC Analysis with Info Button */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              ABC-анализ
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => showInfo('ABC-анализ', infoTexts.abcAnalysis)}
            >
              <Icon
                name="information-outline"
                size={18}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ABCAnalysis
          data={abcData}
          totalAmount={stats?.totalExpense || 0}
          currency="RUB"
        />

        {/* Forecast Card with Info Buttons */}
        <ForecastCard
          currency="RUB"
          onInfoPress={type => {
            switch (type) {
              case 'avgDailySpending':
                showInfo(
                  'Средние дневные расходы',
                  infoTexts.averageDailySpending,
                );
                break;
              case 'expectedIncome':
                showInfo('Ожидаемые доходы', infoTexts.expectedIncome);
                break;
              case 'daysUntilNegative':
                showInfo(
                  'Дней до отрицательного баланса',
                  infoTexts.daysUntilNegative,
                );
                break;
              case 'dailyLimit':
                showInfo('Рекомендуемый дневной лимит', infoTexts.dailyLimit);
                break;
              case 'predictedBalance':
                showInfo(
                  'Прогнозируемый баланс на конец месяца',
                  infoTexts.predictedBalance,
                );
                break;
              case 'dailyForecast':
                showInfo(
                  'Прогноз на следующие 14 дней',
                  infoTexts.dailyForecast,
                );
                break;
            }
          }}
        />

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Info Modal */}
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
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoButton: {
    padding: 4,
  },
  bottomSpacing: {
    height: 100,
  },
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
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    flex: 1,
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
    paddingBottom: 20,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
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
