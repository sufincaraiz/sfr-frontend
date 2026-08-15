'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Save, RefreshCw, MapPin, AlertTriangle, ExternalLink } from 'lucide-react';
import { tipoLabel } from '@/lib/property-types';

interface PropRow {
  id: string; slug: string; title: string | null; type: string; status: string;
  municipality_id: string | null; municipality_name: string | null;
  vereda_id: string | null; vereda_name: string | null;
  pista: string | null;
}
interface VeredaRow {
  id: string; slug: string; name: string;
  municipality_id: string; municipality_name: string;
  propiedades: number; con_pagina: boolean;
}

export default function AdminVeredasPage() {
  const [props,   setProps]   = useState<PropRow[]>([]);
  const [veredas, setVeredas] = useState<VeredaRow[]>([]);
  const [cambios, setCambios] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string; detalle?: string[] } | null>(null);
  const [soloSin, setSoloSin] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/veredas');
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      setProps(data.propiedades ?? []);
      setVeredas(data.veredas ?? []);
      setCambios({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const veredasPorMunicipio = useMemo(() => {
    const m = new Map<string, VeredaRow[]>();
    for (const v of veredas) {
      const g = m.get(v.municipality_id) ?? [];
      g.push(v);
      m.set(v.municipality_id, g);
    }
    return m;
  }, [veredas]);

  const valorActual = (p: PropRow) => (p.id in cambios ? cambios[p.id] : p.vereda_id);

  const pendientes = Object.keys(cambios).length;

  const visibles = soloSin ? props.filter(p => !valorActual(p)) : props;
  const sinVereda = props.filter(p => !p.vereda_id).length;

  function setVereda(p: PropRow, valor: string) {
    const nuevo = valor === '' ? null : valor;
    setCambios(prev => {
      const next = { ...prev };
      if (nuevo === p.vereda_id) delete next[p.id];   // volvió a su valor original
      else next[p.id] = nuevo;
      return next;
    });
  }

  async function guardar() {
    if (!pendientes) return;
    setGuardando(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/veredas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignaciones: Object.entries(cambios).map(([property_id, vereda_id]) => ({ property_id, vereda_id })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: 'error', texto: data.error ?? 'No se pudo guardar', detalle: data.errores });
        return;
      }
      setMsg({ tipo: 'ok', texto: `${data.actualizadas} ficha${data.actualizadas === 1 ? '' : 's'} actualizada${data.actualizadas === 1 ? '' : 's'}.` });
      await fetchData();
    } catch {
      setMsg({ tipo: 'error', texto: 'Error de red. No se guardó nada.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0D2D5E', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>
            <MapPin size={20} /> Veredas
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
            Asignación en lote. Nada se guarda hasta que pulses «Guardar».
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading || guardando}
          style={btnSec}
        >
          <RefreshCw size={14} className={loading ? 'spin' : undefined} /> Recargar
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '1rem 0' }}>
        <Chip label="Fichas"        valor={props.length} />
        <Chip label="Sin vereda"    valor={sinVereda} alerta={sinVereda > 0} />
        <Chip label="Veredas"       valor={veredas.length} />
        <Chip label="Con página"    valor={veredas.filter(v => v.con_pagina).length} />
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.85rem', color: '#334155', marginBottom: '1rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={soloSin} onChange={e => setSoloSin(e.target.checked)} />
        Mostrar solo las que no tienen vereda
      </label>

      {msg && (
        <div style={{
          padding: '0.7rem 0.9rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem',
          background: msg.tipo === 'ok' ? '#DCFCE7' : '#FEE2E2',
          color:      msg.tipo === 'ok' ? '#15803D' : '#B91C1C',
        }}>
          <strong>{msg.texto}</strong>
          {msg.detalle && (
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
              {msg.detalle.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Tabla */}
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
              <th style={th}>Ficha</th>
              <th style={th}>Municipio</th>
              <th style={th}>Vereda</th>
              <th style={th}>Citada en el texto</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(p => {
              const actual   = valorActual(p);
              const cambiada = p.id in cambios;
              const opciones = p.municipality_id ? (veredasPorMunicipio.get(p.municipality_id) ?? []) : [];
              const pistaSinAsignar = p.pista && !actual;
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #F1F5F9', background: cambiada ? '#FFFBEB' : undefined }}>
                  <td style={td}>
                    <Link href={`/admin/propiedades/${p.id}`} style={{ color: '#0D2D5E', fontWeight: 700, textDecoration: 'none' }}>
                      {p.title ?? p.slug}
                    </Link>
                    <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{tipoLabel(p.type)}</div>
                  </td>
                  <td style={{ ...td, color: '#475569' }}>{p.municipality_name ?? '—'}</td>
                  <td style={td}>
                    <select
                      value={actual ?? ''}
                      onChange={e => setVereda(p, e.target.value)}
                      disabled={!p.municipality_id || guardando}
                      style={{
                        width: '100%', padding: '0.4rem 0.5rem', borderRadius: 6,
                        border: `1px solid ${cambiada ? '#F59E0B' : '#CBD5E1'}`,
                        background: '#fff', fontSize: '0.83rem',
                      }}
                    >
                      <option value="">— sin vereda —</option>
                      {opciones.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.con_pagina ? ' ·' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...td, color: pistaSinAsignar ? '#B45309' : '#94A3B8', fontSize: '0.8rem' }}>
                    {p.pista ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {pistaSinAsignar && <AlertTriangle size={13} />}
                        {p.pista}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
            {!visibles.length && (
              <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                {loading ? 'Cargando…' : 'Nada que mostrar.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#94A3B8', fontSize: '0.78rem', margin: '0.6rem 0 0' }}>
        El punto « · » marca las veredas que tienen página propia. Las demás sirven
        igual para filtrar y agrupar, pero no generan una URL.{' '}
        <Link href="/veredas" target="_blank" style={{ color: '#1B56A1', textDecoration: 'none' }}>
          Ver el índice público <ExternalLink size={11} style={{ verticalAlign: -1 }} />
        </Link>
      </p>

      {/* Barra de guardado */}
      {pendientes > 0 && (
        <div style={{
          position: 'sticky', bottom: 0, marginTop: '1rem', padding: '0.8rem 1rem',
          background: '#0D2D5E', borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#fff', fontSize: '0.87rem', fontWeight: 600 }}>
            {pendientes} cambio{pendientes === 1 ? '' : 's'} sin guardar
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCambios({})} disabled={guardando} style={btnSec}>Descartar</button>
            <button onClick={guardar} disabled={guardando} style={btnPri}>
              <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, valor, alerta }: { label: string; valor: number; alerta?: boolean }) {
  return (
    <div style={{
      padding: '0.5rem 0.8rem', borderRadius: 8,
      background: alerta ? '#FEF3C7' : '#F1F5F9',
      border: `1px solid ${alerta ? '#FCD34D' : '#E2E8F0'}`,
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: alerta ? '#B45309' : '#0D2D5E' }}>{valor}</div>
      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.6rem 0.8rem', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '0.6rem 0.8rem', verticalAlign: 'middle' };
const btnPri: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' };
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', color: '#334155', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' };
