import { ar } from '../format'

export function Carte({ children, className = '', sansMarge = false }) {
  return (
    <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-orange-100 ${sansMarge ? '' : 'p-4'} ${className}`}>
      {children}
    </section>
  )
}

export function Bouton({ variante = 'principal', className = '', ...props }) {
  const styles = {
    principal: 'bg-orange-600 text-white active:bg-orange-700',
    secondaire: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200 active:bg-orange-100',
    danger: 'bg-red-50 text-red-700 ring-1 ring-red-200 active:bg-red-100',
  }
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2.5 font-medium disabled:opacity-40 ${styles[variante]} ${className}`}
      {...props}
    />
  )
}

export function Compteur({ valeur, onMoins, onPlus, taille = 'normal', modifie = false }) {
  const btn = taille === 'grand' ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-xl'
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Moins"
        onClick={onMoins}
        disabled={valeur <= 0}
        className={`${btn} rounded-full bg-orange-100 font-bold text-orange-800 active:bg-orange-200 disabled:opacity-30`}
      >
        −
      </button>
      <span
        className={`min-w-8 text-center font-semibold tabular-nums ${taille === 'grand' ? 'text-3xl' : 'text-xl'} ${modifie ? 'text-orange-600 underline decoration-dotted underline-offset-4' : ''}`}
      >
        {valeur}
      </span>
      <button
        type="button"
        aria-label="Plus"
        onClick={onPlus}
        className={`${btn} rounded-full bg-orange-600 font-bold text-white active:bg-orange-700`}
      >
        +
      </button>
    </div>
  )
}

export function Fenetre({ titre, onFermer, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onFermer}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <button type="button" onClick={onFermer} className="text-2xl leading-none text-gray-400" aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Champ({ label, children }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  )
}

export const classeInput =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base focus:border-orange-500 focus:outline-none'

export function Choix({ options, valeur, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          onClick={() => onChange(o.valeur)}
          className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
            valeur === o.valeur ? 'bg-orange-600 text-white ring-orange-600' : 'bg-white text-gray-700 ring-gray-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Solde({ montant, grand = false }) {
  const taille = grand ? 'text-2xl' : 'text-base'
  if (Math.round(montant) === 0) return <span className={`${taille} font-semibold text-gray-400`}>À jour</span>
  return montant > 0 ? (
    <span className={`${taille} font-semibold text-orange-700`}>doit {ar(montant)}</span>
  ) : (
    <span className={`${taille} font-semibold text-sky-700`}>je dois {ar(-montant)}</span>
  )
}
