import { Alert, Text, View, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import type { UploadableDocument } from '../../types/document';
import { theme } from '../../theme';
import { validateUploadDocument } from '../../utils/file';

interface DocumentUploadWidgetProps {
  title?: string;
  defaultDocumentType?: string;
  onSubmit: (payload: { documentType: string; file: UploadableDocument }) => Promise<void>;
}

export function DocumentUploadWidget({
  title = 'رفع مستند',
  defaultDocumentType = '',
  onSubmit,
}: DocumentUploadWidgetProps) {
  const [documentType, setDocumentType] = useState(defaultDocumentType);
  const [file, setFile] = useState<UploadableDocument | null>(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/pdf', 'image/*'],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const selectedFile: UploadableDocument = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };
    const error = validateUploadDocument(selectedFile);
    if (error) {
      Alert.alert('ملف غير صالح', error);
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!documentType.trim() || !file) {
      Alert.alert('بيانات ناقصة', 'اختر نوع المستند والملف قبل الرفع.');
      return;
    }
    try {
      setLoading(true);
      await onSubmit({ documentType: documentType.trim(), file });
      setFile(null);
      if (!defaultDocumentType) setDocumentType('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppCard>
      <Text style={styles.title}>{title}</Text>
      <AppInput
        label="نوع المستند"
        value={documentType}
        onChangeText={setDocumentType}
        editable={!defaultDocumentType}
        hint="اكتب القيمة كما يعتمدها النظام مثل passport أو national_id."
      />
      <AppButton label={file ? `تم اختيار: ${file.name}` : 'اختيار ملف'} variant="secondary" onPress={() => void pickDocument()} />
      <AppButton label="رفع المستند" onPress={() => void handleSubmit()} loading={loading} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    textAlign: 'right',
  },
});
