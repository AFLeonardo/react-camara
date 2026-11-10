import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import { analyzeImage, friendlyError } from '../lib/gemini';
import { parseStudyResponse } from '../lib/parse';
import { saveAnalysis } from '../lib/db';
import { colors, common } from '../lib/theme';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  base64: true,
  quality: 0.6, // reduce el tamaño del base64 que se envía a Gemini
};

const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export default function CaptureScreen() {
  const db = useSQLiteContext();
  const [image, setImage] = useState(null); // { uri, base64, mimeType }
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'error' | 'info', text }

  function handlePickerResult(result) {
    if (result.canceled || !result.assets?.length) {
      setNotice({ type: 'info', text: 'Cancelaste la selección. Puedes intentarlo de nuevo cuando quieras.' });
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      setNotice({ type: 'error', text: 'No se pudo leer la imagen. Intenta con otra.' });
      return;
    }
    setImage({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: SUPPORTED_MIME.includes(asset.mimeType) ? asset.mimeType : 'image/jpeg',
    });
    setNotice(null);
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice({ type: 'error', text: 'Sin permiso de cámara no podemos tomar la foto. También puedes elegir una imagen de la galería.' });
        if (!permission.canAskAgain) {
          Alert.alert(
            'Permiso de cámara denegado',
            'Para tomar fotos, activa el permiso de cámara en los ajustes de tu teléfono.',
            [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }
      handlePickerResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: 'No se pudo abrir la cámara.' });
    }
  }

  async function pickFromGallery() {
    try {
      handlePickerResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: 'No se pudo abrir la galería.' });
    }
  }

  async function analyze() {
    if (!image || loading) return;
    setLoading(true);
    setNotice(null);
    try {
      const text = await analyzeImage(image.base64, image.mimeType);
      const parsed = parseStudyResponse(text);
      if (!parsed.ok) {
        setNotice({ type: 'error', text: parsed.message });
        return;
      }
      const id = await saveAnalysis(db, { imageUri: image.uri, data: parsed.data });
      router.push({ pathname: '/resumen', params: { id: String(id) } });
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: friendlyError(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content}>
      <Text style={common.muted}>
        Toma una foto de tu apunte o elige una de la galería. La IA generará un resumen, los
        conceptos clave y un quiz de 5 preguntas.
      </Text>

      <View style={styles.row}>
        <AppButton title="Tomar foto" onPress={takePhoto} disabled={loading} style={styles.flex} />
        <AppButton
          title="Elegir de galería"
          variant="secondary"
          onPress={pickFromGallery}
          disabled={loading}
          style={styles.flex}
        />
      </View>

      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={common.muted}>Aquí verás la vista previa</Text>
        </View>
      )}

      {notice && (
        <View style={[styles.notice, notice.type === 'error' ? styles.noticeError : styles.noticeInfo]}>
          <Text style={common.body}>{notice.text}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={common.muted}>Analizando tu apunte con Gemini…</Text>
        </View>
      ) : (
        <AppButton title="Analizar apunte" onPress={analyze} disabled={!image} />
      )}

      <AppButton
        title="Ver historial"
        variant="secondary"
        onPress={() => router.push('/historial')}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#E9EEF5',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  notice: { padding: 12, borderRadius: 10 },
  noticeError: { backgroundColor: colors.dangerBg },
  noticeInfo: { backgroundColor: '#E8F0FB' },
  loading: { alignItems: 'center', gap: 8, paddingVertical: 8 },
});
