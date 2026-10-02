import { useState } from 'react'
import Jour, { MESSAGE_NON_ENREGISTRE } from './pages/Jour'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Bilan from './pages/Bilan'
import Reglages from './pages/Reglages'
import { verrouiller } from './securite'

const ONGLETS = [
  { id: 'jour', label: 'Jour', icone: '📅' },
  { id: 'clients', label: 'Crédits', icone: '👥' },
  { id: 'bilan', label: 'Bilan', icone: '📊' },
  { id: 'reglages', label: 'Réglages', icone: '⚙️' },
]

export default function App() {
  const [onglet, setOnglet] = useState('jour')
  const [clientId, setClientId] = useState(null)
  const [jourModifie, setJourModifie] = useState(false)

  function ouvrirClient(id) {
    setJourModifie(false)
    setClientId(id)
    setOnglet('clients')
  }

  function changerOnglet(id) {
    if (onglet === 'jour' && id !== 'jour' && jourModifie && !confirm(MESSAGE_NON_ENREGISTRE)) return
    setJourModifie(false)
    setClientId(null)
    setOnglet(id)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-orange-50/60 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-orange-600 px-4 py-3 text-white shadow">
        <h1 className="text-lg font-bold">Patte & Fromage</h1>
        <button type="button" onClick={verrouiller} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium active:bg-white/25">
          Déconnexion
        </button>
      </header>
      <main className="p-4">
        {onglet === 'jour' && <Jour onOuvrirClient={ouvrirClient} onModifie={setJourModifie} />}
        {onglet === 'clients' &&
          (clientId ? (
            <ClientDetail clientId={clientId} onRetour={() => setClientId(null)} />
          ) : (
            <Clients onOuvrirClient={ouvrirClient} />
          ))}
        {onglet === 'bilan' && <Bilan />}
        {onglet === 'reglages' && <Reglages />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-orange-100 bg-white pb-[env(safe-area-inset-bottom)]">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => changerOnglet(o.id)}
            className={`flex flex-1 flex-col items-center py-2 text-xs ${onglet === o.id ? 'font-semibold text-orange-700' : 'text-gray-500'}`}
          >
            <span className="text-xl">{o.icone}</span>
            {o.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
