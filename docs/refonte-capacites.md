> Document de travail de la refonte (novembre 2026), gardé pour l'historique des idées. Le catalogue retenu est dans `src/domain/abilities/data/` et dans [exigences.md](exigences.md) (CAT-01) ; ses règles d'équilibrage dans [equilibrage-capacites.md](equilibrage-capacites.md).

# Refonte des capacités — proposition à valider

> Statut : **proposition**, rien n'est codé. Les chiffres sont ceux du niveau 1 et servent de point de départ :
> l'équilibrage final se fait par mesure (`scripts/ability-impact.ts`), dans les mêmes fourchettes d'impact
> par rareté qu'aujourd'hui ([equilibrage-capacites.md](equilibrage-capacites.md)).

## 1. Le constat

Les 55 capacités actuelles marchent, mais la plupart se ressemblent : « +X à une stat pendant N minutes » ou
« un adversaire hors jeu N minutes ». Le coach choisit surtout *quand* appuyer, rarement *comment* jouer.

La refonte garde l'esprit (humour de buvette, une capacité par joueur, une utilisation par match, la jauge de
gueulante) mais donne à chaque capacité **une vraie décision** : un timing, une cible, un pari, une lecture du jeu
adverse, une combinaison avec un coéquipier.

## 2. Ce qui ne change pas

- Une capacité par joueur, à vie (CAP-01), unique dans un effectif (CAP-02).
- Une utilisation par match ; les capacités d'occasion resservent à chaque penalty, coup franc ou corner (CAP-04).
- Coût par rareté (2 / 3 / 5 / 7), jauge de 10 points, rien en dehors du match (CAP-05, CAP-06).
- Rôles des raretés (CAP-12) : **commune** = simple et sûre ; **rare** = une petite mécanique en plus ;
  **légendaire** = peut renverser un match ; **mythique** = change les règles, et l'IA y a droit.
- Progression sur 5 niveaux (CAP-10, CAP-11), fourchettes d'impact par rareté.

## 3. Les nouvelles mécaniques

Treize mécaniques nouvelles dans le moteur de match. Chacune se voit sur le terrain et se comprend d'un coup d'œil.

| # | Mécanique | Principe | Ce qu'on voit |
|---|---|---|---|
| M1 | **Marquage** | Un de tes joueurs s'accroche à un adversaire : l'adversaire est affaibli tant que le lien tient. Le lien casse si ton joueur sort, est mis au sol ou exclu. | Un trait pointillé entre les deux jetons. |
| M2 | **Piège** | La capacité s'« arme » pour N minutes et se déclenche au prochain événement adverse visé (tir, but, faute, coup de pied arrêté, capacité). | Une icône de piège armé, **visible seulement par toi** : en duel, l'autre coach ne sait pas ce qui l'attend. |
| M3 | **Arbitre** | Pendant N minutes, l'arbitre penche d'un côté : plus ou moins de fautes sifflées, de cartons, de penalties. | Un badge « Arbitre : complaisant / à cran » au tableau de score. |
| M4 | **Pari** | Probabilité de réussite affichée avant de valider : réussite = gros effet, échec = contrepartie. | La roue du pari tourne à l'activation, résultat annoncé. |
| M5 | **Chrono** | Agir sur le temps : minutes « mortes » sans occasion, temps additionnel en plus ou en moins, retour en arrière. | L'horloge se fige ou le temps additionnel change. |
| M6 | **Relais** | Bonus si un coéquipier a lancé une capacité dans les 5 dernières minutes : on enchaîne. | Un halo « Relais » sur les joueurs qui peuvent enchaîner. |
| M7 | **Bouclier** | Absorbe les N prochaines capacités adverses qui visent l'équipe ou un joueur. | Un bouclier sur les jetons protégés, qui se fissure. |
| M8 | **Lecture du jeu** | La prochaine capacité adverse est affaiblie de moitié… ou renvoyée à l'envoyeur. | « Lu ! » à l'activation adverse. |
| M9 | **Copie** | Rejoue la dernière capacité utilisée par l'adversaire, à ton profit. | La capacité copiée s'annonce avec son nom d'origine. |
| M10 | **Tactique imposée** | Force les consignes adverses pendant N minutes (le faire attaquer, presser, jouer long). | Les consignes adverses changent, avec un cadenas. |
| M11 | **Énergie** | Épuiser des adversaires (fatigue en plus) ou transférer de l'énergie d'un joueur à un autre. | Les jauges d'énergie bougent. |
| M12 | **Conditions** | Capacité disponible seulement dans une situation (mené, devant, après la 70e…) ou plus forte selon l'écart au score. | La capacité s'allume quand la condition est remplie. |
| M13 | **Surcharge** | Vide toute la jauge restante : l'effet grandit avec chaque point dépensé. | La jauge se vide d'un coup. |

## 4. Le catalogue proposé : 60 capacités

30 communes, 16 rares, 9 légendaires, 5 mythiques, réparties pour qu'un effectif de 18 joueurs trouve toujours
des capacités compatibles et toutes différentes (2 gardiens, 6 défenseurs, 6 milieux, 4 attaquants).
« ★ » = idée reprise de l'ancien catalogue, retravaillée.

### Communes (coût 2) — simples et sûres

| Nom | Poste | Cible / quand | Méca. | Effet (niveau 1) |
|---|---|---|---|---|
| Le Bedonnant ★ | Gardien | Soi | — | Arrêts +120 % pendant 25 min : il remplit la cage. |
| Le Bavard ★ | Gardien | Soi | — | Les 3 prochains tirs adverses : −50 % de réussite. |
| Le Lacet défait | Gardien | Soi | M5 | Il relace ses chaussures : 3 minutes sans aucune occasion, pour personne. Idéal pour tenir un score. |
| La Relance au pied | Gardien | Équipe | M2 | Piège 20 min : au prochain arrêt du gardien, contre immédiat pour toi (+15 % de but). |
| Le Marquage à la culotte | Défenseur | 1 attaquant | M1 | Lien 25 min : l'attaquant marqué perd 60 % en tir. |
| Le Libéro de 1982 | Défenseur | Soi | M2 | Piège 30 min : annule les 2 prochaines contre-attaques adverses. |
| Le Mur de saucisses ★ | Défenseur | Coup franc ou corner adverse | — | Les 3 prochains tirs adverses : −80 % (le mur bouge pas). |
| La Tête de pioche ★ | Défenseur | Coup de pied arrêté pour toi | — | Centre : +28 % de but. |
| L'Agriculteur ★ | Défenseur | Soi | — | Toutes ses stats +150 % pendant 25 min : il a labouré le terrain avant le match. |
| Le Rouleau compresseur | Défenseur | 2 adversaires | M11 | +25 de fatigue aux deux cibles : elles finiront le match à genoux. |
| Le Métronome | Milieu | Équipe | — | Milieu de terrain +40 % pendant 20 min : la balle ne quitte plus vos pieds. |
| Le Une-Deux | Milieu | 1 coéquipier attaquant | M6 | Les deux : tir +60 % pendant 15 min. Marque-t-il ? La jauge te rend 1 point. |
| Le Chien de la casse ★ | Milieu | Soi | — | Physique +130 % pendant 25 min. |
| Le Marchand de sable ★ | Milieu | 1 adversaire | — | Concentration −90 % pendant 25 min. |
| Le Pressing de buvette | Milieu | Équipe | M10 | Pressing haut gratuit 15 min : les avantages, sans la fatigue. |
| Le Ballon dans les tribunes | Milieu | Soi | M5 | Il dégage en touche… très loin : la prochaine action adverse est annulée. |
| La Mobylette ★ | Attaquant | Soi | — | Vitesse +130 % pendant 20 min. |
| La Frappe de mule ★ | Attaquant | Soi | — | Prochaine occasion de l'équipe : +15 % de but. |
| Le Renard des surfaces | Attaquant | Soi | — | La prochaine occasion de l'équipe est pour lui, avec +20 % de but. |
| Bière tiède ★ | Attaquant | Penalty ou coup de pied arrêté pour toi | — | +27 % de but sur l'occasion. |
| Le Gratteur de fautes | Attaquant | Soi | M2 | Piège 20 min : la prochaine faute adverse devient un coup franc proche. |
| Le Pivot de comptoir | Attaquant | Soi | — | Physique et tir +80 % pendant 20 min : il garde le ballon dos au but. |
| Le Chambreur ★ | Tous postes | 1 adversaire | — | Toutes ses stats −55 % pendant 18 min. |
| Short trop court ★ | Tous postes | 2 adversaires | — | Concentration −70 % pendant 18 min. |
| Le Supporter infiltré | Tous postes | Équipe | M3 | Arbitre complaisant 20 min : tes fautes ne valent plus de carton. |
| Le Pétard mouillé | Tous postes | Sa zone | — | Adversaires de sa zone : vitesse −80 % pendant 25 min. |
| Le Porteur d'eau ★ | Banc | Équipe | M11 | Rend 60 % de l'énergie perdue à toute l'équipe. |
| Le Kiné douteux ★ | Banc | 3 coéquipiers au sol ou blessés | — | Les relève tout de suite. |
| Le DJ du vestiaire ★ | Banc | Équipe | — | Vitesse +20 % pendant 18 min pour tous. |
| L'Adjoint au carnet | Banc | Adversaires | M8 | La prochaine capacité adverse n'a que la moitié de son effet. |

### Rares (coût 3) — une petite mécanique en plus

| Nom | Poste | Cible / quand | Méca. | Effet (niveau 1) |
|---|---|---|---|---|
| Le Gardien kamikaze ★ | Gardien | Soi | — | Annule les 3 prochaines actions adverses, +1 point de jauge. |
| Le Gardien libéro | Gardien | Soi | M4 | Pari 40 % : il monte et frappe (but). Raté : contre adverse dans un but vide (+35 % de but pour eux). |
| Le Tacle à retardement | Défenseur | 1 adversaire | M4 | L'adversaire est au sol 30 min. Risque : 35 % de carton jaune pour ton défenseur (2e jaune = rouge). |
| Le Bus de l'amicale ★ | Défenseur | Équipe | — | Défense +350 % pendant 45 min ; +2 points de jauge si tu n'encaisses rien d'ici là. |
| Le Mur humain | Défenseur | Équipe | M7 | Bouclier 30 min : les 2 prochaines capacités adverses contre l'équipe sont absorbées. |
| Le Pique-assiette ★ | Milieu | Adversaires | — | Vole 2 points de jauge à l'adversaire et le déconcentre. |
| Le Copieur | Milieu | Soi | M9 | Rejoue la dernière capacité utilisée par l'adversaire, à ton profit (niveau 1). |
| L'Ancien de 42 ans ★ | Milieu | Équipe | M6 | Deux occasions boostées (+22 %). Relais : si un coéquipier vient de lancer une capacité, +35 % chacune. |
| Le Sombrero bourré ★ | Attaquant | Soi | — | Tente lui-même une occasion à +50 %. S'il marque, il pourra la rejouer. |
| Le Plongeur de Séville | Attaquant | Soi | M4 | Pari 45 % : penalty pour toi. Raté : carton jaune pour simulation. |
| Le Revenant de la Feria ★ | Attaquant | Soi | M12 | Tir +5 % par minute déjà jouée (+225 % à la 45e) pendant 30 min : il se réveille tard. |
| Le Chef de chant ★ | Tous postes | Équipe | — | Toutes les stats +35 % pendant 20 min, +5 min à chaque but marqué. |
| Le Capitaine gueulard ★ | Tous postes | Équipe | — | Efface les malus de l'équipe, puis +38 % à tout pendant 20 min. 3 malus effacés : +1 point de jauge. |
| Le Chien du président ★ | Banc | 1 adversaire | — | Au sol 30 min, puis le chien choisit une nouvelle victime pour 30 min. |
| Le Ramasseur de balles ★ | Banc | Penalty adverse | — | Le penalty marqué est à retirer. |
| Le Faux médecin | Banc | Équipe | M5, M12 | Mené ou à égalité : +4 min de temps additionnel, et +40 % à tout pendant ce temps-là. |

### Légendaires (coût 5) — peuvent renverser un match

| Nom | Poste | Cible / quand | Méca. | Effet (niveau 1) |
|---|---|---|---|---|
| Le Piège à cons | Gardien | Équipe | M2 | Armé jusqu'à la fin du match : le prochain but adverse est refusé pour hors-jeu, et tu pars en contre (+30 %). |
| L'Échange de maillots ★ | Tous postes | Équipes | — | Les niveaux des deux équipes sont inversés pendant 60 min. |
| La Mêlée générale ★ | Tous postes | 3 adversaires | M3 | Les 3 au sol 40 min, ton joueur 15 min, et l'arbitre distribue un carton jaune au hasard dans chaque équipe. |
| La Coupure de courant ★ | Banc | — | — | Annule le dernier but adverse s'il date de moins de 5 min. |
| La Panenka ivre ★ | Attaquant | Soi | — | Occasion immédiate à 90 %, puis +20 % à tout pendant 10 min. |
| Le Match arrangé | Milieu | Arbitre | M3 | Arbitre acheté 20 min : les fautes adverses sont sifflées double, cartons faciles, et chaque faute dans la surface devient penalty pour toi. |
| La Remontada du dimanche | Attaquant | Équipe | M12 | Disponible seulement si tu es mené : +45 % à tout **par but de retard**, jusqu'à la fin du match. |
| L'Entraîneur-joueur | Milieu | Adversaires | M10 | Il donne leurs consignes : l'adversaire joue offensif avec pressing haut pendant 20 min (il s'expose et se fatigue). |
| Le Tifo géant | Banc | Équipe | M13 | Surcharge : vide la jauge restante, +15 % à tout pour toute l'équipe **par point dépensé**, pendant 25 min. |

### Mythiques (coût 7) — changent les règles

| Nom | Poste | Cible / quand | Méca. | Effet (niveau 1) |
|---|---|---|---|---|
| Le But en or massif ★ | Attaquant | Équipe | — | Chaque but de ton équipe compte double pendant 20 min, +100 % à tout. (Plafonné : 2 buts doublés au plus.) |
| Le Transfert du parking ★ | Milieu | Adversaires | — | Le meilleur joueur de champ adverse change d'équipe jusqu'à la fin du match. |
| Le Miracle du kiné ★ | Défenseur | Équipe | — | Exclus et blessés reviennent, toute l'équipe repart à 100 % d'énergie, +80 % à tout pendant 25 min. |
| La Machine à remonter le temps | Gardien | Match | M5 | Le score revient à celui d'il y a 15 minutes : tous les buts des 15 dernières minutes sont effacés, des deux côtés. |
| La Grève des arbitres | Banc | Match | M3 | 30 minutes sans arbitre : plus de fautes sifflées, plus de cartons, plus de coups de pied arrêtés. Les capacités adverses de coup franc et de penalty deviennent inutiles. |

## 5. L'IA

Chaque mécanique a sa règle de jeu pour l'IA (et pour l'adversaire en solo) :

- **Piège, Bouclier, Lecture** : posés tôt, ou dès que l'adversaire a de la jauge pour une grosse capacité.
- **Pari** : seulement quand elle est menée ou à égalité en fin de match.
- **Chrono** : Lacet défait et ralentisseurs quand elle mène ; temps additionnel quand elle est menée.
- **Conditions** : lancées dès que la condition est remplie, sauf si l'écart au score est déjà fait.
- **Surcharge** : seulement avec au moins 6 points de jauge.
- **Copie** : seulement si l'adversaire vient de jouer une capacité qui vaut le coup.

## 6. Ce que deviennent les joueurs existants

- Les capacités marquées ★ gardent leur identifiant : les joueurs qui les ont les gardent.
- Les autres joueurs reçoivent une **nouvelle capacité de la même rareté**, compatible avec leur poste et unique
  dans l'effectif. Ils gardent leur **niveau et leur XP**.
- La conversion se fait au chargement d'une sauvegarde (solo et ligues multijoueur), une seule fois.
- Le reroll de capacité et le scout fonctionnent tels quels avec le nouveau catalogue.

## 7. Plan de réalisation

C'est un gros chantier, en cinq étapes, chacune testée avant la suivante :

1. **Moteur** : les 13 mécaniques, avec leurs tests.
2. **Catalogue** : les 60 capacités, leurs textes, leurs effets par niveau.
3. **Écran de match** : traits de marquage, pièges (cachés à l'adversaire en duel), badge d'arbitre, roue du pari,
   bouclier, horloge figée, annonces.
4. **IA et équilibrage** : règles de l'IA, puis mesure de chaque capacité et recalage dans les fourchettes de sa rareté.
5. **Conversion des sauvegardes**, documentation (catalogue CAT-01, équilibrage), vérification complète dans le navigateur.

## 8. Questions ouvertes

1. Le catalogue te plaît-il ? Des capacités à retirer, renommer, ajouter ?
2. **60 capacités** (contre 55), ça te va ?
3. On garde bien les classiques marqués ★, ou tu veux **tout** renouveler ?
4. En duel, les **pièges restent cachés** à l'adversaire (il découvre au déclenchement) : d'accord ?
5. **Les paris** (Gardien libéro, Tacle à retardement, Plongeur de Séville) : la probabilité est affichée avant de valider. D'accord ?
