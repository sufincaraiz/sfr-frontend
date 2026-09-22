'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudOff, ImageOff, Loader2, Plus, UploadCloud } from 'lucide-react';
import {
  almacenNavegador, avisoDeCola, leerCola, vaciarCola,
  avisoDeRecibos, leerRecibos, vaciarRecibos,
  type PendienteEnCola, type ReciboPendiente,
} from '@/lib/finanzas/cola-egresos';

/** data URL → File, para subir la foto que quedó guardada en el teléfono. */
function dataUrlAFile(dataUrl: string): File {
  const [cab, b64] = dataUrl.split(',');
  const bin = atob(b64!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'recibo.jpg', { type: cab!.includes('png') ? 'image/png' : 'image/jpeg' });
}

/**
 * Aviso de la cola + botón flotante «+ Gasto», presentes en todo el módulo.
 *
 * El aviso es DELIBERADAMENTE incómodo: rojo, fijo arriba y con el riesgo
 * escrito. Se eligió la cola local (no una PWA con service worker), así que
 * lo que está en cola vive solo en este teléfono y en esta pestaña. Un aviso
 * discreto acabaría en gastos perdidos sin que nadie se entere.
 *
 * Reintenta solo: al montar, al volver la señal (`online`) y cada 60 s.
 */
export default function ColaYAcciones() {
  const ruta = usePathname();
  const [cola, setCola] = useState<PendienteEnCola[]>([]);
  const [recibos, setRecibos] = useState<ReciboPendiente[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState('');

  const refrescar = useCallback(() => {
    const a = almacenNavegador();
    setCola(a ? leerCola(a) : []);
    setRecibos(a ? leerRecibos(a) : []);
  }, []);

  /**
   * Recibos de gastos YA guardados cuya foto no subió. Se reintenta la subida
   * y, si funciona, se adjunta al gasto por su id. La foto no se descarta
   * nunca sola: o sube, o sigue aquí a la vista.
   */
  const subirRecibos = useCallback(async () => {
    const a = almacenNavegador();
    if (!a || leerRecibos(a).length === 0) return;
    const r = await vaciarRecibos(a, async rec => {
      try {
        const fd = new FormData();
        fd.append('archivo', dataUrlAFile(rec.foto));
        const rf = await fetch('/api/admin/finanzas/recibos', { method: 'POST', body: fd });
        if (!rf.ok) {
          const j = await rf.json().catch(() => ({}));
          return { ok: false, error: j.error ?? `la subida respondió ${rf.status}` };
        }
        const { public_id } = await rf.json();
        const res = await fetch(`/api/admin/finanzas/egresos/${rec.egreso_id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'adjuntar-recibo', public_id }),
        });
        if (res.ok) return { ok: true };
        const j = await res.json().catch(() => ({}));
        return { ok: false, error: j.error ?? `no se pudo adjuntar (${res.status})` };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'sin conexión' };
      }
    });
    refrescar();
    if (r.subidos) setResultado(`${r.subidos === 1 ? 'Recibo subido' : `${r.subidos} recibos subidos`} y adjuntado${r.subidos === 1 ? '' : 's'} al gasto.`);
  }, [refrescar]);

  const subir = useCallback(async () => {
    const a = almacenNavegador();
    if (!a || leerCola(a).length === 0 || subiendo) return;
    setSubiendo(true);
    const r = await vaciarCola(a, async p => {
      try {
        let publicId: string | null = null;
        if (p.foto) {
          const [cab, b64] = p.foto.split(',');
          const bin = atob(b64!);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const fd = new FormData();
          fd.append('archivo', new File([bytes], 'recibo.jpg', { type: cab!.includes('png') ? 'image/png' : 'image/jpeg' }));
          const rf = await fetch('/api/admin/finanzas/recibos', { method: 'POST', body: fd });
          if (rf.ok) publicId = (await rf.json()).public_id;
          else if (rf.status !== 503) return { ok: false, error: 'no se pudo subir la foto' };
        }
        const res = await fetch('/api/admin/finanzas/egresos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p.cuerpo, soporte_public_id: publicId }),
        });
        if (res.ok) return { ok: true };
        // Un 400 no se arregla reintentando, pero tampoco se tira el gasto: se
        // queda en cola con el motivo a la vista para corregirlo a mano.
        const j = await res.json().catch(() => ({}));
        return { ok: false, error: j.error ?? `error ${res.status}` };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'sin conexión' };
      }
    });
    refrescar();
    setSubiendo(false);
    if (r.subidos) setResultado(`${r.subidos} ${r.subidos === 1 ? 'gasto subido' : 'gastos subidos'}.`);
  }, [refrescar, subiendo]);

  useEffect(() => {
    refrescar();
    subir();
    subirRecibos();
    const alVolver = () => { refrescar(); subir(); subirRecibos(); };
    window.addEventListener('online', alVolver);
    const t = setInterval(alVolver, 60_000);
    return () => { window.removeEventListener('online', alVolver); clearInterval(t); };
  }, [refrescar, subir, subirRecibos]);

  const aviso = avisoDeCola(cola);
  const avisoRecibo = avisoDeRecibos(recibos);
  const enCaptura = ruta?.endsWith('/egresos/nuevo');

  return (
    <>
      {aviso && (
        <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          <CloudOff size={20} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{aviso}</span>
          <button onClick={subir} disabled={subiendo}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #7F1D1D', background: '#fff', color: '#7F1D1D', borderRadius: 9, padding: '7px 12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}>
            {subiendo ? <Loader2 size={14} className="girar" /> : <UploadCloud size={14} />} Subir ahora
          </button>
        </div>
      )}
      {avisoRecibo && (
        <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 41, display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          <ImageOff size={20} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            {avisoRecibo}
            {recibos[0]?.ultimo_error && (
              <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78rem', marginTop: 2 }}>Último motivo: {recibos[0].ultimo_error}</span>
            )}
          </span>
          <button onClick={subirRecibos}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #7F1D1D', background: '#fff', color: '#7F1D1D', borderRadius: 9, padding: '7px 12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}>
            <UploadCloud size={14} /> Reintentar
          </button>
        </div>
      )}
      {resultado && !aviso && !avisoRecibo && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#15803D', borderRadius: 12, padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{resultado}</div>
      )}

      {!enCaptura && (
        <Link href="/admin/finanzas/egresos/nuevo" aria-label="Registrar un gasto"
          style={{ position: 'fixed', right: 20, bottom: 24, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', borderRadius: 999, padding: '14px 20px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 10px 24px rgba(13,45,94,.28)' }}>
          <Plus size={20} /> Gasto
        </Link>
      )}
      <style>{'.girar{animation:girar 1s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </>
  );
}
