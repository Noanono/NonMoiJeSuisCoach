# Impact réel des capacités en match

Mesures du banc `src/domain/match/impactBench.ts`, à régénérer avec `bun run impact`. Les cibles et les règles d'équilibrage sont dans [equilibrage-capacites.md](equilibrage-capacites.md).

## Méthode

- Deux équipes identiques (note 60 partout, 4-4-2), sans aucune autre capacité, aucune IA qui active quoi que ce soit.
- 1 000 matchs par capacité, joués deux fois avec la même graine : une fois sans rien faire, une fois en activant la capacité. L'écart entre les deux versions est l'effet de la capacité.
- Activation à la 30e minute, jauge pleine, meilleures cibles choisies. Une capacité liée à un événement (penalty, coup franc, mi-temps, but) est activée à la première occurrence de cet événement après la 30e minute.
- Le contexte qui rend la capacité utile est installé dans les deux versions : joueurs au sol pour le kiné, but adverse récent pour la coupure de courant, blessé et exclu pour le miracle, malus pour le capitaine gueulard. L'Échange de maillots est mesuré avec une équipe à domicile plus faible (note 50), sinon échanger deux équipes identiques ne change rien.
- **Fenêtre** : durée de l'effet au niveau 1 (15 min par défaut pour les effets instantanés). Les buts marqués et encaissés sont comptés pendant cette fenêtre, en moyenne par match où l'activation a eu lieu.
- **Δ diff. de buts** et **Δ points** : écart sur le match entier, avec moins sans.
- **Activée** : part des matchs où la capacité a pu être utilisée (pour un déclencheur, où l'événement s'est produit après la 30e minute).
- La mesure a une incertitude d'environ ±0,03 point : un écart d'un centième avec la fourchette n'est pas significatif.

## Synthèse par rareté

| Rareté | Cible | Niveau 1 (moyenne) | Niveau 1 (min / max) | Niveau 5 (moyenne) | Niveau 5 (min / max) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Commune | +0.15 à +0.20 | +0.18 | +0.14 / +0.43 | +0.36 | +0.18 / +0.59 |
| Rare | +0.30 à +0.40 | +0.35 | +0.30 / +0.38 | +0.65 | +0.41 / +0.94 |
| Légendaire | +0.60 à +0.80 | +0.70 | +0.62 / +0.75 | +0.97 | +0.65 / +1.54 |
| Mythique | +1.00 à +1.40 | +1.17 | +1.10 / +1.27 | +1.47 | +1.32 / +1.64 |

Deux capacités sortent de leur fourchette au niveau 1 :

- **Le Danseur** (+0,43) : ne sert que sur penalty adverse (8 % des matchs après la 30e minute), où il divise par deux le risque d'encaisser. Situationnelle, elle peut dépasser.
- **Le Rugbyman reconverti** (+0,14) : il annule une action adverse, un nombre entier ; en annuler deux le rendrait trop fort.

## Mesures au niveau 1

| Capacité | Rareté | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Bedonnant | Commune | 25 min | 100 % | 0.39 → 0.43 | 0.42 → 0.22 | +0.25 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Bavard | Commune | 15 min | 100 % | 0.25 → 0.27 | 0.25 → 0.14 | +0.24 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Danseur | Commune | 15 min | 8 % | 0.14 → 0.28 | 1.04 → 0.47 | +0.52 | +0.43 | 0.15 à 0.20 | au-dessus (situationnelle) |
| Le Dégagement de mule | Commune | 15 min | 100 % | 0.25 → 0.46 | 0.25 → 0.23 | +0.31 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Jardinier | Commune | 25 min | 99 % | 0.39 → 0.45 | 0.42 → 0.23 | +0.22 | +0.15 | 0.15 à 0.20 | dans la cible |
| L’Agriculteur | Commune | 30 min | 99 % | 0.48 → 0.64 | 0.49 → 0.38 | +0.28 | +0.17 | 0.15 à 0.20 | dans la cible |
| Le Rugbyman reconverti | Commune | 15 min | 99 % | 0.25 → 0.26 | 0.25 → 0.11 | +0.19 | +0.14 | 0.15 à 0.20 | sous la cible |
| Haleine de Ricard | Commune | 25 min | 99 % | 0.39 → 0.65 | 0.42 → 0.36 | +0.34 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Mur de saucisses | Commune | 15 min | 85 % | 0.25 → 0.24 | 0.31 → 0.10 | +0.24 | +0.17 | 0.15 à 0.20 | dans la cible |
| Le Videur de boîte | Commune | 25 min | 99 % | 0.39 → 0.41 | 0.42 → 0.20 | +0.23 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Lacet fou | Commune | 11 min | 99 % | 0.18 → 0.35 | 0.19 → 0.16 | +0.20 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Marchand de sable | Commune | 25 min | 99 % | 0.39 → 0.66 | 0.42 → 0.36 | +0.34 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Chien de la casse | Commune | 25 min | 99 % | 0.39 → 0.58 | 0.42 → 0.31 | +0.32 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Ruisselant | Commune | 25 min | 99 % | 0.39 → 0.58 | 0.42 → 0.31 | +0.32 | +0.20 | 0.15 à 0.20 | dans la cible |
| Les Pigeons | Commune | 20 min | 99 % | 0.32 → 0.43 | 0.34 → 0.25 | +0.23 | +0.16 | 0.15 à 0.20 | dans la cible |
| La Mobylette | Commune | 20 min | 100 % | 0.32 → 0.55 | 0.34 → 0.29 | +0.32 | +0.20 | 0.15 à 0.20 | dans la cible |
| Le Buteur de comptoir | Commune | 20 min | 100 % | 0.32 → 0.50 | 0.34 → 0.30 | +0.27 | +0.16 | 0.15 à 0.20 | dans la cible |
| Bière tiède | Commune | 15 min | 89 % | 0.36 → 0.66 | 0.22 → 0.19 | +0.32 | +0.15 | 0.15 à 0.20 | dans la cible |
| Le Bulldozer | Commune | 22 min | 100 % | 0.34 → 0.57 | 0.37 → 0.31 | +0.29 | +0.20 | 0.15 à 0.20 | dans la cible |
| La Frappe de mule | Commune | 15 min | 100 % | 0.25 → 0.41 | 0.25 → 0.23 | +0.26 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Chambreur | Commune | 15 min | 99 % | 0.25 → 0.46 | 0.25 → 0.23 | +0.30 | +0.17 | 0.15 à 0.20 | dans la cible |
| Short trop court | Commune | 18 min | 99 % | 0.29 → 0.48 | 0.31 → 0.27 | +0.28 | +0.16 | 0.15 à 0.20 | dans la cible |
| Le Porteur d’eau | Commune | 15 min | 100 % | 0.25 → 0.30 | 0.25 → 0.21 | +0.32 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le DJ du vestiaire | Commune | 18 min | 100 % | 0.29 → 0.42 | 0.31 → 0.20 | +0.28 | +0.17 | 0.15 à 0.20 | dans la cible |
| Le Kiné douteux | Commune | 15 min | 100 % | 0.10 → 0.27 | 0.30 → 0.24 | +0.34 | +0.19 | 0.15 à 0.20 | dans la cible |
| Le Gardien kamikaze | Rare | 15 min | 100 % | 0.25 → 0.28 | 0.25 → 0.04 | +0.43 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Gardien fumeur | Rare | 25 min | 100 % | 0.39 → 0.42 | 0.42 → 0.08 | +0.47 | +0.34 | 0.30 à 0.40 | dans la cible |
| Le Bus de l’amicale | Rare | 35 min | 99 % | 0.55 → 0.59 | 0.56 → 0.23 | +0.39 | +0.30 | 0.30 à 0.40 | dans la cible |
| Le Boucher du village | Rare | 35 min | 99 % | 0.55 → 1.05 | 0.56 → 0.50 | +0.56 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Vomisseur | Rare | 14 min | 99 % | 0.23 → 0.54 | 0.24 → 0.10 | +0.50 | +0.34 | 0.30 à 0.40 | dans la cible |
| Le Retraité de 42 ans | Rare | 15 min | 99 % | 0.25 → 0.57 | 0.25 → 0.24 | +0.51 | +0.31 | 0.30 à 0.40 | dans la cible |
| Le Pique-assiette | Rare | 18 min | 99 % | 0.29 → 0.62 | 0.31 → 0.15 | +0.53 | +0.35 | 0.30 à 0.40 | dans la cible |
| Le Sombrero bourré | Rare | 15 min | 100 % | 0.25 → 0.69 | 0.25 → 0.24 | +0.57 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Revenant de la Feria | Rare | 30 min | 100 % | 0.48 → 0.99 | 0.49 → 0.45 | +0.57 | +0.34 | 0.30 à 0.40 | dans la cible |
| Le Chef de chant | Rare | 20 min | 99 % | 0.32 → 0.61 | 0.34 → 0.19 | +0.60 | +0.36 | 0.30 à 0.40 | dans la cible |
| Le Capitaine gueulard | Rare | 20 min | 99 % | 0.30 → 0.70 | 0.35 → 0.16 | +0.64 | +0.38 | 0.30 à 0.40 | dans la cible |
| Le Chien du président | Rare | 60 min | 100 % | 0.96 → 1.46 | 0.92 → 0.80 | +0.60 | +0.38 | 0.30 à 0.40 | dans la cible |
| La Panenka ivre | Légendaire | 15 min | 100 % | 0.25 → 1.08 | 0.25 → 0.24 | +0.92 | +0.62 | 0.60 à 0.80 | dans la cible |
| L’Échange de maillots | Légendaire | 60 min | 99 % | 0.67 → 1.25 | 1.31 → 0.73 | +1.18 | +0.73 | 0.60 à 0.80 | dans la cible |
| La Mêlée générale | Légendaire | 40 min | 99 % | 0.64 → 1.87 | 0.63 → 0.59 | +1.28 | +0.74 | 0.60 à 0.80 | dans la cible |
| La Coupure de courant | Légendaire | 15 min | 100 % | 0.24 → 0.27 | 1.23 → 0.24 | +1.01 | +0.66 | 0.60 à 0.80 | dans la cible |
| La Malédiction de mémé | Légendaire | 25 min | 100 % | 0.39 → 1.37 | 0.42 → 0.15 | +1.28 | +0.75 | 0.60 à 0.80 | dans la cible |
| Le Transfert du parking | Mythique | 30 min | 99 % | 0.48 → 2.28 | 0.49 → 0.14 | +2.31 | +1.12 | 1.00 à 1.40 | dans la cible |
| Le But en or massif | Mythique | 25 min | 100 % | 0.39 → 3.38 | 0.42 → 0.13 | +3.27 | +1.20 | 1.00 à 1.40 | dans la cible |
| Le Kebab du siècle | Mythique | 35 min | 100 % | 0.55 → 2.45 | 0.56 → 0.23 | +2.20 | +1.10 | 1.00 à 1.40 | dans la cible |
| Le Miracle du kiné | Mythique | 25 min | 99 % | 0.33 → 1.59 | 0.54 → 0.13 | +2.27 | +1.27 | 1.00 à 1.40 | dans la cible |

## Mesures au niveau 5

Au niveau 5, la fenêtre de comptage reste celle du niveau 1 ; l'écart de points porte sur le match entier.

| Capacité | Rareté | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points | Cible | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Le Bedonnant | Commune | 25 min | 100 % | 0.39 → 0.43 | 0.42 → 0.22 | +0.44 | +0.31 | 0.15 à 0.20 | au-dessus |
| Le Bavard | Commune | 15 min | 100 % | 0.25 → 0.27 | 0.25 → 0.09 | +0.42 | +0.28 | 0.15 à 0.20 | au-dessus |
| Le Danseur | Commune | 15 min | 8 % | 0.14 → 0.28 | 1.04 → 0.33 | +0.71 | +0.53 | 0.15 à 0.20 | au-dessus (situationnelle) |
| Le Dégagement de mule | Commune | 15 min | 100 % | 0.25 → 0.56 | 0.25 → 0.23 | +0.74 | +0.46 | 0.15 à 0.20 | au-dessus |
| Le Jardinier | Commune | 25 min | 99 % | 0.39 → 0.45 | 0.42 → 0.20 | +0.52 | +0.35 | 0.15 à 0.20 | au-dessus |
| L’Agriculteur | Commune | 30 min | 99 % | 0.48 → 0.65 | 0.49 → 0.35 | +0.54 | +0.33 | 0.15 à 0.20 | au-dessus |
| Le Rugbyman reconverti | Commune | 15 min | 99 % | 0.25 → 0.30 | 0.25 → 0.10 | +0.26 | +0.19 | 0.15 à 0.20 | dans la cible |
| Haleine de Ricard | Commune | 25 min | 99 % | 0.39 → 0.94 | 0.42 → 0.35 | +0.89 | +0.58 | 0.15 à 0.20 | au-dessus |
| Le Mur de saucisses | Commune | 15 min | 85 % | 0.25 → 0.24 | 0.31 → 0.04 | +0.43 | +0.29 | 0.15 à 0.20 | au-dessus |
| Le Videur de boîte | Commune | 25 min | 99 % | 0.39 → 0.41 | 0.42 → 0.20 | +0.32 | +0.23 | 0.15 à 0.20 | au-dessus |
| Le Lacet fou | Commune | 11 min | 99 % | 0.18 → 0.44 | 0.19 → 0.16 | +0.47 | +0.33 | 0.15 à 0.20 | au-dessus |
| Le Marchand de sable | Commune | 25 min | 99 % | 0.39 → 0.94 | 0.42 → 0.35 | +0.90 | +0.59 | 0.15 à 0.20 | au-dessus |
| Le Chien de la casse | Commune | 25 min | 99 % | 0.39 → 0.64 | 0.42 → 0.30 | +0.70 | +0.45 | 0.15 à 0.20 | au-dessus |
| Le Ruisselant | Commune | 25 min | 99 % | 0.39 → 0.64 | 0.42 → 0.30 | +0.70 | +0.45 | 0.15 à 0.20 | au-dessus |
| Les Pigeons | Commune | 20 min | 99 % | 0.32 → 0.59 | 0.34 → 0.19 | +0.55 | +0.36 | 0.15 à 0.20 | au-dessus |
| La Mobylette | Commune | 20 min | 100 % | 0.32 → 0.65 | 0.34 → 0.28 | +0.70 | +0.46 | 0.15 à 0.20 | au-dessus |
| Le Buteur de comptoir | Commune | 20 min | 100 % | 0.32 → 0.58 | 0.34 → 0.29 | +0.59 | +0.37 | 0.15 à 0.20 | au-dessus |
| Bière tiède | Commune | 15 min | 89 % | 0.36 → 0.79 | 0.22 → 0.21 | +0.41 | +0.22 | 0.15 à 0.20 | au-dessus |
| Le Bulldozer | Commune | 22 min | 100 % | 0.34 → 0.74 | 0.37 → 0.29 | +0.56 | +0.35 | 0.15 à 0.20 | au-dessus |
| La Frappe de mule | Commune | 15 min | 100 % | 0.25 → 0.44 | 0.25 → 0.23 | +0.30 | +0.18 | 0.15 à 0.20 | dans la cible |
| Le Chambreur | Commune | 15 min | 99 % | 0.25 → 0.56 | 0.25 → 0.21 | +0.59 | +0.35 | 0.15 à 0.20 | au-dessus |
| Short trop court | Commune | 18 min | 99 % | 0.29 → 0.73 | 0.31 → 0.26 | +0.70 | +0.43 | 0.15 à 0.20 | au-dessus |
| Le Porteur d’eau | Commune | 15 min | 100 % | 0.25 → 0.31 | 0.25 → 0.21 | +0.36 | +0.21 | 0.15 à 0.20 | au-dessus |
| Le DJ du vestiaire | Commune | 18 min | 100 % | 0.29 → 0.47 | 0.31 → 0.19 | +0.57 | +0.38 | 0.15 à 0.20 | au-dessus |
| Le Kiné douteux | Commune | 15 min | 100 % | 0.10 → 0.31 | 0.30 → 0.20 | +0.42 | +0.25 | 0.15 à 0.20 | au-dessus |
| Le Gardien kamikaze | Rare | 15 min | 100 % | 0.25 → 0.31 | 0.25 → 0.03 | +0.51 | +0.41 | 0.30 à 0.40 | au-dessus |
| Le Gardien fumeur | Rare | 25 min | 100 % | 0.39 → 0.42 | 0.42 → 0.05 | +0.74 | +0.55 | 0.30 à 0.40 | au-dessus |
| Le Bus de l’amicale | Rare | 35 min | 99 % | 0.55 → 0.59 | 0.56 → 0.20 | +0.68 | +0.53 | 0.30 à 0.40 | au-dessus |
| Le Boucher du village | Rare | 35 min | 99 % | 0.55 → 1.36 | 0.56 → 0.50 | +1.21 | +0.72 | 0.30 à 0.40 | au-dessus |
| Le Vomisseur | Rare | 14 min | 99 % | 0.23 → 0.54 | 0.24 → 0.10 | +0.85 | +0.58 | 0.30 à 0.40 | au-dessus |
| Le Retraité de 42 ans | Rare | 15 min | 99 % | 0.25 → 0.70 | 0.25 → 0.24 | +0.68 | +0.41 | 0.30 à 0.40 | au-dessus |
| Le Pique-assiette | Rare | 18 min | 99 % | 0.29 → 0.90 | 0.31 → 0.13 | +1.62 | +0.94 | 0.30 à 0.40 | au-dessus |
| Le Sombrero bourré | Rare | 15 min | 100 % | 0.25 → 0.84 | 0.25 → 0.24 | +0.75 | +0.51 | 0.30 à 0.40 | au-dessus |
| Le Revenant de la Feria | Rare | 30 min | 100 % | 0.48 → 1.12 | 0.49 → 0.46 | +1.31 | +0.71 | 0.30 à 0.40 | au-dessus |
| Le Chef de chant | Rare | 20 min | 99 % | 0.32 → 0.73 | 0.34 → 0.16 | +1.40 | +0.79 | 0.30 à 0.40 | au-dessus |
| Le Capitaine gueulard | Rare | 20 min | 99 % | 0.30 → 0.89 | 0.35 → 0.13 | +1.54 | +0.90 | 0.30 à 0.40 | au-dessus |
| Le Chien du président | Rare | 60 min | 100 % | 0.96 → 2.03 | 0.92 → 0.79 | +1.25 | +0.75 | 0.30 à 0.40 | au-dessus |
| La Panenka ivre | Légendaire | 15 min | 100 % | 0.25 → 1.14 | 0.25 → 0.24 | +0.97 | +0.65 | 0.60 à 0.80 | dans la cible |
| L’Échange de maillots | Légendaire | 60 min | 99 % | 0.67 → 1.25 | 1.31 → 0.73 | +1.27 | +0.78 | 0.60 à 0.80 | dans la cible |
| La Mêlée générale | Légendaire | 40 min | 99 % | 0.64 → 2.45 | 0.63 → 0.58 | +2.65 | +1.17 | 0.60 à 0.80 | au-dessus |
| La Coupure de courant | Légendaire | 15 min | 100 % | 0.24 → 0.31 | 1.23 → 0.21 | +1.09 | +0.71 | 0.60 à 0.80 | dans la cible |
| La Malédiction de mémé | Légendaire | 25 min | 100 % | 0.39 → 2.94 | 0.42 → 0.08 | +6.27 | +1.54 | 0.60 à 0.80 | au-dessus |
| Le Transfert du parking | Mythique | 30 min | 99 % | 0.48 → 3.20 | 0.49 → 0.11 | +4.46 | +1.46 | 1.00 à 1.40 | au-dessus |
| Le But en or massif | Mythique | 25 min | 100 % | 0.39 → 4.79 | 0.42 → 0.10 | +6.92 | +1.47 | 1.00 à 1.40 | au-dessus |
| Le Kebab du siècle | Mythique | 35 min | 100 % | 0.55 → 2.45 | 0.56 → 0.23 | +3.19 | +1.32 | 1.00 à 1.40 | dans la cible |
| Le Miracle du kiné | Mythique | 25 min | 99 % | 0.33 → 2.20 | 0.54 → 0.10 | +3.79 | +1.64 | 1.00 à 1.40 | au-dessus |
