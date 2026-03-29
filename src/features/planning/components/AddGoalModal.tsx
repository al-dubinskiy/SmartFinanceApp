import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../core/hooks/useTheme';
import goalService from '../../../core/services/goal.service';

const ICON_OPTIONS = [
  'home', 'car', 'airplane', 'phone', 'laptop', 
  'cash', 'bank', 'piggy-bank', 'gift', 'crown',
];

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#E74C3C', '#3498DB',
];

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    if (current > target) {
      Alert.alert('Error', 'Current amount cannot exceed target amount');
      return;
    }

    setIsLoading(true);
    try {
      await goalService.createGoal({
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        deadline: deadline?.getTime() || null,
        icon: selectedIcon,
        color: selectedColor,
      });
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline(null);
    setSelectedIcon('piggy-bank');
    setSelectedColor('#FF6B6B');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

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
              Create Goal
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>
              Goal Name
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
              placeholder="e.g., New Car, Vacation, Emergency Fund"
              placeholderTextColor={colors.text.secondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>
              Target Amount
            </Text>
            <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.text.primary }]}>$</Text>
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
              Current Savings (Optional)
            </Text>
            <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.text.primary }]}>$</Text>
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
              Deadline (Optional)
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={20} color={colors.text.secondary} />
              <Text style={[styles.dateText, { color: colors.text.primary }]}>
                {deadline ? deadline.toLocaleDateString() : 'Select date'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={deadline || new Date()}
                mode="date"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={[styles.label, { color: colors.text.secondary }]}>
              Choose Icon
            </Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: selectedIcon === icon
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
              Choose Color
            </Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: colors.text.secondary }]}>
                  Cancel
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
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  {isLoading ? 'Creating...' : 'Create Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    gap: 12,
    marginBottom: 12,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
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