export default function DashboardLoading() {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-sora), sans-serif' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ width: '200px', height: '28px', background: 'var(--s2)', borderRadius: '6px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
          <div style={{ width: '300px', height: '16px', background: 'var(--s2)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ width: '120px', height: '36px', background: 'var(--s2)', borderRadius: '20px', animation: 'pulse 1.5s infinite' }}></div>
      </div>

      {/* KPI Row Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--s2)', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '60%', height: '16px', background: 'var(--s2)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '80%', height: '24px', background: 'var(--s2)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Big Chart Skeleton */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', height: '300px' }}>
             <div style={{ width: '40%', height: '20px', background: 'var(--s2)', borderRadius: '4px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}></div>
             <div style={{ width: '100%', height: '200px', background: 'var(--s2)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', height: '200px' }}>
             <div style={{ width: '30%', height: '20px', background: 'var(--s2)', borderRadius: '4px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}></div>
             <div style={{ width: '100%', height: '100px', background: 'var(--s2)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
        </div>
        
        {/* Sidebar Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', height: '150px' }}>
               <div style={{ width: '50%', height: '16px', background: 'var(--s2)', borderRadius: '4px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}></div>
               <div style={{ width: '100%', height: '40px', background: 'var(--s2)', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
               <div style={{ width: '80%', height: '40px', background: 'var(--s2)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
            </div>
          ))}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: \
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      \}} />
    </div>
  )
}
