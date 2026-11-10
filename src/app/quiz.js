import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import { getAnalysis, saveScore } from '../lib/db';
import { colors, common } from '../lib/theme';

export default function QuizScreen() {
  const { id } = useLocalSearchParams();
  const db = useSQLiteContext();
  const [preguntas, setPreguntas] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    getAnalysis(db, id)
      .then((item) => setPreguntas(item?.data?.preguntas ?? []))
      .catch(() => setPreguntas([]));
  }, [db, id]);

  if (preguntas === null) {
    return (
      <View style={[common.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (preguntas.length === 0) {
    return (
      <View style={[common.screen, styles.center, common.content]}>
        <Text style={common.body}>Este apunte no tiene preguntas disponibles.</Text>
        <AppButton title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  const total = preguntas.length;

  function choose(optionIndex) {
    if (selected !== null) return; // solo una respuesta por pregunta
    setSelected(optionIndex);
    if (optionIndex === preguntas[index].correcta) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 < total) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      setFinished(true);
      saveScore(db, id, score, total).catch((e) => console.warn('No se guardó el puntaje', e));
    }
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <ScrollView style={common.screen} contentContainerStyle={[common.content, styles.center]}>
        <Text style={common.h1}>¡Quiz terminado!</Text>
        <Text style={styles.score}>
          {score} / {total}
        </Text>
        <Text style={common.body}>
          {pct === 100
            ? '¡Perfecto! Dominas el tema.'
            : pct >= 60
              ? 'Buen trabajo. Repasa los conceptos que fallaste.'
              : 'Te conviene repasar el resumen e intentarlo de nuevo.'}
        </Text>
        <AppButton title="Reintentar quiz" onPress={restart} style={styles.full} />
        <AppButton title="Volver al resumen" variant="secondary" onPress={() => router.back()} style={styles.full} />
      </ScrollView>
    );
  }

  const q = preguntas[index];
  const answered = selected !== null;
  const isCorrect = answered && selected === q.correcta;

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content}>
      <Text style={common.muted}>
        Pregunta {index + 1} de {total} · Puntaje: {score}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }]} />
      </View>

      <Text style={common.h2}>{q.pregunta}</Text>

      <View style={styles.options}>
        {q.opciones.map((opcion, i) => {
          const showCorrect = answered && i === q.correcta;
          const showWrong = answered && i === selected && i !== q.correcta;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              onPress={() => choose(i)}
              disabled={answered}
              style={[styles.option, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
            >
              <Text style={common.body}>
                {String.fromCharCode(65 + i)}. {opcion}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {answered && (
        <View style={[styles.feedback, isCorrect ? styles.optionCorrect : styles.optionWrong]}>
          <Text style={[common.body, { fontWeight: '700' }]}>
            {isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto'}
          </Text>
          {!isCorrect && (
            <Text style={common.body}>La respuesta correcta es: {q.opciones[q.correcta]}</Text>
          )}
        </View>
      )}

      <AppButton
        title={index + 1 < total ? 'Siguiente' : 'Ver resultado'}
        onPress={next}
        disabled={!answered}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  full: { alignSelf: 'stretch' },
  score: { fontSize: 48, fontWeight: '800', color: colors.primary },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.primary },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    minHeight: 48,
  },
  optionCorrect: { backgroundColor: colors.successBg, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  feedback: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
});
