'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Save, X, Pencil, Trash2, Upload, PenSquare, ExternalLink, Send } from 'lucide-react';
import { cloudinaryOptimize, cloudinarySquare } from '@/lib/utils';

interface Articulo {
  id: string; slug: string; title: string; excerpt: string | null;
  cover_image_url: string | null; published_at: string | null; created_at: string;
  author_id: string | null; author_name: string | null;
}

interface Form {
  id?: string; title: string; content: string; cover_image_url: string;
  author_name: string; author_photo_url: string; author_email: string;
}

const EMPTY: Form = { title: '', content: '', cover_image_url: '', author_name: '', author_photo_url: '', author_email: '' };

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

const inputS: React.CSSProperties = { padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelS: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 };

async function uploadToCloudinary(file: File): Promise<string | null> {
  const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', 'blog');
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
    const d = await res.json();
    return d.secure_url ?? null;
  } catch { return null; }
}

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

export default function AdminBlogPage() {
  const [list, setList] = useState<Articulo[]>([]);
  const [role, setRole] = useState('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [upCover, setUpCover] = useState(false);
  const [upPhoto, setUpPhoto] = useState(false);
  const [msg, setMsg] = useState('');
  const [declaro, setDeclaro] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [me, setMe] = useState<{ nombre: string; email: string }>({ nombre: '', email: '' });
  const coverRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/blog');
    if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.articulos ?? []); setRole(d.role ?? '');
  }, []);
  useEffect(() => {
    load();
    // Datos del usuario para prellenar seudónimo + correo al crear.
    fetch('/api/admin/me').then(r => r.ok ? r.json() : null).then(d => d && setMe({ nombre: d.nombre ?? '', email: d.email ?? '' })).catch(() => {});
  }, [load]);

  const isAdmin = role === 'admin';
  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const flash = (m: string) => { setMsg(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const nuevo = () => {
    setForm({ ...EMPTY, author_name: me.nombre, author_email: me.email });
    setDeclaro(false); setAcepto(false); setShowForm(true); setMsg('');
  };
  const editar = async (id: string) => {
    setShowForm(true); setMsg('⏳ Cargando contenido…');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(`/api/admin/blog/${id}`);
      if (res.ok) {
        const d = await res.json();
        setForm({ id: d.id, title: d.title, content: d.content ?? '', cover_image_url: d.cover_image_url ?? '', author_name: d.author_name ?? '', author_photo_url: d.author_photo_url ?? '', author_email: d.author_email ?? '' });
        // Ya fue aceptado previamente al crear; no obligamos a re-tildar para editar.
        setDeclaro(true); setAcepto(true);
        setMsg('');
      } else { flash('⚠️ No se pudo cargar el artículo.'); }
    } catch { flash('⚠️ No se pudo cargar el artículo.'); }
  };
  const cerrar = () => { setForm(EMPTY); setDeclaro(false); setAcepto(false); setShowForm(false); };

  // Enlace directo desde el dashboard: /admin/blog?edit=<id> abre el editor.
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) editar(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 4) { flash('⚠️ El título es muy corto.'); return; }
    if (form.content.trim().length < 20) { flash('⚠️ El contenido es muy corto.'); return; }
    if (!form.author_email.trim()) { flash('⚠️ El correo electrónico es obligatorio.'); return; }
    if (!declaro) { flash('⚠️ Debes declarar la originalidad del contenido.'); return; }
    if (!acepto) { flash('⚠️ Debes aceptar los Términos y Condiciones.'); return; }
    setSaving(true); setMsg('');
    const editing = !!form.id;
    const res = await fetch('/api/admin/blog', {
      method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`⚠️ ${d.error ?? 'No se pudo guardar.'}`); return; }
    flash(editing ? '✅ Artículo actualizado.' : '✅ Artículo publicado.');
    cerrar(); load();
  };

  const borrar = async (a: Articulo) => {
    if (!confirm(`¿Eliminar el artículo "${a.title}"?`)) return;
    setBusyId(a.id);
    const res = await fetch(`/api/admin/blog?id=${a.id}`, { method: 'DELETE' });
    setBusyId('');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`⚠️ ${d.error ?? 'No se pudo eliminar.'}`); return; }
    flash('✅ Artículo eliminado.'); load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PenSquare size={20} style={{ color: '#1B56A1' }} />
          <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Blog</h2>
        </div>
        {!showForm && (
          <button onClick={nuevo} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.85rem', padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo artículo
          </button>
        )}
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : msg.startsWith('⏳') ? '#EFF6FF' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : msg.startsWith('⏳') ? '#BFDBFE' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : msg.startsWith('⏳') ? '#1B56A1' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={guardar} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{form.id ? 'Editar artículo' : 'Nuevo artículo'}</h3>
            <button type="button" onClick={cerrar} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}><X size={14} /> Cerrar</button>
          </div>

          <div>
            <label style={labelS}>Título del tema *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required maxLength={180} style={inputS} placeholder="Ej. La historia del café en La Vega" />
          </div>

          <div>
            <label style={labelS}>Foto del tema (opcional)</label>
            <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpCover(true); const u = await uploadToCloudinary(f); if (u) set('cover_image_url', cloudinaryOptimize(u, 1280)); setUpCover(false); }} />
            {form.cover_image_url ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => set('cover_image_url', '')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={13} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => coverRef.current?.click()} disabled={upCover} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                {upCover ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />} {upCover ? 'Subiendo…' : 'Subir portada'}
              </button>
            )}
          </div>

          <div>
            <label style={labelS}>Contenido del post *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} required rows={14} style={{ ...inputS, resize: 'vertical', minHeight: 280, lineHeight: 1.6 }} placeholder="Escribe aquí tu artículo. Separa los párrafos con una línea en blanco." />
          </div>

          <div>
            <label style={labelS}>Tus datos (seudónimo)</label>
            <input value={form.author_name} onChange={e => set('author_name', e.target.value)} maxLength={80} style={inputS} placeholder="Cómo quieres que aparezca tu nombre" />
          </div>

          <div>
            <label style={labelS}>Fotografía personal (opcional)</label>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpPhoto(true); const u = await uploadToCloudinary(f); if (u) set('author_photo_url', cloudinarySquare(u, 400)); setUpPhoto(false); }} />
            {form.author_photo_url ? (
              <div style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E8B92F' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.author_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => set('author_photo_url', '')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => photoRef.current?.click()} disabled={upPhoto} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                {upPhoto ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />} {upPhoto ? 'Subiendo…' : 'Subir foto'}
              </button>
            )}
          </div>

          <div>
            <label style={labelS}>Correo electrónico *</label>
            <input type="email" value={form.author_email} onChange={e => set('author_email', e.target.value)} required maxLength={160} style={inputS} placeholder="tucorreo@ejemplo.com" />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 5 }}>Se mostrará en tu publicación para que los interesados te puedan contactar.</p>
          </div>

          {/* Declaraciones obligatorias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.1rem' }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={declaro} onChange={e => setDeclaro(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }} />
              <span style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Declaro que el contenido compartido (textos e imágenes) es original, de mi autoría, o cuento con los
                permisos legales para su uso. Eximo a Su Finca Raíz de cualquier responsabilidad frente a terceros por
                derechos de autor o propiedad intelectual, asumiendo total responsabilidad legal por lo publicado.
                Asimismo, cedo a la plataforma los derechos de publicación, adaptación y distribución de este material.
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }} />
              <span style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Acepto los{' '}
                <Link href="/terminos-y-condiciones" target="_blank" style={{ color: '#1B56A1', fontWeight: 700, textDecoration: 'underline' }}>
                  Términos y Condiciones
                </Link>
                , incluidas las Políticas de Contenido Generado por el Usuario.
              </span>
            </label>
          </div>

          <div>
            <button type="submit" disabled={saving || upCover || upPhoto} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.92rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (form.id ? <Save size={16} /> : <Send size={16} />)} {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Publicar artículo')}
            </button>
            <p style={{ color: '#94A3B8', fontSize: '0.76rem', marginTop: 8 }}>Tu artículo se publica de inmediato en el blog.</p>
          </div>
        </form>
      )}

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
          {isAdmin ? 'Todos los artículos' : 'Mis artículos'} ({list.length})
        </div>
        {list.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>Aún no hay artículos. Crea el primero arriba.</div>}
        {list.map(a => {
          const busy = busyId === a.id;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 1.25rem', borderTop: '1px solid #F1F5F9' }}>
              {a.cover_image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.cover_image_url} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                : <div style={{ width: 56, height: 40, borderRadius: 6, background: '#F1F5F9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}><PenSquare size={16} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.76rem' }}>
                  {fmt(a.published_at ?? a.created_at)}{isAdmin && a.author_name ? ` · ${a.author_name}` : ''}{!a.author_id ? ' · comunidad' : ''}
                </p>
              </div>
              <Link href={`/blog/${a.slug}`} target="_blank" title="Ver en el blog" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><ExternalLink size={15} /></Link>
              <button onClick={() => editar(a.id)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
              {isAdmin && (
                <button onClick={() => borrar(a)} disabled={busy} title="Eliminar" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
