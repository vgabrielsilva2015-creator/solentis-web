export function Logo({ className = "", size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 48 : 31

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div 
        style={{
          width: dim,
          height: dim,
          borderRadius: size === "lg" ? '12px' : '9px',
          background: 'linear-gradient(150deg, #3ad0d6, #0a86a0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(10, 134, 160, 0.32)'
        }}
        className="shrink-0 sol-logo"
      >
        <span className="sol-surface"></span>
        <span className="sol-b sol-b1"></span>
        <span className="sol-b sol-b2"></span>
        <span className="sol-b sol-b3"></span>
        <span className="sol-b sol-b4"></span>
      </div>
      <span 
        className={`font-heading font-bold text-slate-100 ${size === "lg" ? "text-2xl" : "text-lg"}`}
        style={{ letterSpacing: "-0.03em" }}
      >
        solentis
      </span>
    </div>
  )
}
