'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, Download, Loader2, Lock, Plus, RotateCcw, Save, ShieldCheck, Trash2, Unlock,
} from 'lucide-react';
import {
  claveConcepto, describirOrigen, pendientesParaActivar,
  type Procedencia, type ProcedenciaEscalares,
} from '@/lib/finanzas/pendientes';
import { decodificarRespuesta } from '@/lib/finanzas/formulario-contador';

// ─────────────────────────────────────────────────────────────────────────────
// Parámetros fiscales del año.
//
// La lista de pendientes se calcula EN VIVO con `pendientesParaActivar`, la
// MISMA función que usa el servidor para activar y la guarda para calcular.
// La activación se valida sobre lo GUARDADO: por eso el botón exige guardar
// antes. Lo copiado o importado nace sin revisar y bloquea hasta confirmarlo.
// ─────────────────────────────────────────────────────────────────────────────

type Esc = 'uvt' | 'responsable_iva' | 'tarifa_iva' | 'tarifa_reteiva';

interface FilaConcepto {
  label: string; tarifa_declarante: string; tarifa_no_declarante: string; base_minima_uvt: string;
  revisado: boolean; origen: string; copiado_de_anio: number | null; cargado_por: string | null; cargado_en: string | null;
}
interface FilaIca {
  municipio: string; tarifa_por_mil: string;
  revisado: boolean; origen: string; copiado_de_anio: number | null; cargado_por: string | null; cargado_en: string | null;
}
interface ParametroServidor {
  anio: number; estado: 'BORRADOR' | 'ACTIVO'; cerrado: boolean; responsable_iva: boolean | null;
  uvt: string | null; tarifa_iva: string | null; tarifa_reteiva: string | null; notas: string | null;
  procedencia: ProcedenciaEscalares; activado_por: string | null; activado_en: string | null; updated_at: string;
  conceptos: FilaConcepto[]; tarifasIca: FilaIca[];
}
interface Datos {
  anio: number;
  anios: { anio: number; estado: string }[];
  anteriorDisponible: { anio: number; estado: string } | null;
  parametro: ParametroServidor | null;
}
interface Form {
  uvt: string; responsable_iva: boolean | null; tarifa_iva: string; tarifa_reteiva: string; notas: string;
  conceptos: FilaConcepto[]; tarifasIca: FilaIca[]; confirmar: Esc[]; importados: Esc[];
}

const C = { navy: '#0D2D5E', blue: '#1B56A1', gold: '#E8B92F', line: '#E2E8F0', muted: '#64748B', ink: '#1E293B', warn: '#B45309', warnBg: '#FFFBEB', ok: '#15803D', okBg: '#F0FDF4', bad: '#B91C1C', badBg: '#FEF2F2' };
const inputS: React.CSSProperties = { padding: '9px 11px', border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: '0.9rem', color: C.navy, background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const cardS: React.CSSProperties = { background: '#fff', borderRadius: 14, border: `1px solid ${C.line}`, padding: '1.25rem' };
const h3S: React.CSSProperties = { color: C.navy, fontWeight: 800, fontSize: '0.95rem', margin: '0 0 0.25rem' };
const notaS: React.CSSProperties = { color: C.muted, fontSize: '0.8rem', lineHeight: 1.5, margin: '0 0 0.8rem' };

const vacioForm = (): Form => ({ uvt: '', responsable_iva: null, tarifa_iva: '', tarifa_reteiva: '', notas: '', conceptos: [], tarifasIca: [], confirmar: [], importados: [] });

function formDesde(p: ParametroServidor | null): Form {
  if (!p) return vacioForm();
  return {
    uvt: p.uvt ?? '', responsable_iva: p.responsable_iva, tarifa_iva: p.tarifa_iva ?? '', tarifa_reteiva: p.tarifa_reteiva ?? '',
    notas: p.notas ?? '', conceptos: p.conceptos.map(c => ({ ...c })), tarifasIca: p.tarifasIca.map(t => ({ ...t })),
    confirmar: [], importados: [],
  };
}

/** Lo que viaja al servidor. También sirve para saber si hay cambios sin guardar. */
function carga(anio: number, f: Form) {
  return {
    anio, uvt: f.uvt, responsable_iva: f.responsable_iva, tarifa_iva: f.tarifa_iva, tarifa_reteiva: f.tarifa_reteiva,
    notas: f.notas || null, confirmar: f.confirmar, importados: f.importados,
    conceptos: f.conceptos.map(c => ({ label: c.label, tarifa_declarante: c.tarifa_declarante, tarifa_no_declarante: c.tarifa_no_declarante, base_minima_uvt: c.base_minima_uvt, revisado: c.revisado, origen: c.origen })),
    tarifasIca: f.tarifasIca.map(t => ({ municipio: t.municipio, tarifa_por_mil: t.tarifa_por_mil, revisado: t.revisado, origen: t.origen })),
  };
}

const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Procedencia de cada escalar tal como quedaría si se guardara ahora. */
function procedenciaEfectiva(f: Form, p: ParametroServidor | null): ProcedenciaEscalares {
  const base = p?.procedencia ?? {};
  const original = formDesde(p);
  const r: ProcedenciaEscalares = { ...base };
  const ahora = new Date().toISOString();
  (['uvt', 'responsable_iva', 'tarifa_iva', 'tarifa_reteiva'] as Esc[]).forEach(e => {
    const cambio = String(f[e] ?? '') !== String(original[e] ?? '');
    const vacio = f[e] === null || f[e] === '';
    if (vacio) { delete r[e]; return; }
    if (f.importados.includes(e)) r[e] = { por: 'Formulario del contador', en: ahora, origen: 'contador', revisado: f.confirmar.includes(e) };
    else if (cambio) r[e] = { por: 'tú, sin guardar', en: ahora, origen: 'manual', revisado: true };
    else if (f.confirmar.includes(e) && base[e]) r[e] = { ...base[e]!, revisado: true };
  });
  return r;
}

function LineaProcedencia({ p, onConfirmar, bloqueado }: { p?: Procedencia; onConfirmar?: () => void; bloqueado?: boolean }) {
  if (!p) return <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 5 }}>Sin cargar</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.74rem', color: C.muted, marginTop: 5 }}>
      <span>{describirOrigen(p.origen, p.copiadoDe)} · {p.por ?? '—'} · {fecha(p.en)}</span>
      {p.revisado
        ? <span style={{ color: C.ok, fontWeight: 700 }}>✓ revisado</span>
        : <>
            <span style={{ background: C.warnBg, color: C.warn, fontWeight: 800, padding: '1px 7px', borderRadius: 999 }}>SIN REVISAR</span>
            {onConfirmar && !bloqueado && (
              <button type="button" onClick={onConfirmar} style={{ border: `1px solid ${C.warn}`, color: C.warn, background: '#fff', borderRadius: 7, padding: '1px 8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                Confirmar
              </button>
            )}
          </>}
    </div>
  );
}

const procFila = (r: { origen: string; copiado_de_anio: number | null; cargado_por: string | null; cargado_en: string | null; revisado: boolean }): Procedencia | undefined =>
  r.cargado_en || r.origen !== 'manual'
    ? { por: r.cargado_por, en: r.cargado_en ?? new Date().toISOString(), origen: (r.origen as Procedencia['origen']) ?? 'manual', copiadoDe: r.copiado_de_anio, revisado: r.revisado }
    : undefined;

export default function ParametrosFiscalesPage() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [form, setForm] = useState<Form>(vacioForm());
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [importando, setImportando] = useState(false);
  const [textoImport, setTextoImport] = useState('');

  const p = datos?.parametro ?? null;
  const activo = p?.estado === 'ACTIVO';
  const bloqueado = activo || !!p?.cerrado;

  const aplicar = useCallback((d: Datos) => { setDatos(d); setForm(formDesde(d.parametro)); }, []);

  const cargar = useCallback(async (a: number) => {
    setCargando(true); setError(''); setAviso('');
    try {
      const res = await fetch(`/api/admin/finanzas/parametros?anio=${a}`);
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      aplicar(await res.json());
    } catch {
      setError('No se pudieron cargar los parámetros.');
    } finally {
      setCargando(false);
    }
  }, [aplicar]);

  useEffect(() => { cargar(anio); }, [anio, cargar]);

  const hayCambios = useMemo(
    () => JSON.stringify(carga(anio, form)) !== JSON.stringify(carga(anio, formDesde(p))),
    [anio, form, p],
  );

  useEffect(() => {
    if (!hayCambios) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hayCambios]);

  const proc = useMemo(() => procedenciaEfectiva(form, p), [form, p]);

  // ── LISTA EN VIVO: la misma función que valida el servidor ──
  const pendientes = useMemo(() => pendientesParaActivar({
    anio,
    uvt: form.uvt || null,
    responsable_iva: form.responsable_iva,
    tarifa_iva: form.tarifa_iva || null,
    tarifa_reteiva: form.tarifa_reteiva || null,
    conceptos: form.conceptos.filter(c => c.label.trim()).map(c => ({ concepto: claveConcepto(c.label), label: c.label, revisado: c.revisado, origen: c.origen, copiado_de_anio: c.copiado_de_anio })),
    tarifasIca: form.tarifasIca.filter(t => t.municipio.trim()).map(t => ({ municipio: t.municipio, revisado: t.revisado, origen: t.origen, copiado_de_anio: t.copiado_de_anio })),
    procedencia: proc,
  }), [anio, form, proc]);

  const motivosNoActivar: string[] = [];
  if (!p) motivosNoActivar.push('Guarda el borrador primero.');
  if (hayCambios) motivosNoActivar.push('Guarda los cambios: la activación valida lo GUARDADO, no lo que ves en pantalla.');
  if (pendientes.length) motivosNoActivar.push(`Faltan ${pendientes.length} punto${pendientes.length === 1 ? '' : 's'} de la lista.`);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const setEsc = (e: Esc, v: string | boolean | null) =>
    setForm(f => ({ ...f, [e]: v, importados: f.importados.filter(x => x !== e), confirmar: f.confirmar.filter(x => x !== e) }));
  const confirmarEsc = (e: Esc) => setForm(f => ({ ...f, confirmar: f.confirmar.includes(e) ? f.confirmar : [...f.confirmar, e] }));

  const editarConcepto = (i: number, k: keyof FilaConcepto, v: string) =>
    setForm(f => ({ ...f, conceptos: f.conceptos.map((c, n) => n === i ? { ...c, [k]: v, origen: 'manual', revisado: true, copiado_de_anio: null } : c) }));
  const editarIca = (i: number, k: keyof FilaIca, v: string) =>
    setForm(f => ({ ...f, tarifasIca: f.tarifasIca.map((t, n) => n === i ? { ...t, [k]: v, origen: 'manual', revisado: true, copiado_de_anio: null } : t) }));

  const sinRevisarFilas = form.conceptos.filter(c => !c.revisado).length + form.tarifasIca.filter(t => !t.revisado).length;

  async function accion(nombre: string, fn: () => Promise<Response>, ok: (j: Datos & { copia?: { copiado: string[]; omitido: string[]; desde: number } }) => string) {
    setOcupado(nombre); setError(''); setAviso('');
    try {
      const res = await fn();
      const j = await res.json();
      if (!res.ok) {
        setError(j.pendientes ? `${j.error} ${j.pendientes.join(' · ')}` : (j.error ?? 'No se pudo completar.'));
        return;
      }
      aplicar(j);
      setAviso(ok(j));
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setOcupado(null);
    }
  }

  const guardar = () => accion('guardar',
    () => fetch('/api/admin/finanzas/parametros', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(carga(anio, form)) }),
    () => 'Borrador guardado.');

  const post = (a: string) => () => fetch(`/api/admin/finanzas/parametros/${a}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anio }) });

  const copiar = () => {
    if (!datos?.anteriorDisponible) return;
    const desde = datos.anteriorDisponible.anio;
    if (!confirm(
      `Copiar a ${anio} los parámetros de ${desde}.\n\n` +
      `• NO se copian el UVT ni la decisión de IVA: cambian cada año.\n` +
      `• No se pisa nada que ya esté cargado en ${anio}.\n` +
      `• Todo lo copiado queda SIN REVISAR y bloquea la activación hasta que lo confirmes.`,
    )) return;
    accion('copiar', post('copiar'), j => {
      const c = j.copia;
      return c ? `Copiado de ${c.desde}: ${c.copiado.length ? c.copiado.join(', ') : 'nada nuevo'}. No copiado: ${c.omitido.join(', ')}.` : 'Copiado.';
    });
  };

  const activar = () => {
    if (!confirm(`Activar ${anio}. Desde ese momento el módulo calcula retenciones con estos parámetros. ¿Continuar?`)) return;
    accion('activar', post('activar'), () => `${anio} está ACTIVO.`);
  };

  const aBorrador = () => {
    if (!confirm(`Volver ${anio} a BORRADOR. Mientras esté en borrador el módulo NO calcula nada de ese año. ¿Continuar?`)) return;
    accion('borrador', post('borrador'), () => `${anio} volvió a borrador. Edita y actívalo de nuevo.`);
  };

  const importar = () => {
    setError('');
    try {
      const r = decodificarRespuesta(textoImport);
      if (r.anio !== anio) {
        setError(`El código es del año ${r.anio} y estás en ${anio}. Cambia el año arriba y vuelve a pegarlo.`);
        return;
      }
      setForm(f => {
        const n: Form = { ...f, conceptos: [...f.conceptos], tarifasIca: [...f.tarifasIca], importados: [...f.importados], confirmar: [...f.confirmar] };
        const marca = (e: Esc) => { if (!n.importados.includes(e)) n.importados.push(e); n.confirmar = n.confirmar.filter(x => x !== e); };
        if (r.uvt) { n.uvt = r.uvt; marca('uvt'); }
        if (r.responsable_iva === 'si' || r.responsable_iva === 'no') { n.responsable_iva = r.responsable_iva === 'si'; marca('responsable_iva'); }
        if (r.tarifa_iva) { n.tarifa_iva = r.tarifa_iva; marca('tarifa_iva'); }
        if (r.tarifa_reteiva) { n.tarifa_reteiva = r.tarifa_reteiva; marca('tarifa_reteiva'); }
        const importadaC = { origen: 'contador', revisado: false, copiado_de_anio: null, cargado_por: 'Formulario del contador', cargado_en: new Date().toISOString() };
        r.conceptos.forEach(c => {
          const fila = { label: c.label, tarifa_declarante: c.declarante, tarifa_no_declarante: c.no_declarante, base_minima_uvt: c.base_uvt || '0', ...importadaC };
          const i = n.conceptos.findIndex(x => claveConcepto(x.label) === claveConcepto(c.label));
          if (i >= 0) n.conceptos[i] = fila; else n.conceptos.push(fila);
        });
        r.ica.forEach(t => {
          const fila = { municipio: t.municipio, tarifa_por_mil: t.tarifa, ...importadaC };
          const i = n.tarifasIca.findIndex(x => x.municipio.trim().toLowerCase() === t.municipio.trim().toLowerCase());
          if (i >= 0) n.tarifasIca[i] = fila; else n.tarifasIca.push(fila);
        });
        return n;
      });
      setImportando(false); setTextoImport('');
      setAviso(`Importado el formulario de ${r.por || 'el contador'} (${r.fecha}). Todo quedó SIN REVISAR: confírmalo valor por valor y guarda.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el código.');
    }
  };

  const cambiarAnio = (a: number) => {
    if (hayCambios && !confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de año?')) return;
    setAnio(a);
  };

  const opcionesAnio = Array.from(new Set([anioActual + 1, anioActual, ...(datos?.anios ?? []).map(a => a.anio)])).sort((a, b) => b - a);

  if (cargando && !datos) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={26} className="spin" style={{ color: C.blue }} /><style>{'.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;
  }

  const estadoBadge = !p
    ? { txt: 'SIN CREAR', bg: '#F1F5F9', fg: C.muted, icon: null }
    : activo
      ? { txt: 'ACTIVO', bg: C.okBg, fg: C.ok, icon: <ShieldCheck size={15} /> }
      : { txt: 'BORRADOR', bg: C.warnBg, fg: C.warn, icon: <AlertTriangle size={15} /> };

  const btn = (fondo: string, color: string, borde = fondo): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: fondo, color, border: `1.5px solid ${borde}`, fontWeight: 800, fontSize: '0.86rem', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', width: '100%' });

  return (
    <div className="pf">
      <style>{`
        .pf { display:grid; grid-template-columns: minmax(0,1fr) 320px; gap: 1.25rem; align-items:start; max-width: 1180px; }
        .pf-lado { position: sticky; top: 84px; display:flex; flex-direction:column; gap: 1rem; }
        .pf-col { display:flex; flex-direction:column; gap: 1rem; min-width:0; }
        .pf-tabla { width:100%; border-collapse: collapse; font-size: .86rem; }
        .pf-tabla th { text-align:left; font-size:.7rem; text-transform:uppercase; letter-spacing:.4px; color:${C.muted}; padding: 6px 6px; border-bottom:1px solid ${C.line}; }
        .pf-tabla td { padding: 6px 6px; border-bottom:1px solid #F1F5F9; vertical-align: top; }
        .pf-fila-nr td { background: ${C.warnBg}; }
        button:disabled { opacity:.45; cursor:not-allowed !important; }
        .spin { animation: spin 1s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 980px) { .pf { grid-template-columns: 1fr; } .pf-lado { position: static; order: -1; } }
        @media (max-width: 640px) { .pf-scroll { overflow-x:auto; } .pf-tabla { min-width: 620px; } }
      `}</style>

      {/* ─── Columna principal ─── */}
      <div className="pf-col">
        <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 800, color: C.navy }}>
            Año fiscal{' '}
            <select value={anio} onChange={e => cambiarAnio(Number(e.target.value))} style={{ ...inputS, width: 'auto', display: 'inline-block', marginLeft: 6, fontWeight: 800 }}>
              {opcionesAnio.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: estadoBadge.bg, color: estadoBadge.fg, fontWeight: 900, letterSpacing: '.6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${estadoBadge.fg}` }}>
            {estadoBadge.icon}{estadoBadge.txt}
          </span>
          <span style={{ fontSize: '0.8rem', color: C.muted }}>
            {!p && 'Este año todavía no tiene parámetros.'}
            {p && !activo && 'El módulo NO calcula con un borrador.'}
            {activo && <>Activado por <strong>{p.activado_por ?? '—'}</strong> el {fecha(p.activado_en)}. No se edita: vuélvelo a borrador para cambiarlo.</>}
          </span>
          {hayCambios && <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 800, color: C.warn }}>● Cambios sin guardar</span>}
        </div>

        {error && <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{error}</div>}
        {aviso && <div style={{ background: C.okBg, border: '1.5px solid #BBF7D0', color: C.ok, borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{aviso}</div>}

        <fieldset disabled={bloqueado || !!ocupado} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* UVT */}
          <div style={cardS}>
            <h3 style={h3S}>1. Valor del UVT</h3>
            <p style={notaS}>En pesos, como lo publica la DIAN: <code>49.799</code> y <code>49799</code> son lo mismo. No se copia del año anterior.</p>
            <input value={form.uvt} onChange={e => setEsc('uvt', e.target.value)} placeholder="ej. 49.799" inputMode="decimal" style={{ ...inputS, maxWidth: 240 }} />
            <LineaProcedencia p={proc.uvt} onConfirmar={() => confirmarEsc('uvt')} bloqueado={bloqueado} />
          </div>

          {/* Responsable de IVA — tres estados, nunca casilla */}
          <div style={cardS}>
            <h3 style={h3S}>2. ¿Responsable de IVA este año?</h3>
            <p style={notaS}>Se decide año por año y no se copia. Mientras esté <strong>sin decidir</strong>, el año no se puede activar: no se asume que no.</p>
            <div role="radiogroup" aria-label="Responsable de IVA" style={{ display: 'inline-flex', border: `1.5px solid ${C.line}`, borderRadius: 11, overflow: 'hidden' }}>
              {([
                { v: null, txt: 'Sin decidir', on: { bg: C.warnBg, fg: C.warn } },
                { v: true, txt: 'Sí', on: { bg: C.navy, fg: '#fff' } },
                { v: false, txt: 'No', on: { bg: C.navy, fg: '#fff' } },
              ] as const).map((o, i) => {
                const sel = form.responsable_iva === o.v;
                return (
                  <button key={o.txt} type="button" role="radio" aria-checked={sel} onClick={() => setEsc('responsable_iva', o.v)}
                    style={{ padding: '9px 18px', fontWeight: 800, fontSize: '0.88rem', border: 'none', borderLeft: i ? `1.5px solid ${C.line}` : 'none', background: sel ? o.on.bg : '#fff', color: sel ? o.on.fg : C.muted, cursor: 'pointer' }}>
                    {sel && o.v === null ? '⚠ ' : ''}{o.txt}
                  </button>
                );
              })}
            </div>
            <LineaProcedencia p={proc.responsable_iva} onConfirmar={() => confirmarEsc('responsable_iva')} bloqueado={bloqueado} />
          </div>

          {/* Tarifas de IVA */}
          <div style={cardS}>
            <h3 style={h3S}>3. Tarifas de IVA y reteIVA</h3>
            {form.responsable_iva === null && <p style={{ ...notaS, marginBottom: 0 }}>Decide primero si el año es responsable de IVA.</p>}
            {form.responsable_iva === false && (
              <p style={{ ...notaS, marginBottom: 0 }}>
                <strong>No aplican este año.</strong> No se factura IVA, el IVA pagado a proveedores es <strong>costo</strong> y no hay reteIVA en ninguna dirección.
                {(form.tarifa_iva || form.tarifa_reteiva) && ' Hay tarifas cargadas: se conservan pero no se usan en ningún cálculo.'}
              </p>
            )}
            {form.responsable_iva === true && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Tarifa de IVA (%) — obligatoria</label>
                  <input value={form.tarifa_iva} onChange={e => setEsc('tarifa_iva', e.target.value)} inputMode="decimal" style={inputS} />
                  <LineaProcedencia p={proc.tarifa_iva} onConfirmar={() => confirmarEsc('tarifa_iva')} bloqueado={bloqueado} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Tarifa de reteIVA (%) — solo si es agente</label>
                  <input value={form.tarifa_reteiva} onChange={e => setEsc('tarifa_reteiva', e.target.value)} inputMode="decimal" style={inputS} />
                  <LineaProcedencia p={proc.tarifa_reteiva} onConfirmar={() => confirmarEsc('tarifa_reteiva')} bloqueado={bloqueado} />
                </div>
              </div>
            )}
          </div>

          {/* Conceptos */}
          <div style={cardS}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={h3S}>4. Conceptos de retención en la fuente</h3>
              {form.conceptos.some(c => !c.revisado) && !bloqueado && (
                <button type="button" onClick={() => set('conceptos', form.conceptos.map(c => ({ ...c, revisado: true })))} style={{ border: `1px solid ${C.warn}`, color: C.warn, background: '#fff', borderRadius: 8, padding: '4px 10px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}>
                  Confirmar los {form.conceptos.filter(c => !c.revisado).length} sin revisar
                </button>
              )}
            </div>
            <p style={notaS}>Tarifa según el tercero declare o no renta. Base mínima en UVT: si la base no la supera, no se retiene (0 = sin base mínima).</p>
            <div className="pf-scroll">
              <table className="pf-tabla">
                <thead><tr><th>Concepto</th><th>Declara %</th><th>No declara %</th><th>Base (UVT)</th><th>Procedencia</th><th /></tr></thead>
                <tbody>
                  {form.conceptos.length === 0 && <tr><td colSpan={6} style={{ color: C.muted, padding: '12px 6px' }}>Sin conceptos. Añade al menos uno para poder activar.</td></tr>}
                  {form.conceptos.map((c, i) => (
                    <tr key={i} className={c.revisado ? '' : 'pf-fila-nr'}>
                      <td><input value={c.label} onChange={e => editarConcepto(i, 'label', e.target.value)} placeholder="Comisiones" style={inputS} /></td>
                      <td style={{ width: 92 }}><input value={c.tarifa_declarante} onChange={e => editarConcepto(i, 'tarifa_declarante', e.target.value)} inputMode="decimal" style={inputS} /></td>
                      <td style={{ width: 92 }}><input value={c.tarifa_no_declarante} onChange={e => editarConcepto(i, 'tarifa_no_declarante', e.target.value)} inputMode="decimal" style={inputS} /></td>
                      <td style={{ width: 86 }}><input value={c.base_minima_uvt} onChange={e => editarConcepto(i, 'base_minima_uvt', e.target.value)} inputMode="decimal" style={inputS} /></td>
                      <td style={{ minWidth: 150 }}>
                        <LineaProcedencia p={procFila(c)} bloqueado={bloqueado}
                          onConfirmar={() => set('conceptos', form.conceptos.map((x, n) => n === i ? { ...x, revisado: true } : x))} />
                      </td>
                      <td style={{ width: 34 }}>
                        <button type="button" aria-label="Quitar concepto" onClick={() => set('conceptos', form.conceptos.filter((_, n) => n !== i))} style={{ border: 'none', background: 'none', color: C.bad, cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => set('conceptos', [...form.conceptos, { label: '', tarifa_declarante: '', tarifa_no_declarante: '', base_minima_uvt: '0', revisado: true, origen: 'manual', copiado_de_anio: null, cargado_por: null, cargado_en: null }])}
              style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px dashed ${C.line}`, background: '#fff', color: C.blue, fontWeight: 800, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: '0.84rem' }}>
              <Plus size={14} /> Añadir concepto
            </button>
          </div>

          {/* ICA */}
          <div style={cardS}>
            <h3 style={h3S}>5. Tarifas de ICA por municipio</h3>
            <p style={notaS}>Por mil. No son obligatorias para activar; pero una copiada o importada sin revisar sí bloquea, porque se usaría como si estuviera confirmada.</p>
            <div className="pf-scroll">
              <table className="pf-tabla">
                <thead><tr><th>Municipio</th><th>Tarifa ‰</th><th>Procedencia</th><th /></tr></thead>
                <tbody>
                  {form.tarifasIca.length === 0 && <tr><td colSpan={4} style={{ color: C.muted, padding: '12px 6px' }}>Sin tarifas de ICA.</td></tr>}
                  {form.tarifasIca.map((t, i) => (
                    <tr key={i} className={t.revisado ? '' : 'pf-fila-nr'}>
                      <td><input value={t.municipio} onChange={e => editarIca(i, 'municipio', e.target.value)} placeholder="La Vega, Cundinamarca" style={inputS} /></td>
                      <td style={{ width: 110 }}><input value={t.tarifa_por_mil} onChange={e => editarIca(i, 'tarifa_por_mil', e.target.value)} inputMode="decimal" style={inputS} /></td>
                      <td style={{ minWidth: 150 }}>
                        <LineaProcedencia p={procFila(t)} bloqueado={bloqueado}
                          onConfirmar={() => set('tarifasIca', form.tarifasIca.map((x, n) => n === i ? { ...x, revisado: true } : x))} />
                      </td>
                      <td style={{ width: 34 }}>
                        <button type="button" aria-label="Quitar municipio" onClick={() => set('tarifasIca', form.tarifasIca.filter((_, n) => n !== i))} style={{ border: 'none', background: 'none', color: C.bad, cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => set('tarifasIca', [...form.tarifasIca, { municipio: '', tarifa_por_mil: '', revisado: true, origen: 'manual', copiado_de_anio: null, cargado_por: null, cargado_en: null }])}
              style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px dashed ${C.line}`, background: '#fff', color: C.blue, fontWeight: 800, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: '0.84rem' }}>
              <Plus size={14} /> Añadir municipio
            </button>
          </div>

          <div style={cardS}>
            <h3 style={h3S}>Notas</h3>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Fuente de cada dato, resolución del UVT, observaciones del contador…" style={{ ...inputS, resize: 'vertical' }} />
          </div>
        </fieldset>
      </div>

      {/* ─── Panel lateral: pendientes EN VIVO y acciones ─── */}
      <aside className="pf-lado">
        <div style={{ ...cardS, borderColor: pendientes.length ? '#FDE68A' : '#BBF7D0', borderWidth: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {pendientes.length
              ? <AlertTriangle size={18} style={{ color: C.warn }} />
              : <CheckCircle2 size={18} style={{ color: C.ok }} />}
            <strong style={{ color: C.navy, fontSize: '0.95rem' }}>
              {pendientes.length ? `Para activar faltan ${pendientes.length}` : activo ? 'Año activo y completo' : 'Listo para activar'}
            </strong>
          </div>
          {pendientes.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: 20, color: C.ink, fontSize: '0.83rem', lineHeight: 1.5 }}>
              {pendientes.map(t => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}
            </ol>
          )}
          {sinRevisarFilas > 0 && <p style={{ ...notaS, margin: '8px 0 0' }}>Las filas en amarillo están sin revisar.</p>}
        </div>

        <div style={{ ...cardS, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!bloqueado && (
            <button type="button" onClick={guardar} disabled={!!ocupado || !hayCambios} style={btn(C.blue, '#fff')}>
              {ocupado === 'guardar' ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Guardar borrador
            </button>
          )}

          {!activo ? (
            <>
              <button type="button" onClick={activar} disabled={!!ocupado || motivosNoActivar.length > 0} style={btn(C.ok, '#fff')}>
                {ocupado === 'activar' ? <Loader2 size={15} className="spin" /> : <Lock size={15} />} Activar {anio}
              </button>
              {motivosNoActivar.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, color: C.warn, fontSize: '0.76rem', lineHeight: 1.45 }}>
                  {motivosNoActivar.map(m => <li key={m}>{m}</li>)}
                </ul>
              )}
            </>
          ) : (
            <button type="button" onClick={aBorrador} disabled={!!ocupado || !!p?.cerrado} style={btn('#fff', C.warn, C.warn)}>
              {ocupado === 'borrador' ? <Loader2 size={15} className="spin" /> : <Unlock size={15} />} Volver a borrador para editar
            </button>
          )}

          {!bloqueado && (
            <>
              <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '4px 0' }} />
              <button type="button" onClick={copiar} disabled={!!ocupado || !datos?.anteriorDisponible || hayCambios} style={btn('#fff', C.navy, C.line)}>
                {ocupado === 'copiar' ? <Loader2 size={15} className="spin" /> : <Copy size={15} />}
                Copiar de {anio - 1}
              </button>
              <div style={{ fontSize: '0.74rem', color: C.muted, lineHeight: 1.4 }}>
                {!datos?.anteriorDisponible
                  ? `No hay parámetros de ${anio - 1} para copiar.`
                  : hayCambios ? 'Guarda antes de copiar.'
                  : 'Sin UVT ni decisión de IVA. No pisa lo cargado. Todo queda sin revisar.'}
              </div>
              <button type="button" onClick={() => { setImportando(v => !v); setError(''); }} disabled={!!ocupado} style={btn('#fff', C.navy, C.line)}>
                <Download size={15} /> Importar respuesta del contador
              </button>
              {importando && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={textoImport} onChange={e => setTextoImport(e.target.value)} rows={5} placeholder="Pega aquí el mensaje de WhatsApp completo del contador" style={{ ...inputS, fontSize: '0.78rem', resize: 'vertical' }} />
                  <button type="button" onClick={importar} disabled={!textoImport.trim()} style={btn(C.navy, '#fff')}>Importar al borrador</button>
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>Lo importado queda sin revisar y no se guarda hasta que pulses «Guardar borrador».</span>
                </div>
              )}
              <a href="/interno/datos-contador" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: C.blue, fontWeight: 700, textAlign: 'center' }}>
                Abrir el formulario del contador ↗
              </a>
            </>
          )}

          {hayCambios && !bloqueado && (
            <button type="button" onClick={() => { if (confirm('¿Descartar los cambios sin guardar?')) setForm(formDesde(p)); }} style={{ ...btn('#fff', C.muted, C.line), fontWeight: 700 }}>
              <RotateCcw size={14} /> Descartar cambios
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
