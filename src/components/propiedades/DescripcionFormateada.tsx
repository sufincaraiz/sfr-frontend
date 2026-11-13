import { Fragment } from 'react';

/**
 * Pinta la descripción con negrilla ligera: **texto** → <strong>texto</strong>.
 *
 * El texto va como children de React (se escapa), así que NO hay riesgo de
 * inyección de HTML aunque el contenido venga de la base. Los saltos de línea
 * los preserva el contenedor con `whiteSpace: pre-line`; aquí no se tocan.
 */
export function DescripcionFormateada({ texto }: { texto: string }) {
  // El grupo de captura conserva los tokens **…** como elementos propios del
  // array; el resto queda como texto normal.
  const partes = texto.split(/(\*\*[^*]+?\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        const m = /^\*\*([^*]+?)\*\*$/.exec(parte);
        return m
          ? <strong key={i} style={{ fontWeight: 800, color: '#0D2D5E' }}>{m[1]}</strong>
          : <Fragment key={i}>{parte}</Fragment>;
      })}
    </>
  );
}
