import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick, types } from '@react-native-documents/picker'
import { useTheme } from '../../../core/hooks/useTheme';
import backupService, { CSVColumnMapping } from '../../../core/services/backup.service';

interface CSVImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<'select' | 'map'>('select');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    dateColumn: '',
    amountColumn: '',
    descriptionColumn: '',
    typeColumn: '',
    defaultCategory: 'Other',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      const result = await pick({
        type: types.csv,
      });
      
      setSelectedFile(result[0]);
      
      // Читаем заголовки CSV
      // В реальном приложении нужно прочитать файл и получить заголовки
      // Для демонстрации используем mock заголовки
      const mockHeaders = ['Date', 'Amount', 'Description', 'Type', 'Category'];
      setCsvHeaders(mockHeaders);
      
      setStep('map');
    } catch (error) {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleImport = async () => {
    if (!mapping.dateColumn || !mapping.amountColumn || !mapping.descriptionColumn) {
      Alert.alert('Error', 'Please map all required columns');
      return;
    }

    setIsLoading(true);
    try {
      const result = await backupService.importCSV(selectedFile.uri, mapping);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        onSuccess();
        onClose();
        resetForm();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedFile(null);
    setCsvHeaders([]);
    setMapping({
      dateColumn: '',
      amountColumn: '',
      descriptionColumn: '',
      typeColumn: '',
      defaultCategory: 'Other',
    });
  };

  const renderSelectStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="file-csv" size={64} color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        Import CSV File
      </Text>
      <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
        Select a CSV file exported from your bank or financial app
      </Text>
      
      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: colors.primary }]}
        onPress={handleSelectFile}
      >
        <Icon name="folder-open" size={24} color="#FFFFFF" />
        <Text style={styles.selectButtonText}>Choose File</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMapStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
          Map Columns
        </Text>
        <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
          Match CSV columns with SmartFinance fields
        </Text>

        {/* Date Column */}
        <View style={styles.mapField}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            Date Column *
          </Text>
          <View style={styles.radioGroup}>
            {csvHeaders.map((header) => (
              <TouchableOpacity
                key={header}
                style={[
                  styles.radioButton,
                  {
                    backgroundColor: mapping.dateColumn === header
                      ? colors.primary
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMapping({ ...mapping, dateColumn: header })}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: mapping.dateColumn === header
                        ? '#FFFFFF'
                        : colors.text.primary,
                    },
                  ]}
                >
                  {header}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Column */}
        <View style={styles.mapField}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            Amount Column *
          </Text>
          <View style={styles.radioGroup}>
            {csvHeaders.map((header) => (
              <TouchableOpacity
                key={header}
                style={[
                  styles.radioButton,
                  {
                    backgroundColor: mapping.amountColumn === header
                      ? colors.primary
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMapping({ ...mapping, amountColumn: header })}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: mapping.amountColumn === header
                        ? '#FFFFFF'
                        : colors.text.primary,
                    },
                  ]}
                >
                  {header}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Column */}
        <View style={styles.mapField}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            Description Column *
          </Text>
          <View style={styles.radioGroup}>
            {csvHeaders.map((header) => (
              <TouchableOpacity
                key={header}
                style={[
                  styles.radioButton,
                  {
                    backgroundColor: mapping.descriptionColumn === header
                      ? colors.primary
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMapping({ ...mapping, descriptionColumn: header })}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: mapping.descriptionColumn === header
                        ? '#FFFFFF'
                        : colors.text.primary,
                    },
                  ]}
                >
                  {header}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Type Column (Optional) */}
        <View style={styles.mapField}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            Type Column (Optional)
          </Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                {
                  backgroundColor: !mapping.typeColumn
                    ? colors.primary
                    : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setMapping({ ...mapping, typeColumn: '' })}
            >
              <Text
                style={[
                  styles.radioText,
                  {
                    color: !mapping.typeColumn
                      ? '#FFFFFF'
                      : colors.text.primary,
                  },
                ]}
              >
                Auto-detect
              </Text>
            </TouchableOpacity>
            {csvHeaders.map((header) => (
              <TouchableOpacity
                key={header}
                style={[
                  styles.radioButton,
                  {
                    backgroundColor: mapping.typeColumn === header
                      ? colors.primary
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMapping({ ...mapping, typeColumn: header })}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: mapping.typeColumn === header
                        ? '#FFFFFF'
                        : colors.text.primary,
                    },
                  ]}
                >
                  {header}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default Category */}
        <View style={styles.mapField}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            Default Category *
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
            placeholder="e.g., Other"
            placeholderTextColor={colors.text.secondary}
            value={mapping.defaultCategory}
            onChangeText={(text) => setMapping({ ...mapping, defaultCategory: text })}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={() => setStep('select')}
          >
            <Text style={[styles.buttonText, { color: colors.text.secondary }]}>
              Back
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.importButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleImport}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Import
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

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
              Import CSV
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {step === 'select' ? renderSelectStep() : renderMapStep()}
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
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mapField: {
    width: '100%',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  radioText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
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
  importButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});