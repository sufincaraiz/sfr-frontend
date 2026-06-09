'use client';

import { useEffect, useRef } from 'react';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only on pointer: fine (desktop, not touch)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dot = dotRef.current;
    if (!dot) return;

    dot.style.display = 'block';

    const move = (e: MouseEvent) => {
      dot.style.left = `${e.clientX - 4}px`;
      dot.style.top = `${e.clientY - 4}px`;
    };

    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) {
        dot.classList.add('over-link');
      } else {
        dot.classList.remove('over-link');
      }
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      className="cursor-dot"
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}
