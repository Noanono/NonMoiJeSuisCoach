# Non, moi je suis coach — Exigences

Version du 9 nov. 2026. Chaque exigence porte un identifiant pour être suivie pendant le développement.

## Présentation

*Non, moi je suis coach* est un jeu de gestion de club de foot amateur, jouable en solo dans le navigateur. Le joueur prend la tête d'un club de district et tente de le hisser jusqu'à l'élite, saison après saison.

Le jeu mêle une vraie couche de gestion (effectif, tactique, mercato, budget) et un humour franchement adulte : alcool, grivoiserie, scatologie. Ce qui se passe pendant un match reste dans le match, à part le résultat, les cartons rouges et les blessures.

- Public : adultes, joueurs occasionnels qui aiment le foot et le second degré.
- Ton : buvette du dimanche, vestiaire qui sent la bière tiède, président local mégalo.

## Exigences techniques

| ID | Exigence |
| --- | --- |
| TECH-01 | Le jeu se joue dans un navigateur web sur ordinateur, sans installation. |
| TECH-02 | Le jeu fonctionne entièrement en solo et hors ligne : ni serveur, ni compte, ni connexion requise après le chargement. |
| TECH-03 | La partie est sauvegardée localement et peut être reprise là où elle a été laissée (au minimum entre deux journées de championnat). |
| TECH-04 | Le joueur peut gérer plusieurs emplacements de sauvegarde (nouvelle partie, charger, supprimer). |

## Effectif et joueurs

| ID | Exigence |
| --- | --- |
| EFF-01 | Chaque joueur possède des attributs (vitesse, technique, physique, tir, défense, gardien…) et une note globale calculée à partir d'eux. |
| EFF-02 | Chaque joueur a un poste principal (gardien, défenseur, milieu, attaquant) ; un joueur hors de son poste est moins performant. |
| EFF-03 | Le coach choisit le onze de départ, les remplaçants et la formation (4-4-2, 4-3-3, 3-5-2, 5-3-2…) en déplaçant des cartes entre le terrain, le banc et la tribune. |
| EFF-04 | Les joueurs accumulent de la fatigue uniquement en jouant et récupèrent au repos. Plus un joueur est fatigué, moins il est bon (jusqu'à −50 %) et plus il risque de se blesser. Son énergie restante est visible en match et dans Tactique. La note affichée reste celle du joueur frais : la fatigue joue sans être chiffrée à l'écran. |
| EFF-05 | Les joueurs peuvent se blesser en match. La plupart des blessures se soignent en moins d'une semaine ; seules les grosses blessures, rares, font manquer plusieurs matchs. |
| EFF-06 | Chaque joueur a un avatar dessiné, déduit de son identité : il garde le même toute sa carrière. |
| EFF-08 | Chaque joueur possède une seule capacité personnelle, activable par le coach pendant le match. |
| EFF-09 | À partir de 32 ans, un joueur peut prendre sa retraite à chaque intersaison ; la probabilité augmente chaque année (10 % à 32 ans, puis +15 points par an). |
| EFF-10 | Pas de contrats : le salaire d'un joueur suit sa note générale et est recalculé à chaque intersaison, en restant raisonnable. |

## Matchs

| ID | Exigence |
| --- | --- |
| MATCH-01 | Le match est simulé par le jeu à partir des notes, de la fatigue, de la tactique et des capacités activées par les deux coachs. |
| MATCH-02 | Le match se déroule en temps accéléré, avec pause et plusieurs vitesses (×1, ×2, ×4), pour laisser au coach le temps d'activer ses capacités. |
| MATCH-03 | L'activation des capacités pendant le match est la mécanique centrale du jeu. |
| MATCH-04 | Le match s'affiche en fil concis : seules les actions importantes (buts, tirs, cartons, capacités, changements), en quelques mots. Le commentaire humoristique reste en infobulle. |
| MATCH-05 | Avant le match et pendant les pauses, le coach donne des consignes tactiques (défensif, équilibré, offensif, pressing haut, jeu long…) qui modifient la simulation. |
| MATCH-06 | À la fin du match, un résumé affiche le score, les buteurs et leurs passeurs, les cartons, les blessures et l'impact de chaque capacité utilisée. |
| MATCH-07 | L'équipe adverse, pilotée par l'IA, active elle aussi ses capacités ; le coach les voit annoncées et peut riposter. |
| MATCH-08 | Le coach peut faire 5 remplacements par match, à tout moment, en glissant un remplaçant sur un joueur du terrain (ou l'inverse) ou depuis le panneau du joueur. Un joueur sorti ne revient pas. Un blessé peut être remplacé, pas un exclu. Si le gardien du coach se blesse, le match se met en pause pour qu'il choisisse le remplaçant ; s'il laisse filer, le jeu fait entrer le gardien du banc (un joueur de champ enfile les gants s'il n'y a plus de changement). L'IA remplace ses blessés, et ses joueurs cuits après l'heure de jeu. |
| MATCH-09 | Une mini-carte animée montre les joueurs et le ballon. Le coach attaque toujours vers la droite et son équipe est à gauche du tableau de score. |
| MATCH-10 | Un bouton en coin rappelle l'impact de chaque effet, match en pause. |
| MATCH-11 | Un but arrête le match et s'annonce au centre de l'écran (buteur, minute, score). Le coach reprend quand il veut. |
| MATCH-12 | Un coup franc est annoncé avec sa distance (proche, moyenne, lointaine). Le match s'arrête : l'équipe qui tire choisit frappe directe, centre ou combinaison, celle qui défend choisit la taille de son mur. De près la frappe directe paie, de loin le centre ; un grand mur ferme la frappe mais ouvre les centres, un petit mur l'inverse. Un centre repoussé laisse parfois un contre. L'IA fait des choix logiques ; si le coach laisse filer, le choix logique est joué. |
| MATCH-13 | Sur un penalty, le match s'arrête : le tireur choisit sa frappe (placée, en force ou Panenka), le gardien plonge à gauche, à droite ou reste au centre. Le côté visé est tiré au sort. La frappe placée punit le gardien qui reste au centre, la frappe en force déborde celui qui plonge, la Panenka est imparable s'il plonge et ridicule s'il attend ; une Panenka réussie fait gagner 1 point de gueulante et en fait perdre 1 à l'adversaire, une ratée l'inverse. Chaque gardien a une habitude cachée (plonge presque toujours, la plupart du temps, ou reste volontiers au centre), notée par le staff après son premier penalty du match. Laissé à l'IA, un penalty rentre toujours environ 3 fois sur 4. |
| MATCH-14 | Pendant le match, sans user de remplacement, le coach glisse un titulaire sur un autre titulaire pour échanger leurs postes (gardien compris), ou sur une autre ligne pour changer de formation. Chaque ligne garde au moins un joueur, 6 au plus ; on ne devient gardien que par échange. Exclus et blessés ne bougent pas. |
| MATCH-15 | Fautes et cartons ont les mêmes taux en direct et en simulation rapide (matchs entre clubs IA) : environ 6 % de rouges par équipe et par match. Le risque de carton monte avec la fatigue du fautif, ses malus de concentration et dans un derby ; le pressing haut fait plus de fautes ; un joueur averti lève le pied. Les clubs IA subissent aussi blessures et suspensions. |
| MATCH-16 | Chaque coach IA a un style reconnaissable, affiché avant le match : le bétonneur, le fou d’attaque, le presseur, le roublard. Le style fixe sa formation et ses consignes, son goût pour certaines capacités, et le moment où il pousse quand il est mené ou ferme le jeu quand il mène. |

## Club, mercato et président

| ID | Exigence |
| --- | --- |
| CLUB-01 | Le club dispose d'un budget, alimenté par les résultats, les sponsors, la buvette et les primes de fin de saison, et dépensé en salaires et transferts. Prime de classement : 600 000 € pour le champion de l'élite, divisée par 2,5 à chaque division plus bas (environ 38 000 € en district), le dernier touchant 10 % de la prime du champion. En coupe, chaque club touche une prime dès son élimination, qui double à chaque tour franchi : de 1 600 € au tour préliminaire à 50 000 € pour le finaliste ; le vainqueur touche 100 000 €, quelle que soit sa division. La prime apparaît dans le bilan de la semaine. |
| CLUB-02 | Le mercato permet d'acheter et de vendre des joueurs, dans la limite du budget, pendant des fenêtres définies dans la saison. |
| CLUB-03 | Les clubs adverses font aussi des offres sur les joueurs du coach, qu'il peut accepter ou refuser. |
| CLUB-04 | Le président fixe des objectifs en début de saison (maintien, montée, parcours en coupe…). |
| CLUB-05 | La confiance du président évolue selon les résultats (comparés à ce qu'il attendait) et les dialogues ; l'humeur des sponsors aussi (+4 par victoire, −4 par défaite). À partir de 3 victoires ou défaites de suite, chaque match ajoute ±2 aux deux jauges. Le fil de la semaine affiche l'évolution des deux jauges après chaque match. À zéro de confiance, le coach est licencié : trois clubs moins cotés lui proposent un poste, il peut signer dans l'un d'eux (effectif, budget et classement repris) ou abandonner la partie. |
| CLUB-06 | Des dialogues humoristiques interpellent régulièrement le coach (président, joueurs, journaliste local, supporters, femme du président…) avec des choix de réponse qui ont des conséquences. Certains dialogues sont propres à une division (au moins deux par division), et les montants grossissent avec la division (×2,5 par division au-dessus du district). |
| CLUB-07 | Chaque saison, le centre de formation promeut un jeune en équipe première, avec un potentiel et parfois une capacité spéciale déjà visible. Plus le centre est développé, plus sa note et son potentiel sont élevés. |
| CLUB-08 | La valeur d'un joueur au mercato est calculée à partir de sa note globale, de son âge et de son potentiel, de la rareté de sa capacité et de son niveau. Le potentiel pèse lourd chez les jeunes (+6 % par point d'écart jusqu'à 21 ans, +4,5 % jusqu'à 24 ans, +2,5 % jusqu'à 27 ans, ×2,5 au plus) : à note égale, un joueur avec une capacité légendaire vaut nettement plus qu'un joueur avec une capacité commune, et chaque niveau de capacité ajoute 20 % (×1,8 au niveau 5). La rareté et la valeur sont affichées sur la fiche du joueur. |
| CLUB-09 | Le coach améliore six installations avec son budget (cinq niveaux chacune, de 10 000 € à 160 000 €) : buvette (recettes), tribunes (sponsors et avantage du terrain), vestiaires (récupération), centre d'entraînement (progression) et centre de formation (qualité du jeune promu). |
| CLUB-10 | Cellule de scouts (installation, niveaux 0 à 5). Des joueurs des autres clubs, la rareté de la capacité se voit toujours ; son nom, son effet et le potentiel se découvrent d'un coup. Chaque semaine, la cellule donne 2 à 12 rapports (stockables 2 semaines) : un rapport révèle la capacité et le potentiel exact d'un joueur. 5 à 55 % des joueurs sont connus d'office (+10 % par niveau), et les joueurs affrontés en match aussi. En multi, chaque coach a ses propres connaissances. |
| CLUB-11 | La réputation des clubs suit leurs saisons : elle monte avec le classement, une montée et un beau parcours en coupe, baisse avec une descente, et se rapproche peu à peu de la division où le club joue. Elle décide du niveau des jeunes, des objectifs du président, des offres d’emploi et des pronostics. |
| CLUB-12 | Pendant les fenêtres de mercato, les clubs IA se renforcent entre eux : un club achète, à son poste le plus faible, un meilleur joueur d’un club de même niveau ou d’en dessous, dans la limite de son budget. Le coach voit passer les transferts de sa division dans l’actualité. |

## Univers et compétitions

| ID | Exigence |
| --- | --- |
| UNIV-01 | Tous les clubs, joueurs et compétitions sont fictifs, avec des noms parodiques (ex. AS Saint-Pastis, Olympique de Biroute-sur-Loire, FC Gueule-de-Bois). |
| UNIV-02 | Le coach commence dans un club de district : terrain boueux, buvette, vestiaires qui fuient. |
| UNIV-03 | Le jeu comporte plusieurs divisions hiérarchisées, du district jusqu'à l'élite. |
| UNIV-04 | En fin de saison, les 2 premiers montent et les 2 derniers descendent. La dernière semaine, des barrages d'accession opposent le 3e de chaque division à l'antépénultième (8e) de la division du dessus : match sec chez le club de la division supérieure, tirs au but en cas d'égalité. Si le club d'en bas gagne, les deux échangent leur division. Pour le président, monter par les barrages vaut une montée, descendre par les barrages vaut une descente. |
| UNIV-05 | Chaque saison suit un calendrier de championnat complet avec classement mis à jour (points, différence de buts). |
| UNIV-06 | Une coupe à élimination directe se joue en parallèle du championnat, ouverte aux clubs de toutes les divisions. |
| UNIV-07 | Trois niveaux de difficulté au choix en début de partie (facile, normal, difficile) : budget de départ, patience du président et niveau des adversaires. |
| UNIV-08 | Un écran de statistiques classe les buteurs, passeurs et joueurs les plus sanctionnés de chaque division, avec une équipe type ; les meilleurs sont récompensés en fin de saison. |
| UNIV-09 | Chaque saison, un rival est tiré au sort dans la division du coach : les derbys comptent double pour le président et les sponsors, et amènent leurs propres dialogues. |

## Capacités spéciales : règles générales

Le gameplay repose sur les capacités : chaque joueur en a une, personnelle, que le coach déclenche pendant le match au bon moment. Une capacité doit se comprendre d'un coup d'œil et se voir sur le terrain.

| ID | Exigence |
| --- | --- |
| CAP-01 | Chaque joueur possède exactement une capacité personnelle, liée à lui pour toute sa carrière (elle le suit en cas de transfert). |
| CAP-02 | Dans un même effectif généré, deux joueurs n'ont jamais la même capacité. |
| CAP-03 | Toutes les capacités s'activent manuellement par le coach pendant le match, en touchant le joueur sur le terrain. Les capacités « Banc » s'activent depuis le banc. |
| CAP-04 | Chaque capacité définit : poste, cible (soi, coéquipier, adversaire, zone, équipe), effet chiffré, durée, et son propre coût en Gueulante (1 à 7), fixé selon sa puissance mesurée et non selon sa rareté. Chaque capacité ne sert qu'une fois par match : la jouer est un choix. Exception : les capacités d'occasion (penalty, coup franc, corner) resservent à chaque fois que l'événement se présente, tant que la jauge le permet. Sur une même occasion de but, chaque camp ne joue qu'une seule capacité d'occasion. |
| CAP-05 | Les activations consomment la Jauge de Gueulante du coach (10 points max, 3 au coup d'envoi), qui se recharge de 1 point toutes les 10 minutes, +1 quand l'équipe encaisse un but : 4 à 6 activations par match. |
| CAP-06 | Une capacité n'a aucun effet en dehors du match : ni budget, ni confiance, ni blessure longue, ni fatigue pour la suite. |
| CAP-08 | La fiche du joueur détaille l'effet, la durée et le coût au niveau actuel et au niveau suivant. |
| CAP-09 | Pendant le match, chaque effet actif apparaît sur les joueurs concernés (halo et picto, vert pour un bonus, rouge pour un malus) avec un compte à rebours. |
| CAP-10 | Chaque capacité progresse sur 5 niveaux au fil de la carrière, grâce à l'expérience gagnée par activation (selon son impact sur le match) et à l'entraînement. Chaque niveau est plus dur à obtenir que le précédent : le niveau 5 demande presque une carrière. Les joueurs des autres clubs progressent chaque saison, et un joueur généré a le niveau de capacité de son âge : un vétéran arrive avec une capacité plus haute qu'un jeune. |
| CAP-11 | Chaque capacité progresse à chaque niveau : effet +10 %, durée +10 % (au moins une minute) ; une capacité sans chiffre à faire grandir gagne un petit bonus d'équipe. Le niveau 5 ajoute en plus une cible, sinon 50 % de durée, sinon un effet 25 % plus fort. Une capacité peut avoir une durée fixe (Le Béton armé) : ses niveaux ne renforcent alors que l'effet ; aucun malus ne dépasse −90 %. Détail dans [equilibrage-capacites.md](equilibrage-capacites.md). |
| CAP-12 | Chaque capacité a une rareté, qui dit à quel point elle est mécanique et stratégique, pas à quel point elle est forte. Commune : un effet direct, à lancer quand on veut. Rare : une mécanique à exploiter (condition de score ou de minute, pari, marquage, moment du match). Légendaire : plusieurs mécaniques qui se combinent, à préparer. Mythique : change les règles du match, et l'IA y a droit aussi. La puissance se lit dans le coût. Quelle que soit sa rareté, une capacité ne sert qu'une fois par match, sauf les capacités d'occasion (penalty, coup franc, corner), qui resservent à chaque occasion. Les raretés hautes restent rares à la génération des joueurs. |
| CAP-13 | Le coach connaît toujours les capacités de son effectif (recrues, jeunes promus et dépanneurs compris). Celles des joueurs des autres clubs restent inconnues tant que sa cellule de scouts ne les a pas vus (CLUB-10) ; en match, un adversaire scouté a ses capacités affichées, même celles de Banc. |
| CAP-16 | Quand une capacité cible un coéquipier ou un adversaire, le coach choisit lui-même la cible sur le terrain : les cibles valides sont mises en évidence, les autres grisées. Le choix se fait match en pause. |
| CAP-17 | Une cible est valide si elle est sur le terrain, n'est pas déjà hors jeu et appartient à la ligne visée. Pour une capacité à plusieurs cibles, le coach les choisit une à une. |
| CAP-18 | Les capacités de zone se déclenchent à l'emplacement du joueur : le coach choisit le moment, pas la cible. Seules les capacités décrites « au hasard » gardent une cible aléatoire. |
| CAP-19 | Les capacités liées à un événement (penalty, coup franc, corner) restent manuelles : le jeu se met en pause et propose de les activer, sans obligation. Certaines ne s'activent que sur un coup franc (pas sur un corner). |
| CAP-22 | Relancer une capacité dont l'effet est encore actif le prolonge sans le cumuler. |
| CAP-20 | Le coach peut annuler une activation tant qu'il n'a pas validé la cible : la capacité n'est alors pas consommée. |
| CAP-21 | Une activation, du coach comme de l'adversaire, s'annonce au centre de l'écran pendant 5 secondes avec l'avatar du joueur et la description de l'effet, match en pause. Flèches vers les cibles, zone colorée et textes s'affichent sur le terrain. |
| CAP-23 | **Fermé pour l'instant** (`ABILITY_REROLL_OPEN`), le code reste prêt à rouvrir. Reroll de capacité depuis la fiche d'un joueur du coach dont la capacité est découverte : on paie d'abord (5 % de la valeur du joueur pour une commune, 8 % rare, 15 % légendaire, 25 % mythique ; au moins 300 € au District, ×2,5 par division), puis on choisit parmi 3 capacités compatibles avec le poste et absentes de l'effectif, ou on garde l'ancienne (l'argent est perdu). Chaque proposition a 4 % de chances d'être d'une rareté au-dessus. La nouvelle capacité repart au niveau 1, XP à zéro. |
| CAP-24 | Quotas de rareté sur la feuille de match (titulaires + remplaçants), selon la division. District : 3 rares, 0 légendaire, 0 mythique ; division 3 : 5 / 2 / 0 ; division 2 : 6 / 3 / 1 ; élite : 9 / 4 / 2. Acheter reste permis ; une compo qui dépasse ne peut pas lancer de match. L’écran Tactique affiche le compte, la compo de l’adjoint et celle des clubs IA respectent les quotas, et un club qui n’a plus assez de joueurs alignables dans les quotas fait signer des dépanneurs à capacité commune. |

## Catalogue des capacités

CAT-01 : le jeu contient les 69 capacités ci-dessous (catalogue refait en novembre 2026). Les valeurs sont celles du jeu au niveau 1, telles que la fiche du joueur les affiche ; elles viennent de `src/domain/abilities/data/`, et les règles d'équilibrage par coût de [equilibrage-capacites.md](equilibrage-capacites.md).

| Rareté | Part des joueurs générés | Coûts rencontrés | Utilisation | Multiplicateur de valeur |
| --- | ---: | ---: | --- | ---: |
| Commune | ~70 % | 1 à 7 | Une fois par match | ×1 |
| Rare | ~25 % | 1 à 3 | Une fois par match | ×1,5 |
| Légendaire | ~4,5 % | 2 à 5 | Une fois par match | ×3 |
| Mythique | ~0,5 % | 2 à 7 | Une fois par match | ×10 |

Aucun malus de stats ne dépasse −90 %, à aucun niveau : un joueur ne descend jamais sous 10 % de sa note. Plusieurs malus peuvent se cumuler.

### Communes (23) : un effet direct, à lancer quand on veut

| Capacité | Poste | Coût | Quand | Cible | Effet au niveau 1 |
| --- | --- | ---: | --- | --- | --- |
| Le Clin d’œil | Tous postes | 1 | À tout moment | 1 adversaire au choix | −85 % de concentration (la cible) pendant 14 min |
| Le Coup d’épaule | Défenseur | 1 | À tout moment | 1 adversaire au choix | −50 % à toutes les stats (la cible) pendant 13 min |
| Le Crochet | Attaquant | 1 | À tout moment | Lui-même | +9 % de chances de but sur la prochaine occasion |
| Le Dégagement au pif | Gardien | 1 | À tout moment | Toute son équipe | +33 % au tir (son équipe) pendant 12 min |
| Le Seau d’eau | Défenseur | 1 | À tout moment | 1 coéquipier au sol ou blessé au choix | Relève la cible immédiatement, ou soigne un blessé resté sur le terrain ; Efface 50 % de la fatigue (la cible) |
| Le Spray magique | Banc | 1 | À tout moment | 1 coéquipier au choix | Retire tous les malus de la cible ; +70 % à toutes les stats (la cible) pendant 12 min |
| L’Éponge miracle | Banc | 2 | À tout moment | 3 coéquipiers au sol ou blessé au choix | Relève la cible immédiatement, ou soigne un blessé resté sur le terrain |
| La Gourde magique | Banc | 2 | À tout moment | Toute son équipe | Efface 60 % de la fatigue (son équipe) |
| La Mine des 25 mètres | Attaquant | 2 | À tout moment | Lui-même | +23 % de chances de but sur la prochaine occasion |
| La Sortie aux poings | Gardien | 2 | À tout moment | Lui-même | Annule la prochaine action adverse ; +60 % d'arrêts (lui-même) pendant 15 min |
| Le Chambreur de gardien | Attaquant | 2 | À tout moment | 1 gardien au choix | −80 % d'arrêts (la cible) pendant 20 min |
| Le Gardien volant | Gardien | 2 | À tout moment | Lui-même | +320 % d'arrêts (lui-même) pendant 35 min |
| Le Métronome | Milieu | 2 | À tout moment | Toute son équipe | +25 % de technique (son équipe) pendant 20 min |
| Le Petit Pont | Milieu | 2 | À tout moment | 1 adversaire au choix | −90 % de concentration (la cible) pendant 25 min |
| Le Tacle sur gravier | Défenseur | 2 | À tout moment | 1 adversaire au choix | Hors jeu 16 min : la cible |
| Le Videur | Défenseur | 2 | À tout moment | 2 attaquants au choix | −90 % au tir (la cible) pendant 25 min ; −25 % de technique (la cible) pendant 25 min |
| Le Béton armé | Défenseur | 3 | À tout moment | Toute son équipe | +350 % en défense (son équipe) pendant 45 min |
| Le Supporter qui klaxonne | Banc | 3 | À tout moment | Toute l'équipe adverse | +18 de fatigue (l'équipe adverse), le temps du match |
| Le Terrain labouré | Tous postes | 3 | À tout moment | Sa zone : tu choisis le moment | −70 % de vitesse (adversaires de la zone) pendant 30 min |
| La Symphonie | Milieu | 5 | À tout moment | Toute son équipe | +72 % à toutes les stats (son équipe) pendant 25 min |
| Le Ciseau du camping | Attaquant | 5 | À tout moment | Lui-même | Occasion immédiate à 90 % de but ; +20 % à toutes les stats (son équipe) pendant 10 min |
| Le Sort de la voyante | Tous postes | 5 | À tout moment | Toute l'équipe adverse | −45 % à toutes les stats (l'équipe adverse) pendant 25 min |
| La Tournée générale | Banc | 7 | À tout moment | 6 adversaires au hasard | Hors jeu 35 min : la cible |

### Rares (22) : une mécanique à exploiter : condition, pari, marquage, moment du match

| Capacité | Poste | Coût | Quand | Cible | Effet au niveau 1 |
| --- | --- | ---: | --- | --- | --- |
| Le Ramasseur lent | Banc | 1 | À tout moment (devant) | Lui-même | 14 minutes sans occasion ni faute, pour personne |
| L’Horloger du club | Banc | 2 | À tout moment (pas devant, dès la 80e) | Lui-même | +5 minutes de temps additionnel en fin de match ; +40 % au tir (son équipe) pendant 15 min |
| La Bouteille d’eau bénite | Milieu | 2 | À tout moment | Toute son équipe | Retire tous les malus de son équipe, +10 % à toutes les stats (son équipe) par malus retiré pendant 15 min |
| La Causerie | Tous postes | 2 | À la mi-temps | Toute son équipe | +17 % à toutes les stats (son équipe) pendant 30 min |
| La Danse de la victoire | Milieu | 2 | Après un but de son équipe | Toute son équipe | +26 % à toutes les stats (son équipe) pendant 15 min |
| La Tête de bois | Défenseur | 2 | Sur coup de pied arrêté offensif | Lui-même | +28 % de chances de but sur un centre (coup franc ou corner) |
| Le Coup franc de kermesse | Milieu | 2 | Sur coup franc pour son équipe | Lui-même | +30 % de chances de but si le coup franc est tiré directement |
| Le Fayot | Tous postes | 2 | À tout moment | 1 coéquipier au choix | Bouclier (la cible) : 1 la prochaine capacité adverse qui le vise est annulée sur lui, pendant 30 min ; +170 % à toutes les stats (la cible) pendant 25 min |
| Le Gardien au sifflet | Gardien | 2 | À tout moment | Lui-même | Pari à 72 % : −85 % de réussite pour les 3 prochains tirs adverses. Raté : rien |
| Le Kiné du dimanche | Banc | 2 | À tout moment | 2 coéquipiers au sol ou blessé au choix | Pari à 75 % : Relève la cible immédiatement, ou soigne un blessé resté sur le terrain, +60 % à toutes les stats (la cible) pendant 20 min. Raté : la cible reste au sol 5 min de plus |
| Le Marquage à la culotte | Défenseur | 2 | À tout moment | 1 attaquant au choix | Marquage : −90 % à toutes les stats pour la cible pendant 35 min, tant que le marqueur est sur le terrain et debout |
| Le Mur de parpaings | Gardien | 2 | À tout moment | Lui-même | Annule les 2 prochaines actions adverses |
| Le Mur qui avance | Défenseur | 2 | Sur coup de pied arrêté adverse | Lui-même | −85 % de réussite pour les 3 prochains tirs adverses |
| Le Pari du milieu | Milieu | 2 | À tout moment | Lui-même | Pari à 50 % : Occasion immédiate à 45 % de but. Raté : rien |
| Le Réveil tardif | Attaquant | 2 | À tout moment (dès la 70e) | Lui-même | +140 % au tir (lui-même) pendant 20 min |
| Le Rouleau compresseur | Défenseur | 2 | À tout moment | 2 adversaires au choix | +32 de fatigue (la cible), le temps du match |
| Le Ballon crevé | Banc | 3 | Sur penalty adverse | Lui-même | Le prochain penalty adverse marqué est à retirer ; −30 % de réussite pour les 2 prochains tirs adverses |
| Le Coup de gueule | Tous postes | 3 | À tout moment | Toute son équipe | Retire tous les malus de son équipe, +1 point de Gueulante si au moins 3 sont retirés ; +38 % à toutes les stats (son équipe) pendant 20 min |
| Le Lob du parking | Attaquant | 3 | À tout moment | Lui-même | +50 % de chances de but sur la prochaine occasion : il la tente lui-même, et s'il marque, il pourra la rejouer |
| Le Marathonien | Milieu | 3 | À tout moment | Toute l'équipe adverse | +15 de fatigue (l'équipe adverse), le temps du match ; Efface 30 % de la fatigue (son équipe) |
| Le Plongeur de Séville | Attaquant | 3 | À tout moment | Lui-même | Pari à 55 % : Penalty pour son équipe. Raté : Carton jaune pour lui |
| Le Tacle à retardement | Défenseur | 3 | À tout moment | 1 adversaire au choix | Pari à 65 % : Hors jeu 45 min : la cible. Raté : Carton jaune pour lui |

### Légendaires (16) : plusieurs mécaniques qui se combinent, à préparer

| Capacité | Poste | Coût | Quand | Cible | Effet au niveau 1 |
| --- | --- | ---: | --- | --- | --- |
| La Célébration interdite | Attaquant | 3 | Après un but de son équipe | Toute son équipe | +20 % à toutes les stats (son équipe) pendant 20 min ; −20 % de concentration (l'équipe adverse) pendant 20 min |
| Le Car à deux étages | Défenseur | 3 | À tout moment | Toute son équipe | +300 % en défense (son équipe) pendant 45 min ; +3 points de Gueulante si aucun but encaissé pendant 45 min |
| Le Copieur | Milieu | 3 | À tout moment | Lui-même | Rejoue la dernière capacité utilisée par l'adversaire, pour son équipe ; si elle coûtait moins cher, la différence de Gueulante est rendue ; +15 % à toutes les stats (son équipe) pendant 20 min |
| Le Gardien libéro | Gardien | 3 | À tout moment | Lui-même | Pari à 60 % : Occasion immédiate à 95 % de but, +30 % à toutes les stats (son équipe) pendant 15 min. Raté : Occasion adverse à 35 % de but |
| Le Mur humain | Défenseur | 3 | À tout moment | 2 coéquipiers au choix | Bouclier (lui-même) : 1 la prochaine capacité adverse qui le vise est annulée sur lui, pendant 35 min ; Bouclier (la cible) : 1 la prochaine capacité adverse qui le vise est annulée sur lui, pendant 35 min ; +150 % en défense (son équipe) pendant 25 min ; −60 % de réussite pour les 2 prochains tirs adverses |
| Le Remède de grand-mère | Tous postes | 3 | À la mi-temps | Toute son équipe | Efface 75 % de la fatigue (son équipe) ; Retire tous les malus de son équipe ; Impossible à mettre au sol pendant 15 min (son équipe) |
| Le Voleur de sifflet | Milieu | 3 | À tout moment | Lui-même | Vole 2 points de Gueulante au coach adverse ; −35 % de concentration (l'équipe adverse) pendant 18 min |
| Le Gardien-forteresse | Gardien | 4 | À tout moment | 2 coéquipiers au choix | Bouclier (lui-même) : 2 prochaines capacités adverses qui le visent sont annulées sur lui, pendant 45 min ; Bouclier (la cible) : 2 prochaines capacités adverses qui le visent sont annulées sur lui, pendant 45 min ; +900 % d'arrêts (lui-même) pendant 60 min ; +350 % en défense (son équipe) pendant 45 min |
| La Remontada du dimanche | Attaquant | 5 | À tout moment (mené) | Toute son équipe | +10 % à toutes les stats (son équipe) pendant 40 min, +35 % par but de retard |
| Le Coup de sifflet tardif | Banc | 5 | À tout moment (pas devant, dès la 80e) | Lui-même | +8 minutes de temps additionnel en fin de match ; +70 % à toutes les stats (son équipe) pendant 20 min |
| Le Discours de la mi-temps | Tous postes | 5 | À la mi-temps | Toute son équipe | +42 % à toutes les stats (son équipe) pendant 45 min ; Efface 40 % de la fatigue (son équipe) |
| Le Double ou rien | Attaquant | 5 | À tout moment | Lui-même | Pari à 60 % : Occasion immédiate à 95 % de but, +80 % à toutes les stats (son équipe) pendant 25 min. Raté : Occasion adverse à 40 % de but |
| Le Marquage de l’enfer | Défenseur | 5 | À tout moment | 2 adversaires au choix | Marquage : −90 % à toutes les stats pour la cible pendant 45 min, tant que le marqueur est sur le terrain et debout |
| Le Penalty imaginaire | Tous postes | 5 | Sur coup franc pour son équipe | Lui-même | Le coup franc devient un penalty ; −35 % à toutes les stats (l'équipe adverse) pendant 15 min |
| Le Tifo géant | Banc | 5 | À tout moment | Toute son équipe | Surcharge : vide toute la Gueulante, +11 % à toutes les stats (son équipe) par point dépensé (coût compris) pendant 25 min |
| Les Plombs qui sautent | Banc | 5 | À tout moment | Lui-même | Annule un but adverse des 5 dernières minutes ; −20 % de concentration (l'équipe adverse) pendant 10 min |

### Mythiques (8) : changent les règles du match

| Capacité | Poste | Coût | Quand | Cible | Effet au niveau 1 |
| --- | --- | ---: | --- | --- | --- |
| La Coupure pub | Banc | 2 | À tout moment | Toute son équipe | 10 minutes sans occasion ni faute, pour personne ; Efface 50 % de la fatigue (son équipe) |
| Le Docteur Miracle | Banc | 3 | À tout moment | Toute son équipe | Jusqu'à la fin du match : un joueur de son équipe mis au sol se relève après 2 min, et les malus adverses durent 50 % de leur durée ; Efface 90 % de la fatigue (son équipe) |
| Le Maillot retourné | Tous postes | 4 | À tout moment | Toute l'équipe adverse | Inverse les niveaux des deux équipes pendant 40 min |
| Le Recrutement sauvage | Milieu | 6 | À tout moment | Toute l'équipe adverse | Le meilleur joueur de champ adverse rejoint son équipe jusqu'à la fin du match ; +60 % à toutes les stats (son équipe) pendant 30 min |
| Le Rideau de fer | Défenseur | 6 | À tout moment | 3 coéquipiers au choix | Bouclier (lui-même) : 2 prochaines capacités adverses qui le visent sont annulées sur lui, pendant 45 min ; Bouclier (la cible) : 2 prochaines capacités adverses qui le visent sont annulées sur lui, pendant 45 min ; +800 % en défense (son équipe) pendant 90 min ; −90 % de réussite pour les 10 prochains tirs adverses ; Annule les 3 prochaines actions adverses |
| La Machine à remonter le temps | Gardien | 7 | À tout moment (mené) | Lui-même | Efface tous les buts des 20 dernières minutes, des deux côtés ; +60 % à toutes les stats (son équipe) pendant 20 min |
| La Résurrection | Défenseur | 7 | À tout moment | Toute son équipe | Ramène les exclus et les blessés, et remet toute l'équipe à 100 % d'énergie ; +80 % à toutes les stats (son équipe) pendant 25 min |
| Le But qui compte double | Attaquant | 7 | À tout moment | Toute son équipe | Chaque but de son équipe compte double pendant 25 min ; +100 % à toutes les stats (son équipe) pendant 25 min |

## Entraînement

| ID | Exigence |
| --- | --- |
| TRAIN-01 | Chaque semaine, chaque joueur non blessé travaille le programme que le coach lui a donné : un attribut ou sa capacité spéciale. |
| TRAIN-02 | Le programme se règle joueur par joueur et reste actif tant qu'il n'est pas changé. |
| TRAIN-03 | Aucun coût : le rythme dépend de l'âge. Passé son potentiel, un joueur progresse 4 fois moins vite, et de 5 points au maximum. Le travail de capacité va bien plus vite qu'en match (30 à 60 XP par semaine selon l'âge, contre 10 à 30 par activation) et ne dépend pas du potentiel. Hors de son programme, chaque joueur progresse quand même un peu : ses stats de poste au quart de son rythme (une stat importante et basse d'abord), et sa capacité de 5 à 9 XP par semaine selon l'âge quand il ne la travaille pas. |
| TRAIN-04 | Le programme donne un petit bonus au prochain match : +5 % au tir, en défense ou aux arrêts, +3 % en vitesse, technique ou physique. |
| TRAIN-05 | L'écran Effectif affiche l'évolution de la note de chaque joueur depuis le début de la saison. |

## Progression, rejouabilité et interface

Section à compléter.

## Multijoueur en réseau local

| ID | Exigence |
|---|---|
| MULTI-01 | Une partie peut réunir plusieurs coachs humains. Chacun a son club, son président, ses sponsors, ses offres, ses dialogues, son actualité, son historique et son rival ; le reste du monde est commun. |
| MULTI-02 | À la création de la ligue, chaque joueur connecté crée son club (nom de coach et nom de club uniques). Tous commencent dans la division de départ, au maximum 10 coachs. |
| MULTI-03 | Un joueur qui rejoint en cours de saison, ou les saisons suivantes, récupère le club IA le plus faible du monde et le renomme. |
| MULTI-04 | La semaine n'avance que lorsque chaque coach a joué son match, répondu à son dialogue et cliqué sur « Semaine suivante ». Un coach licencié doit d'abord choisir son nouveau club. |
| MULTI-05 | L'hôte lance le serveur sur son PC (npm run serveur) ; ses amis ouvrent son adresse dans leur navigateur. Le serveur garde et sauvegarde les ligues ; chaque action d'un coach ne touche que son club. |
| MULTI-06 | Chacun joue ses matchs contre l'IA dans son navigateur, à la vitesse qu'il veut. Un match entre deux coachs non joué en direct est simulé au passage de la semaine. |
| MULTI-07 | Match en direct entre deux coachs, joué par le serveur : vitesse ×1 imposée, 3 pauses de 10 s par coach (seul celui qui a mis pause peut reprendre), 10 s au plus pour chaque fenêtre de choix ou ciblage (une barre se vide) puis choix automatique, l'un après l'autre (le tireur puis le gardien), mi-temps de 20 s ou moins si les deux sont prêts. Pas de semaine suivante tant qu'il n'est pas fini. |
| MULTI-08 | Le joueur d'un autre coach ne s'achète pas au mercato : on lui fait une offre d'un montant libre (valeur du joueur affichée en repère), valable 2 semaines et tant que le mercato est ouvert. Elle arrive dans le Bureau de l'autre coach, qui l'accepte (le joueur et l'argent changent de club) ou la refuse ; l'acheteur peut la retirer. Chacun est prévenu dans son fil de la semaine. |
| MULTI-09 | L'accueil propose Solo, Héberger une partie (seulement sur le PC du serveur) et Rejoindre une partie. L'hôte garde jusqu'à 3 ligues : il en ouvre une (reprise ou nouvelle) ou en supprime une (rangée dans parties/corbeille) ; changer de ligue renvoie les joueurs connectés à l'accueil. Le joueur voit la ligue ouverte : « Continuer » s'il y a déjà joué dans ce navigateur, sinon « Rejoindre » avec son nom de coach et de club. L'ancienne ligue unique devient la ligue 1. |
| MULTI-10 | Le serveur n’envoie à chaque navigateur que ce qui a changé dans la partie. Un match en direct est enregistré avec la ligue : si le serveur s’arrête, il reprend où il en était quand les deux coachs reviennent. L’hôte peut donner à un coach un code de reprise (4 chiffres, dix minutes) pour retrouver son club dans un autre navigateur. |
