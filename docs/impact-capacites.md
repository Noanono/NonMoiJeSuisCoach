# Impact réel des capacités en match

Mesures du banc `src/domain/match/impactBench.ts` (catalogue de 69 capacités, novembre 2026), à régénérer avec `bun run impact`. Les cibles par coût et les règles d'équilibrage sont dans [equilibrage-capacites.md](equilibrage-capacites.md).

## Méthode

- Deux équipes identiques (note 60 partout, 4-4-2), sans aucune autre capacité, aucune IA qui active quoi que ce soit.
- 1 000 matchs par capacité et par niveau, joués deux fois avec la même graine : une fois sans rien faire, une fois en activant la capacité. L'écart entre les deux versions est l'effet de la capacité.
- Activation à la 30e minute, jauge pleine, meilleures cibles choisies. Une capacité à condition de minute attend sa minute ; une condition de score est installée dans les deux versions.
- Capacités de penalty et de coup franc : l'événement est provoqué dans les deux versions, et le coach joue l'option qui convient à la capacité.
- Le contexte qui rend la capacité utile est installé dans les deux versions : joueurs au sol pour les relèves, malus pour les soins, but adverse récent pour une annulation, capacité adverse à copier, capacité adverse hostile pour un bouclier, une immunité ou le docteur. Le Maillot retourné est mesuré avec une équipe à domicile plus faible (note 50).
- **Δ points (jouable)** : écart de points sur le match entier ; pour une capacité à condition, rapporté aux matchs où elle a pu être jouée.
- **±** : deux erreurs types. Une capacité hors de sa fourchette de moins que cette marge est « dans la marge » : 1 000 matchs ne permettent pas de trancher.

## Bilan

| Niveau | Dans la cible | Dans la marge (bas) | Dans la marge (haut) | Hors cible |
| --- | ---: | ---: | ---: | ---: |
| 1 | 52 | 10 | 7 | 0 |
| 5 | 60 | 3 | 6 | 0 |

L'équilibrage a été réglé sur 3 000 matchs au niveau 1 et 2 500 au niveau 5, où toutes les capacités tombent dans leur fourchette.

## Mesures au niveau 1

| Capacité | Rareté | Coût | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points (jouable) | ± | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Dégagement au pif | Commune | 1 | 12 min | 100 % | 0.21 → 0.33 | 0.20 → 0.19 | +0.17 | +0.12 | ±0.07 | 0.06 à 0.10 | dans la marge (haut) |
| La Sortie aux poings | Commune | 2 | 15 min | 100 % | 0.26 → 0.28 | 0.24 → 0.10 | +0.22 | +0.17 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Gardien volant | Commune | 2 | 35 min | 100 % | 0.57 → 0.60 | 0.54 → 0.29 | +0.28 | +0.19 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Coup d’épaule | Commune | 1 | 13 min | 99 % | 0.23 → 0.37 | 0.22 → 0.20 | +0.15 | +0.09 | ±0.07 | 0.06 à 0.10 | dans la cible |
| Le Tacle sur gravier | Commune | 2 | 16 min | 99 % | 0.28 → 0.52 | 0.26 → 0.26 | +0.25 | +0.15 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Videur | Commune | 2 | 25 min | 99 % | 0.41 → 0.42 | 0.39 → 0.20 | +0.23 | +0.16 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Béton armé | Commune | 3 | 45 min | 99 % | 0.73 → 0.78 | 0.68 → 0.26 | +0.48 | +0.34 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Métronome | Commune | 2 | 20 min | 99 % | 0.34 → 0.48 | 0.32 → 0.23 | +0.27 | +0.20 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Petit Pont | Commune | 2 | 25 min | 99 % | 0.41 → 0.65 | 0.39 → 0.39 | +0.26 | +0.18 | ±0.07 | 0.15 à 0.20 | dans la cible |
| La Symphonie | Commune | 5 | 25 min | 99 % | 0.41 → 1.22 | 0.39 → 0.15 | +1.07 | +0.65 | ±0.08 | 0.60 à 0.80 | dans la cible |
| Le Crochet | Commune | 1 | 15 min | 100 % | 0.26 → 0.35 | 0.24 → 0.24 | +0.11 | +0.09 | ±0.07 | 0.06 à 0.10 | dans la cible |
| La Mine des 25 mètres | Commune | 2 | 15 min | 100 % | 0.26 → 0.47 | 0.24 → 0.24 | +0.26 | +0.20 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Chambreur de gardien | Commune | 2 | 20 min | 100 % | 0.34 → 0.62 | 0.32 → 0.32 | +0.31 | +0.19 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Ciseau du camping | Commune | 5 | 10 min | 100 % | 0.17 → 1.15 | 0.16 → 0.12 | +1.00 | +0.61 | ±0.07 | 0.60 à 0.80 | dans la cible |
| Le Clin d’œil | Commune | 1 | 14 min | 99 % | 0.25 → 0.36 | 0.23 → 0.21 | +0.14 | +0.08 | ±0.07 | 0.06 à 0.10 | dans la cible |
| Le Terrain labouré | Commune | 3 | 30 min | 99 % | 0.50 → 0.81 | 0.46 → 0.26 | +0.53 | +0.35 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Sort de la voyante | Commune | 5 | 25 min | 99 % | 0.41 → 1.34 | 0.39 → 0.14 | +1.21 | +0.71 | ±0.09 | 0.60 à 0.80 | dans la cible |
| La Gourde magique | Commune | 2 | 15 min | 100 % | 0.26 → 0.30 | 0.24 → 0.22 | +0.28 | +0.20 | ±0.07 | 0.15 à 0.20 | dans la cible |
| L’Éponge miracle | Commune | 2 | 15 min | 100 % | 0.12 → 0.28 | 0.29 → 0.24 | +0.29 | +0.21 | ±0.08 | 0.15 à 0.20 | dans la marge (haut) |
| Le Spray magique | Commune | 1 | 12 min | 100 % | 0.19 → 0.20 | 0.22 → 0.15 | +0.07 | +0.05 | ±0.07 | 0.06 à 0.10 | dans la marge (bas) |
| Le Seau d’eau | Commune | 1 | 15 min | 99 % | 0.12 → 0.17 | 0.29 → 0.25 | +0.15 | +0.11 | ±0.07 | 0.06 à 0.10 | dans la marge (haut) |
| Le Supporter qui klaxonne | Commune | 3 | 15 min | 100 % | 0.26 → 0.32 | 0.24 → 0.20 | +0.45 | +0.29 | ±0.07 | 0.30 à 0.40 | dans la marge (bas) |
| La Tournée générale | Commune | 7 | 35 min | 100 % | 0.57 → 2.41 | 0.54 → 0.26 | +2.13 | +1.01 | ±0.09 | 1.00 à 1.40 | dans la cible |
| Le Gardien au sifflet | Rare | 2 | 15 min | 100 % | 0.26 → 0.26 | 0.24 → 0.11 | +0.26 | +0.19 | ±0.06 | 0.15 à 0.20 | dans la cible |
| Le Mur de parpaings | Rare | 2 | 15 min | 100 % | 0.26 → 0.28 | 0.24 → 0.06 | +0.32 | +0.24 | ±0.07 | 0.15 à 0.20 | dans la marge (haut) |
| Le Marquage à la culotte | Rare | 2 | 35 min | 99 % | 0.57 → 0.61 | 0.54 → 0.38 | +0.18 | +0.13 | ±0.07 | 0.15 à 0.20 | dans la marge (bas) |
| Le Rouleau compresseur | Rare | 2 | 15 min | 99 % | 0.26 → 0.33 | 0.24 → 0.23 | +0.30 | +0.18 | ±0.07 | 0.15 à 0.20 | dans la cible |
| La Tête de bois | Rare | 2 | 15 min | 99 % | 0.35 → 0.60 | 0.24 → 0.22 | +0.30 | +0.17 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Mur qui avance | Rare | 2 | 15 min | 99 % | 0.27 → 0.28 | 0.36 → 0.12 | +0.31 | +0.20 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Tacle à retardement | Rare | 3 | 15 min | 99 % | 0.26 → 0.43 | 0.24 → 0.24 | +0.49 | +0.28 | ±0.08 | 0.30 à 0.40 | dans la marge (bas) |
| Le Coup franc de kermesse | Rare | 2 | 15 min | 99 % | 0.36 → 0.59 | 0.24 → 0.21 | +0.30 | +0.22 | ±0.07 | 0.15 à 0.20 | dans la marge (haut) |
| Le Marathonien | Rare | 3 | 15 min | 99 % | 0.26 → 0.33 | 0.24 → 0.20 | +0.47 | +0.30 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Pari du milieu | Rare | 2 | 15 min | 99 % | 0.26 → 0.50 | 0.24 → 0.24 | +0.26 | +0.16 | ±0.07 | 0.15 à 0.20 | dans la cible |
| La Danse de la victoire | Rare | 2 | 15 min | 64 % | 1.23 → 1.37 | 0.18 → 0.13 | +0.16 | +0.21 | ±0.11 | 0.15 à 0.20 | dans la marge (haut) |
| Le Réveil tardif | Rare | 2 | 20 min | 99 % | 0.32 → 0.58 | 0.31 → 0.32 | +0.27 | +0.18 | ±0.06 | 0.15 à 0.20 | dans la cible |
| Le Lob du parking | Rare | 3 | 15 min | 100 % | 0.26 → 0.68 | 0.24 → 0.25 | +0.52 | +0.33 | ±0.07 | 0.30 à 0.40 | dans la cible |
| Le Plongeur de Séville | Rare | 3 | 15 min | 100 % | 0.26 → 0.65 | 0.24 → 0.24 | +0.41 | +0.27 | ±0.07 | 0.30 à 0.40 | dans la marge (bas) |
| La Causerie | Rare | 2 | 30 min | 99 % | 0.52 → 0.66 | 0.45 → 0.34 | +0.28 | +0.20 | ±0.06 | 0.15 à 0.20 | dans la cible |
| Le Fayot | Rare | 2 | 30 min | 99 % | 0.48 → 0.50 | 0.57 → 0.35 | +0.23 | +0.17 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Coup de gueule | Rare | 3 | 20 min | 99 % | 0.32 → 0.64 | 0.34 → 0.17 | +0.52 | +0.34 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Kiné du dimanche | Rare | 2 | 15 min | 100 % | 0.12 → 0.26 | 0.29 → 0.25 | +0.26 | +0.16 | ±0.07 | 0.15 à 0.20 | dans la cible |
| La Bouteille d’eau bénite | Rare | 2 | 15 min | 99 % | 0.23 → 0.38 | 0.26 → 0.17 | +0.23 | +0.17 | ±0.07 | 0.15 à 0.20 | dans la cible |
| Le Ramasseur lent | Rare | 1 | 14 min | 77 % | 1.25 → 1.07 | 0.22 → 0.06 | −0.00 | +0.05 | ±0.07 | 0.06 à 0.10 | dans la marge (bas) |
| L’Horloger du club | Rare | 2 | 15 min | 61 % | 0.23 → 0.31 | 0.23 → 0.25 | +0.06 | +0.11 | ±0.08 | 0.15 à 0.20 | dans la marge (bas) |
| Le Ballon crevé | Rare | 3 | 15 min | 100 % | 0.26 → 0.27 | 0.98 → 0.50 | +0.51 | +0.35 | ±0.07 | 0.30 à 0.40 | dans la cible |
| Le Gardien libéro | Légendaire | 3 | 15 min | 100 % | 0.26 → 0.97 | 0.24 → 0.36 | +0.63 | +0.38 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Gardien-forteresse | Légendaire | 4 | 60 min | 100 % | 0.95 → 0.98 | 1.00 → 0.28 | +0.71 | +0.50 | ±0.09 | 0.45 à 0.60 | dans la cible |
| Le Mur humain | Légendaire | 3 | 35 min | 99 % | 0.56 → 0.59 | 0.64 → 0.22 | +0.44 | +0.32 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Car à deux étages | Légendaire | 3 | 45 min | 99 % | 0.73 → 0.78 | 0.68 → 0.27 | +0.48 | +0.33 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Marquage de l’enfer | Légendaire | 5 | 45 min | 99 % | 0.73 → 1.67 | 0.68 → 0.64 | +1.02 | +0.60 | ±0.09 | 0.60 à 0.80 | dans la cible |
| Le Copieur | Légendaire | 3 | 20 min | 99 % | 0.20 → 0.44 | 0.56 → 0.25 | +0.59 | +0.35 | ±0.08 | 0.30 à 0.40 | dans la cible |
| Le Voleur de sifflet | Légendaire | 3 | 18 min | 99 % | 0.32 → 0.62 | 0.29 → 0.15 | +0.50 | +0.35 | ±0.08 | 0.30 à 0.40 | dans la cible |
| La Célébration interdite | Légendaire | 3 | 20 min | 64 % | 1.29 → 1.59 | 0.24 → 0.15 | +0.35 | +0.30 | ±0.12 | 0.30 à 0.40 | dans la cible |
| La Remontada du dimanche | Légendaire | 5 | 40 min | 73 % | 0.69 → 1.41 | 1.61 → 1.36 | +0.96 | +0.81 | ±0.11 | 0.60 à 0.80 | dans la marge (haut) |
| Le Double ou rien | Légendaire | 5 | 15 min | 100 % | 0.26 → 1.22 | 0.24 → 0.33 | +1.20 | +0.57 | ±0.09 | 0.60 à 0.80 | dans la marge (bas) |
| Le Discours de la mi-temps | Légendaire | 5 | 45 min | 99 % | 0.74 → 1.49 | 0.68 → 0.38 | +1.04 | +0.61 | ±0.09 | 0.60 à 0.80 | dans la cible |
| Le Remède de grand-mère | Légendaire | 3 | 15 min | 99 % | 0.21 → 0.29 | 0.34 → 0.22 | +0.46 | +0.29 | ±0.08 | 0.30 à 0.40 | dans la marge (bas) |
| Le Penalty imaginaire | Légendaire | 5 | 15 min | 99 % | 0.36 → 1.37 | 0.24 → 0.10 | +1.16 | +0.70 | ±0.08 | 0.60 à 0.80 | dans la cible |
| Le Coup de sifflet tardif | Légendaire | 5 | 20 min | 61 % | 0.23 → 0.65 | 0.23 → 0.17 | +0.47 | +0.68 | ±0.11 | 0.60 à 0.80 | dans la cible |
| Le Tifo géant | Légendaire | 5 | 25 min | 100 % | 0.41 → 1.29 | 0.39 → 0.14 | +1.16 | +0.69 | ±0.09 | 0.60 à 0.80 | dans la cible |
| Les Plombs qui sautent | Légendaire | 5 | 10 min | 100 % | 0.19 → 0.26 | 1.16 → 0.12 | +1.08 | +0.73 | ±0.07 | 0.60 à 0.80 | dans la cible |
| La Coupure pub | Mythique | 2 | 10 min | 100 % | 0.17 → 0.02 | 0.16 → 0.02 | +0.19 | +0.11 | ±0.08 | 0.15 à 0.20 | dans la marge (bas) |
| Le Maillot retourné | Mythique | 4 | 40 min | 99 % | 0.47 → 0.84 | 0.87 → 0.54 | +0.72 | +0.49 | ±0.08 | 0.45 à 0.60 | dans la cible |
| Le Rideau de fer | Mythique | 6 | 90 min | 99 % | 1.04 → 1.06 | 1.08 → 0.02 | +1.08 | +0.81 | ±0.09 | 0.80 à 1.10 | dans la cible |
| La Machine à remonter le temps | Mythique | 7 | 20 min | 73 % | 0.35 → 0.70 | 1.31 → 0.45 | +1.43 | +1.32 | ±0.11 | 1.00 à 1.40 | dans la cible |
| Le Recrutement sauvage | Mythique | 6 | 30 min | 99 % | 0.50 → 1.56 | 0.46 → 0.18 | +1.55 | +0.87 | ±0.09 | 0.80 à 1.10 | dans la cible |
| Le But qui compte double | Mythique | 7 | 25 min | 100 % | 0.41 → 3.35 | 0.39 → 0.12 | +3.23 | +1.10 | ±0.09 | 1.00 à 1.40 | dans la cible |
| La Résurrection | Mythique | 7 | 25 min | 99 % | 0.36 → 1.61 | 0.53 → 0.13 | +2.27 | +1.29 | ±0.09 | 1.00 à 1.40 | dans la cible |
| Le Docteur Miracle | Mythique | 3 | 15 min | 100 % | 0.24 → 0.31 | 0.29 → 0.21 | +0.48 | +0.33 | ±0.09 | 0.30 à 0.40 | dans la cible |

## Mesures au niveau 5

| Capacité | Rareté | Coût | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points (jouable) | ± | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Dégagement au pif | Commune | 1 | 12 min | 100 % | 0.21 → 0.35 | 0.20 → 0.19 | +0.28 | +0.18 | ±0.08 | 0.09 à 0.20 | dans la cible |
| La Sortie aux poings | Commune | 2 | 15 min | 100 % | 0.26 → 0.28 | 0.24 → 0.09 | +0.39 | +0.28 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Gardien volant | Commune | 2 | 35 min | 100 % | 0.57 → 0.60 | 0.54 → 0.29 | +0.35 | +0.24 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Coup d’épaule | Commune | 1 | 13 min | 99 % | 0.23 → 0.47 | 0.22 → 0.20 | +0.33 | +0.22 | ±0.07 | 0.09 à 0.20 | dans la marge (haut) |
| Le Tacle sur gravier | Commune | 2 | 16 min | 99 % | 0.28 → 0.69 | 0.26 → 0.23 | +0.68 | +0.43 | ±0.08 | 0.22 à 0.40 | dans la marge (haut) |
| Le Videur | Commune | 2 | 25 min | 99 % | 0.41 → 0.43 | 0.39 → 0.20 | +0.31 | +0.20 | ±0.08 | 0.22 à 0.40 | dans la marge (bas) |
| Le Béton armé | Commune | 3 | 45 min | 99 % | 0.73 → 1.14 | 0.68 → 0.19 | +0.93 | +0.61 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Métronome | Commune | 2 | 20 min | 99 % | 0.34 → 0.51 | 0.32 → 0.21 | +0.49 | +0.34 | ±0.08 | 0.22 à 0.40 | dans la cible |
| Le Petit Pont | Commune | 2 | 25 min | 99 % | 0.41 → 0.77 | 0.39 → 0.35 | +0.60 | +0.39 | ±0.08 | 0.22 à 0.40 | dans la cible |
| La Symphonie | Commune | 5 | 25 min | 99 % | 0.41 → 1.70 | 0.39 → 0.13 | +2.78 | +1.24 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Crochet | Commune | 1 | 15 min | 100 % | 0.26 → 0.41 | 0.24 → 0.24 | +0.18 | +0.13 | ±0.07 | 0.09 à 0.20 | dans la cible |
| La Mine des 25 mètres | Commune | 2 | 15 min | 100 % | 0.26 → 0.61 | 0.24 → 0.24 | +0.42 | +0.30 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Chambreur de gardien | Commune | 2 | 20 min | 100 % | 0.34 → 0.62 | 0.32 → 0.32 | +0.40 | +0.25 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Ciseau du camping | Commune | 5 | 10 min | 100 % | 0.17 → 1.29 | 0.16 → 0.08 | +1.76 | +0.97 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Clin d’œil | Commune | 1 | 14 min | 99 % | 0.25 → 0.45 | 0.23 → 0.19 | +0.31 | +0.22 | ±0.07 | 0.09 à 0.20 | dans la marge (haut) |
| Le Terrain labouré | Commune | 3 | 30 min | 99 % | 0.50 → 0.90 | 0.46 → 0.24 | +0.89 | +0.57 | ±0.09 | 0.45 à 0.80 | dans la cible |
| Le Sort de la voyante | Commune | 5 | 25 min | 99 % | 0.41 → 2.94 | 0.39 → 0.09 | +6.24 | +1.49 | ±0.08 | 0.90 à 1.60 | dans la cible |
| La Gourde magique | Commune | 2 | 15 min | 100 % | 0.26 → 0.41 | 0.24 → 0.16 | +0.52 | +0.36 | ±0.07 | 0.22 à 0.40 | dans la cible |
| L’Éponge miracle | Commune | 2 | 15 min | 100 % | 0.12 → 0.31 | 0.29 → 0.21 | +0.33 | +0.24 | ±0.08 | 0.22 à 0.40 | dans la cible |
| Le Spray magique | Commune | 1 | 12 min | 100 % | 0.19 → 0.22 | 0.22 → 0.11 | +0.15 | +0.13 | ±0.07 | 0.09 à 0.20 | dans la cible |
| Le Seau d’eau | Commune | 1 | 15 min | 99 % | 0.12 → 0.22 | 0.29 → 0.24 | +0.26 | +0.18 | ±0.07 | 0.09 à 0.20 | dans la cible |
| Le Supporter qui klaxonne | Commune | 3 | 15 min | 100 % | 0.26 → 0.39 | 0.24 → 0.17 | +0.92 | +0.56 | ±0.08 | 0.45 à 0.80 | dans la cible |
| La Tournée générale | Commune | 7 | 35 min | 100 % | 0.57 → 3.22 | 0.54 → 0.19 | +5.62 | +1.46 | ±0.08 | 1.50 à 2.80 | dans la marge (bas) |
| Le Gardien au sifflet | Rare | 2 | 15 min | 100 % | 0.26 → 0.26 | 0.24 → 0.08 | +0.46 | +0.35 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Mur de parpaings | Rare | 2 | 15 min | 100 % | 0.26 → 0.46 | 0.24 → 0.04 | +0.62 | +0.43 | ±0.08 | 0.22 à 0.40 | dans la marge (haut) |
| Le Marquage à la culotte | Rare | 2 | 35 min | 99 % | 0.57 → 0.63 | 0.54 → 0.27 | +0.46 | +0.32 | ±0.08 | 0.22 à 0.40 | dans la cible |
| Le Rouleau compresseur | Rare | 2 | 15 min | 99 % | 0.26 → 0.36 | 0.24 → 0.23 | +0.47 | +0.28 | ±0.08 | 0.22 à 0.40 | dans la cible |
| La Tête de bois | Rare | 2 | 15 min | 99 % | 0.35 → 0.80 | 0.24 → 0.22 | +0.50 | +0.30 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Mur qui avance | Rare | 2 | 15 min | 99 % | 0.27 → 0.28 | 0.36 → 0.07 | +0.53 | +0.35 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Tacle à retardement | Rare | 3 | 15 min | 99 % | 0.26 → 0.52 | 0.24 → 0.21 | +0.84 | +0.47 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Coup franc de kermesse | Rare | 2 | 15 min | 99 % | 0.36 → 0.85 | 0.24 → 0.22 | +0.57 | +0.40 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Marathonien | Rare | 3 | 15 min | 99 % | 0.26 → 0.40 | 0.24 → 0.17 | +0.94 | +0.57 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Pari du milieu | Rare | 2 | 15 min | 99 % | 0.26 → 0.76 | 0.24 → 0.25 | +0.52 | +0.34 | ±0.07 | 0.22 à 0.40 | dans la cible |
| La Danse de la victoire | Rare | 2 | 15 min | 64 % | 1.23 → 1.38 | 0.18 → 0.13 | +0.31 | +0.30 | ±0.12 | 0.22 à 0.40 | dans la cible |
| Le Réveil tardif | Rare | 2 | 20 min | 99 % | 0.32 → 0.67 | 0.31 → 0.33 | +0.42 | +0.27 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Lob du parking | Rare | 3 | 15 min | 100 % | 0.26 → 0.96 | 0.24 → 0.24 | +0.84 | +0.57 | ±0.07 | 0.45 à 0.80 | dans la cible |
| Le Plongeur de Séville | Rare | 3 | 15 min | 100 % | 0.26 → 0.95 | 0.24 → 0.16 | +0.87 | +0.52 | ±0.08 | 0.45 à 0.80 | dans la cible |
| La Causerie | Rare | 2 | 30 min | 99 % | 0.52 → 0.72 | 0.45 → 0.33 | +0.55 | +0.34 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Fayot | Rare | 2 | 30 min | 99 % | 0.48 → 0.60 | 0.57 → 0.20 | +0.49 | +0.35 | ±0.08 | 0.22 à 0.40 | dans la cible |
| Le Coup de gueule | Rare | 3 | 20 min | 99 % | 0.32 → 0.71 | 0.34 → 0.16 | +0.99 | +0.60 | ±0.09 | 0.45 à 0.80 | dans la cible |
| Le Kiné du dimanche | Rare | 2 | 15 min | 100 % | 0.12 → 0.49 | 0.29 → 0.22 | +0.61 | +0.44 | ±0.08 | 0.22 à 0.40 | dans la marge (haut) |
| La Bouteille d’eau bénite | Rare | 2 | 15 min | 99 % | 0.23 → 0.49 | 0.26 → 0.13 | +0.39 | +0.26 | ±0.07 | 0.22 à 0.40 | dans la cible |
| Le Ramasseur lent | Rare | 1 | 14 min | 77 % | 1.25 → 1.07 | 0.22 → 0.06 | −0.05 | +0.10 | ±0.08 | 0.09 à 0.20 | dans la cible |
| L’Horloger du club | Rare | 2 | 15 min | 61 % | 0.23 → 0.37 | 0.23 → 0.24 | +0.17 | +0.29 | ±0.09 | 0.22 à 0.40 | dans la cible |
| Le Ballon crevé | Rare | 3 | 15 min | 100 % | 0.26 → 0.26 | 0.98 → 0.20 | +1.02 | +0.67 | ±0.07 | 0.45 à 0.80 | dans la cible |
| Le Gardien libéro | Légendaire | 3 | 15 min | 100 % | 0.26 → 1.30 | 0.24 → 0.23 | +1.07 | +0.65 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Gardien-forteresse | Légendaire | 4 | 60 min | 100 % | 0.95 → 1.14 | 1.00 → 0.16 | +1.09 | +0.77 | ±0.09 | 0.68 à 1.20 | dans la cible |
| Le Mur humain | Légendaire | 3 | 35 min | 99 % | 0.56 → 0.57 | 0.64 → 0.09 | +0.72 | +0.51 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Car à deux étages | Légendaire | 3 | 45 min | 99 % | 0.73 → 1.08 | 0.68 → 0.20 | +0.84 | +0.55 | ±0.09 | 0.45 à 0.80 | dans la cible |
| Le Marquage de l’enfer | Légendaire | 5 | 45 min | 99 % | 0.73 → 2.04 | 0.68 → 0.62 | +1.91 | +0.91 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Copieur | Légendaire | 3 | 20 min | 99 % | 0.20 → 0.47 | 0.56 → 0.23 | +0.88 | +0.51 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Voleur de sifflet | Légendaire | 3 | 18 min | 99 % | 0.32 → 0.72 | 0.29 → 0.15 | +0.99 | +0.59 | ±0.09 | 0.45 à 0.80 | dans la cible |
| La Célébration interdite | Légendaire | 3 | 20 min | 64 % | 1.29 → 1.81 | 0.24 → 0.13 | +1.16 | +0.86 | ±0.15 | 0.45 à 0.80 | dans la marge (haut) |
| La Remontada du dimanche | Légendaire | 5 | 40 min | 73 % | 0.69 → 1.52 | 1.61 → 1.37 | +1.74 | +1.45 | ±0.12 | 0.90 à 1.60 | dans la cible |
| Le Double ou rien | Légendaire | 5 | 15 min | 100 % | 0.26 → 1.98 | 0.24 → 0.21 | +2.51 | +0.97 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Discours de la mi-temps | Légendaire | 5 | 45 min | 99 % | 0.74 → 1.99 | 0.68 → 0.29 | +1.79 | +0.94 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Remède de grand-mère | Légendaire | 3 | 15 min | 99 % | 0.21 → 0.51 | 0.34 → 0.16 | +0.88 | +0.54 | ±0.08 | 0.45 à 0.80 | dans la cible |
| Le Penalty imaginaire | Légendaire | 5 | 15 min | 99 % | 0.36 → 1.76 | 0.24 → 0.07 | +2.62 | +1.17 | ±0.09 | 0.90 à 1.60 | dans la cible |
| Le Coup de sifflet tardif | Légendaire | 5 | 20 min | 61 % | 0.23 → 0.84 | 0.23 → 0.16 | +0.75 | +1.01 | ±0.12 | 0.90 à 1.60 | dans la cible |
| Le Tifo géant | Légendaire | 5 | 25 min | 100 % | 0.41 → 1.81 | 0.39 → 0.12 | +3.64 | +1.38 | ±0.08 | 0.90 à 1.60 | dans la cible |
| Les Plombs qui sautent | Légendaire | 5 | 10 min | 100 % | 0.19 → 0.30 | 1.16 → 0.11 | +1.39 | +0.95 | ±0.08 | 0.90 à 1.60 | dans la cible |
| La Coupure pub | Mythique | 2 | 10 min | 100 % | 0.17 → 0.02 | 0.16 → 0.01 | +0.43 | +0.29 | ±0.08 | 0.22 à 0.40 | dans la cible |
| Le Maillot retourné | Mythique | 4 | 40 min | 99 % | 0.47 → 0.84 | 0.87 → 0.54 | +1.14 | +0.75 | ±0.09 | 0.68 à 1.20 | dans la cible |
| Le Rideau de fer | Mythique | 6 | 90 min | 99 % | 1.04 → 2.10 | 1.08 → 0.02 | +2.12 | +1.21 | ±0.09 | 1.20 à 2.20 | dans la cible |
| La Machine à remonter le temps | Mythique | 7 | 20 min | 73 % | 0.35 → 0.89 | 1.31 → 0.42 | +1.85 | +1.68 | ±0.12 | 1.50 à 2.80 | dans la cible |
| Le Recrutement sauvage | Mythique | 6 | 30 min | 99 % | 0.50 → 2.63 | 0.46 → 0.12 | +4.54 | +1.44 | ±0.08 | 1.20 à 2.20 | dans la cible |
| Le But qui compte double | Mythique | 7 | 25 min | 100 % | 0.41 → 4.71 | 0.39 → 0.09 | +6.88 | +1.45 | ±0.08 | 1.50 à 2.80 | dans la marge (bas) |
| La Résurrection | Mythique | 7 | 25 min | 99 % | 0.36 → 2.21 | 0.53 → 0.11 | +3.84 | +1.70 | ±0.08 | 1.50 à 2.80 | dans la cible |
| Le Docteur Miracle | Mythique | 3 | 15 min | 100 % | 0.24 → 0.48 | 0.29 → 0.14 | +0.80 | +0.53 | ±0.09 | 0.45 à 0.80 | dans la cible |
