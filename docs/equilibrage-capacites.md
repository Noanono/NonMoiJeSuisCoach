# Équilibrage des capacités

Ce document fixe les règles d'équilibrage des capacités spéciales. Les mesures qui les vérifient sont dans [impact-capacites.md](impact-capacites.md).

## Cibles d'impact par coût

Une capacité se juge à ce qu'elle rapporte au classement : les **points de championnat gagnés en moyenne quand on l'active**, comparés au même match sans elle. Mesure entre deux équipes de même niveau (voir la méthode dans [impact-capacites.md](impact-capacites.md)).

Le coût en gueulante de chaque capacité (1 à 7) est fixé selon ce qu'elle rapporte ; la rareté, elle, dit seulement à quel point la capacité est mécanique (CAP-12). Une commune peut donc coûter 7 et une mythique 2.

| Coût | Niveau 1 | Niveau 5 |
| ---: | ---: | ---: |
| 1 | +0,06 à +0,10 | +0,09 à +0,20 |
| 2 | +0,15 à +0,20 | +0,22 à +0,40 |
| 3 | +0,30 à +0,40 | +0,45 à +0,80 |
| 4 | +0,45 à +0,60 | +0,68 à +1,20 |
| 5 | +0,60 à +0,80 | +0,90 à +1,60 |
| 6 | +0,80 à +1,10 | +1,20 à +2,20 |
| 7 | +1,00 à +1,40 | +1,50 à +2,80 |

Principes :

- le point de gueulante rapporte un peu plus sur les grosses capacités : économiser est récompensé ;
- au niveau 5, une capacité rapporte entre 1,5 et 2 fois sa fourchette du niveau 1 ;
- une capacité à condition (« seulement quand tu es mené », « à partir de la 80e minute ») est jugée sur les matchs où elle a pu être jouée ;
- une capacité de penalty ou de coup franc est jugée sur ce qu'elle rapporte quand l'événement arrive ;
- aucun malus de stats ne dépasse −90 % (`MAX_MALUS`), à aucun niveau : au-delà, le joueur est déjà au plancher de 10 % de sa note. Une capacité au plafond progresse par sa durée ou ses cibles.

Les cibles sont codées dans `IMPACT_TARGETS` et `impactTarget` (`src/domain/match/impactBench.ts`). Le test `impactBench.test.ts` vérifie à chaque lancement de la suite que chaque capacité reste dans la fourchette de son coût au niveau 1 (400 matchs par capacité, avec une marge de 2,5 erreurs types : il détecte une capacité cassée, pas un écart fin).

## Progression par niveau (CAP-11)

Toutes les capacités progressent à chaque niveau, du niveau 1 au niveau 5 (`statsAtLevel`, `src/domain/abilities/progression.ts`) :

| Ce qui grandit | Par niveau au-delà du premier |
| --- | --- |
| Valeurs (bonus et malus de stats, bonus d'occasion, modificateurs progressifs) | +10 % |
| Probabilités (occasion immédiate, malus de tir adverse, énergie rendue) | la part d'échec diminue de 10 % : elles se rapprochent de 100 % sans l'atteindre |
| Malus de tir adverse | un tir de plus touché aux niveaux 3 et 5 |
| Durées (effets, mises au sol, poursuite, inversion des niveaux, buts doubles, délai d'annulation) | +10 %, au moins une minute de plus à chaque niveau |
| Capacités sans chiffre à faire grandir (annulation d'action, vol de jauge, transfert, relève, annulation de but) | petit bonus d'équipe : +3 % à toutes les stats pendant 10 minutes par niveau |

Le niveau 5 garde en plus son bonus : une cible de plus pour les capacités ciblées, sinon +50 % de durée, sinon un effet 25 % plus fort. Une capacité à durée fixe (`fixedDuration` : Le Béton armé, Le Car à deux étages) ne gagne jamais de minutes : ses niveaux et son bonus de niveau 5 ne renforcent que l'effet. La contrepartie d'une capacité (pari perdu, porteur au sol) ne grandit jamais.

Chaque capacité peut régler sa progression pour tenir sa cible du niveau 5 :

- `levelGain` : vitesse de progression des valeurs et des durées (1 = normale, 0,4 = freinée, 2 = doublée) ;
- `levelBoost` : bonus d'équipe ajouté à chaque niveau (part de toutes les stats, pendant 20 minutes), pour les capacités qui ne peuvent pas grandir d'elles-mêmes (bouclier, annulation, règles du match) ;
- `maxDuration` : durée maximale de ses effets, quel que soit le niveau (une mi-temps pour Le Gardien volant).

## Rythme de progression (CAP-10)

Monter une capacité au niveau 5 doit prendre presque une carrière. Chaque niveau coûte plus d'XP que le précédent (`XP_THRESHOLDS` dans `src/domain/abilities/progression.ts`) :

| Niveau | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| XP cumulée | 0 | 250 | 900 | 2 400 | 5 000 |
| XP pour ce niveau | | 250 | 650 | 1 500 | 2 600 |

Sources d'XP au club du coach :

- une activation rapporte de 10 à 30 XP selon son impact, environ 20 en moyenne (mesuré) ;
- le programme d'entraînement « capacité » rapporte 60 XP par semaine jusqu'à 23 ans, 50 de 24 à 27 ans, 40 de 28 à 31 ans et 30 ensuite (28 semaines par saison), davantage avec le centre d'entraînement. C'est la voie rapide : une semaine d'entraînement vaut deux à trois activations, mais le joueur ne travaille alors aucun attribut.

Rythme attendu, en saisons pour atteindre chaque niveau :

| Joueur | XP par saison | Niv. 2 | Niv. 3 | Niv. 4 | Niv. 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Très utilisé (une activation par match, entraînement capacité, moins de 24 ans) | ~2 080 | 0,1 | 0,4 | 1,2 | ~2,4 |
| Utilisé un match sur deux, entraînement capacité, 24 à 27 ans | ~1 600 | 0,2 | 0,6 | 1,5 | ~3,1 |
| Entraînement capacité seul, sans activation, 28 à 31 ans | ~1 120 | 0,2 | 0,8 | 2,1 | ~4,5 |
| Activations seules (entraînement sur un attribut), moins de 24 ans | ~400 | 0,6 | 2,3 | 6 | ~12,5 |

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
- **Novembre 2026** : penalty à choix (frappe placée, en force, Panenka ; plongeon du gardien). Le calibrage garde ~76 % de réussite quand l'IA choisit, les capacités de penalty restent dans leur fourchette (banc de la suite de tests).
- **Novembre 2026** : l'entraînement de capacité devient la voie rapide (30 à 60 XP par semaine selon l'âge, au lieu de 1 à 5) : un joueur entraîné sur sa capacité atteint le niveau 5 en 2 à 5 saisons, contre une dizaine en ne comptant que les matchs.
