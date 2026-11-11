# Équilibrage des capacités

Ce document fixe les règles d'équilibrage des capacités spéciales. Les mesures qui les vérifient sont dans [impact-capacites.md](impact-capacites.md).

## Cibles d'impact par rareté

Une capacité se juge à ce qu'elle rapporte au classement : les **points de championnat gagnés en moyenne quand on l'active**, comparés au même match sans elle. Mesure au niveau 1, entre deux équipes de même niveau (voir la méthode dans [impact-capacites.md](impact-capacites.md)).

| Rareté | Coût (gueulante) | Points par activation | Points par point de gueulante |
| --- | ---: | ---: | ---: |
| Commune | 2 | **+0,15 à +0,20** | 0,075 à 0,10 |
| Rare | 3 | **+0,30 à +0,40** | 0,10 à 0,13 |
| Légendaire | 5 | **+0,60 à +0,80** | 0,12 à 0,16 |
| Mythique | 7 | **+1,00 à +1,40** | 0,14 à 0,20 |

Principes :

- les fourchettes ne se chevauchent pas : une rareté au-dessus est toujours plus forte ;
- le point de gueulante rapporte un peu plus à chaque rareté : économiser pour une grosse capacité est récompensé ;
- une mythique retourne un match à elle seule (environ un point par activation, souvent la différence entre un nul et une victoire) ;
- une capacité de penalty ou de coup franc est jugée sur ce qu'elle rapporte quand l'événement arrive, avec les mêmes fourchettes : elle ne sert pas souvent, mais elle doit valoir son prix quand on la joue ;
- un penalty est déjà marqué 3 fois sur 4 : une capacité qui ne fait qu'améliorer le tir plafonne vite. Les capacités de penalty ajoutent donc un effet qui dure (bonus de tir, élan de l'équipe, adversaire déconcentré), et les communes de penalty ont exceptionnellement deux effets ;
- une capacité peut être déclarée situationnelle (`SITUATIONAL_ABILITIES` dans `src/domain/match/impactBench.ts`) si elle a le droit de dépasser sa fourchette ; la liste est vide aujourd'hui.

Les cibles sont codées dans `IMPACT_TARGETS` (`src/domain/match/impactBench.ts`). Le test `impactBench.test.ts` vérifie à chaque lancement de la suite que chaque capacité reste dans sa fourchette (250 matchs par capacité, avec une marge de 0,2 point pour le bruit de mesure : il détecte une capacité cassée, pas un écart fin).

## Progression par niveau (CAP-11)

Toutes les capacités progressent à chaque niveau, du niveau 1 au niveau 5 (`statsAtLevel`, `src/domain/abilities/progression.ts`) :

| Ce qui grandit | Par niveau au-delà du premier |
| --- | --- |
| Valeurs (bonus et malus de stats, bonus d'occasion, modificateurs progressifs) | +10 % |
| Probabilités (occasion immédiate, malus de tir adverse, énergie rendue) | la part d'échec diminue de 10 % : elles se rapprochent de 100 % sans l'atteindre |
| Malus de tir adverse | un tir de plus touché aux niveaux 3 et 5 |
| Durées (effets, mises au sol, poursuite, inversion des niveaux, buts doubles, délai d'annulation) | +10 %, au moins une minute de plus à chaque niveau |
| Capacités sans chiffre à faire grandir (annulation d'action, vol de jauge, transfert, relève, annulation de but) | petit bonus d'équipe : +3 % à toutes les stats pendant 10 minutes par niveau |

Le niveau 5 garde en plus son bonus : une cible de plus pour les capacités ciblées, sinon +50 % de durée, sinon un effet 25 % plus fort. Une capacité à durée fixe (`fixedDuration`, aujourd'hui Le Bus de l'amicale) ne gagne jamais de minutes : ses niveaux et son bonus de niveau 5 ne renforcent que l'effet. La contrepartie d'une capacité (le porteur au sol après La Mêlée générale) ne grandit jamais.

## Rythme de progression (CAP-10)

Monter une capacité au niveau 5 doit prendre presque une carrière. Chaque niveau coûte plus d'XP que le précédent (`XP_THRESHOLDS` dans `src/domain/abilities/progression.ts`) :

| Niveau | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| XP cumulée | 0 | 250 | 900 | 2 400 | 5 000 |
| XP pour ce niveau | | 250 | 650 | 1 500 | 2 600 |

Sources d'XP au club du coach :

- une activation rapporte de 10 à 30 XP selon son impact, environ 20 en moyenne (mesuré) ;
- le programme d'entraînement « capacité » rapporte de 1 à 5 XP par semaine selon l'âge (28 semaines par saison), davantage avec le centre d'entraînement.

Rythme attendu, en saisons pour atteindre chaque niveau :

| Joueur | XP par saison | Niv. 2 | Niv. 3 | Niv. 4 | Niv. 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Très utilisé (une activation par match, entraînement capacité, moins de 24 ans) | ~540 | 0,5 | 1,7 | 4,4 | ~9 |
| Utilisé un match sur deux, entraînement capacité, 24 à 27 ans | ~285 | 0,9 | 3,2 | 8,4 | ~17 |

Hors du club du coach, on ne simule pas l'XP match par match : chaque joueur gagne de 120 à 320 XP par saison (`CAREER_XP_PER_SEASON`), et un joueur généré reçoit l'XP d'une carrière commencée à 18 ans. Résultat dans un monde neuf (mesuré) :

| Âge | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 | Niv. 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 18 à 20 ans | 51 % | 49 % | | | |
| 21 à 23 ans | | 52 % | 48 % | | |
| 24 à 27 ans | | 6 % | 84 % | 10 % | |
| 28 à 30 ans | | | 46 % | 54 % | |
| 31 à 34 ans | | | 18 % | 81 % | 1 % |

Le niveau 5 reste exceptionnel ; les clubs IA y amènent quelques vétérans au fil des saisons.

Le niveau de capacité compte dans la valeur marchande : +20 % par niveau au-delà du premier (×1,8 au niveau 5).

## Coups francs (MATCH-12)

Un coup franc est tiré à une distance au hasard : proche (30 %), moyenne (45 %) ou lointaine (25 %). L'équipe qui tire choisit son option, celle qui défend la taille de son mur (`FREE_KICK_CONVERSION` et `WALL_FACTOR` dans `src/domain/match/plays.ts`).

Probabilité de but mesurée entre deux équipes égales, mur normal :

| Distance | Frappe directe | Centre | Combinaison |
| --- | ---: | ---: | ---: |
| Proche | 14 % | 6 % | 8 % |
| Moyenne | 7,5 % | 9 % | 8 % |
| Lointaine | 4 % | 9 % | 8 % |

- **Mur** : un grand mur réduit la frappe directe de 30 % mais améliore les centres de 15 % ; un petit mur fait l'inverse (+30 % / −15 %). La combinaison n'est pas touchée.
- **Centre repoussé** : 5 % de risque de contre adverse, la défense étant montée.
- **Choix par défaut** (IA, ou coach qui laisse filer) : frappe directe de près, centre sinon ; grand mur de près, normal à moyenne distance, petit de loin.
- Le nombre de buts par match n'a pas bougé avec ce système (2,94 entre deux équipes égales).

Capacités liées (déclencheurs `ownFreeKick` et `opponentFreeKick`, qui ne s'ouvrent que sur un coup franc, pas sur un corner) : Le Pied de velours, Le Ballon déplacé, Le Plongeon d'Oscar, La Bousculade dans le mur. La Tête de pioche et Le Mur de saucisses valent aussi sur corner.

## Jauge de gueulante (CAP-05)

La jauge reste rare exprès : jouer une capacité doit être un choix réfléchi, pas un réflexe. Chaque activation pèse lourd, mais on n'en déclenche que quelques-unes par match.

- 3 points au coup d'envoi ;
- +1 point toutes les 10 minutes ;
- +1 point quand l'équipe encaisse ;
- 10 points au maximum.

Une jauge plus rapide (5 au départ, +1 toutes les 8 minutes) a été essayée puis abandonnée : trop de capacités déclenchées, plus assez de stratégie.

## Refaire les mesures

```bash
bun run impact
```

Le script `scripts/ability-impact.ts` mesure chaque capacité sur 1 000 matchs (on peut passer un autre nombre en argument) et affiche le tableau Markdown d'[impact-capacites.md](impact-capacites.md). Après toute modification d'une capacité, relancer la mesure, recaler les valeurs dans `src/domain/abilities/data/` jusqu'à revenir dans la fourchette, puis mettre à jour le tableau.

## Historique

- **Novembre 2026** : premier équilibrage. Avant, l'impact moyen allait de +0,10 point (commune) à +0,51 point (mythique), et la mythique rapportait moins par point de gueulante que la légendaire. Les valeurs ont été recalées sur les cibles ci-dessus et toutes les capacités progressent désormais à chaque niveau. La jauge garde son rythme d'origine. Les paliers d'XP ont été relevés (niveau 5 à 5 000 XP au lieu de 300) pour que le niveau 5 demande presque une carrière.
- **Novembre 2026** : coups francs avec distance, choix de l'option (frappe directe, centre, combinaison) et du mur. Neuf capacités de penalty et de coup franc ajoutées (55 en tout), mesurées sur l'événement qu'elles visent et recalées dans leur fourchette. Quelques capacités existantes ont été réajustées après ce changement.
- **Novembre 2026** : chaque capacité ne sert plus qu'une fois par match, quelle que soit sa rareté (il n'y a plus de recharge). Le bonus de niveau 5 « recharge plus courte » devient « effet 25 % plus fort ». Les mesures par activation ne changent pas : le banc n'active qu'une fois.
- **Novembre 2026** : les capacités d'occasion (penalty, coup franc, corner) resservent à chaque occasion dans le match, tant que la jauge le permet ; les autres restent à une utilisation par match.
