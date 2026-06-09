export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 16,
          overflow: 'hidden', border: '1px solid #F1F5F9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{ aspectRatio: '4/3', background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'sfr-shimmer 1.5s infinite' }} />
          <div style={{ padding: '1rem 1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 12, borderRadius: 6, background: '#F1F5F9', width: '60%' }} />
            <div style={{ height: 18, borderRadius: 6, background: '#F1F5F9', width: '85%' }} />
            <div style={{ height: 20, borderRadius: 6, background: '#FEF3C7', width: '45%' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              {[40, 50, 70].map(w => <div key={w} style={{ height: 12, borderRadius: 6, background: '#F1F5F9', width: w }} />)}
            </div>
          </div>
        </div>
      ))}
      <style>{`@keyframes sfr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
