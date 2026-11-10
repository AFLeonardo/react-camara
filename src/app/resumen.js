import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import { getAnalysis } from '../lib/db';
import { colors, common } from '../lib/theme';

export default function ResumenScreen() {
  const { id } = useLocalSearchParams();
  const db = useSQLiteContext();
  const [item, setItem] = useState(undefined); // undefined = cargando, null = no existe

  useEffect(() => {
    getAnalysis(db, id)
      .then(setItem)
      .catch(() => setItem(null));
  }, [db, id]);

  if (item === undefined) {
    return (
      <View style={[common.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[common.screen, styles.center, common.content]}>
        <Text style={common.body}>No se encontró este resumen.</Text>
        <AppButton title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  const { titulo, resumen, conceptos_clave, preguntas } = item.data;

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content}>
      {item.image_uri ? (
        <Image source={{ uri: item.image_uri }} style={styles.thumb} resizeMode="cover" />
      ) : null}

      <Text style={common.h1}>{titulo}</Text>

      <View style={common.card}>
        <Text style={common.h2}>Resumen</Text>
        <Text style={common.body}>{resumen}</Text>
      </View>

      <View style={common.card}>
        <Text style={common.h2}>Conceptos clave</Text>
        <View style={styles.chips}>
          {conceptos_clave.map((c, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      <AppButton
        title={`Hacer quiz (${preguntas.length} preguntas)`}
        onPress={() => router.push({ pathname: '/quiz', params: { id: String(item.id) } })}
      />
      <AppButton title="Escanear otro apunte" variant="secondary" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  thumb: { width: '100%', height: 160, borderRadius: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#E8F0FB',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: colors.primaryDark, fontSize: 14, fontWeight: '600' },
});
