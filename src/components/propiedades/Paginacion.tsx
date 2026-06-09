'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { page: number; pages: number; total: number }

export function Paginacion({ page, pages, total }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  if (pages <= 1) return null;

  const go = (n: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(n));
    router.push(`${pathname}?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const btn = (content: React.ReactNode, onClick: () => void, disabled: boolean, active = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 40, height: 40, borderRadius: 8,
        border: active ? 'none' : '1.5px solid #E2E8F0',
        background: active ? '#1B56A1' : disabled ? '#F8FAFC' : '#fff',
        color: active ? '#fff' : disabled ? '#CBD5E1' : '#0D2D5E',
        fontWeight: 700, fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        padding: '0 12px',
      }}
    >
      {content}
    </button>
  );

  const pageNums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== '…') pageNums.push('…');
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
      marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #F1F5F9',
    }}>
      <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
        Página <strong>{page}</strong> de <strong>{pages}</strong> · {total} propiedades
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {btn(<ChevronLeft size={16} />, () => go(page - 1), page === 1)}
        {pageNums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#94A3B8' }}>…</span>
            : btn(n, () => go(n as number), false, n === page)
        )}
        {btn(<ChevronRight size={16} />, () => go(page + 1), page === pages)}
      </div>
    </div>
  );
}
