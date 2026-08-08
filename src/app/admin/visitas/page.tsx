'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, RefreshCw, ExternalLink, Home, Users, ShieldAlert, X, Clock, Trash2 } from 'lucide-react';
import { EnlacesDueno, type EnlaceRow } from './EnlacesDueno';

interface VisitaRow {
  id: string;
  createdAt: string;
  nombresCompletos: string;
  cedula: string;
  correo: string;
  celular: string;
  municipioOrigen: string;
  inmuebleReferencia: string;
  consentAt: string;
}

interface Retencion {
  proximasAVencer: number; // entre 22 y 24 meses: se acercan al límite
  yaVencidas: number;      // pasaron los 2 años y siguen ahí (el cron no corrió)
}

interface Grupo {
  clave: string;
  esOtro: boolean;
  titulo: string;
  municipio: string | null;
  propiedadId: string | null;
  propiedadSlug: string | null;
  totalVisitas: number;
  visitas: VisitaRow[];
}

const inputS: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: '0.87rem', outline: 'none', color: '#0D2D5E', background: '#fff',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const th: React.CSSProperties = { padding: '9px 12px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 12px', color: '#334155', verticalAlign: 'top' };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminVisitasPage() {
  const [grupos, setGrupos]   = useState<Grupo[]>([]);
  const [total, setTotal]     = useState(0);
  const [truncado, setTrunc]  = useState(false);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');
  const [buscar, setBuscar]   = useState('');
  const [aplicado, setAplicado] = useState({ desde: '', hasta: '', buscar: '' });
  const [retencion, setRetencion] = useState<Retencion>({ proximasAVencer: 0, yaVencidas: 0 });
  const [enlaces, setEnlaces]     = useState<EnlaceRow[]>([]);
  const [purgando, setPurgando]   = useState(false);
  // `ok: false` pinta el aviso en rojo — un fallo de la limpieza no puede
  // parecerse a un éxito, o el admin creería que la retención ya se cumplió.
  const [avisoPurga, setAviso]    = useState<{ texto: string; ok: boolean } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (aplicado.desde)  params.set('desde', aplicado.desde);
      if (aplicado.hasta)  params.set('hasta', aplicado.hasta);
      if (aplicado.buscar) params.set('buscar', aplicado.buscar);
      const res = await fetch(`/api/admin/visitas?${params}`);
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      setGrupos(d.grupos ?? []);
      setTotal(d.total ?? 0);
      setTrunc(!!d.truncado);
      setRetencion(d.retencion ?? { proximasAVencer: 0, yaVencidas: 0 });
    } finally {
      setCargando(false);
    }
  }, [aplicado]);

  // Los enlaces se piden aparte de las visitas: no dependen de los filtros de
  // fecha ni de búsqueda, y se refrescan solos al generar o revocar uno.
  const cargarEnlaces = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/visitas/enlaces');
      if (!res.ok) return;
      const d = await res.json();
      setEnlaces(d.enlaces ?? []);
    } catch { /* el listado de visitas sigue sirviendo aunque esto falle */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarEnlaces(); }, [cargarEnlaces]);

  // Respaldo manual del cron diario: borra las visitas de más de 2 años. Se
  // confirma antes porque es un borrado definitivo y no se puede deshacer.
  const purgar = async () => {
    if (!confirm(
      'Se eliminarán definitivamente los registros de visita con más de 2 años, ' +
      'como lo exige la política de tratamiento de datos.\n\nEsta acción no se puede deshacer. ¿Continuar?'
    )) return;

    setPurgando(true);
    setAviso(null);
    try {
      const res = await fetch('/api/admin/visitas/purgar', { method: 'POST' });
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      if (!res.ok) { setAviso({ texto: d.error || 'No se pudo ejecutar la limpieza.', ok: false }); return; }
      setAviso({
        ok: true,
        texto: d.eliminadas === 0
          ? 'No había registros vencidos: nada que eliminar.'
          : `Limpieza ejecutada: ${d.eliminadas} registro${d.eliminadas !== 1 ? 's' : ''} eliminado${d.eliminadas !== 1 ? 's' : ''}.`,
      });
      await cargar(); // refresca el listado y el contador
    } catch {
      setAviso({ texto: 'No se pudo ejecutar la limpieza.', ok: false });
    } finally {
      setPurgando(false);
    }
  };

  const aplicar = (e?: React.FormEvent) => {
    e?.preventDefault();
    setAplicado({ desde, hasta, buscar });
  };

  const limpiar = () => {
    setDesde(''); setHasta(''); setBuscar('');
    setAplicado({ desde: '', hasta: '', buscar: '' });
  };

  const hayFiltros = aplicado.desde || aplicado.hasta || aplicado.buscar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Recordatorio de que esto es dato sensible */}
      <div style={{
        display: 'flex', gap: 11, alignItems: 'flex-start',
        background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12,
        padding: '0.85rem 1.05rem',
      }}>
        <ShieldAlert size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: '#92400E', fontSize: '0.83rem', lineHeight: 1.55, margin: 0 }}>
          Esta vista contiene datos personales, incluido el número de documento. Úsala solo
          para control de ingreso y seguridad. Los registros se eliminan automáticamente a
          los <strong>2 años</strong> de la visita.
        </p>
      </div>

      {/* Estado de la retención + respaldo manual del cron.
          El contador es global (no depende de los filtros de arriba). */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '0.8rem 1.15rem',
      }}>
        <Clock size={16} style={{ color: retencion.yaVencidas > 0 ? '#B45309' : '#94A3B8', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
            {retencion.proximasAVencer === 0
              ? 'Ningún registro se acerca al límite de 2 años.'
              : <><strong style={{ color: '#0D2D5E' }}>{retencion.proximasAVencer}</strong> registro{retencion.proximasAVencer !== 1 ? 's' : ''} se acerca{retencion.proximasAVencer !== 1 ? 'n' : ''} al límite de 2 años.</>}
          </p>
          {retencion.yaVencidas > 0 && (
            <p style={{ color: '#B45309', fontSize: '0.8rem', margin: '3px 0 0', fontWeight: 600 }}>
              {retencion.yaVencidas} ya superó{retencion.yaVencidas !== 1 ? 'aron' : ''} los 2 años y sigue{retencion.yaVencidas !== 1 ? 'n' : ''} en la base — ejecuta la limpieza.
            </p>
          )}
          {avisoPurga && (
            <p style={{ color: avisoPurga.ok ? '#15803D' : '#B91C1C', fontSize: '0.8rem', margin: '3px 0 0', fontWeight: 600 }}>
              {avisoPurga.texto}
            </p>
          )}
        </div>
        <button
          type="button" onClick={purgar} disabled={purgando}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', color: retencion.yaVencidas > 0 ? '#B45309' : '#64748B',
            fontWeight: 700, fontSize: '0.82rem', padding: '8px 14px', borderRadius: 9,
            border: `1.5px solid ${retencion.yaVencidas > 0 ? '#FDE68A' : '#E2E8F0'}`,
            cursor: purgando ? 'wait' : 'pointer', opacity: purgando ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {purgando
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Limpiando…</>
            : <><Trash2 size={13} /> Ejecutar limpieza de registros vencidos</>}
        </button>
      </div>

      {/* Filtros */}
      <form onSubmit={aplicar} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 5 }}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...inputS, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 5 }}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...inputS, width: '100%' }} />
          </div>
          <div style={{ gridColumn: 'span 2', minWidth: 200 }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 5 }}>Buscar por cédula o nombre</label>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Ej. 1012345678 o María Rodríguez" style={{ ...inputS, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1B56A1', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer' }}
            >
              <Search size={14} /> Filtrar
            </button>
            {hayFiltros && (
              <button
                type="button" onClick={limpiar}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', padding: '9px 13px', borderRadius: 9, border: '1.5px solid #E2E8F0', cursor: 'pointer' }}
              >
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Resumen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>
          {total} visita{total !== 1 ? 's' : ''} en {grupos.length} inmueble{grupos.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button" onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#1B56A1', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
        {truncado && (
          <span style={{ color: '#B45309', fontSize: '0.8rem' }}>
            Mostrando las 2000 más recientes — acota el rango de fechas.
          </span>
        )}
      </div>

      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={26} style={{ color: '#1B56A1', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : grupos.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <Users size={40} color="#CBD5E1" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {hayFiltros ? 'Ninguna visita coincide con los filtros.' : 'Todavía no hay visitas registradas.'}
          </p>
        </div>
      ) : (
        grupos.map(g => (
          <div key={g.clave} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>

            {/* Cabecera del grupo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap',
              padding: '0.95rem 1.25rem',
              background: g.esOtro ? '#FFFBEB' : '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
            }}>
              <Home size={17} style={{ color: g.esOtro ? '#B45309' : '#1B56A1', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.93rem', margin: 0, lineHeight: 1.35 }}>
                  {g.esOtro ? `Inmueble no listado · ${g.titulo}` : g.titulo}
                </p>
                {g.municipio && (
                  <p style={{ color: '#94A3B8', fontSize: '0.78rem', margin: '2px 0 0' }}>{g.municipio}</p>
                )}
                {g.esOtro && (
                  <p style={{ color: '#B45309', fontSize: '0.75rem', margin: '2px 0 0' }}>
                    De un colega — no está en nuestro catálogo
                  </p>
                )}
              </div>
              <span style={{ background: '#EFF6FF', color: '#1B56A1', fontWeight: 700, fontSize: '0.78rem', padding: '4px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {g.totalVisitas} visita{g.totalVisitas !== 1 ? 's' : ''}
              </span>
              {g.propiedadSlug && (
                <a
                  href={`/propiedad/${g.propiedadSlug}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1B56A1', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Ver ficha <ExternalLink size={13} />
                </a>
              )}
            </div>

            {/* Visitantes */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 860 }}>
                <thead>
                  <tr style={{ background: '#fff', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>
                    <th style={th}>Fecha</th>
                    <th style={th}>Nombre</th>
                    <th style={th}>Cédula</th>
                    <th style={th}>Correo</th>
                    <th style={th}>Celular</th>
                    <th style={th}>Procedencia</th>
                  </tr>
                </thead>
                <tbody>
                  {g.visitas.map(v => (
                    <tr key={v.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: '#64748B' }}>{fecha(v.createdAt)}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#0D2D5E' }}>{v.nombresCompletos}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{v.cedula}</td>
                      <td style={td}><a href={`mailto:${v.correo}`} style={{ color: '#1B56A1' }}>{v.correo}</a></td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <a href={`https://wa.me/${v.celular.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B56A1' }}>
                          {v.celular}
                        </a>
                      </td>
                      <td style={td}>{v.municipioOrigen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enlace privado del dueño. Solo para propiedades del catálogo: un
                inmueble "Otro" es de un colega y no tiene dueño a quien darle
                acceso desde aquí. */}
            {g.propiedadId && (
              <EnlacesDueno
                propiedadId={g.propiedadId}
                enlaces={enlaces.filter(e => e.propiedadId === g.propiedadId)}
                onCambio={cargarEnlaces}
              />
            )}
          </div>
        ))
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
