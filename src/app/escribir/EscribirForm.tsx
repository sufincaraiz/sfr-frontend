'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Loader2, Send, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { cloudinaryOptimize, cloudinarySquare } from '@/lib/utils';

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '11px 14px',
  fontSize: '0.95rem', outline: 'none', color: '#0D2D5E', width: '100%',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.82rem', fontWeight: 700, color: '#0D2D5E', display: 'block', marginBottom: 6,
};

async function uploadToCloudinary(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);
  fd.append('folder', 'blog');
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
    const d = await res.json();
    return d.secure_url ?? null;
  } catch { return null; }
}

export function EscribirForm() {
  const router = useRouter();
  const coverRef  = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [authorPhoto, setAuthorPhoto] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAuthor, setUploadingAuthor] = useState(false);
  const [declaroOriginal, setDeclaroOriginal] = useState(false);
  const [aceptoTerminos, setAceptoTerminos]   = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [publishedSlug, setPublishedSlug] = useState('');

  const handleCover = async (file: File) => {
    setUploadingCover(true);
    const url = await uploadToCloudinary(file);
    if (url) setCoverUrl(cloudinaryOptimize(url, 1280));   // portada liviana (f_auto,q_auto)
    setUploadingCover(false);
  };
  const handleAuthorPhoto = async (file: File) => {
    setUploadingAuthor(true);
    const url = await uploadToCloudinary(file);
    if (url) setAuthorPhoto(cloudinarySquare(url, 400));   // foto cuadrada y liviana
    setUploadingAuthor(false);
  };

  const logout = async () => {
    await fetch('/api/blog-writer/logout', { method: 'POST' });
    router.push('/escribir/login');
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4) { setStatus('error'); setErrorMsg('El título es muy corto.'); return; }
    if (content.trim().length < 20) { setStatus('error'); setErrorMsg('El contenido del post es muy corto.'); return; }
    if (!authorEmail.trim()) { setStatus('error'); setErrorMsg('El correo electrónico es obligatorio.'); return; }
    if (!declaroOriginal) { setStatus('error'); setErrorMsg('Debes declarar la originalidad del contenido.'); return; }
    if (!aceptoTerminos) { setStatus('error'); setErrorMsg('Debes aceptar los Términos y Condiciones.'); return; }

    setStatus('loading'); setErrorMsg('');
    try {
      const res = await fetch('/api/blog-writer/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, content,
          cover_image_url: coverUrl,
          author_name: authorName,
          author_photo_url: authorPhoto,
          author_email: authorEmail,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus('error'); setErrorMsg(d.error ?? 'No pudimos publicar tu post.'); return; }
      setPublishedSlug(d.slug);
      setStatus('success');
    } catch {
      setStatus('error'); setErrorMsg('Error de conexión. Intenta de nuevo.');
    }
  };

  if (status === 'success') {
    return (
      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: 460, textAlign: 'center', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: '2.5rem 2rem' }}>
          <CheckCircle2 size={56} color="#15803D" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.4rem', marginBottom: 10 }}>¡Tu post fue publicado!</h1>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Ya está disponible en el blog para que el conocimiento perdure en el tiempo.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/blog/${publishedSlug}`} target="_blank" style={{ background: '#1B56A1', color: '#fff', fontWeight: 700, padding: '11px 22px', borderRadius: 10, textDecoration: 'none', fontSize: '0.9rem' }}>
              Ver mi post →
            </Link>
            <button onClick={() => { setStatus('idle'); setTitle(''); setContent(''); setCoverUrl(''); setAuthorPhoto(''); }}
              style={{ background: '#fff', color: '#1B56A1', border: '1.5px solid #E2E8F0', fontWeight: 700, padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
              Escribir otro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '80vh', background: '#F8FAFC', padding: '2.5rem 1.5rem' }}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.9rem)', marginBottom: 4 }}>Comparte tu conocimiento</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Tu escrito se publicará en el blog de la comunidad.</p>
          </div>
          <button type="button" onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '0.82rem', padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
            <LogOut size={14} /> Salir
          </button>
        </div>

        {/* Título */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          <label style={labelStyle}>Título del tema *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={180}
            placeholder="Ej. La historia del café en La Vega" style={inputStyle} />
        </div>

        {/* Foto del tema */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          <label style={labelStyle}>Foto del tema (opcional)</label>
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCover(e.target.files[0])} />
          {coverUrl ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => setCoverUrl('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => coverRef.current?.click()} disabled={uploadingCover}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              {uploadingCover ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
              {uploadingCover ? 'Subiendo…' : 'Subir foto del tema'}
            </button>
          )}
        </div>

        {/* Detalles del post */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          <label style={labelStyle}>Detalles del post *</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} required rows={14}
            placeholder="Escribe aquí tu artículo, mensaje o historia. Separa los párrafos con una línea en blanco."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 280, lineHeight: 1.6 }} />
        </div>

        {/* Autor */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Tus datos (seudónimo)</label>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} maxLength={80}
              placeholder="Cómo quieres que aparezca tu nombre" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Foto de la persona (opcional)</label>
            <input ref={authorRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleAuthorPhoto(e.target.files[0])} />
            {authorPhoto ? (
              <div style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E8B92F' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={authorPhoto} alt="Autor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => setAuthorPhoto('')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => authorRef.current?.click()} disabled={uploadingAuthor}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                {uploadingAuthor ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                {uploadingAuthor ? 'Subiendo…' : 'Subir tu foto'}
              </button>
            )}
          </div>
          <div>
            <label style={labelStyle}>Correo electrónico *</label>
            <input type="email" value={authorEmail} onChange={e => setAuthorEmail(e.target.value)} required maxLength={160}
              placeholder="tucorreo@ejemplo.com" style={inputStyle} />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 5 }}>Se mostrará en tu publicación para que los interesados te puedan contactar.</p>
          </div>
        </div>

        {/* Declaraciones obligatorias */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={declaroOriginal} onChange={e => setDeclaroOriginal(e.target.checked)} required
              style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }} />
            <span style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.55 }}>
              Declaro que el contenido compartido (textos e imágenes) es original, de mi autoría, o cuento con los
              permisos legales para su uso. Eximo a Su Finca Raíz de cualquier responsabilidad frente a terceros por
              derechos de autor o propiedad intelectual, asumiendo total responsabilidad legal por lo publicado.
              Asimismo, cedo a la plataforma los derechos de publicación, adaptación y distribución de este material.
            </span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptoTerminos} onChange={e => setAceptoTerminos(e.target.checked)} required
              style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }} />
            <span style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.55 }}>
              Acepto los{' '}
              <Link href="/terminos-y-condiciones" target="_blank" style={{ color: '#1B56A1', fontWeight: 700, textDecoration: 'underline' }}>
                Términos y Condiciones
              </Link>
              , incluidas las Políticas de Contenido Generado por el Usuario.
            </span>
          </label>
        </div>

        {status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: '#B91C1C', fontSize: '0.88rem' }}>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={status === 'loading' || uploadingCover || uploadingAuthor}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: status === 'loading' ? '#94A3B8' : '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', padding: '15px', border: 'none', borderRadius: 12, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}>
          {status === 'loading' ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={17} />}
          {status === 'loading' ? 'Publicando…' : 'Publicar mi post'}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
