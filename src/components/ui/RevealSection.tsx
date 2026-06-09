'use client';

import { useEffect, useRef } from 'react';

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
}

export function RevealSection({
  children,
  className,
  delay = 0,
  direction = 'up',
}: RevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ctx: { revert: () => void } | null = null;

    const init = async () => {
      const { gsap }          = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const fromVars =
        direction === 'up'
          ? { opacity: 0, y: 40 }
          : direction === 'left'
            ? { opacity: 0, x: -40 }
            : { opacity: 0, x: 40 };

      ctx = gsap.context(() => {
        gsap.from(el, {
          ...fromVars,
          duration: 0.8,
          ease: 'power3.out',
          delay,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        });
      });
    };

    void init();
    return () => ctx?.revert();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
