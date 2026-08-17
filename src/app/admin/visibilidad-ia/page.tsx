'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Radar, Save, RefreshCw, Download, Trash2, Check, X } from 'lucide-react';

interface Consulta { id: string; texto: string; proposito: string }
interface Motor { id: string; label: string }
interface Medicion {
  id: string; consulta_id: string; motor: string; aparece: boolean;
  posicion: number | null; competidores: string[];
  descripcion: string | null; notas: string | null;
  medido_en: string; medido_por: string | null;
  commit_sitio: string | null; version_nota: string | null;
}

export default function VisibilidadIAPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [motores,   setMotores]   = useState<Motor[]>([]);
  const [meds,      setMeds]      = useState<Medicion[]>([]);
  const [cargando,  setCargando]  = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg,       setMsg]       = useState<{ ok: boolean; texto: string } | null>(null);
  const [vista,     setVista]     = useState<'registrar' | 'evolucion' | 'descripciones'>('registrar');

  // ── Formulario rápido ──────────────────────────────────────────────────────
  const [motor,     setMotor]     = useState('');
  const [consulta,  setConsulta]  = useState('');
  const [aparece,   setAparece]   = useState<boolean | null>(null);
  const [posicion,  setPosicion]  = useState('');
  const [compet,    setCompet]    = useState('');
  const [descrip,   setDescrip]   = useState('');
  const [notas,     setNotas]     = useState('');
  // Se CONSERVA entre mediciones: una ronda entera pertenece a la misma versión
  // del sitio, y volver a escribirla once veces sería la forma de que no se use.
  const [versionNota, setVersionNota] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch('/api/admin/visibilidad-ia');
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await r.json();
      setConsultas(d.consultas ?? []);
      setMotores(d.motores ?? []);
      setMeds(d.mediciones ?? []);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const puedeGuardar = motor && consulta && aparece !== null && !guardando;

  async function guardar() {
    if (!puedeGuardar) return;
    setGuardando(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/visibilidad-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta_id: consulta,
          motor,
          aparece,
          posicion: aparece && posicion ? parseInt(posicion) : null,
          competidores: compet.split(',').map(s => s.trim()).filter(Boolean),
          descripcion: descrip || undefined,
          notas: notas || undefined,
          version_nota: versionNota || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, texto: d.error ?? 'No se pudo guardar' }); return; }
      setMsg({ ok: true, texto: 'Medición registrada.' });
      // Se conserva el MOTOR y se avanza a la consulta siguiente: se mide un
      // motor entero de una pasada, no saltando entre pestañas.
      const i = consultas.findIndex(c => c.id === consulta);
      setConsulta(i >= 0 && i < consultas.length - 1 ? consultas[i + 1]!.id : '');
      setAparece(null); setPosicion(''); setCompet(''); setDescrip(''); setNotas('');
      await cargar();
    } catch {
      setMsg({ ok: false, texto: 'Error de red. No se guardó.' });
    } finally { setGuardando(false); }
  }

  async function borrar(id: string) {
    await fetch(`/api/admin/visibilidad-ia?id=${id}`, { method: 'DELETE' });
    await cargar();
  }

  function exportar() {
    const cab = ['fecha', 'motor', 'consulta_id', 'consulta', 'aparece', 'posicion', 'competidores', 'descripcion', 'notas', 'commit_sitio', 'version_nota', 'medido_por'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = meds.map(m => [
      m.medido_en.slice(0, 10),
      motores.find(x => x.id === m.motor)?.label ?? m.motor,
      m.consulta_id,
      consultas.find(c => c.id === m.consulta_id)?.texto ?? '',
      m.aparece ? 'sí' : 'no',
      m.posicion ?? '',
      m.competidores.join(' | '),
      m.descripcion ?? '',
      m.notas ?? '',
      m.commit_sitio ?? '',
      m.version_nota ?? '',
      m.medido_por ?? '',
    ].map(esc).join(','));
    const csv = '﻿' + [cab.join(','), ...filas].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `visibilidad-ia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ── Evolución: última medición de cada par consulta × motor, y su serie ────
  const matriz = useMemo(() => {
    const m = new Map<string, Medicion[]>();
    for (const x of meds) {
      const k = `${x.consulta_id}|${x.motor}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(x);
    }
    for (const v of m.values()) v.sort((a, b) => a.medido_en.localeCompare(b.medido_en));
    return m;
  }, [meds]);

  const cobertura = useMemo(() => {
    const total = consultas.length * motores.length;
    const medidos = new Set(meds.map(m => `${m.consulta_id}|${m.motor}`)).size;
    const apariciones = [...matriz.values()].filter(s => s[s.length - 1]!.aparece).length;
    return { total, medidos, apariciones };
  }, [consultas, motores, meds, matriz]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0D2D5E', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>
            <Radar size={20} /> Visibilidad en IA
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
            {consultas.length} consultas de control × {motores.length} motores. Las consultas
            son fijas: si cambian, las mediciones dejan de ser comparables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cargar} disabled={cargando} style={btnSec}><RefreshCw size={14} /> Recargar</button>
          <button onClick={exportar} disabled={!meds.length} style={btnSec}><Download size={14} /> CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '1rem 0' }}>
        <Chip label="Mediciones"  valor={meds.length} />
        <Chip label="Pares medidos" valor={`${cobertura.medidos}/${cobertura.total}`} />
        <Chip label="Aparecemos"  valor={cobertura.apariciones} alerta={cobertura.medidos > 0 && cobertura.apariciones === 0} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {(['registrar', 'evolucion', 'descripciones'] as const).map(v => (
          <button key={v} onClick={() => setVista(v)} style={{ ...btnSec, background: vista === v ? '#0D2D5E' : '#fff', color: vista === v ? '#fff' : '#334155' }}>
            {v === 'registrar' ? 'Registrar' : v === 'evolucion' ? 'Evolución' : 'Descripciones'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: '0.7rem 0.9rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', background: msg.ok ? '#DCFCE7' : '#FEE2E2', color: msg.ok ? '#15803D' : '#B91C1C' }}>
          {msg.texto}
        </div>
      )}

      {vista === 'descripciones' ? (
        <div style={card}>
          <h2 style={h2}>Cómo describen los motores a Su Finca Raíz</h2>
          <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
            Agrupado por consulta y en orden cronológico. Es la vista que más dice: el
            sí/no mide si aparecemos, pero solo leyendo las descripciones en secuencia se
            ve si el motor resolvió la entidad correcta, si nos confunde con la homónima
            de Rionegro, y si sigue citando datos que ya corregimos.
          </p>

          {consultas.map(c => {
            const conTexto = meds
              .filter(m => m.consulta_id === c.id && m.descripcion)
              .sort((a, b) => a.medido_en.localeCompare(b.medido_en));
            if (!conTexto.length) return null;
            return (
              <section key={c.id} style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.92rem', margin: '0 0 0.2rem' }}>
                  <span style={{ color: '#94A3B8' }}>{c.id}</span> {c.texto}
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>{c.proposito}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {conTexto.map(m => (
                    <div key={m.id} style={{ borderLeft: '3px solid #1B56A1', background: '#F8FAFC', borderRadius: '0 8px 8px 0', padding: '0.7rem 0.9rem' }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 5 }}>
                        <strong style={{ color: '#0D2D5E', fontSize: '0.82rem' }}>
                          {motores.find(x => x.id === m.motor)?.label ?? m.motor}
                        </strong>
                        <span style={{ color: '#64748B', fontSize: '0.76rem' }}>{m.medido_en.slice(0, 10)}</span>
                        <span style={{ color: m.aparece ? '#15803D' : '#B91C1C', fontSize: '0.76rem', fontWeight: 700 }}>
                          {m.aparece ? `aparece${m.posicion ? ` #${m.posicion}` : ''}` : 'no aparece'}
                        </span>
                        {m.commit_sitio && <code style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{m.commit_sitio}</code>}
                        {m.version_nota && <span style={{ color: '#B45309', fontSize: '0.74rem' }}>{m.version_nota}</span>}
                      </div>
                      <p style={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {m.descripcion}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {!meds.some(m => m.descripcion) && (
            <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
              Todavía no hay ninguna descripción registrada.
            </p>
          )}
        </div>
      ) : vista === 'registrar' ? (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div style={card}>
            <Campo label="1 · Motor">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {motores.map(m => (
                  <button key={m.id} onClick={() => setMotor(m.id)}
                    style={{ ...pill, background: motor === m.id ? '#1B56A1' : '#fff', color: motor === m.id ? '#fff' : '#334155', borderColor: motor === m.id ? '#1B56A1' : '#CBD5E1' }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </Campo>

            <Campo label="2 · Consulta">
              <select value={consulta} onChange={e => setConsulta(e.target.value)} style={input}>
                <option value="">— elige una —</option>
                {consultas.map(c => {
                  const hecha = motor && matriz.has(`${c.id}|${motor}`);
                  return <option key={c.id} value={c.id}>{hecha ? '✓ ' : ''}{c.id} · {c.texto}</option>;
                })}
              </select>
              {consulta && (
                <p style={{ color: '#64748B', fontSize: '0.78rem', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                  {consultas.find(c => c.id === consulta)?.proposito}
                </p>
              )}
            </Campo>

            <Campo label="3 · ¿Aparece Su Finca Raíz?">
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAparece(true)} style={{ ...pill, background: aparece === true ? '#15803D' : '#fff', color: aparece === true ? '#fff' : '#334155', borderColor: aparece === true ? '#15803D' : '#CBD5E1' }}>
                  <Check size={14} /> Sí
                </button>
                <button onClick={() => { setAparece(false); setPosicion(''); }} style={{ ...pill, background: aparece === false ? '#B91C1C' : '#fff', color: aparece === false ? '#fff' : '#334155', borderColor: aparece === false ? '#B91C1C' : '#CBD5E1' }}>
                  <X size={14} /> No
                </button>
              </div>
            </Campo>

            {aparece && (
              <Campo label="Posición (1 = primera mención)">
                <input type="number" min={1} max={50} value={posicion} onChange={e => setPosicion(e.target.value)} style={{ ...input, maxWidth: 140 }} />
              </Campo>
            )}

            <Campo label="Competidores mencionados (separados por coma)">
              <input value={compet} onChange={e => setCompet(e.target.value)} placeholder="Fincaraiz, Metrocuadrado, …" style={input} />
            </Campo>

            <Campo label="⭐ Cómo describe el motor a Su Finca Raíz — pega el texto literal">
              <textarea value={descrip} onChange={e => setDescrip(e.target.value)} rows={5} style={{ ...input, fontFamily: 'inherit' }}
                placeholder="Es el campo más importante: aquí se ve si resolvió la entidad de La Vega o la homónima de Rionegro, y si repite datos que ya corregimos." />
            </Campo>

            <Campo label="Notas">
              <input value={notas} onChange={e => setNotas(e.target.value)} style={input} />
            </Campo>

            <Campo label="Versión del sitio (se conserva en toda la ronda)">
              <input value={versionNota} onChange={e => setVersionNota(e.target.value)}
                placeholder="p. ej. «tras retirar el gratis» — el commit se guarda solo" style={input} />
            </Campo>

            <button onClick={guardar} disabled={!puedeGuardar} style={{ ...btnPri, opacity: puedeGuardar ? 1 : 0.45, width: '100%', justifyContent: 'center' }}>
              <Save size={15} /> {guardando ? 'Guardando…' : 'Registrar y pasar a la siguiente'}
            </button>
          </div>

          {meds.length > 0 && (
            <div style={card}>
              <h2 style={h2}>Últimas mediciones</h2>
              <table style={tabla}>
                <thead><tr style={{ background: '#F8FAFC' }}>
                  <th style={th}>Fecha</th><th style={th}>Motor</th><th style={th}>Consulta</th><th style={th}>Aparece</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {meds.slice(0, 15).map(m => (
                    <tr key={m.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={td}>{m.medido_en.slice(0, 10)}</td>
                      <td style={td}>{motores.find(x => x.id === m.motor)?.label ?? m.motor}</td>
                      <td style={{ ...td, color: '#64748B' }}>{m.consulta_id}</td>
                      <td style={td}>{m.aparece ? <span style={{ color: '#15803D', fontWeight: 700 }}>sí{m.posicion ? ` · #${m.posicion}` : ''}</span> : <span style={{ color: '#B91C1C', fontWeight: 700 }}>no</span>}</td>
                      <td style={td}><button onClick={() => borrar(m.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={card}>
          <h2 style={h2}>Evolución por consulta y motor</h2>
          <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0 0 1rem' }}>
            Cada celda es la última medición. El número entre paréntesis es la posición.
            «—» significa que ese par todavía no se ha medido.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={tabla}>
              <thead><tr style={{ background: '#F8FAFC' }}>
                <th style={{ ...th, minWidth: 260 }}>Consulta</th>
                {motores.map(m => <th key={m.id} style={th}>{m.label}</th>)}
              </tr></thead>
              <tbody>
                {consultas.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ ...td, fontSize: '0.8rem' }}>
                      <strong style={{ color: '#64748B' }}>{c.id}</strong> {c.texto}
                    </td>
                    {motores.map(m => {
                      const serie = matriz.get(`${c.id}|${m.id}`);
                      if (!serie?.length) return <td key={m.id} style={{ ...td, color: '#CBD5E1', textAlign: 'center' }}>—</td>;
                      const u = serie[serie.length - 1]!;
                      const previa = serie.length > 1 ? serie[serie.length - 2]! : null;
                      const mejora = previa && !previa.aparece && u.aparece;
                      const caida  = previa && previa.aparece && !u.aparece;
                      return (
                        <td key={m.id} style={{ ...td, textAlign: 'center', background: u.aparece ? '#F0FDF4' : '#FEF2F2' }}>
                          <span style={{ color: u.aparece ? '#15803D' : '#B91C1C', fontWeight: 700 }}>
                            {u.aparece ? `sí${u.posicion ? ` (${u.posicion})` : ''}` : 'no'}
                          </span>
                          {mejora && <span title="mejoró desde la medición anterior"> ▲</span>}
                          {caida  && <span title="cayó desde la medición anterior"> ▼</span>}
                          <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{u.medido_en.slice(5, 10)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
function Chip({ label, valor, alerta }: { label: string; valor: number | string; alerta?: boolean }) {
  return (
    <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: alerta ? '#FEF3C7' : '#F1F5F9', border: `1px solid ${alerta ? '#FCD34D' : '#E2E8F0'}` }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: alerta ? '#B45309' : '#0D2D5E' }}>{valor}</div>
      <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' };
const h2: React.CSSProperties = { color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', margin: '0 0 0.75rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#fff' };
const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.9rem', borderRadius: 999, border: '1px solid #CBD5E1', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' };
const tabla: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' };
const th: React.CSSProperties = { padding: '0.55rem 0.7rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '0.55rem 0.7rem', verticalAlign: 'middle' };
const btnPri: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.65rem 1.1rem', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#0D2D5E', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' };
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', color: '#334155', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' };
