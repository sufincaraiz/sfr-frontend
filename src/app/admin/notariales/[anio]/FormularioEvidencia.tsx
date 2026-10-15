'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Check, FileUp, Loader2, Link2, FileText, Copy } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// EL RESPALDO DE UNA CIFRA — URL oficial, o documento archivado
//
// Ninguna cifra se activa sin esto. El formulario no reimplementa las reglas:
// las exige el servidor en `exigirRespaldoOficial`, y aquí se muestran para que
// se vean antes de pelearse con un error. Si el servidor rechaza, su mensaje se
// enseña tal cual: él sabe por qué.
//
// ⚠⚠ LA HUELLA ES DEL CONTENIDO DEL PDF, Y SE PUEDE COMPROBAR SIN NOSOTROS.
//
// El archivo viaja como bytes y se hashea tal como llegó, antes de subir nada
// —ver `evidencia.ts`—. No hay normalización, ni re-guardado, ni lectura en
// modo texto en medio. Por eso esta pantalla MUESTRA la huella y el comando
// para calcularla por fuera: cualquiera con el mismo PDF tiene que obtener los
// mismos 64 dígitos sin tener nuestro código.
//
// No es un detalle de interfaz. El 2026-10-14 perdimos medio día y dos
// despliegues porque una huella se calculó sobre la superficie —los finales de
// línea de una copia— en vez de sobre el contenido. Una huella que solo nuestro
// código puede reproducir no sirve de evidencia: es un número.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B',
  ok: '#15803D', okBg: '#DCFCE7', warn: '#B45309', warnBg: '#FEF3C7',
  bad: '#B91C1C', badBg: '#FEF2F2',
};

export interface FuentePantalla {
  dominio: string; entidad: string; es_compilacion: boolean; advertencia: string | null;
}

export interface RespaldoVisible {
  campo: string; norma: string; articulo: string | null; tipo_evidencia: string;
}

/** Lo que el formulario manda. Los nombres son los de `Respaldo` en tipos.ts. */
interface Archivado {
  documento_ruta: string;
  documento_hash: string;
  bytes: number;
  archivado_por: string;
  nombre: string;
}

export default function FormularioEvidencia({
  ambito, clave, campos, fuentes, respaldos, guardar, guardando,
}: {
  ambito: 'ANIO' | 'CONCEPTO' | 'REGLA_RETENCION';
  clave?: string;
  /** Los campos de esta sección que pueden llevar respaldo. */
  campos: string[];
  fuentes: FuentePantalla[];
  respaldos: RespaldoVisible[];
  guardar: (cuerpo: Record<string, unknown>, marca: string) => Promise<void>;
  guardando: string | null;
}) {
  const marca = `respaldo·${ambito}·${clave ?? '-'}`;
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<'URL_OFICIAL' | 'DOCUMENTO_ARCHIVADO'>('URL_OFICIAL');
  const [f, setF] = useState<Record<string, string>>({});
  const [archivado, setArchivado] = useState<Archivado | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setF(v => ({ ...v, [k]: e.target.value }));

  /**
   * Sube el PDF y se queda con la ruta y la huella. El archivo NO se vuelve a
   * tocar después: lo que se guarda en el respaldo es exactamente lo que el
   * servidor calculó sobre los bytes que recibió.
   */
  async function subir(file: File) {
    setSubiendo(true); setErrorArchivo(''); setArchivado(null);
    const cuerpo = new FormData();
    cuerpo.append('archivo', file);
    const res = await fetch('/api/admin/notariales/evidencia', { method: 'POST', body: cuerpo });
    const j = await res.json().catch(() => ({ error: 'El servidor no devolvió JSON.' }));
    setSubiendo(false);
    if (!res.ok) { setErrorArchivo(j.error ?? 'No se pudo archivar.'); return; }
    setArchivado({
      documento_ruta: j.ruta, documento_hash: j.hash, bytes: j.bytes,
      archivado_por: j.archivado_por, nombre: file.name,
    });
    /* El tamaño en el nombre no: el nombre del archivo en disco no es un dato
     * del documento y cambiar el nombre no cambia la norma. */
  }

  async function enviar() {
    const respaldo: Record<string, unknown> = {
      campo: f.campo ?? '',
      norma: f.norma ?? '',
      articulo: f.articulo || null,
      tipo_evidencia: tipo,
      caracter: f.caracter || 'EXIGIDO',
      nota: f.nota || null,
      fecha_norma: f.fecha_norma || null,
      vigencia_desde: f.vigencia_desde ?? '',
      vigencia_hasta: f.vigencia_hasta || null,
      articulo_vigencia: f.articulo_vigencia || null,
    };
    if (tipo === 'URL_OFICIAL') {
      respaldo.url = f.url ?? '';
      respaldo.fuente_dominio = f.fuente_dominio || null;
    } else {
      respaldo.url = f.url || null;
      respaldo.fuente_dominio = f.fuente_dominio || null;
      respaldo.documento_ruta = archivado?.documento_ruta ?? null;
      respaldo.documento_hash = archivado?.documento_hash ?? null;
      respaldo.entidad_emisora = f.entidad_emisora || null;
      respaldo.obtenido_de = f.obtenido_de || null;
      respaldo.obtenido_en = f.obtenido_en || null;
      respaldo.archivado_por = archivado?.archivado_por ?? null;
      respaldo.donde_conseguirlo = f.donde_conseguirlo || null;
    }
    await guardar({ seccion: 'respaldo', ambito, clave, respaldo }, marca);
    setF({}); setArchivado(null); setAbierto(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const fuente = fuentes.find(x => x.dominio === f.fuente_dominio);
  const ocupado = guardando === marca;

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, marginTop: '0.9rem', paddingTop: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.8rem', color: C.navy }}>Respaldo normativo</strong>
        {respaldos.length === 0
          ? <span style={{ fontSize: '0.75rem', color: C.warn, fontWeight: 700 }}>
              sin respaldo: estas cifras no se pueden activar
            </span>
          : <span style={{ fontSize: '0.75rem', color: C.muted }}>
              {respaldos.length} cargado(s): {respaldos.map(r => r.campo).join(', ')}
            </span>}
        <button
          type="button" onClick={() => setAbierto(a => !a)}
          style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: C.blue, background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
        >
          {abierto ? 'Cerrar' : 'Añadir respaldo'}
        </button>
      </div>

      {respaldos.length > 0 && (
        <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', fontSize: '0.75rem', color: C.muted }}>
          {respaldos.map(r => (
            <li key={r.campo}>
              <strong>{r.campo}</strong> — {r.norma}{r.articulo ? `, ${r.articulo}` : ''}{' '}
              <span style={{ color: r.tipo_evidencia === 'DOCUMENTO_ARCHIVADO' ? C.navy : C.muted }}>
                ({r.tipo_evidencia === 'DOCUMENTO_ARCHIVADO' ? 'documento archivado' : 'url oficial'})
              </span>
            </li>
          ))}
        </ul>
      )}

      {!abierto ? null : (
        <div style={{ marginTop: '0.9rem', background: '#F8FAFC', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: '0.9rem' }}>
            {([
              ['URL_OFICIAL', 'URL oficial', Link2],
              ['DOCUMENTO_ARCHIVADO', 'Documento archivado', FileText],
            ] as const).map(([v, label, Icono]) => (
              <button
                key={v} type="button" onClick={() => setTipo(v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700,
                  padding: '6px 11px', borderRadius: 9, cursor: 'pointer',
                  border: `2px solid ${tipo === v ? C.blue : C.line}`,
                  background: tipo === v ? '#EFF6FF' : '#fff', color: tipo === v ? C.blue : C.muted,
                }}
              >
                <Icono size={14} /> {label}
              </button>
            ))}
          </div>

          <Nota>
            {tipo === 'URL_OFICIAL'
              ? 'La URL tiene que ser https y de un dominio dado de alta como fuente OFICIAL. Si la fuente es una compilación, la nota es obligatoria.'
              : 'Para un documento archivado hacen falta SEIS datos además del archivo: entidad que lo emitió, de dónde se obtuvo, cuándo, quién lo archivó, su huella y DÓNDE LO CONSIGUE EL LECTOR. Lo último no es un adorno: el PDF de la simulación no puede enlazar nuestra copia.'}
          </Nota>

          <Rejilla>
            <Campo label="Campo que respalda" ancho>
              <select value={f.campo ?? ''} onChange={set('campo')} style={entrada}>
                <option value="">— elige el campo —</option>
                {campos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo label="Norma" ancho ayuda="Como la nombra el propio documento.">
              <input value={f.norma ?? ''} onChange={set('norma')} placeholder="RES-2026-000964-6" style={entrada} />
            </Campo>
            <Campo label="Artículo de la cifra" ayuda="Donde está el número, no el de vigencia.">
              <input value={f.articulo ?? ''} onChange={set('articulo')} placeholder="art. 50" style={entrada} />
            </Campo>
            <Campo label="Carácter" ayuda="¿La norma lo EXIGE, o lo permite y lo adoptamos?">
              <select value={f.caracter ?? 'EXIGIDO'} onChange={set('caracter')} style={entrada}>
                <option value="EXIGIDO">La norma lo exige</option>
                <option value="ADOPTADO">La norma lo permite y lo adoptamos</option>
              </select>
            </Campo>
            <Campo label="Rige desde" ayuda="Obligatorio. No es el 1 de enero por defecto.">
              <input type="date" value={f.vigencia_desde ?? ''} onChange={set('vigencia_desde')} style={entrada} />
            </Campo>
            <Campo label="Rige hasta" ayuda="En blanco si sigue vigente.">
              <input type="date" value={f.vigencia_hasta ?? ''} onChange={set('vigencia_hasta')} style={entrada} />
            </Campo>
            <Campo label="Artículo de vigencia" ancho
              ayuda="El que dice desde cuándo rige. Puede estar derogado por otro documento que él no menciona: pasó con el art. 29 registral.">
              <input value={f.articulo_vigencia ?? ''} onChange={set('articulo_vigencia')} placeholder="art. 56" style={entrada} />
            </Campo>
            <Campo label="Fecha de la norma">
              <input type="date" value={f.fecha_norma ?? ''} onChange={set('fecha_norma')} style={entrada} />
            </Campo>
            <Campo label="Autoridad (fuente dada de alta)" ancho>
              <select value={f.fuente_dominio ?? ''} onChange={set('fuente_dominio')} style={entrada}>
                <option value="">— elige la autoridad —</option>
                {fuentes.map(x => (
                  <option key={x.dominio} value={x.dominio}>
                    {x.entidad} ({x.dominio}){x.es_compilacion ? ' — compilación' : ''}
                  </option>
                ))}
              </select>
            </Campo>
          </Rejilla>

          {fuente?.es_compilacion && (
            <Aviso>
              <strong>{fuente.entidad} es una compilación.</strong> {fuente.advertencia ?? ''}{' '}
              La nota de abajo es obligatoria: qué edición se consultó, dónde está el texto auténtico
              y qué erratas tiene.
            </Aviso>
          )}

          {tipo === 'URL_OFICIAL' ? (
            <Rejilla>
              <Campo label="URL oficial" ancho>
                <input value={f.url ?? ''} onChange={set('url')} placeholder="https://…" style={entrada} />
              </Campo>
              <Campo label="Nota" ancho ayuda="Obligatoria si la fuente es una compilación.">
                <textarea value={f.nota ?? ''} onChange={set('nota')} rows={2} style={{ ...entrada, resize: 'vertical' }} />
              </Campo>
            </Rejilla>
          ) : (
            <>
              <div style={{ margin: '0.9rem 0' }}>
                <input
                  ref={fileRef} type="file" accept="application/pdf"
                  onChange={e => { const x = e.target.files?.[0]; if (x) subir(x); }}
                  style={{ display: 'none' }} id={`pdf-${marca}`}
                />
                <label
                  htmlFor={`pdf-${marca}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: C.blue, borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}
                >
                  {subiendo ? <Loader2 size={15} className="gira" /> : <FileUp size={15} />}
                  {subiendo ? 'Archivando…' : 'Elegir el PDF de la resolución'}
                </label>
                <span style={{ marginLeft: 10, fontSize: '0.72rem', color: C.muted }}>
                  Máximo 20 MB. Se comprueba que sea un PDF de verdad, no solo la extensión.
                </span>
              </div>

              {errorArchivo && <Aviso malo>{errorArchivo}</Aviso>}

              {archivado && (
                <div style={{ background: C.okBg, border: `1px solid #86EFAC`, borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.ok, fontWeight: 800, fontSize: '0.8rem' }}>
                    <Check size={15} /> {archivado.nombre} — {(archivado.bytes / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <p style={{ margin: '0.5rem 0 0.3rem', fontSize: '0.72rem', color: '#14532D', lineHeight: 1.5 }}>
                    <strong>Huella SHA-256 del contenido del archivo.</strong> Se calculó sobre los bytes
                    que llegaron, antes de guardar nada. Compruébala por fuera con el mismo PDF: tiene
                    que dar estos 64 dígitos sin usar nuestro código.
                  </p>
                  <code style={{ display: 'block', fontSize: '0.68rem', wordBreak: 'break-all', background: '#fff', border: `1px solid #86EFAC`, borderRadius: 7, padding: '7px 9px', color: C.navy, lineHeight: 1.45 }}>
                    {archivado.documento_hash}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(archivado.documento_hash);
                      setCopiado(true); setTimeout(() => setCopiado(false), 1800);
                    }}
                    style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 700, color: C.ok, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <Copy size={12} /> {copiado ? 'copiada' : 'copiar la huella'}
                  </button>
                  <p style={{ margin: '0.6rem 0 0.2rem', fontSize: '0.7rem', color: '#14532D' }}>
                    Para comprobarla con el archivo que tienes en el escritorio:
                  </p>
                  <code style={{ display: 'block', fontSize: '0.68rem', background: '#fff', border: `1px solid #86EFAC`, borderRadius: 7, padding: '6px 9px', color: C.navy }}>
                    certutil -hashfile &quot;{archivado.nombre}&quot; SHA256
                  </code>
                  <code style={{ display: 'block', fontSize: '0.68rem', background: '#fff', border: `1px solid #86EFAC`, borderRadius: 7, padding: '6px 9px', color: C.navy, marginTop: 4 }}>
                    sha256sum &quot;{archivado.nombre}&quot;
                  </code>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.68rem', color: '#166534' }}>
                    El primero es de Windows, el segundo de Linux y macOS. Si no coincide, el archivo
                    que se archivó no es el que tienes: no guardes el respaldo.
                  </p>
                </div>
              )}

              <Rejilla>
                <Campo label="Entidad que lo emitió" ancho ayuda="Como la nombra el documento. Un papel no trae dominio.">
                  <input value={f.entidad_emisora ?? ''} onChange={set('entidad_emisora')} placeholder="Superintendencia de Notariado y Registro" style={entrada} />
                </Campo>
                <Campo label="De dónde se obtuvo" ancho>
                  <input value={f.obtenido_de ?? ''} onChange={set('obtenido_de')} placeholder="Notaría de La Vega, copia impresa" style={entrada} />
                </Campo>
                <Campo label="Cuándo se obtuvo">
                  <input type="date" value={f.obtenido_en ?? ''} onChange={set('obtenido_en')} style={entrada} />
                </Campo>
                <Campo label="Dónde lo consigue el lector" ancho
                  ayuda="Obligatorio. El PDF de la simulación cita la norma y dice dónde conseguirla: nunca enlaza nuestra copia.">
                  <input value={f.donde_conseguirlo ?? ''} onChange={set('donde_conseguirlo')} placeholder="Diario Oficial 53.444, o en cualquier notaría" style={entrada} />
                </Campo>
                <Campo label="Nota" ancho>
                  <textarea value={f.nota ?? ''} onChange={set('nota')} rows={2} style={{ ...entrada, resize: 'vertical' }} />
                </Campo>
              </Rejilla>
            </>
          )}

          <button
            type="button" onClick={enviar} disabled={ocupado || subiendo}
            style={{ marginTop: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 800, color: '#fff', background: ocupado ? C.muted : C.navy, border: 'none', borderRadius: 10, padding: '9px 16px', cursor: ocupado ? 'default' : 'pointer' }}
          >
            {ocupado ? <Loader2 size={15} className="gira" /> : <Check size={15} />}
            Guardar este respaldo
          </button>
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.7rem', color: C.muted, lineHeight: 1.5 }}>
            Se guarda solo esta sección. Si falta algo, el servidor dice exactamente qué: las reglas
            las aplica él y no esta pantalla, para que no haya dos listas que puedan separarse.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

const entrada: React.CSSProperties = {
  width: '100%', fontSize: '0.8rem', padding: '7px 9px', borderRadius: 8,
  border: `1px solid ${C.line}`, color: C.navy, background: '#fff',
};

function Rejilla({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.7rem 0.9rem' }}>
      {children}
    </div>
  );
}

function Campo({ label, ayuda, ancho, children }: {
  label: string; ayuda?: string; ancho?: boolean; children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', gridColumn: ancho ? 'span 2' : undefined }}>
      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: C.navy, marginBottom: 3 }}>
        {label}
      </span>
      {children}
      {ayuda && (
        <span style={{ display: 'block', fontSize: '0.67rem', color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
          {ayuda}
        </span>
      )}
    </label>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 0.9rem', fontSize: '0.73rem', color: C.muted, lineHeight: 1.55 }}>
      {children}
    </p>
  );
}

function Aviso({ children, malo }: { children: React.ReactNode; malo?: boolean }) {
  return (
    <div role="alert" style={{ background: malo ? C.badBg : C.warnBg, border: `1px solid ${malo ? '#FCA5A5' : '#FCD34D'}`, color: malo ? '#7F1D1D' : '#78350F', borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.74rem', lineHeight: 1.5, margin: '0.3rem 0 0.9rem', display: 'flex', gap: 8 }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}
