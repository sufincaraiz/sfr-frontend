'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, Camera, Check, CloudOff, Coffee, FileText, Fuel, Image as ImageIcon,
  Loader2, Megaphone, MoreHorizontal, Package, Plane, Repeat, Search, X,
} from 'lucide-react';
import { NATURALEZAS, erroresDeCaptura, repetirEgreso, type EgresoCapturado, type Naturaleza, type UltimoEgreso } from '@/lib/finanzas/captura';
import {
  almacenNavegador, encolar, leerCola, avisoDeCola, encolarRecibo,
  type PendienteEnCola,
} from '@/lib/finanzas/cola-egresos';

// ─────────────────────────────────────────────────────────────────────────────
// CAPTURA DE UN GASTO — pensada para el teléfono, en la calle, con el recibo
// en la mano. Cuatro pasos y ningún campo escrito a mano salvo el valor.
//
// Lo opcional (proveedor, factura, descripción) se completa después en el
// escritorio: el gasto nace POR COMPLETAR y ya cuenta en los reportes.
//
// Sin señal, el gasto se guarda en este teléfono y sube al volver. El aviso de
// la cola es deliberadamente incómodo: si se cierra la pestaña, se pierde.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', badBg: '#FEF2F2' };

const ICONOS: Record<string, React.ComponentType<{ size?: number }>> = {
  'Atención a clientes': Coffee,
  'Transporte a visitas': Fuel,
  'Trámites y documentos': FileText,
  'Mensajería y envíos': Package,
  'Publicidad de una propiedad': Megaphone,
  'Fotografía y dron de una propiedad': ImageIcon,
  'Viáticos': Plane,
};

interface Categoria { id: string; nombre: string; orden: number; es_deducible_por_defecto: boolean }
interface Destino { id: string; etiqueta: string; detalle: string }

const MEMORIA_ULTIMO = 'sfr-ultimo-egreso';

/** Comprime la foto en el teléfono: se captura con datos móviles en vereda. */
async function comprimir(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const lado = 1600;
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala), h = Math.round(bitmap.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = w; lienzo.height = h;
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  return lienzo.toDataURL('image/jpeg', 0.7);
}

const dataUrlAFile = (dataUrl: string): File => {
  const [cab, b64] = dataUrl.split(',');
  const bin = atob(b64!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'recibo.jpg', { type: cab!.includes('png') ? 'image/png' : 'image/jpeg' });
};

const pesos = (v: string) => {
  const n = v.replace(/\D/g, '');
  return n === '' ? '' : Number(n).toLocaleString('es-CO');
};

export default function NuevoEgresoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [valor, setValor] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [naturaleza, setNaturaleza] = useState<Naturaleza | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState<{ valor: string; categoria: string; enCola: boolean; reciboPendiente: boolean; motivoFoto: string | null } | null>(null);
  const [cola, setCola] = useState<PendienteEnCola[]>([]);
  const [ultimo, setUltimo] = useState<UltimoEgreso | null>(null);
  const camara = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/finanzas/egresos?vista=captura')
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; return null; } return r.json(); })
      .then(d => d && setCategorias(d.categorias ?? []))
      .catch(() => setError('No se pudieron cargar las categorías.'));
    const a = almacenNavegador();
    if (a) setCola(leerCola(a));
    try {
      const u = localStorage.getItem(MEMORIA_ULTIMO);
      if (u) setUltimo(JSON.parse(u));
    } catch { /* sin memoria: no pasa nada */ }
  }, []);

  const necesitaDestino = naturaleza === 'DE_OPERACION' || naturaleza === 'REEMBOLSABLE';

  const cuerpo = (): EgresoCapturado => ({
    valor: valor.replace(/\./g, ''),
    categoria_id: categoria?.id ?? '',
    naturaleza: naturaleza ?? 'DEL_NEGOCIO',
    property_id: naturaleza === 'DE_OPERACION' ? destino?.id ?? null : null,
    reembolsa_tercero_id: naturaleza === 'REEMBOLSABLE' ? destino?.id ?? null : null,
  });

  /**
   * Sube la foto. Devuelve el public_id, o el MOTIVO por el que no se pudo.
   * Nunca devuelve «nada» en silencio: el silencio es lo que hizo creer que un
   * gasto tenía recibo cuando no lo tenía.
   */
  async function subirFoto(): Promise<{ publicId: string | null; motivo: string | null }> {
    if (!foto) return { publicId: null, motivo: null };
    try {
      const fd = new FormData();
      fd.append('archivo', dataUrlAFile(foto));
      const r = await fetch('/api/admin/finanzas/recibos', { method: 'POST', body: fd });
      if (r.ok) return { publicId: (await r.json()).public_id, motivo: null };
      const j = await r.json().catch(() => ({}));
      // 503 = subida privada sin configurar. Tampoco pasa callado: el recibo se
      // queda en cola. NUNCA se sube a una URL pública como alternativa.
      return { publicId: null, motivo: j.error ?? `Cloudinary respondió ${r.status}.` };
    } catch {
      return { publicId: null, motivo: 'sin conexión al subir la foto' };
    }
  }

  async function guardar() {
    const datos = cuerpo();
    const errores = erroresDeCaptura(datos);
    if (errores.length) { setError(errores.join(' ')); return; }
    setGuardando(true); setError('');

    const { publicId, motivo } = await subirFoto();

    let creado: { id?: string } | null = null;
    try {
      const res = await fetch('/api/admin/finanzas/egresos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, soporte_public_id: publicId }),
      });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'No se pudo guardar.'); setGuardando(false); return; }
      creado = j;
    } catch {
      // Sin señal: el gasto ENTERO a la cola, con la foto dentro.
      const a = almacenNavegador();
      if (!a) { setError('Sin conexión y este navegador no deja guardar en el teléfono. Anota el gasto y regístralo luego.'); setGuardando(false); return; }
      encolar(a, { ...datos }, foto);
      setCola(leerCola(a));
      recordarUltimo();
      setHecho({ valor: pesos(valor), categoria: categoria!.nombre, enCola: true, reciboPendiente: false, motivoFoto: null });
      setGuardando(false);
      return;
    }

    // El gasto SÍ se guardó. Si la foto no subió, la foto no se descarta: se
    // encola atada a ese gasto y se avisa fuerte.
    let reciboPendiente = false;
    if (foto && !publicId) {
      const a = almacenNavegador();
      if (a && creado?.id) {
        encolarRecibo(a, creado.id, foto, `$${pesos(valor)} · ${categoria!.nombre}`, motivo ?? undefined);
        reciboPendiente = true;
      }
    }
    recordarUltimo();
    setHecho({
      valor: pesos(valor), categoria: categoria!.nombre, enCola: false,
      reciboPendiente,
      motivoFoto: reciboPendiente ? motivo : null,
    });
    setGuardando(false);
  }

  function recordarUltimo() {
    try {
      // La foto NO se recuerda: ver `repetirEgreso`, cada gasto lleva su propio
      // comprobante.
      localStorage.setItem(MEMORIA_ULTIMO, JSON.stringify({
        valor: valor.replace(/\./g, ''), categoria_id: categoria!.id, categoria: categoria!.nombre,
        naturaleza, destino,
      }));
    } catch { /* sin memoria: no pasa nada */ }
  }

  function repetirUltimo() {
    if (!ultimo) return;
    const r = repetirEgreso(ultimo);
    const cat = categorias.find(c => c.id === r.categoria_id) ?? null;
    setValor(pesos(r.valor)); setCategoria(cat); setNaturaleza(r.naturaleza); setDestino(r.destino);
    // Explícito y no heredado: el repetido empieza SIN foto y termina en el
    // paso de la cámara, aunque ya tuviera propiedad o cliente.
    setFoto(r.foto);
    setPaso(r.naturaleza !== 'DEL_NEGOCIO' && !r.destino ? 3 : 4);
  }

  function otro() {
    setPaso(1); setValor(''); setCategoria(null); setNaturaleza(null); setDestino(null); setFoto(null); setHecho(null);
  }

  const btnGrande: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 18px',
    border: `1.5px solid ${C.line}`, borderRadius: 14, background: '#fff', cursor: 'pointer',
    fontSize: '1rem', fontWeight: 700, color: C.navy, textAlign: 'left',
  };

  if (hecho) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: hecho.reciboPendiente ? C.badBg : hecho.enCola ? C.warnBg : '#F0FDF4', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
          {hecho.reciboPendiente
            ? <AlertTriangle size={30} style={{ color: C.bad }} />
            : hecho.enCola ? <CloudOff size={30} style={{ color: C.warn }} /> : <Check size={32} style={{ color: C.ok }} />}
        </div>
        <h2 style={{ color: C.navy, margin: '0 0 6px' }}>${hecho.valor}</h2>
        <p style={{ color: C.muted, margin: '0 0 4px' }}>{hecho.categoria}</p>
        {hecho.reciboPendiente ? (
          /* El caso que antes pasaba callado: el gasto viajó y la foto no. */
          <div style={{ background: C.badBg, border: `2px solid #FCA5A5`, borderRadius: 12, padding: '0.9rem 1rem', margin: '0 0 1.25rem', textAlign: 'left' }}>
            <p style={{ color: '#7F1D1D', fontWeight: 800, margin: '0 0 6px' }}>
              El gasto se guardó, pero la foto del recibo NO se subió.
            </p>
            <p style={{ color: '#7F1D1D', fontSize: '0.85rem', margin: '0 0 6px' }}>
              La foto sigue guardada en este teléfono y se reintenta sola. No cierres la pestaña hasta que suba.
            </p>
            {hecho.motivoFoto && <p style={{ color: '#7F1D1D', fontSize: '0.78rem', margin: 0 }}>Motivo: {hecho.motivoFoto}</p>}
          </div>
        ) : (
          <p style={{ color: hecho.enCola ? C.warn : C.ok, fontWeight: 700, margin: '0 0 1.5rem' }}>
            {hecho.enCola
              ? 'Guardado en este teléfono. Subirá solo cuando vuelva la señal; no cierres la pestaña hasta entonces.'
              : 'Guardado. Falta completarlo en el escritorio (proveedor, factura).'}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={otro} style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none' }}>Otro gasto</button>
          <button onClick={() => router.push('/admin/finanzas')} style={{ ...btnGrande, justifyContent: 'center' }}>Volver a finanzas</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <button onClick={() => (paso === 1 ? router.push('/admin/finanzas') : setPaso(paso - 1))}
          aria-label="Atrás" style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.navy, padding: 6 }}>
          <ArrowLeft size={22} />
        </button>
        <strong style={{ color: C.navy, fontSize: '1.05rem' }}>Nuevo gasto</strong>
        <span style={{ marginLeft: 'auto', color: C.muted, fontSize: '0.8rem' }}>Paso {paso} de 4</span>
      </div>

      {cola.length > 0 && (
        <div style={{ background: C.warnBg, border: '1.5px solid #FDE68A', color: '#78350F', borderRadius: 12, padding: '0.7rem 0.9rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
          {avisoDeCola(cola)}
        </div>
      )}
      {error && <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 12, padding: '0.7rem 0.9rem', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

      {paso === 1 && (
        <div>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <input
              value={valor ? `$ ${valor}` : ''}
              onChange={e => setValor(pesos(e.target.value))}
              inputMode="numeric" autoFocus placeholder="$ 0"
              aria-label="Valor del gasto"
              style={{ width: '100%', border: 'none', borderBottom: `2px solid ${C.line}`, fontSize: '2.6rem', fontWeight: 800, textAlign: 'center', color: C.navy, outline: 'none', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>
          {ultimo && (
            <button onClick={repetirUltimo} style={{ ...btnGrande, borderStyle: 'dashed' }}>
              <Repeat size={20} />
              <span style={{ fontWeight: 700 }}>Repetir el último<br />
                <span style={{ fontWeight: 400, fontSize: '0.85rem', color: C.muted }}>
                  {ultimo.categoria} · ${Number(ultimo.valor).toLocaleString('es-CO')}
                  {ultimo.destino ? ` · ${ultimo.destino.etiqueta}` : ''} · sin la foto: hay que tomar la del recibo nuevo
                </span>
              </span>
            </button>
          )}
          <button onClick={() => setPaso(2)} disabled={!valor}
            style={{ ...btnGrande, justifyContent: 'center', marginTop: 14, background: C.navy, color: '#fff', border: 'none', opacity: valor ? 1 : 0.4 }}>
            Siguiente
          </button>
        </div>
      )}

      {paso === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {categorias.map(c => {
            const Icono = ICONOS[c.nombre] ?? MoreHorizontal;
            const sel = categoria?.id === c.id;
            return (
              <button key={c.id} onClick={() => { setCategoria(c); setPaso(3); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 14px', minHeight: 96, borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: 700, border: `1.5px solid ${sel ? C.navy : C.line}`, background: sel ? '#F8FAFC' : '#fff', color: C.navy }}>
                <Icono size={22} />
                {c.nombre}
              </button>
            );
          })}
        </div>
      )}

      {paso === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NATURALEZAS.map(n => (
            <button key={n.valor} onClick={() => { setNaturaleza(n.valor); setDestino(null); if (n.valor === 'DEL_NEGOCIO') setPaso(4); }}
              style={{ ...btnGrande, borderColor: naturaleza === n.valor ? C.navy : C.line, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span>{n.titulo}</span>
              <span style={{ fontWeight: 400, fontSize: '0.82rem', color: C.muted }}>{n.ayuda}</span>
            </button>
          ))}
          {necesitaDestino && (
            <SelectorDestino
              tipo={naturaleza === 'DE_OPERACION' ? 'propiedad' : 'cliente'}
              elegido={destino}
              onElegir={d => { setDestino(d); setPaso(4); }}
            />
          )}
        </div>
      )}

      {paso === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input ref={camara} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { setFoto(await comprimir(f)); } catch { setError('No se pudo procesar la foto.'); }
              e.target.value = '';
            }} />
          {foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={foto} alt="Recibo" style={{ width: '100%', borderRadius: 14, border: `1px solid ${C.line}` }} />
            : <button onClick={() => camara.current?.click()} style={{ ...btnGrande, justifyContent: 'center', minHeight: 120, flexDirection: 'column', gap: 8 }}>
                <Camera size={30} /> Tomar foto del recibo
              </button>}
          {foto && <button onClick={() => setFoto(null)} style={{ ...btnGrande, justifyContent: 'center' }}><X size={18} /> Quitar la foto</button>}

          <div style={{ background: '#F8FAFC', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.8rem 1rem', fontSize: '0.85rem', color: C.muted }}>
            <div><strong style={{ color: C.navy }}>${valor}</strong> · {categoria?.nombre}</div>
            <div>{NATURALEZAS.find(n => n.valor === naturaleza)?.titulo}{destino ? ` · ${destino.etiqueta}` : ''}</div>
            <div style={{ marginTop: 4 }}>Proveedor, factura y descripción se completan después.</div>
          </div>

          <button onClick={guardar} disabled={guardando}
            style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none' }}>
            {guardando ? <Loader2 size={18} className="girar" /> : <Check size={18} />} Guardar
          </button>
          <style>{'.girar{animation:girar 1s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}
    </div>
  );
}

/** Buscador con los recientes arriba: nada de listas alfabéticas de 200 filas. */
function SelectorDestino({ tipo, elegido, onElegir }: { tipo: 'propiedad' | 'cliente'; elegido: Destino | null; onElegir: (d: Destino) => void }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState<Destino[]>([]);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);

  const buscar = useCallback(async (texto: string) => {
    setCargando(true);
    try {
      const r = await fetch(`/api/admin/finanzas/destinos?q=${encodeURIComponent(texto)}`);
      const d = await r.json();
      setLista(tipo === 'propiedad' ? d.propiedades ?? [] : d.terceros ?? []);
    } catch { /* la lista queda como esté */ }
    setCargando(false);
  }, [tipo]);

  useEffect(() => { buscar(''); }, [buscar]);
  useEffect(() => {
    const t = setTimeout(() => buscar(q), 250);
    return () => clearTimeout(t);
  }, [q, buscar]);

  async function crear() {
    setCreando(true);
    try {
      const r = await fetch('/api/admin/finanzas/destinos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: q, rol: 'CLIENTE' }),
      });
      if (r.ok) onElegir(await r.json());
    } finally { setCreando(false); }
  }

  return (
    <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '8px 10px' }}>
        <Search size={16} style={{ color: C.muted }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={tipo === 'propiedad' ? 'Buscar propiedad…' : 'Buscar cliente…'}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: C.navy, fontFamily: 'inherit' }} />
        {cargando && <Loader2 size={15} className="girar" style={{ color: C.muted }} />}
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lista.map(d => (
          <button key={d.id} onClick={() => onElegir(d)}
            style={{ textAlign: 'left', padding: '11px 12px', borderRadius: 10, border: `1.5px solid ${elegido?.id === d.id ? C.navy : C.line}`, background: '#fff', cursor: 'pointer', color: C.navy, fontWeight: 600, fontSize: '0.9rem' }}>
            {d.etiqueta}
            {d.detalle && <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78rem', color: C.muted }}>{d.detalle}</span>}
          </button>
        ))}
        {!cargando && lista.length === 0 && <p style={{ color: C.muted, fontSize: '0.85rem', margin: 4 }}>Sin resultados.</p>}
      </div>
      {tipo === 'cliente' && q.trim().length >= 3 && (
        <button onClick={crear} disabled={creando}
          style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px dashed ${C.blue}`, background: '#fff', color: C.blue, fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>
          {creando ? 'Creando…' : `Crear cliente «${q.trim()}» (datos del RUT después)`}
        </button>
      )}
    </div>
  );
}
