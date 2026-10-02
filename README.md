# Patte & Fromage

Application téléphone pour suivre les ventes de pattes et fromages au bureau :
ventes du jour, crédits des clients (Ananako), monnaie à rendre (Ananany) et bilans.

## Lancer

```bash
npm install
npm run dev        # ouvre http://localhost:5173 (et l'adresse réseau pour le téléphone)
npm run build      # version finale dans dist/
```

Pour l'essayer sur le téléphone : PC et téléphone sur le même Wi-Fi, puis ouvrir
l'adresse « Network » affichée par `npm run dev`.

## Données

Tout est stocké dans le navigateur (IndexedDB), sans serveur. Penser à faire une
sauvegarde régulière depuis l'onglet **Réglages**.

Un mot de passe est demandé une fois par jour (créé au premier lancement, modifiable
dans Réglages). Il n'est pas inclus dans les sauvegardes et ne peut pas être récupéré :
en cas d'oubli, il faut tout effacer puis restaurer une sauvegarde.

| Écran | Rôle |
|---|---|
| Jour | Compteurs des ventes payées, crédits du jour, ma conso (Ahy), congé/absent |
| Crédits | Solde de chaque client : ce qu'il me doit ou ce que je lui dois |
| Bilan | Totaux par semaine ou par mois, tableau jour par jour |
| Réglages | Prix des produits, sauvegarde et restauration |
