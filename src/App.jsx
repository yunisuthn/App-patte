import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Jour, { MESSAGE_NON_ENREGISTRE } from './pages/Jour'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Bilan from './pages/Bilan'
import Reglages from './pages/Reglages'
import { db } from './db'
import { aujourdhui, dateLongue } from './format'
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
  const client = useLiveQuery(() => clientId && db.clients.get(clientId), [clientId])
  const titre = ONGLETS.find((o) => o.id === onglet).label

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
    <div className="mx-auto min-h-dvh max-w-md bg-orange-50/60 pb-24 lg:max-w-none lg:pb-0">
      {/* Même entête sur téléphone et ordinateur ; le titre de la page n'apparaît que sur ordinateur. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-orange-600 px-4 text-white shadow">
        <div className="flex items-center gap-2 lg:w-52">
          <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg ring-1 ring-white/40" />
          <h1 className="text-lg font-bold">Patte & Fromage</h1>
        </div>
        <div className="hidden min-w-0 items-center gap-2 pl-8 text-lg lg:flex">
          {client ? (
            <>
              <button type="button" onClick={() => setClientId(null)} className="text-white/80 hover:text-white hover:underline">
                {titre}
              </button>
              <span className="text-white/60">›</span>
              <span className="truncate font-semibold">{client.nom}</span>
            </>
          ) : (
            <span className="font-semibold">{titre}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-sm text-white/80 first-letter:uppercase lg:block">{dateLongue(aujourdhui())}</span>
          <button
            type="button"
            onClick={verrouiller}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25 active:bg-white/25"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <div className="lg:pl-56">
        <main className="p-4 lg:mx-auto lg:max-w-6xl lg:p-8">
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
      </div>
      {/* En bas sur téléphone, barre latérale sur ordinateur. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-orange-100 bg-white pb-[env(safe-area-inset-bottom)] lg:top-14 lg:right-auto lg:w-56 lg:max-w-none lg:flex-col lg:gap-1 lg:border-t-0 lg:border-r lg:p-3">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => changerOnglet(o.id)}
            className={`flex flex-1 flex-col items-center py-2 text-xs lg:flex-none lg:flex-row lg:gap-3 lg:rounded-xl lg:px-4 lg:py-2.5 lg:text-base ${
              onglet === o.id ? 'font-semibold text-orange-700 lg:bg-orange-50' : 'text-gray-500 lg:hover:bg-gray-50'
            }`}
          >
            <span className="text-xl">{o.icone}</span>
            {o.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
