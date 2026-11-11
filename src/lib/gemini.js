import { getApp } from '@react-native-firebase/app';
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';
import { getAI, getGenerativeModel, Schema } from '@react-native-firebase/ai';

// Modelo multimodal (texto + imagen) recomendado en la documentación de Firebase AI Logic.
const MODEL_NAME = 'gemini-3.1-flash-lite';

export const PROMPT = `Eres un asistente de estudio. Analiza la fotografía de un apunte (notas escritas a mano, pizarrón, libro o diapositiva).

Responde ÚNICAMENTE con JSON válido, sin texto adicional y sin bloques de código markdown, con exactamente esta estructura:
{ "titulo": "", "resumen": "", "conceptos_clave": [], "preguntas": [ { "pregunta": "", "opciones": [], "correcta": 0 } ] }

Reglas:
- Escribe todo en español.
- "titulo": un título corto que describa el tema del apunte.
- "resumen": un resumen claro de 1 a 2 párrafos del contenido.
- "conceptos_clave": entre 3 y 8 conceptos importantes, cada uno como texto breve.
- "preguntas": exactamente 5 preguntas de opción múltiple sobre el contenido del apunte.
- Cada pregunta tiene exactamente 4 "opciones" y "correcta" es el índice (0 a 3) de la opción correcta.
- Si la imagen NO es un apunte de estudio, o está tan borrosa que no se puede leer, responde con "titulo": "", "conceptos_clave": [], "preguntas": [] y en "resumen" explica brevemente por qué no se pudo analizar.`;

// Reto extra
const RESPONSE_SCHEMA = Schema.object({
  properties: {
    titulo: Schema.string(),
    resumen: Schema.string(),
    conceptos_clave: Schema.array({ items: Schema.string() }),
    preguntas: Schema.array({
      items: Schema.object({
        properties: {
          pregunta: Schema.string(),
          opciones: Schema.array({ items: Schema.string() }),
          correcta: Schema.integer(),
        },
      }),
    }),
  },
});

let appCheckInstance = null;
let initPromise = null;
let model = null;

// Token de depuración fijo, creado en Firebase Console > App Check > Apps >
// Administrar tokens de depuración. Si existe, se usa el proveedor "debug"
// (necesario en dev builds y en APKs de prueba que no vienen de Play Store).
const DEBUG_TOKEN = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;
const USE_DEBUG = __DEV__ || !!DEBUG_TOKEN;

/**
 * Inicializa App Check una sola vez. Si falla, la app sigue funcionando
 * (solo importa cuando App Check se exige).
 */
export function initFirebase() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const provider = new ReactNativeFirebaseAppCheckProvider();
        provider.configure({
          android: USE_DEBUG
            ? { provider: 'debug', debugToken: DEBUG_TOKEN }
            : { provider: 'playIntegrity' },
          apple: USE_DEBUG
            ? { provider: 'debug', debugToken: DEBUG_TOKEN }
            : { provider: 'appAttestWithDeviceCheckFallback' },
        });
        appCheckInstance = await initializeAppCheck(getApp(), {
          provider,
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        console.warn('No se pudo inicializar App Check:', error);
      }
    })();
  }
  return initPromise;
}

async function getModel() {
  await initFirebase();
  if (!model) {
    const ai = getAI(getApp(), { appCheck: appCheckInstance ?? undefined });
    model = getGenerativeModel(ai, {
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });
  }
  return model;
}

/** Envía la imagen (base64) junto con el prompt y regresa el texto crudo de Gemini. */
export async function analyzeImage(base64, mimeType) {
  const result = await (await getModel()).generateContent([
    PROMPT,
    { inlineData: { mimeType, data: base64 } },
  ]);
  return result.response.text();
}

/** Convierte cualquier error de red / Firebase en un mensaje entendible para el usuario. */
export function friendlyError(error) {
  const message = String(error?.message ?? error ?? '');
  const status = error?.customErrorData?.status;

  if (/network request failed|failed to fetch|network|timeout|abort/i.test(message)) {
    return 'No hay conexión a internet o la red es muy lenta. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (status === 429) {
    return 'Se alcanzó el límite de solicitudes a Gemini. Espera un momento e inténtalo de nuevo.';
  }
  if (status === 401 || status === 403 || error?.code === 'api-not-enabled') {
    return 'El servicio de IA no está disponible para esta app. Revisa la configuración de Firebase AI Logic y App Check.';
  }
  if (status >= 500) {
    return 'El servicio de Gemini tuvo un problema. Inténtalo de nuevo en unos minutos.';
  }
  return 'Ocurrió un error al analizar la imagen. Inténtalo de nuevo.';
}
