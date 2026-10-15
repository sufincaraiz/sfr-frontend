'use client';

import { useCallback, useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import FormularioEvidencia from './FormularioEvidencia';
import {
  AlertTriangle, ArrowLeft, Check, FileUp, Loader2, Lock, ShieldCheck, Unlock, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CARGA DE PARÁMETROS NOTARIALES — pensada para usarse con el PDF al lado
//
// Decisiones de esta pantalla, que no son estéticas:
//
//  · ORDEN DEL DOCUMENTO, no del modelo. Las cifras salen en el orden del
//    bloque de transcripción, que es el orden en que están en la resolución.
//    Y cada campo dice a qué artículo ir: eso es NAVEGACIÓN, no un campo —el
//    artículo que se teclea es el del respaldo, una vez por respaldo—.
//
//  · LA UNIDAD, PEGADA AL CAMPO. Un 3 cargado pensando «por mil» y guardado
//    como «por ciento» es un error de diez veces que da una cifra plausible.
//    En una leyenda aparte nadie la mira.
//
//  · SE GUARDA POR SECCIÓN. 53 cifras en 14 conceptos no son un formulario:
//    son una sesión larga. Con un «Guardar» al final, un navegador que se cae
//    cuesta la mañana.
//
// ⚠⚠ Y LA RESTRICCIÓN QUE NO SE PUEDE RELAJAR:
//
//    ESTA PANTALLA MUESTRA EL VEREDICTO DEL COTEJO, NUNCA LA CIFRA TRANSCRITA.
//
// Cuando algo difiere dice QUÉ difiere y EN QUÉ ARTÍCULO MIRAR. No dice
// «esperaba 28.900». Si lo dijera, se copiaría el número y el cotejo dejaría de
// comparar dos lecturas del PDF para comparar una consigo misma: habría costado
// el trabajo de construirlo y no detectaría nada.
//
// Si alguien quiere «mejorarlo» añadiendo el valor esperado al mensaje para que
// sea más útil: eso es exactamente lo que no se puede hacer. El servidor no lo
// manda —ver `veredictoPorSeccion` en cotejo.ts— y hay una verificación en el
// arnés que serializa el veredicto y comprueba que ninguna cifra del documento
// aparezca en él.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B',
  ok: '#15803D', okBg: '#DCFCE7', warn: '#B45309', warnBg: '#FEF3C7',
  bad: '#B91C1C', badBg: '#FEF2F2',
};

type Estado = 'COINCIDE' | 'DIFIERE' | 'SIN_TRANSCRIBIR' | 'SIN_CARGAR';

interface Campo {
  concepto: string; label: string; campo: string;
  articulo_navegacion: string;
  valor: string | null; unidad: string | null;
  tipo: string; ayuda: string | null; dueno: string; unidad_esperada: string;
}
interface VeredictoCampo { concepto: string; campo: string; estado: Estado; mirar_en: string; difiere_en: string[] }
interface VeredictoSeccion {
  concepto: string; total: number; coinciden: number; difieren: number;
  sin_transcribir: number; sin_cargar: number; campos: VeredictoCampo[];
}
interface Pantalla {
  anio: number; estado: string; cerrado: boolean; version: number;
  uvt: string | null; uvb: string | null; tarifa_iva: string | null;
  campos: Campo[];
  conceptos: { clave: string; label: string; tipo: string; grupo: string; exigidos: string[]; dueno: string;
    respaldos: { campo: string; norma: string; articulo: string | null; tipo_evidencia: string }[] }[];
  pendientes: { total: number; porDueno: { dueno: string; etiqueta: string; cantidad: number; items: string[] }[] };
  incoherencia: string | null;
  veredicto: VeredictoSeccion[];
  avance: { cargadas: number; total: number; porcentaje: number };
  aviso_uvt: string | null;
  criterios_adoptados: { clave: string; criterio: string; porque: string; adoptado_por: string }[];
  /* Las fuentes dadas de alta: el respaldo de un documento archivado tiene que
   * nombrar su autoridad, porque un papel no trae dominio del que deducirla. */
  fuentes: { dominio: string; entidad: string; es_compilacion: boolean; advertencia: string | null }[];
  respaldos_anio: { campo: string; norma: string; articulo: string | null; tipo_evidencia: string }[];
}

const DUENO: Record<string, string> = {
  titular: 'tú, con la resolución',
  contador: 'el contador',
  entidad: 'la entidad que lo expide',
};

export default function CargaNotarialPage({ params }: { params: Promise<{ anio: string }> }) {
  const { anio } = use(params);
  const [p, setP] = useState<Pantalla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    const res = await fetch(`/api/admin/notariales/${anio}`);
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (res.status === 404) { setError(`El año ${anio} no está sembrado.`); setCargando(false); return; }
    const j = await res.json();
    if (!res.ok) setError(j.error ?? 'El servidor respondió un error sin mensaje.'); else setP(j);
    setCargando(false);
  }, [anio]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Guarda UNA sección y recibe la pantalla recalculada, con su veredicto. */
  async function guardarSeccion(cuerpo: Record<string, unknown>, marca: string) {
    setGuardando(marca); setError('');
    const res = await fetch(`/api/admin/notariales/${anio}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const j = await res.json();
    setGuardando(null);
    if (!res.ok) {
      // Tal cual lo manda el servidor: él clasificó la causa.
      setError(j.error ?? 'El servidor respondió un error sin mensaje.');
      return;
    }
    setP(j);
    // Lo guardado deja de ser borrador local: lo que se ve viene ya del servidor.
    setBorrador(b => {
      const limpio = { ...b };
      for (const k of Object.keys(limpio)) if (k.startsWith(`${marca}·`)) delete limpio[k];
      return limpio;
    });
  }

  async function accion(accion: 'activar' | 'borrador') {
    setGuardando(accion); setError('');
    const res = await fetch(`/api/admin/notariales/${anio}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    });
    const j = await res.json();
    setGuardando(null);
    if (!res.ok) { setError(j.error ?? 'El servidor respondió un error sin mensaje.'); return; }
    setP(j);
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={26} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
        <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }
  if (!p) {
    return (
      <div style={{ maxWidth: 760 }}>
        <Aviso tono="bad" titulo="No se pudo abrir el año">{error}</Aviso>
        <Link href="/admin/notariales" style={{ color: C.blue, fontSize: '0.88rem' }}>← Volver</Link>
      </div>
    );
  }

  const activo = p.estado === 'ACTIVO';
  const editable = !activo && !p.cerrado;
  const porConcepto = new Map(p.veredicto.map(v => [v.concepto, v]));
  const secciones = [...new Set(p.campos.map(c => c.concepto))];

  return (
    <div style={{ maxWidth: 940, paddingBottom: '5rem' }}>
      <Link href="/admin/notariales" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.blue, fontSize: '0.85rem', textDecoration: 'none', marginBottom: 12 }}>
        <ArrowLeft size={15} /> Años tarifarios
      </Link>

      {/* ── Cabecera: avance y estado ─────────────────────────────────── */}
      <Tarjeta>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ color: C.navy, fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{p.anio}</h2>
          <Chip tono={activo ? 'ok' : 'warn'}>{p.cerrado ? 'CERRADO' : p.estado}</Chip>
          <span style={{ color: C.muted, fontSize: '0.78rem' }}>versión {p.version}</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 5 }}>
            <span style={{ color: C.navy, fontWeight: 700 }}>
              {p.avance.cargadas} de {p.avance.total} cifras cargadas
            </span>
            <span style={{ color: C.muted }}>{p.avance.porcentaje} %</span>
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(p.avance.porcentaje, 1)}%`, height: '100%', background: C.blue, borderRadius: 999 }} />
          </div>
        </div>
      </Tarjeta>

      {error && <Aviso tono="bad" titulo="El servidor rechazó la operación">{error}</Aviso>}

      {p.incoherencia && (
        <Aviso tono="bad" titulo="El esquema se contradice">
          {p.incoherencia}
          <div style={{ marginTop: 6, fontSize: '0.8rem' }}>
            Esto no espera a nadie: está mal cargado y hay que corregirlo.
          </div>
        </Aviso>
      )}
      {p.aviso_uvt && <Aviso tono="warn" titulo="El UVT no coincide con el del módulo fiscal">{p.aviso_uvt}</Aviso>}

      {/* ── Pendientes, por dueño ─────────────────────────────────────── */}
      <Tarjeta>
        <div style={{ color: C.navy, fontWeight: 800, fontSize: '0.92rem', marginBottom: 2 }}>
          Para poder activar
        </div>
        <p style={{ color: C.muted, fontSize: '0.8rem', margin: '0 0 10px' }}>
          Separado por de quién es la pelota. El total es solo la suma.
        </p>
        {p.pendientes.porDueno.length === 0 ? (
          <div style={{ color: C.ok, fontSize: '0.88rem', fontWeight: 700 }}>No falta nada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {p.pendientes.porDueno.map(d => (
              <details key={d.dueno}>
                <summary style={{ cursor: 'pointer', color: C.navy, fontSize: '0.87rem', fontWeight: 700 }}>
                  {d.cantidad} {d.etiqueta} <span style={{ color: C.muted, fontWeight: 400 }}>— {DUENO[d.dueno] ?? d.dueno}</span>
                </summary>
                <ul style={{ margin: '7px 0 0 18px', padding: 0, color: C.muted, fontSize: '0.81rem', lineHeight: 1.6 }}>
                  {d.items.map((i, n) => <li key={n}>{i}</li>)}
                </ul>
              </details>
            ))}
            <div style={{ color: C.muted, fontSize: '0.78rem', borderTop: `1px solid ${C.line}`, paddingTop: 7 }}>
              {p.pendientes.total} en total
            </div>
          </div>
        )}
      </Tarjeta>

      {/* ── Las secciones, en el orden del documento ──────────────────── */}
      {secciones.map(concepto => {
        const campos = p.campos.filter(c => c.concepto === concepto);
        const v = porConcepto.get(concepto);
        const label = campos[0]?.label ?? concepto;
        const esTramos = campos.some(c => c.campo.startsWith('tramo.'));
        const marca = `concepto:${concepto}`;

        return (
          <Tarjeta key={concepto}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ color: C.navy, fontWeight: 800, fontSize: '0.95rem' }}>{label}</div>
              {v && <Veredicto v={v} />}
            </div>
            {campos[0]?.ayuda && (
              <p style={{ color: C.muted, fontSize: '0.8rem', margin: '0 0 10px', lineHeight: 1.5 }}>{campos[0].ayuda}</p>
            )}
            {esTramos && (
              <p style={{ color: C.muted, fontSize: '0.78rem', margin: '0 0 10px' }}>
                Los tramos se guardan como tabla completa: una tabla a medias tendría un hueco, y un
                hueco da una cifra plausible y equivocada.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {campos.map(c => {
                const llave = `${marca}·${c.campo}`;
                const vc = v?.campos.find(x => x.campo === c.campo);
                return (
                  <div key={c.campo} style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ width: 168, color: C.navy, fontSize: '0.84rem', fontWeight: 600 }}>{c.campo}</span>
                    {/* NAVEGACIÓN: a qué artículo ir. No se teclea. */}
                    <span style={{ color: C.muted, fontSize: '0.76rem', width: 128 }}>{c.articulo_navegacion}</span>
                    <input
                      value={borrador[llave] ?? c.valor ?? ''}
                      disabled={!editable}
                      placeholder=""
                      onChange={e => setBorrador(b => ({ ...b, [llave]: e.target.value }))}
                      style={{
                        padding: '7px 10px', border: `1.5px solid ${C.line}`, borderRadius: 8,
                        fontSize: '0.86rem', color: C.navy, fontWeight: 700, width: 128, fontFamily: 'inherit',
                        background: editable ? '#fff' : '#F8FAFC',
                      }}
                    />
                    {/* La unidad, AL LADO del campo. */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em',
                      color: C.blue, background: '#EFF6FF', padding: '3px 7px', borderRadius: 6,
                    }}>
                      {c.unidad_esperada}
                    </span>
                    {vc && <Icono estado={vc.estado} difiereEn={vc.difiere_en} mirarEn={vc.mirar_en} />}
                  </div>
                );
              })}
            </div>

            {editable && (
              <button
                onClick={() => {
                  const campos2: Record<string, string> = {};
                  for (const [k, val] of Object.entries(borrador)) {
                    if (k.startsWith(`${marca}·`)) campos2[k.split('·')[1]!] = val;
                  }
                  if (!Object.keys(campos2).length) return;
                  // El año tiene sus propios campos; los conceptos van por clave.
                  if (concepto === '(anio)') {
                    guardarSeccion({ seccion: 'anio', campos: campos2 }, marca);
                  } else if (esTramos) {
                    setError(
                      'Los tramos todavía no se editan desde aquí: se cargan con el script de siembra ' +
                      'o se añade el editor de tabla. No se guarda una tabla a medias.',
                    );
                  } else {
                    guardarSeccion({ seccion: 'concepto', clave: concepto, campos: campos2 }, marca);
                  }
                }}
                disabled={guardando === marca}
                style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 9, border: 'none',
                  background: C.navy, color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  cursor: guardando === marca ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {guardando === marca ? 'Guardando…' : 'Guardar esta sección'}
              </button>
            )}

            {/* EL RESPALDO, EN LA MISMA TARJETA QUE LA CIFRA.
                No en una pantalla aparte: la cifra y de dónde salió se cargan
                con el mismo PDF delante, y separarlos invita a cargar
                diecinueve cifras y dejar los respaldos «para después». */}
            {editable && (
              <FormularioEvidencia
                ambito={concepto === '(anio)' ? 'ANIO' : 'CONCEPTO'}
                clave={concepto === '(anio)' ? undefined : concepto}
                campos={campos.map(c => c.campo)}
                fuentes={p.fuentes ?? []}
                respaldos={concepto === '(anio)'
                  ? (p.respaldos_anio ?? [])
                  : (p.conceptos.find(c => c.clave === concepto)?.respaldos ?? [])}
                guardar={guardarSeccion}
                guardando={guardando}
              />
            )}
          </Tarjeta>
        );
      })}

      {/* ── Criterios adoptados: NO son tarifas ───────────────────────── */}
      <Tarjeta borde={C.warn}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.warn, fontWeight: 800, fontSize: '0.92rem' }}>
          <ShieldCheck size={17} /> Criterios adoptados por Su Finca Raíz
        </div>
        <p style={{ color: C.muted, fontSize: '0.8rem', margin: '4px 0 10px', lineHeight: 1.5 }}>
          Esto <strong>no es contenido de la norma</strong>: es lo que la norma no define y nosotros
          decidimos. Se lee distinto de una tarifa a propósito.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.criterios_adoptados.map(c => (
            <div key={c.clave}>
              <div style={{ color: C.navy, fontSize: '0.85rem', fontWeight: 700 }}>{c.criterio}</div>
              <div style={{ color: C.muted, fontSize: '0.79rem', lineHeight: 1.5 }}>{c.porque}</div>
            </div>
          ))}
        </div>
      </Tarjeta>

      {/* ── Activar ───────────────────────────────────────────────────── */}
      <Tarjeta>
        <div style={{ color: C.navy, fontWeight: 800, fontSize: '0.92rem', marginBottom: 8 }}>
          {activo ? 'Año activo' : 'Activar el año'}
        </div>
        {activo ? (
          <>
            <p style={{ color: C.muted, fontSize: '0.82rem', margin: '0 0 10px', lineHeight: 1.5 }}>
              Un año activo no se edita: cambiar una tarifa en caliente movería cifras que ya se
              están publicando. Para corregir algo hay que devolverlo a borrador, y eso queda
              registrado.
            </p>
            <button onClick={() => accion('borrador')} disabled={guardando === 'borrador'}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${C.warn}`, background: '#fff', color: C.warn, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Unlock size={15} /> Devolver a borrador
            </button>
          </>
        ) : (
          <>
            {p.pendientes.total > 0 && (
              <p style={{ color: C.warn, fontSize: '0.83rem', margin: '0 0 10px', lineHeight: 1.5 }}>
                No se puede activar: faltan {p.pendientes.total} cosas, y están arriba separadas por
                de quién son.
              </p>
            )}
            {p.veredicto.some(v => v.difieren > 0) && (
              <p style={{ color: C.bad, fontSize: '0.83rem', margin: '0 0 10px', lineHeight: 1.5 }}>
                Y hay cifras en las que las dos lecturas del PDF no coinciden. Eso se resuelve
                volviendo al documento, no activando.
              </p>
            )}
            <button
              onClick={() => accion('activar')}
              disabled={guardando === 'activar' || p.pendientes.total > 0 || !!p.incoherencia}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10,
                border: 'none', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
                background: p.pendientes.total > 0 || p.incoherencia ? '#E2E8F0' : C.navy,
                color: p.pendientes.total > 0 || p.incoherencia ? C.muted : '#fff',
                cursor: p.pendientes.total > 0 || p.incoherencia ? 'not-allowed' : 'pointer',
              }}
            >
              <Lock size={15} /> Activar {p.anio}
            </button>
          </>
        )}
      </Tarjeta>

      <p style={{ color: C.muted, fontSize: '0.78rem', marginTop: '1.25rem', lineHeight: 1.6 }}>
        <FileUp size={13} style={{ verticalAlign: -2 }} /> La evidencia de cada cifra —el PDF de la
        resolución, con su hash y su procedencia— se sube por respaldo. El documento queda archivado
        de forma autenticada y <strong>no se publica</strong>: una copia pública de una norma que no
        emitimos nos convertiría en un sitio desde el que citarla.
      </p>
    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function Tarjeta({ children, borde }: { children: React.ReactNode; borde?: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${borde ?? C.line}`, borderRadius: 14, padding: '1.1rem 1.25rem', marginBottom: '1rem' }}>
      {children}
    </div>
  );
}

function Chip({ children, tono }: { children: React.ReactNode; tono: 'ok' | 'warn' | 'bad' }) {
  const fondo = tono === 'ok' ? C.okBg : tono === 'warn' ? C.warnBg : C.badBg;
  const color = tono === 'ok' ? C.ok : tono === 'warn' ? C.warn : C.bad;
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 999, background: fondo, color }}>
      {children}
    </span>
  );
}

function Aviso({ titulo, children, tono }: { titulo: string; children: React.ReactNode; tono: 'warn' | 'bad' }) {
  const fondo = tono === 'bad' ? C.badBg : C.warnBg;
  const borde = tono === 'bad' ? '#FCA5A5' : '#FCD34D';
  const color = tono === 'bad' ? '#7F1D1D' : '#78350F';
  return (
    <div role="alert" style={{ background: fondo, border: `2px solid ${borde}`, color, borderRadius: 14, padding: '0.9rem 1.1rem', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <AlertTriangle size={17} /> {titulo}
      </strong>
      {children}
    </div>
  );
}

/** El recuento de la sección. Cifras del cotejo, no del documento. */
function Veredicto({ v }: { v: VeredictoSeccion }) {
  if (v.difieren > 0) return <Chip tono="bad">{v.difieren} no coinciden</Chip>;
  if (v.sin_transcribir > 0) return <Chip tono="warn">{v.sin_transcribir} sin transcribir</Chip>;
  if (v.coinciden === v.total) return <Chip tono="ok">{v.coinciden} de {v.total} coinciden</Chip>;
  return <Chip tono="warn">{v.coinciden} de {v.total} coinciden</Chip>;
}

/**
 * El icono por campo. Al pasar el ratón dice QUÉ difiere y DÓNDE mirar.
 * Nunca qué se esperaba: ver el aviso de la cabecera de este archivo.
 */
function Icono({ estado, difiereEn, mirarEn }: { estado: Estado; difiereEn: string[]; mirarEn: string }) {
  // El texto va en un `span` con `title` y `aria-label`: un `title` dentro del
  // SVG no lo anuncia el lector de pantalla y lucide no lo acepta.
  if (estado === 'COINCIDE') {
    return (
      <span title="Las dos lecturas del PDF coinciden" aria-label="coincide" style={{ display: 'inline-flex' }}>
        <Check size={16} style={{ color: C.ok }} />
      </span>
    );
  }
  if (estado === 'DIFIERE') {
    const texto = `No coincide con la transcripción en: ${difiereEn.join(', ')}. Vuelve a ${mirarEn}.`;
    return (
      <span title={texto} aria-label={texto} style={{ display: 'inline-flex' }}>
        <X size={16} style={{ color: C.bad }} />
      </span>
    );
  }
  if (estado === 'SIN_TRANSCRIBIR') {
    const texto = 'Cargado sin transcribir: una sola lectura, o ninguna.';
    return (
      <span title={texto} aria-label={texto} style={{ display: 'inline-flex' }}>
        <AlertTriangle size={15} style={{ color: C.warn }} />
      </span>
    );
  }
  return <span style={{ color: C.line, fontSize: '0.9rem' }} title="Sin cargar" aria-label="sin cargar">·</span>;
}
