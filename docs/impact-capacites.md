# Impact réel des capacités en match

Mesures du banc `src/domain/match/impactBench.ts`, à régénérer avec `bun run impact`. Les cibles et les règles d'équilibrage sont dans [equilibrage-capacites.md](equilibrage-capacites.md).

## Méthode

- Deux équipes identiques (note 60 partout, 4-4-2), sans aucune autre capacité, aucune IA qui active quoi que ce soit.
- 1 000 matchs par capacité, joués deux fois avec la même graine : une fois sans rien faire, une fois en activant la capacité. L'écart entre les deux versions est l'effet de la capacité.
- Activation à la 30e minute, jauge pleine, meilleures cibles choisies.
- Capacités de penalty et de coup franc : le penalty ou le coup franc est provoqué à la 30e minute dans les deux versions (distance tirée au hasard comme en match), et le coach joue l'option qui convient à la capacité (frappe directe ou centre). Sans capacité, il joue le choix logique (frappe de près, centre sinon). Elles sont donc jugées sur ce qu'elles rapportent quand l'événement arrive.
- Les autres capacités liées à un événement (mi-temps, but…) sont activées à sa première occurrence après la 30e minute.
- Le contexte qui rend la capacité utile est installé dans les deux versions : joueurs au sol pour le kiné, but adverse récent pour la coupure de courant, blessé et exclu pour le miracle, malus pour le capitaine gueulard. L'Échange de maillots est mesuré avec une équipe à domicile plus faible (note 50), sinon échanger deux équipes identiques ne change rien.
- **Fenêtre** : durée de l'effet au niveau 1 (15 min par défaut pour les effets instantanés). Les buts marqués et encaissés sont comptés pendant cette fenêtre, en moyenne par match où l'activation a eu lieu.
- **Δ diff. de buts** et **Δ points** : écart sur le match entier, avec moins sans.
- La mesure a une incertitude d'environ ±0,03 point : un écart d'un centième avec la fourchette n'est pas significatif.
- Les effets sur la jauge (points rendus, volés) ne se voient pas ici : l'adversaire du banc n'a pas de capacités et la jauge est remplie avant chaque activation.

## Synthèse par rareté

| Rareté | Cible | Niveau 1 (moyenne) | Niveau 1 (min / max) | Niveau 5 (moyenne) | Niveau 5 (min / max) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Commune (29) | +0.15 à +0.20 | +0.17 | +0.15 / +0.20 | +0.36 | +0.18 / +0.54 |
| Rare (15) | +0.30 à +0.40 | +0.34 | +0.30 / +0.39 | +0.66 | +0.36 / +1.05 |
| Légendaire (7) | +0.60 à +0.80 | +0.69 | +0.64 / +0.73 | +1.04 | +0.77 / +1.52 |
| Mythique (4) | +1.00 à +1.40 | +1.13 | +1.05 / +1.23 | +1.46 | +1.27 / +1.66 |

## Mesures au niveau 1

| Capacité | Rareté | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Bedonnant | Commune | 35 min | 100 % | 0.58 → 0.60 | 0.52 → 0.29 | +0.26 | +0.19 | 0.15 à 0.20 | dans la cible |
| Le Bavard | Commune | 15 min | 100 % | 0.26 → 0.27 | 0.24 → 0.12 | +0.23 | +0.17 | 0.15 à 0.20 | dans la cible |
| Le Danseur | Commune | 15 min | 100 % | 0.26 → 0.26 | 1.00 → 0.64 | +0.36 | +0.19 | 0.15 à 0.20 | dans la cible |
| Le Dégagement de mule | Commune | 15 min | 100 % | 0.26 → 0.48 | 0.24 → 0.23 | +0.25 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Jardinier | Commune | 30 min | 99 % | 0.51 → 0.54 | 0.45 → 0.28 | +0.22 | +0.17 | 0.15 à 0.20 | dans la cible |
| L’Agriculteur | Commune | 30 min | 99 % | 0.51 → 0.61 | 0.45 → 0.35 | +0.22 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Rugbyman reconverti | Commune | 15 min | 99 % | 0.26 → 0.28 | 0.24 → 0.15 | +0.19 | +0.15 | 0.15 à 0.20 | dans la cible |
| Haleine de Ricard | Commune | 25 min | 99 % | 0.41 → 0.66 | 0.38 → 0.39 | +0.25 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Mur de saucisses | Commune | 15 min | 99 % | 0.26 → 0.28 | 0.35 → 0.11 | +0.30 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Videur de boîte | Commune | 25 min | 99 % | 0.41 → 0.41 | 0.38 → 0.20 | +0.22 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Lacet fou | Commune | 16 min | 99 % | 0.27 → 0.52 | 0.25 → 0.26 | +0.24 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Marchand de sable | Commune | 25 min | 99 % | 0.41 → 0.66 | 0.38 → 0.39 | +0.25 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Chien de la casse | Commune | 25 min | 99 % | 0.41 → 0.57 | 0.38 → 0.35 | +0.20 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Ruisselant | Commune | 25 min | 99 % | 0.41 → 0.57 | 0.38 → 0.35 | +0.20 | +0.16 | 0.15 à 0.20 | dans la cible |
| Les Pigeons | Commune | 20 min | 99 % | 0.34 → 0.43 | 0.31 → 0.24 | +0.19 | +0.18 | 0.15 à 0.20 | dans la cible |
| La Mobylette | Commune | 20 min | 100 % | 0.34 → 0.54 | 0.31 → 0.29 | +0.24 | +0.19 | 0.15 à 0.20 | dans la cible |
| Le Buteur de comptoir | Commune | 20 min | 100 % | 0.34 → 0.49 | 0.31 → 0.31 | +0.18 | +0.16 | 0.15 à 0.20 | dans la cible |
| Bière tiède | Commune | 15 min | 100 % | 0.34 → 0.62 | 0.23 → 0.23 | +0.27 | +0.19 | 0.15 à 0.20 | dans la cible |
| Le Bulldozer | Commune | 22 min | 100 % | 0.37 → 0.55 | 0.34 → 0.33 | +0.20 | +0.15 | 0.15 à 0.20 | dans la cible |
| La Frappe de mule | Commune | 15 min | 100 % | 0.26 → 0.41 | 0.24 → 0.25 | +0.16 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Chambreur | Commune | 18 min | 99 % | 0.31 → 0.56 | 0.28 → 0.28 | +0.25 | +0.18 | 0.15 à 0.20 | dans la cible |
| Short trop court | Commune | 18 min | 99 % | 0.31 → 0.50 | 0.28 → 0.27 | +0.22 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Porteur d’eau | Commune | 15 min | 100 % | 0.26 → 0.30 | 0.24 → 0.23 | +0.25 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le DJ du vestiaire | Commune | 18 min | 100 % | 0.31 → 0.43 | 0.28 → 0.22 | +0.18 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Kiné douteux | Commune | 15 min | 100 % | 0.12 → 0.28 | 0.28 → 0.25 | +0.24 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Regard qui tue | Commune | 15 min | 100 % | 1.02 → 1.32 | 0.23 → 0.23 | +0.30 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Gardien qui parle | Commune | 18 min | 100 % | 0.31 → 0.32 | 1.04 → 0.73 | +0.29 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Pied de velours | Commune | 15 min | 99 % | 0.35 → 0.58 | 0.24 → 0.21 | +0.28 | +0.19 | 0.15 à 0.20 | dans la cible |
| La Tête de pioche | Commune | 15 min | 99 % | 0.34 → 0.63 | 0.24 → 0.23 | +0.28 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Gardien kamikaze | Rare | 15 min | 100 % | 0.26 → 0.29 | 0.24 → 0.03 | +0.42 | +0.32 | 0.30 à 0.40 | dans la cible |
| Le Gardien fumeur | Rare | 25 min | 100 % | 0.41 → 0.42 | 0.38 → 0.10 | +0.41 | +0.31 | 0.30 à 0.40 | dans la cible |
| Le Bus de l’amicale | Rare | 45 min | 99 % | 0.74 → 0.78 | 0.67 → 0.26 | +0.48 | +0.35 | 0.30 à 0.40 | dans la cible |
| Le Boucher du village | Rare | 35 min | 99 % | 0.58 → 1.10 | 0.52 → 0.53 | +0.53 | +0.34 | 0.30 à 0.40 | dans la cible |
| Le Vomisseur | Rare | 14 min | 99 % | 0.24 → 0.53 | 0.23 → 0.11 | +0.45 | +0.30 | 0.30 à 0.40 | dans la cible |
| Le Retraité de 42 ans | Rare | 15 min | 99 % | 0.26 → 0.58 | 0.24 → 0.24 | +0.41 | +0.31 | 0.30 à 0.40 | dans la cible |
| Le Pique-assiette | Rare | 18 min | 99 % | 0.31 → 0.62 | 0.28 → 0.14 | +0.49 | +0.37 | 0.30 à 0.40 | dans la cible |
| Le Sombrero bourré | Rare | 15 min | 100 % | 0.26 → 0.69 | 0.24 → 0.25 | +0.51 | +0.33 | 0.30 à 0.40 | dans la cible |
| Le Revenant de la Feria | Rare | 30 min | 100 % | 0.51 → 0.96 | 0.45 → 0.45 | +0.47 | +0.30 | 0.30 à 0.40 | dans la cible |
| Le Chef de chant | Rare | 20 min | 99 % | 0.34 → 0.63 | 0.31 → 0.18 | +0.51 | +0.33 | 0.30 à 0.40 | dans la cible |
| Le Capitaine gueulard | Rare | 20 min | 99 % | 0.31 → 0.66 | 0.33 → 0.17 | +0.52 | +0.37 | 0.30 à 0.40 | dans la cible |
| Le Chien du président | Rare | 60 min | 100 % | 0.96 → 1.47 | 0.89 → 0.84 | +0.57 | +0.39 | 0.30 à 0.40 | dans la cible |
| Le Ballon déplacé | Rare | 15 min | 100 % | 0.35 → 0.84 | 0.24 → 0.22 | +0.54 | +0.36 | 0.30 à 0.40 | dans la cible |
| La Bousculade dans le mur | Rare | 15 min | 99 % | 0.26 → 0.58 | 0.33 → 0.13 | +0.52 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Ramasseur de balles | Rare | 10 min | 100 % | 0.17 → 0.30 | 0.93 → 0.58 | +0.47 | +0.30 | 0.30 à 0.40 | dans la cible |
| La Panenka ivre | Légendaire | 10 min | 100 % | 0.17 → 1.16 | 0.16 → 0.11 | +1.04 | +0.66 | 0.60 à 0.80 | dans la cible |
| L’Échange de maillots | Légendaire | 60 min | 99 % | 0.65 → 1.23 | 1.30 → 0.79 | +1.09 | +0.69 | 0.60 à 0.80 | dans la cible |
| La Mêlée générale | Légendaire | 40 min | 99 % | 0.66 → 1.90 | 0.60 → 0.60 | +1.24 | +0.70 | 0.60 à 0.80 | dans la cible |
| La Coupure de courant | Légendaire | 10 min | 100 % | 0.17 → 0.25 | 1.17 → 0.12 | +1.08 | +0.69 | 0.60 à 0.80 | dans la cible |
| La Malédiction de mémé | Légendaire | 25 min | 100 % | 0.41 → 1.35 | 0.38 → 0.13 | +1.21 | +0.73 | 0.60 à 0.80 | dans la cible |
| Le Plongeon d’Oscar | Légendaire | 15 min | 99 % | 0.35 → 1.33 | 0.24 → 0.12 | +1.11 | +0.69 | 0.60 à 0.80 | dans la cible |
| La Panenka de légende | Légendaire | 25 min | 100 % | 1.19 → 2.30 | 0.37 → 0.14 | +1.35 | +0.64 | 0.60 à 0.80 | dans la cible |
| Le Transfert du parking | Mythique | 30 min | 99 % | 0.51 → 2.27 | 0.45 → 0.14 | +2.25 | +1.12 | 1.00 à 1.40 | dans la cible |
| Le But en or massif | Mythique | 25 min | 100 % | 0.41 → 3.37 | 0.38 → 0.11 | +3.23 | +1.14 | 1.00 à 1.40 | dans la cible |
| Le Kebab du siècle | Mythique | 35 min | 100 % | 0.58 → 2.40 | 0.52 → 0.25 | +2.11 | +1.05 | 1.00 à 1.40 | dans la cible |
| Le Miracle du kiné | Mythique | 25 min | 99 % | 0.35 → 1.58 | 0.52 → 0.12 | +2.20 | +1.23 | 1.00 à 1.40 | dans la cible |

## Mesures au niveau 5

Au niveau 5, la fenêtre de comptage reste celle du niveau 1 ; l'écart de points porte sur le match entier.

| Capacité | Rareté | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Bedonnant | Commune | 35 min | 100 % | 0.58 → 0.60 | 0.52 → 0.29 | +0.47 | +0.34 | 0.15 à 0.20 | au-dessus |
| Le Bavard | Commune | 15 min | 100 % | 0.26 → 0.27 | 0.24 → 0.07 | +0.63 | +0.46 | 0.15 à 0.20 | au-dessus |
| Le Danseur | Commune | 15 min | 100 % | 0.26 → 0.26 | 1.00 → 0.32 | +0.87 | +0.54 | 0.15 à 0.20 | au-dessus |
| Le Dégagement de mule | Commune | 15 min | 100 % | 0.26 → 0.56 | 0.24 → 0.24 | +0.69 | +0.45 | 0.15 à 0.20 | au-dessus |
| Le Jardinier | Commune | 30 min | 99 % | 0.51 → 0.54 | 0.45 → 0.24 | +0.56 | +0.40 | 0.15 à 0.20 | au-dessus |
| L’Agriculteur | Commune | 30 min | 99 % | 0.51 → 0.64 | 0.45 → 0.33 | +0.55 | +0.38 | 0.15 à 0.20 | au-dessus |
| Le Rugbyman reconverti | Commune | 15 min | 99 % | 0.26 → 0.31 | 0.24 → 0.13 | +0.24 | +0.19 | 0.15 à 0.20 | dans la cible |
| Haleine de Ricard | Commune | 25 min | 99 % | 0.41 → 0.97 | 0.38 → 0.36 | +0.84 | +0.51 | 0.15 à 0.20 | au-dessus |
| Le Mur de saucisses | Commune | 15 min | 99 % | 0.26 → 0.28 | 0.35 → 0.06 | +0.73 | +0.47 | 0.15 à 0.20 | au-dessus |
| Le Videur de boîte | Commune | 25 min | 99 % | 0.41 → 0.41 | 0.38 → 0.20 | +0.28 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Lacet fou | Commune | 16 min | 99 % | 0.27 → 0.68 | 0.25 → 0.24 | +0.64 | +0.45 | 0.15 à 0.20 | au-dessus |
| Le Marchand de sable | Commune | 25 min | 99 % | 0.41 → 0.97 | 0.38 → 0.36 | +0.85 | +0.52 | 0.15 à 0.20 | au-dessus |
| Le Chien de la casse | Commune | 25 min | 99 % | 0.41 → 0.64 | 0.38 → 0.31 | +0.60 | +0.42 | 0.15 à 0.20 | au-dessus |
| Le Ruisselant | Commune | 25 min | 99 % | 0.41 → 0.64 | 0.38 → 0.31 | +0.60 | +0.42 | 0.15 à 0.20 | au-dessus |
| Les Pigeons | Commune | 20 min | 99 % | 0.34 → 0.59 | 0.31 → 0.19 | +0.52 | +0.37 | 0.15 à 0.20 | au-dessus |
| La Mobylette | Commune | 20 min | 100 % | 0.34 → 0.63 | 0.31 → 0.28 | +0.65 | +0.40 | 0.15 à 0.20 | au-dessus |
| Le Buteur de comptoir | Commune | 20 min | 100 % | 0.34 → 0.56 | 0.31 → 0.31 | +0.49 | +0.32 | 0.15 à 0.20 | au-dessus |
| Bière tiède | Commune | 15 min | 100 % | 0.34 → 0.81 | 0.23 → 0.23 | +0.47 | +0.33 | 0.15 à 0.20 | au-dessus |
| Le Bulldozer | Commune | 22 min | 100 % | 0.37 → 0.74 | 0.34 → 0.30 | +0.52 | +0.37 | 0.15 à 0.20 | au-dessus |
| La Frappe de mule | Commune | 15 min | 100 % | 0.26 → 0.51 | 0.24 → 0.24 | +0.28 | +0.24 | 0.15 à 0.20 | au-dessus |
| Le Chambreur | Commune | 18 min | 99 % | 0.31 → 0.71 | 0.28 → 0.26 | +0.60 | +0.40 | 0.15 à 0.20 | au-dessus |
| Short trop court | Commune | 18 min | 99 % | 0.31 → 0.74 | 0.28 → 0.26 | +0.69 | +0.45 | 0.15 à 0.20 | au-dessus |
| Le Porteur d’eau | Commune | 15 min | 100 % | 0.26 → 0.32 | 0.24 → 0.22 | +0.32 | +0.23 | 0.15 à 0.20 | au-dessus |
| Le DJ du vestiaire | Commune | 18 min | 100 % | 0.31 → 0.47 | 0.28 → 0.19 | +0.53 | +0.38 | 0.15 à 0.20 | au-dessus |
| Le Kiné douteux | Commune | 15 min | 100 % | 0.12 → 0.31 | 0.28 → 0.22 | +0.29 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Regard qui tue | Commune | 15 min | 100 % | 1.02 → 1.36 | 0.23 → 0.22 | +0.51 | +0.27 | 0.15 à 0.20 | au-dessus |
| Le Gardien qui parle | Commune | 18 min | 100 % | 0.31 → 0.32 | 1.04 → 0.73 | +0.47 | +0.24 | 0.15 à 0.20 | au-dessus |
| Le Pied de velours | Commune | 15 min | 99 % | 0.35 → 0.84 | 0.24 → 0.22 | +0.55 | +0.37 | 0.15 à 0.20 | au-dessus |
| La Tête de pioche | Commune | 15 min | 99 % | 0.34 → 0.82 | 0.24 → 0.24 | +0.47 | +0.28 | 0.15 à 0.20 | au-dessus |
| Le Gardien kamikaze | Rare | 15 min | 100 % | 0.26 → 0.32 | 0.24 → 0.03 | +0.48 | +0.37 | 0.30 à 0.40 | dans la cible |
| Le Gardien fumeur | Rare | 25 min | 100 % | 0.41 → 0.42 | 0.38 → 0.07 | +0.71 | +0.53 | 0.30 à 0.40 | au-dessus |
| Le Bus de l’amicale | Rare | 45 min | 99 % | 0.74 → 0.77 | 0.67 → 0.22 | +0.49 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Boucher du village | Rare | 35 min | 99 % | 0.58 → 1.44 | 0.52 → 0.53 | +1.20 | +0.70 | 0.30 à 0.40 | au-dessus |
| Le Vomisseur | Rare | 14 min | 99 % | 0.24 → 0.53 | 0.23 → 0.11 | +0.86 | +0.59 | 0.30 à 0.40 | au-dessus |
| Le Retraité de 42 ans | Rare | 15 min | 99 % | 0.26 → 0.81 | 0.24 → 0.24 | +0.73 | +0.50 | 0.30 à 0.40 | au-dessus |
| Le Pique-assiette | Rare | 18 min | 99 % | 0.31 → 0.88 | 0.28 → 0.12 | +1.64 | +0.94 | 0.30 à 0.40 | au-dessus |
| Le Sombrero bourré | Rare | 15 min | 100 % | 0.26 → 0.97 | 0.24 → 0.25 | +0.84 | +0.59 | 0.30 à 0.40 | au-dessus |
| Le Revenant de la Feria | Rare | 30 min | 100 % | 0.51 → 1.11 | 0.45 → 0.44 | +1.24 | +0.67 | 0.30 à 0.40 | au-dessus |
| Le Chef de chant | Rare | 20 min | 99 % | 0.34 → 0.77 | 0.31 → 0.15 | +1.40 | +0.77 | 0.30 à 0.40 | au-dessus |
| Le Capitaine gueulard | Rare | 20 min | 99 % | 0.31 → 0.81 | 0.33 → 0.14 | +1.31 | +0.81 | 0.30 à 0.40 | au-dessus |
| Le Chien du président | Rare | 60 min | 100 % | 0.96 → 2.10 | 0.89 → 0.81 | +1.29 | +0.72 | 0.30 à 0.40 | au-dessus |
| Le Ballon déplacé | Rare | 15 min | 100 % | 0.35 → 1.21 | 0.24 → 0.21 | +0.90 | +0.62 | 0.30 à 0.40 | au-dessus |
| La Bousculade dans le mur | Rare | 15 min | 99 % | 0.26 → 0.95 | 0.33 → 0.10 | +1.98 | +1.05 | 0.30 à 0.40 | au-dessus |
| Le Ramasseur de balles | Rare | 10 min | 100 % | 0.17 → 0.40 | 0.93 → 0.56 | +0.99 | +0.63 | 0.30 à 0.40 | au-dessus |
| La Panenka ivre | Légendaire | 10 min | 100 % | 0.17 → 1.21 | 0.16 → 0.09 | +1.31 | +0.82 | 0.60 à 0.80 | au-dessus |
| L’Échange de maillots | Légendaire | 60 min | 99 % | 0.65 → 1.23 | 1.30 → 0.79 | +1.20 | +0.77 | 0.60 à 0.80 | dans la cible |
| La Mêlée générale | Légendaire | 40 min | 99 % | 0.66 → 2.44 | 0.60 → 0.55 | +2.66 | +1.16 | 0.60 à 0.80 | au-dessus |
| La Coupure de courant | Légendaire | 10 min | 100 % | 0.17 → 0.28 | 1.17 → 0.11 | +1.37 | +0.90 | 0.60 à 0.80 | au-dessus |
| La Malédiction de mémé | Légendaire | 25 min | 100 % | 0.41 → 2.92 | 0.38 → 0.07 | +6.19 | +1.52 | 0.60 à 0.80 | au-dessus |
| Le Plongeon d’Oscar | Légendaire | 15 min | 99 % | 0.35 → 1.64 | 0.24 → 0.10 | +2.21 | +1.10 | 0.60 à 0.80 | au-dessus |
| La Panenka de légende | Légendaire | 25 min | 100 % | 1.19 → 2.86 | 0.37 → 0.10 | +4.00 | +0.99 | 0.60 à 0.80 | au-dessus |
| Le Transfert du parking | Mythique | 30 min | 99 % | 0.51 → 3.13 | 0.45 → 0.12 | +4.33 | +1.44 | 1.00 à 1.40 | au-dessus |
| Le But en or massif | Mythique | 25 min | 100 % | 0.41 → 4.73 | 0.38 → 0.09 | +6.84 | +1.48 | 1.00 à 1.40 | au-dessus |
| Le Kebab du siècle | Mythique | 35 min | 100 % | 0.58 → 2.40 | 0.52 → 0.25 | +3.13 | +1.27 | 1.00 à 1.40 | dans la cible |
| Le Miracle du kiné | Mythique | 25 min | 99 % | 0.35 → 2.22 | 0.52 → 0.10 | +3.82 | +1.66 | 1.00 à 1.40 | au-dessus |
