import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { DB_NAME, migrateDb } from '../lib/db';
import { initFirebase } from '../lib/gemini';
import { colors } from '../lib/theme';

SplashScreen.setOptions({ duration: 1000, fade: true });

export default function RootLayout() {
  useEffect(() => {
    initFirebase();
  }, []);

  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Escanear apunte' }} />
        <Stack.Screen name="resumen" options={{ title: 'Resumen' }} />
        <Stack.Screen name="quiz" options={{ title: 'Quiz' }} />
        <Stack.Screen name="historial" options={{ title: 'Historial' }} />
      </Stack>
    </SQLiteProvider>
  );
}
