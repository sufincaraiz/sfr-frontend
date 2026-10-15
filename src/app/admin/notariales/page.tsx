'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Loader2, Plus } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AÑOS TARIFARIOS DE LA CALCULADORA NOTARIAL
//
// ⚠ El año es una ETIQUETA, no un rango de fechas: las resoluciones de 2026
// rigen desde el 1 y el 2 de febrero. Lo que decide qué norma aplica a un acto
// es la fecha del acto contra la vigencia de cada respaldo, no este número.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', bad: '#B91C1C' };

interface Fila {
  anio: number
  estado: string
  cerrado: boolean
  version: number
  activado_en: string | null
  updated_at: string
}

export default function NotarialesPage() {
  const [anios, setAnios] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  // EL AÑO LO DECIDE EL SERVIDOR y esta pantalla solo lo muestra: una fecha
  // que es un hecho del NEGOCIO viene del servidor; solo una que es un hecho
  // del VISITANTE puede venir del navegador. Hasta que llegue la respuesta no
  // se propone ninguno, en vez de proponer el del reloj de quien mira.
  const [nuevo, setNuevo] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch('/api/admin/notariales');
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    const j = await res.json();
    setAnios(j.anios ?? []);
    // El ano sugerido viene del servidor. Solo se propone si el campo esta sin
    // tocar, para no pisar lo que el titular haya escrito mientras cargaba.
    setNuevo(n => (n === null ? (j.anio_sugerido ?? null) : n));
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function sembrar() {
    setCreando(true); setError('');
    const res = await fetch('/api/admin/notariales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anio: nuevo }),
    });
    const j = await res.json();
    setCreando(false);
    if (!res.ok) {
      // El mensaje del servidor se muestra TAL CUAL: él sabe qué falló y lo
      // dice clasificado. Envolverlo en un «no se pudo crear» apilaba dos
      // frases genéricas y borraba la única que decía algo.
      setError(j.error ?? 'El servidor respondió un error sin mensaje.');
      // Y se recarga la lista: si la siembra alcanzó a escribir antes de
      // fallar, el año existe y hay que verlo. Decir «no se creó» mientras
      // existe es peor que no decir nada.
      cargar();
      return;
    }
    window.location.href = `/admin/notariales/${nuevo}`;
  }

  const tarjeta: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem 1.25rem' };

  return (
    <div style={{ maxWidth: 820, paddingBottom: '4rem' }}>
      <div style={{ ...tarjeta, marginBottom: '1.25rem' }}>
        <h2 style={{ color: C.navy, fontWeight: 800, fontSize: '1.05rem', margin: '0 0 6px' }}>
          Parámetros de la calculadora notarial
        </h2>
        <p style={{ color: C.muted, fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
          Cada año agrupa las resoluciones que llamamos «las de ese año». El año es una{' '}
          <strong>etiqueta</strong>: ninguna empieza el 1 de enero, y qué norma aplica a una
          escritura lo decide la fecha del acto contra la vigencia de cada respaldo.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 14, padding: '0.9rem 1.1rem', fontSize: '0.86rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AlertTriangle size={17} /> El servidor rechazó la operación
          </strong>
          {error}
        </div>
      )}

      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
          <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
          {anios.length === 0 && (
            <div style={{ ...tarjeta, color: C.muted, fontSize: '0.88rem' }}>
              No hay ningún año cargado todavía.
            </div>
          )}
          {anios.map(a => (
            <Link key={a.anio} href={`/admin/notariales/${a.anio}`} style={{ textDecoration: 'none' }}>
              <div style={{ ...tarjeta, display: 'flex', alignItems: 'center', gap: 14 }}>
                <FileText size={20} style={{ color: C.blue, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.navy, fontWeight: 800 }}>{a.anio}</div>
                  <div style={{ color: C.muted, fontSize: '0.78rem' }}>
                    versión {a.version}
                    {a.activado_en ? ` · activado el ${a.activado_en.slice(0, 10)}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.04em',
                  padding: '3px 9px', borderRadius: 999,
                  background: a.estado === 'ACTIVO' ? '#DCFCE7' : '#FEF3C7',
                  color: a.estado === 'ACTIVO' ? C.ok : C.warn,
                }}>
                  {a.cerrado ? 'CERRADO' : a.estado}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={tarjeta}>
        <div style={{ color: C.navy, fontWeight: 800, fontSize: '0.92rem', marginBottom: 8 }}>
          Sembrar un año
        </div>
        <p style={{ color: C.muted, fontSize: '0.82rem', margin: '0 0 12px', lineHeight: 1.5 }}>
          Nace con los conceptos y su forma de cálculo, y <strong>sin una sola tarifa</strong> salvo
          las tres ya verificadas contra el PDF — que tampoco habilitan nada, porque les falta el
          respaldo. Las cifras se cargan aquí, una por una, cada una con su documento.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number" value={nuevo ?? ''} min={2000} max={2100}
            placeholder="…"
            onChange={e => setNuevo(e.target.value === '' ? null : Number(e.target.value))}
            style={{ padding: '8px 11px', border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: '0.9rem', color: C.navy, fontWeight: 700, width: 110, fontFamily: 'inherit' }}
          />
          <button
            onClick={sembrar} disabled={creando || nuevo === null}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: creando ? 'wait' : 'pointer', fontFamily: 'inherit' }}
          >
            <Plus size={16} /> {creando ? 'Sembrando…' : 'Sembrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
