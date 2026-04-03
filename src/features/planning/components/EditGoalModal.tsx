import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../core/hooks/useTheme';
import goalService from '../../../core/services/goal.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Расширенный перечень иконок по категориям
const ICON_OPTIONS = [
  // Транспорт
  'car',
  'car-sports',
  'car-electric',
  'motorcycle',
  'bike',
  'bus',
  'train',
  'airplane',
  'rocket',
  // Дом и недвижимость
  'home',
  'home-variant',
  'home-city',
  'office-building',
  'garage',
  'bed',
  'sofa',
  'fridge',
  'washing-machine',
  // Финансы и сбережения
  'cash',
  'cash-multiple',
  'bank',
  'piggy-bank',
  'safe',
  'wallet',
  'credit-card',
  'chart-line',
  'chart-bar',
  // Путешествия
  'beach',
  'umbrella-beach',
  'camping',
  'hiking',
  'sailing',
  'ferry',
  'hotel',
  'tent',
  'bag-suitcase',
  // Еда и рестораны
  'food',
  'food-apple',
  'food-turkey',
  'food-steak',
  'coffee',
  'tea',
  'silverware-fork-knife',
  'restaurant',
  // Покупки и шопинг
  'shopping',
  'cart',
  'bag-personal',
  'gift',
  'tag',
  'basket',
  'store',
  'storefront',
  'shopping-search',
  // Образование
  'school',
  'book',
  'book-open-page-variant',
  'notebook',
  'pen',
  'laptop',
  'desktop-classic',
  'tablet',
  // Здоровье и спорт
  'hospital',
  'medical-bag',
  'pill',
  'heart',
  'dumbbell',
  'run',
  'yoga',
  'swim',
  // Развлечения
  'movie',
  'music',
  'gamepad-variant',
  'theater',
  'ticket',
  'party-popper',
  'balloon',
  'cake',
  // Подарки и праздники
  'cake-variant',
  'candy',
  'ribbon',
  'star',
  'crown',
  // Животные
  'dog',
  'cat',
  'rabbit',
  'fish',
  'bird',
  'paw',
  // Природа
  'tree',
  'flower',
  'leaf',
  'mountain',
  'forest',
  'water',
  'sun',
  'moon',
  // Техника и электроника
  'cellphone',
  'tablet',
  'desktop-classic',
  'television',
  'headphones',
  'camera',
  'printer',
  'router',
  // Семья и дети
  'baby-carriage',
  'baby-bottle',
  'toy-brick',
  'puzzle',
  'teddy-bear',
  'family',
  // Иконки для статусов и целей
  'target',
  'flag',
  'flag-checkered',
  'trophy',
  'medal',
  'star-circle',
  'check-circle',
  'check-decagram',
  // Разное
  'lightbulb',
  'flash',
  'fire',
  'water',
  'weather-sunny',
  'cloud',
  'snowflake',
  'calendar',
  'clock',
  'bell',
  'email',
  'phone',
  'message',
  'earth',
  'lock',
  'shield',
  'security',
  'fingerprint',
  'key',
];
// Расширенная палитра цветов
const COLOR_OPTIONS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#E84393',
  '#7F8C8D',
  '#34495E',
  '#16A085',
  '#27AE60',
  '#2980B9',
  '#8E44AD',
  '#2C3E50',
  '#D35400',
  '#BDC3C7',
  '#C0392B',
  '#F1C40F',
  '#1E8449',
  '#6C3483',
  '#117A65',
];

interface EditGoalModalProps {
  visible: boolean;
  goal: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({
  visible,
  goal,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [selectedIcon, setSelectedIcon] = useState('piggy-bank');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setName(goal.name || '');
      setTargetAmount(goal.targetAmount?.toString() || '');
      setCurrentAmount(goal.currentAmount?.toString() || '');
      setDeadline(goal.deadline ? new Date(goal.deadline) : null);
      setSelectedIcon(goal.icon || 'piggy-bank');
      setSelectedColor(goal.color || '#FF6B6B');
    }
  }, [goal]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название цели');
      return;
    }

    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;

    if (isNaN(target) || target <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму цели');
      return;
    }

    if (current > target) {
      Alert.alert('Ошибка', 'Накопленная сумма не может превышать цель');
      return;
    }

    setIsLoading(true);
    try {
      await goalService.updateGoal(goal.id, {
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        deadline: deadline?.getTime() || null,
        icon: selectedIcon,
        color: selectedColor,
      });

      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить цель');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!goal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            {/* Индикатор свайпа */}
            <View style={styles.swipeIndicatorContainer}>
              <View
                style={[
                  styles.swipeIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Редактировать цель
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text
                style={[
                  styles.label,
                  { color: colors.text.secondary, marginTop: 0 },
                ]}
              >
                Название цели
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text.primary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Например: Новая машина, Путешествие"
                placeholderTextColor={colors.text.secondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Сумма цели
              </Text>
              <View
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.text.primary },
                  ]}
                >
                  ₽
                </Text>
                <TextInput
                  style={[styles.amountField, { color: colors.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.secondary}
                  keyboardType="decimal-pad"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                />
              </View>

              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Накоплено (опционально)
              </Text>
              <View
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.text.primary },
                  ]}
                >
                  ₽
                </Text>
                <TextInput
                  style={[styles.amountField, { color: colors.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.secondary}
                  keyboardType="decimal-pad"
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                />
              </View>

              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Дедлайн (опционально)
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={20} color={colors.text.secondary} />
                <Text style={[styles.dateText, { color: colors.text.primary }]}>
                  {deadline
                    ? deadline.toLocaleDateString('ru-RU')
                    : 'Выберите дату'}
                </Text>
                <Icon
                  name="chevron-down"
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDeadline(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}

              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Иконка
              </Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon, index) => (
                  <TouchableOpacity
                    key={`${icon}-${index}`}
                    style={[
                      styles.iconButton,
                      {
                        backgroundColor:
                          selectedIcon === icon
                            ? selectedColor
                            : colors.background,
                        borderColor: selectedColor,
                      },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Icon
                      name={icon}
                      size={24}
                      color={selectedIcon === icon ? '#FFFFFF' : selectedColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Цвет
              </Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      {
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 0,
                        borderColor: '#FFFFFF',
                      },
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: colors.border },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[styles.buttonText, { color: colors.text.secondary }]}
                >
                  Отмена
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                    Сохранить
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  scrollContent: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  amountField: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  iconButton: {
    width: '23.5%',
    // aspectRatio: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    // marginTop: 20,
    // marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
