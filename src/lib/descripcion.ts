/**
 * NEGRILLA LIGERA EN LA DESCRIPCIÓN
 * =================================
 *
 * La descripción pública (el campo `short_description`, que es el que la ficha
 * pinta — ver `fusionar-descripciones.ts`) admite negrilla con **asteriscos
 * dobles**. El editor del panel los inserta sobre el texto seleccionado y la
 * ficha los pinta como <strong> (ver `DescripcionFormateada`).
 *
 * En CUALQUIER contexto de texto plano o estructurado —JSON-LD, las APIs
 * públicas, lo que lee Mac, el lector de voz— hay que quitar los marcadores con
 * `descripcionPlana` para que el `**` no se filtre. Es el mismo criterio del
 * resto del proyecto: un marcador de presentación no viaja a donde se consume
 * como dato.
 */
export function descripcionPlana(texto: string | null | undefined): string {
  if (!texto) return '';
  // Solo pares bien formados; un `**` suelto se deja como está (no era negrilla).
  return texto.replace(/\*\*([^*]+?)\*\*/g, '$1');
}
