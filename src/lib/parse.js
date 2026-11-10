/**
 * Convierte la respuesta de Gemini en un objeto válido.
 * Regresa { ok: true, data } o { ok: false, message } — nunca lanza excepciones.
 */
export function parseStudyResponse(rawText) {
  let json;
  try {
    // Por si el modelo envuelve el JSON en ```json ... ```
    const cleaned = String(rawText ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    json = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      message: 'La respuesta de la IA no tuvo el formato esperado. Inténtalo de nuevo.',
    };
  }

  if (!json || typeof json !== 'object') {
    return { ok: false, message: 'La respuesta de la IA llegó vacía. Inténtalo de nuevo.' };
  }

  const titulo = typeof json.titulo === 'string' ? json.titulo.trim() : '';
  const resumen = typeof json.resumen === 'string' ? json.resumen.trim() : '';
  const conceptos_clave = Array.isArray(json.conceptos_clave)
    ? json.conceptos_clave.filter((c) => typeof c === 'string' && c.trim())
    : [];
  const preguntas = Array.isArray(json.preguntas)
    ? json.preguntas.filter(
        (p) =>
          p &&
          typeof p.pregunta === 'string' &&
          Array.isArray(p.opciones) &&
          p.opciones.length >= 2 &&
          Number.isInteger(p.correcta) &&
          p.correcta >= 0 &&
          p.correcta < p.opciones.length
      )
    : [];

  // El prompt pide título vacío y sin preguntas cuando la foto no es un apunte o es ilegible.
  if (!titulo || preguntas.length === 0) {
    return {
      ok: false,
      message:
        resumen ||
        'No se pudo leer un apunte en la imagen. Intenta con una foto más nítida y bien iluminada.',
    };
  }

  return { ok: true, data: { titulo, resumen, conceptos_clave, preguntas } };
}
