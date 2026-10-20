'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, Loader2 } from 'lucide-react';
import {
  tramosDesdeFilas, filasDesdeTramos, filaNueva, resumenParaPantalla,
  type FilaEditor, type Resultado,
} from '@/lib/notariales/editor-tramos';
import type { ModoTramo, UnidadValor, Tramo } from '@/lib/notariales/tipos';

// ─────────────────────────────────────────────────────────────────────────────
// EL EDITOR DE TRAMOS — SOLO ERGONOMÍA.
//
// ⚠ ESTE ARCHIVO NO DECIDE NADA. Ni qué es un hueco, ni qué es un error, ni qué
// tono usar, ni cómo se ordenan las filas. Todo eso vive en
// `lib/notariales/editor-tramos.ts`, que corre con `node` y tiene 60
// verificaciones:
//
//   · `desde` no se teclea: se deriva del `hasta` anterior, así que el hueco y
//     el solape NO SE PUEDEN ESCRIBIR. No hay validación que los cace porque no
//     existen.
//   · el orden es canónico, así que «insertar en medio» no es una operación:
//     da igual dónde se añada la fila.
//   · las dos severidades —INCOMPLETA y ERROR— y el tono las decide
//     `resumenParaPantalla`. Una tabla a medias no está rota, está a medias.
//   · la unidad de los límites se declara UNA VEZ por tabla.
//
// > Si para saber si el editor es correcto hay que abrirlo, está mal diseñado.
//
// Lo único que esta pantalla puede hacer mal es ser incómoda.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  navy: '#0D2D5E', muted: '#64748B', line: '#CBD5E1', soft: '#F8FAFC',
  ok: '#15803D', aviso: '#B45309', mal: '#B91C1C',
};

const MODOS: { valor: ModoTramo; label: string; ayuda: string }[] = [
  { valor: 'FIJO', label: 'Valor fijo', ayuda: 'pesos del tramo, sin mirar la base' },
  { valor: 'TASA_SOBRE_TOTAL', label: 'Tasa sobre el total', ayuda: 'se aplica a la base completa' },
  { valor: 'TASA_MARGINAL', label: 'Tasa marginal', ayuda: 'solo al excedente del tramo' },
];
const UNIDADES: UnidadValor[] = ['PESOS', 'PORCENTAJE', 'POR_MIL'];

const entrada: React.CSSProperties = {
  font: 'inherit', padding: '7px 9px', border: `1.5px solid ${C.line}`,
  borderRadius: 8, width: '100%', minWidth: 0,
};

export function EditorTramos({
  clave, label, tramosGuardados, guardar, guardando,
}: {
  clave: string;
  label: string;
  tramosGuardados: Tramo[];
  guardar: (tramos: Tramo[]) => void;
  guardando: boolean;
}) {
  const inicial = filasDesdeTramos(tramosGuardados);
  const [filas, setFilas] = useState<FilaEditor[]>(inicial.filas);
  const [enUvt, setEnUvt] = useState(inicial.forma.enUvt);

  /* TODO el diagnóstico sale del módulo hoja, en cada tecla. La pantalla no
   * guarda estado de validez: lo recalcula, porque el estado duplicado es lo
   * que se desincroniza. */
  const r: Resultado = tramosDesdeFilas(filas, { enUvt, etiqueta: label });
  const resumen = resumenParaPantalla(r);
  const tono = resumen.tono === 'MAL' ? C.mal : resumen.tono === 'A_MEDIAS' ? C.aviso : C.ok;

  const set = (i: number, campo: keyof FilaEditor) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilas(f => f.map((x, k) => (k === i ? { ...x, [campo]: e.target.value } : x)));

  const avisosDe = (i: number) => r.avisos.filter(a => a.fila === i);
  const avisosTabla = r.avisos.filter(a => a.fila === null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── La unidad, UNA VEZ por tabla ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: C.navy, fontWeight: 700, fontSize: '0.84rem' }}>
          Los límites de esta tabla están en
        </span>
        {([false, true] as const).map(v => (
          <label key={String(v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            border: `1.5px solid ${enUvt === v ? C.navy : C.line}`, borderRadius: 9,
            padding: '5px 11px', fontWeight: 700, fontSize: '0.84rem',
            color: enUvt === v ? C.navy : C.muted,
          }}>
            <input type="radio" name={`uvt-${clave}`} checked={enUvt === v}
              onChange={() => setEnUvt(v)} />
            {v ? 'UVT' : 'pesos'}
          </label>
        ))}
      </div>
      <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
        Lo dice la resolución: «$» o «UVT». No se elige por costumbre — leer en pesos una tabla en
        UVT corre la frontera unas cincuenta mil veces.
      </p>

      {/* ── Las filas. Solo `hasta` y el valor ─────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filas.map((f, i) => {
          const malos = avisosDe(i).filter(a => a.severidad === 'ERROR');
          const medias = avisosDe(i).filter(a => a.severidad === 'INCOMPLETA');
          const borde = malos.length ? C.mal : medias.length ? C.aviso : C.line;
          /* El `desde` se MUESTRA, derivado, y no se puede escribir: es la forma
           * de que se vea que no hay hueco sin ofrecer dónde crearlo. */
          const derivado = r.tramos[i];
          return (
            <div key={i} style={{
              border: `1.5px solid ${borde}`, borderRadius: 11, padding: '9px 11px',
              background: '#fff', display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {derivado ? `desde ${derivado.desde}` : `tramo ${i + 1}`}
                </span>
                <input value={f.hasta === null ? '' : String(f.hasta)}
                  onChange={e => setFilas(x => x.map((y, k) => (k === i ? { ...y, hasta: e.target.value } : y)))}
                  placeholder="hasta…" inputMode="decimal" style={entrada} aria-label={`Hasta, tramo ${i + 1}`} />
                <input value={String(f.valor)} onChange={set(i, 'valor')}
                  placeholder="valor" inputMode="decimal" style={entrada} aria-label={`Valor, tramo ${i + 1}`} />
                <select value={f.unidad} onChange={set(i, 'unidad')} style={entrada} aria-label={`Unidad, tramo ${i + 1}`}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u === 'POR_MIL' ? 'por mil' : u.toLowerCase()}</option>)}
                </select>
                <button type="button" onClick={() => setFilas(x => x.filter((_, k) => k !== i))}
                  title="Quitar este tramo"
                  style={{ border: `1.5px solid ${C.line}`, background: '#fff', borderRadius: 8, padding: 6, cursor: 'pointer', color: C.muted }}>
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={f.modo_calculo} onChange={set(i, 'modo_calculo')}
                  style={{ ...entrada, width: 'auto' }} aria-label={`Modo, tramo ${i + 1}`}>
                  {MODOS.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                </select>
                <span style={{ color: C.muted, fontSize: '0.76rem' }}>
                  {MODOS.find(m => m.valor === f.modo_calculo)?.ayuda}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.hasta === null}
                    onChange={e => setFilas(x => x.map((y, k) => (k === i ? { ...y, hasta: e.target.checked ? null : '' } : y)))} />
                  y de ahí para arriba
                </label>
              </div>

              {/* Los avisos de la fila, con su severidad. El texto es del
                  módulo hoja: la pantalla no redacta diagnósticos. */}
              {avisosDe(i).map((a, n) => (
                <p key={n} style={{
                  margin: 0, fontSize: '0.78rem', lineHeight: 1.45,
                  color: a.severidad === 'ERROR' ? C.mal : C.aviso,
                  fontWeight: a.severidad === 'ERROR' ? 700 : 400,
                }}>
                  {a.severidad === 'ERROR' ? '✗ ' : '· '}{a.mensaje}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={() => setFilas(f => [...f, filaNueva('FIJO', 'PESOS')])}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          border: `1.5px dashed ${C.line}`, background: C.soft, borderRadius: 10,
          padding: '9px', font: 'inherit', fontWeight: 700, color: C.navy, cursor: 'pointer',
        }}>
        <Plus size={16} /> Añadir un tramo
      </button>

      {/* ── El estado de la tabla, con el tono que decide el módulo ────── */}
      <div style={{
        border: `1.5px solid ${tono}`, borderRadius: 10, padding: '9px 11px',
        background: resumen.tono === 'OK' ? '#F0FDF4' : resumen.tono === 'A_MEDIAS' ? '#FFFBEB' : '#FEF2F2',
      }}>
        <div style={{ color: tono, fontWeight: 800, fontSize: '0.85rem' }}>{resumen.texto}</div>
        {avisosTabla.map((a, n) => (
          <p key={n} style={{ margin: '4px 0 0', fontSize: '0.79rem', color: tono, lineHeight: 1.45 }}>
            {a.severidad === 'ERROR' ? '✗ ' : '· '}{a.mensaje}
          </p>
        ))}
      </div>

      {/* ── Guardar. Solo si la tabla se puede liquidar ────────────────── */}
      <button type="button" disabled={!r.liquidable || guardando}
        onClick={() => guardar(r.tramos)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: r.liquidable ? C.navy : C.line, color: '#fff', border: 'none',
          borderRadius: 10, padding: '11px', font: 'inherit', fontWeight: 800,
          cursor: r.liquidable ? 'pointer' : 'not-allowed',
        }}>
        {guardando ? <Loader2 size={16} /> : <Check size={16} />} Guardar la tabla completa
      </button>
      {!r.liquidable && (
        <p style={{ margin: 0, color: C.muted, fontSize: '0.78rem', lineHeight: 1.5 }}>
          {/* El botón apagado SIN decir por qué es un botón muerto. El por qué
              está arriba, enumerado, y aquí se dice que ahí está. */}
          La tabla se guarda completa o no se guarda: una tabla a medias tendría un hueco, y un
          hueco da una cifra plausible y equivocada. Arriba está lo que falta.
        </p>
      )}
    </div>
  );
}
