// Marca Solentis da landing (gota/bolhas animadas). Usa as classes .sol-* de landing.css.
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display font-bold ${large ? 'text-3xl' : 'text-lg'}`}
    >
      <span className={`sol-logo ${large ? 'size-11' : 'size-8'}`} aria-hidden="true">
        <span className="sol-surface" />
        <span className="sol-b sol-b1" />
        <span className="sol-b sol-b2" />
        <span className="sol-b sol-b3" />
        <span className="sol-b sol-b4" />
      </span>
      solentis
    </span>
  )
}
