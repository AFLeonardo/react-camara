import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteAnalysis, listAnalyses } from '../lib/db';
import { colors, common } from '../lib/theme';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function HistorialScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState([]);

  const load = useCallback(() => {
    listAnalyses(db)
      .then(setItems)
      .catch((e) => console.warn('No se pudo cargar el historial', e));
  }, [db]);

  // Recarga al volver a esta pantalla (por ejemplo, después de terminar un quiz).
  useFocusEffect(load);

  function confirmDelete(item) {
    Alert.alert('Eliminar', `¿Eliminar "${item.titulo}" del historial?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteAnalysis(db, item.id).then(load),
      },
    ]);
  }

  return (
    <FlatList
      style={common.screen}
      contentContainerStyle={[common.content, items.length === 0 && styles.emptyContainer]}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        <Text style={[common.muted, styles.emptyText]}>
          Aún no has analizado ningún apunte. Toma una foto para empezar.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/resumen', params: { id: String(item.id) } })}
          onLongPress={() => confirmDelete(item)}
          style={({ pressed }) => [common.card, styles.row, pressed && { opacity: 0.8 }]}
        >
          {item.image_uri ? (
            <Image source={{ uri: item.image_uri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: colors.border }]} />
          )}
          <View style={styles.info}>
            <Text style={common.h2} numberOfLines={2}>
              {item.titulo}
            </Text>
            <Text style={common.muted}>{formatDate(item.fecha)}</Text>
            <Text style={common.muted}>
              {item.total != null ? `Quiz: ${item.puntaje}/${item.total}` : 'Quiz sin responder'}
            </Text>
          </View>
        </Pressable>
      )}
      ListFooterComponent={
        items.length > 0 ? (
          <Text style={[common.muted, styles.emptyText]}>Mantén presionado un elemento para eliminarlo.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  info: { flex: 1, gap: 2 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center' },
});
