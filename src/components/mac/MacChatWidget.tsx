'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Send } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyCard {
  id: string
  slug: string
  titulo: string
  municipio: string
  vereda: string | null
  precioFormateado: string
  fotoPrincipal: string | null
  urlFicha: string
  tipo: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  properties?: PropertyCard[]
  ts: Date
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const match = document.cookie.match(/(?:^|;\s*)mac_session=([^;]+)/)
  if (match?.[1]) return decodeURIComponent(match[1])
  const id  = crypto.randomUUID()
  const exp = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `mac_session=${id}; expires=${exp}; path=/; SameSite=Lax`
  return id
}

function isBubbleDismissed(): boolean {
  return document.cookie.includes('mac_bubble_closed=1')
}

function setBubbleDismissed() {
  // Session cookie (no max-age) — gone when browser closes
  document.cookie = 'mac_bubble_closed=1; path=/; SameSite=Lax'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm"
      style={{ background: 'rgba(255,255,255,0.09)' }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block w-2 h-2 rounded-full"
          style={{
            background: '#E8B92F',
            animation: 'macDot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

function PropCard({ p }: { p: PropertyCard }) {
  return (
    <Link
      href={p.urlFicha}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden mt-2 transition-opacity hover:opacity-90"
      style={{ border: '1px solid rgba(232,185,47,0.25)', background: 'rgba(255,255,255,0.06)' }}
    >
      {p.fotoPrincipal && (
        <div className="relative w-full" style={{ height: 112 }}>
          <Image
            src={p.fotoPrincipal}
            alt={p.titulo}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="text-white text-xs font-bold leading-tight line-clamp-1">{p.titulo}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {p.municipio}{p.vereda ? ` · ${p.vereda}` : ''}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-bold" style={{ color: '#E8B92F' }}>
            {p.precioFormateado}
          </span>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#E8B92F', color: '#0D2D5E' }}
          >
            Ver ficha →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Speech bubble (desktop) ─────────────────────────────────────────────────

function SpeechBubble({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="mac-bubble-in absolute select-none"
      style={{
        // Appears above and to the left of the character
        bottom: 'calc(100% + 12px)',
        right: 0,
        width: 210,
      }}
    >
      {/* Bubble body */}
      <div
        className="relative rounded-2xl rounded-br-sm px-4 py-3 text-sm font-medium leading-snug shadow-xl"
        style={{ background: '#0D2D5E', color: '#fff', border: '1px solid rgba(232,185,47,0.35)' }}
      >
        Hola 👋 ¿Buscas propiedad en La Vega?

        {/* Close button */}
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          aria-label="Cerrar sugerencia"
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#E8B92F', color: '#0D2D5E' }}
        >
          <X size={10} strokeWidth={3} />
        </button>
      </div>

      {/* Tail — right-aligned pointing down-right */}
      <div
        style={{
          position: 'absolute',
          bottom: -7,
          right: 14,
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '0px solid transparent',
          borderTop: '8px solid rgba(232,185,47,0.35)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          right: 15,
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '0px solid transparent',
          borderTop: '7px solid #0D2D5E',
        }}
      />
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function MacChatWidget() {
  const [isOpen,      setIsOpen]      = useState(false)
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [isTyping,    setIsTyping]    = useState(false)
  const [hasUnread,   setHasUnread]   = useState(false)
  const [sessionId,   setSessionId]   = useState<string | null>(null)
  const [showBubble,  setShowBubble]  = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const isSending      = useRef(false)
  const sendStartRef   = useRef(0)

  // Init session on mount (client-only)
  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  // Show speech bubble after 4s (if not dismissed this session)
  useEffect(() => {
    if (isBubbleDismissed()) return
    const t = setTimeout(() => setShowBubble(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // Focus input when panel opens; clear unread
  useEffect(() => {
    if (!isOpen) return
    setHasUnread(false)
    setShowBubble(false)
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [isOpen])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleDismissBubble = useCallback(() => {
    setShowBubble(false)
    setBubbleDismissed()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId || isSending.current) return
    isSending.current  = true
    sendStartRef.current = Date.now()

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: 'user', content: text.trim(), ts: new Date(),
    }])
    setInput('')
    setIsTyping(true)

    const minDelay = 1500 + Math.random() * 1000

    try {
      const res  = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text.trim(), channel: 'WEB' }),
      })
      const data = await res.json()

      const remaining = Math.max(0, minDelay - (Date.now() - sendStartRef.current))
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining))

      setIsTyping(false)
      setMessages(prev => [...prev, {
        id:         crypto.randomUUID(),
        role:       'assistant',
        content:    data.reply ?? 'Lo siento, algo salió mal. Intenta de nuevo.',
        properties: data.properties?.length ? data.properties : undefined,
        ts:         new Date(),
      }])
      if (!isOpen) setHasUnread(true)

    } catch {
      const remaining = Math.max(0, minDelay - (Date.now() - sendStartRef.current))
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Tuve un problema al conectarme. Por favor intenta en un momento.',
        ts: new Date(),
      }])
    } finally {
      isSending.current = false
    }
  }, [sessionId, isOpen])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  // ── Geometry notes ────────────────────────────────────────────────────────
  // Desktop (sm+):
  //   WA/TG buttons: fixed bottom-6 right-6 (24px from right), each w-14 (56px)
  //   WA/TG left edge: 24+56 = 80px from right edge
  //   Mac character: right-24 (96px from right) → 16px gap from WA/TG ✓
  //   Character render: ~60px wide × 180px tall (natural ratio 134:400)
  //   Panel: bottom 196px (above character top), right 24px (same anchor)
  //
  // Mobile (<sm):
  //   Sticky bar: bottom-0, ~56px tall → button at bottom-16 (64px) clears it ✓
  //   Panel: bottom-[4.5rem], right-3

  return (
    <>
      {/* ── Global keyframes ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes macDot {
          0%,60%,100% { transform:translateY(0);   opacity:.35; }
          30%          { transform:translateY(-5px); opacity:1;   }
        }
        @keyframes macSlideUp {
          from { opacity:0; transform:translateY(14px) scale(.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        @keyframes macFloat {
          0%,100% { transform:translateY(0px);  }
          50%     { transform:translateY(-6px); }
        }
        @keyframes macBubbleIn {
          from { opacity:0; transform:translateY(6px) scale(.95); }
          to   { opacity:1; transform:translateY(0)   scale(1);   }
        }
        .mac-panel     { animation: macSlideUp  .2s  ease-out     forwards; }
        .mac-float     { animation: macFloat    3s   ease-in-out  infinite; }
        .mac-bubble-in { animation: macBubbleIn .25s ease-out     forwards; }
        .mac-msgs::-webkit-scrollbar       { width:4px; }
        .mac-msgs::-webkit-scrollbar-track { background:transparent; }
        .mac-msgs::-webkit-scrollbar-thumb { background:rgba(232,185,47,.25); border-radius:4px; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP LAUNCHER — full-body character (sm and up)
          Position: bottom-0 right-24 (96px from right — clears WA/TG stack)
          ════════════════════════════════════════════════════════════════════ */}
      {!isOpen && (
        <div
          className="hidden sm:block fixed z-50"
          style={{ bottom: 0, right: '6rem' }}
        >
          {/* Speech bubble */}
          {showBubble && (
            <SpeechBubble onClose={handleDismissBubble} />
          )}

          {/* Character button */}
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir chat con Mac, asistente virtual de Su Finca Raíz"
            className="mac-float block relative transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none"
            style={{ width: 60, height: 180 }}
          >
            {/* Unread badge */}
            {hasUnread && (
              <span
                className="absolute top-2 right-0 w-4 h-4 rounded-full border-2 border-white z-10"
                style={{ background: '#EF4444' }}
              />
            )}
            <Image
              src="/mac-avatar.webp"
              alt="Mac, asistente virtual de Su Finca Raíz"
              fill
              className="object-contain object-bottom drop-shadow-xl"
              sizes="60px"
              loading="lazy"
              priority={false}
            />
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE LAUNCHER — round bubble with face crop (below sm)
          Position: bottom-16 right-4 (64px from bottom, clears sticky bar)
          ════════════════════════════════════════════════════════════════════ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat con Mac, asistente virtual de Su Finca Raíz"
          className="sm:hidden fixed z-50 rounded-full shadow-xl overflow-hidden transition-transform duration-200 hover:scale-110 active:scale-95"
          style={{
            width:  56,
            height: 56,
            bottom: '4rem',   // 64px — above sticky bar (~56px)
            right:  '1rem',
            background: '#0D2D5E',
            border: '2px solid #E8B92F',
          }}
        >
          {hasUnread && (
            <span
              className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white z-10"
              style={{ background: '#EF4444' }}
            />
          )}
          {/* Crop to face: character face is in top ~35% of the image */}
          <Image
            src="/mac-avatar.webp"
            alt="Mac, asistente virtual de Su Finca Raíz"
            fill
            className="object-cover"
            style={{ objectPosition: 'center 8%' }}
            sizes="56px"
            loading="lazy"
            priority={false}
          />
        </button>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          CHAT PANEL — shared for both breakpoints
          ════════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <>
          {/* Close trigger — desktop character ghost so user can re-hide */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar chat"
            className="hidden sm:flex fixed z-50 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              width: 44, height: 44,
              bottom: '0.75rem', right: '6.75rem',
              background: '#091F42',
              border: '1px solid rgba(232,185,47,0.4)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <X size={18} />
          </button>

          {/* Panel */}
          <div
            className="mac-panel fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              // Mobile: anchor above mobile button
              // Desktop (sm+): anchor above character figure
              width:  'min(380px, calc(100vw - 1.5rem))',
              height: 'min(520px, calc(100vh - 14rem))',
              // sm+ override via the sm: class is not possible in inline styles;
              // we use a single bottom value that works for both:
              // mobile  → 4rem (button) + 56px + 8px gap ≈ 124px → ~8rem
              // desktop → character 180px + 16px gap → 196px → ~12rem
              // Use clamp to adapt:
              bottom: 'clamp(8rem, 15vh, 13rem)',
              right:  'clamp(0.75rem, 5vw, 6rem)',
              background: '#0D2D5E',
              fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
              boxShadow:  '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: '#091F42', borderBottom: '1px solid rgba(232,185,47,0.18)' }}
            >
              {/* Mini avatar */}
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ border: '2px solid #E8B92F' }}>
                <Image
                  src="/mac-avatar.webp"
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: 'center 8%' }}
                  sizes="36px"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-none">Mac</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(232,185,47,0.75)' }}>
                  Asistente IA · Su Finca Raíz
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">En línea</span>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="ml-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                aria-label="Cerrar chat"
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              className="mac-msgs flex-1 overflow-y-auto px-4 py-4"
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {messages.length === 0 && (
                <p className="text-center text-xs mt-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Hola 👋 Cuéntame qué propiedad buscas.
                </p>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className="flex"
                  style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{ maxWidth: '86%' }}>
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 16,
                        ...(msg.role === 'user'
                          ? { background: '#E8B92F', color: '#0D2D5E', borderBottomRightRadius: 4, fontWeight: 500 }
                          : { background: 'rgba(255,255,255,0.09)', color: '#fff', borderBottomLeftRadius: 4 }
                        ),
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.properties?.map(p => <PropCard key={p.id} p={p} />)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start"><TypingDots /></div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="flex items-end gap-2 px-3 py-3 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#091F42' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu mensaje…"
                rows={1}
                disabled={isTyping}
                className="flex-1 resize-none text-sm bg-transparent outline-none leading-relaxed py-1.5 disabled:opacity-40"
                style={{ color: '#fff', maxHeight: 80, scrollbarWidth: 'none' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                aria-label="Enviar mensaje"
                className="flex items-center justify-center rounded-full shrink-0 transition-all hover:scale-110 active:scale-95 disabled:opacity-30"
                style={{ width: 36, height: 36, background: '#E8B92F' }}
              >
                <Send size={15} color="#0D2D5E" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
