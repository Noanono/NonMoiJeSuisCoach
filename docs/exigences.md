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
| MATCH-08 | Le coach peut faire 5 remplacements par match, à tout moment, en glissant un remplaçant sur un joueur du terrain (ou l'inverse) ou depuis le panneau du joueur. Un joueur sorti ne revient pas. Un blessé peut être remplacé, pas un exclu. L'IA remplace ses blessés. |
| MATCH-09 | Une mini-carte animée montre les joueurs et le ballon. Le coach attaque toujours vers la droite et son équipe est à gauche du tableau de score. |
| MATCH-10 | Un bouton en coin rappelle l'impact de chaque effet, match en pause. |
| MATCH-11 | Un but arrête le match et s'annonce au centre de l'écran (buteur, minute, score). Le coach reprend quand il veut. |
| MATCH-12 | Un coup franc est annoncé avec sa distance (proche, moyenne, lointaine). Le match s'arrête : l'équipe qui tire choisit frappe directe, centre ou combinaison, celle qui défend choisit la taille de son mur. De près la frappe directe paie, de loin le centre ; un grand mur ferme la frappe mais ouvre les centres, un petit mur l'inverse. Un centre repoussé laisse parfois un contre. L'IA fait des choix logiques ; si le coach laisse filer, le choix logique est joué. |
| MATCH-13 | Sur un penalty, le match s'arrête : le tireur choisit sa frappe (placée, en force ou Panenka), le gardien plonge à gauche, à droite ou reste au centre. Le côté visé est tiré au sort. La frappe placée punit le gardien qui reste au centre, la frappe en force déborde celui qui plonge, la Panenka est imparable s'il plonge et ridicule s'il attend ; une Panenka réussie fait gagner 1 point de gueulante et en fait perdre 1 à l'adversaire, une ratée l'inverse. Chaque gardien a une habitude cachée (plonge presque toujours, la plupart du temps, ou reste volontiers au centre), notée par le staff après son premier penalty du match. Laissé à l'IA, un penalty rentre toujours environ 3 fois sur 4. |
| MATCH-14 | Pendant le match, sans user de remplacement, le coach glisse un titulaire sur un autre titulaire pour échanger leurs postes (gardien compris), ou sur une autre ligne pour changer de formation. Chaque ligne garde au moins un joueur, 6 au plus ; on ne devient gardien que par échange. Exclus et blessés ne bougent pas. |

## Club, mercato et président

| ID | Exigence |
| --- | --- |
| CLUB-01 | Le club dispose d'un budget, alimenté par les résultats, les sponsors, la buvette et les primes de fin de saison, et dépensé en salaires et transferts. Prime de classement : 600 000 € pour le champion de l'élite, divisée par 2,5 à chaque division plus bas (environ 38 000 € en district), le dernier touchant 10 % de la prime du champion. En coupe, chaque club touche une prime dès son élimination, qui double à chaque tour franchi : de 1 600 € au tour préliminaire à 50 000 € pour le finaliste ; le vainqueur touche 100 000 €, quelle que soit sa division. La prime apparaît dans le bilan de la semaine. |
| CLUB-02 | Le mercato permet d'acheter et de vendre des joueurs, dans la limite du budget, pendant des fenêtres définies dans la saison. |
| CLUB-03 | Les clubs adverses font aussi des offres sur les joueurs du coach, qu'il peut accepter ou refuser. |
| CLUB-04 | Le président fixe des objectifs en début de saison (maintien, montée, parcours en coupe…). |
| CLUB-05 | La confiance du président évolue selon les résultats et les dialogues ; l'humeur des sponsors aussi. À zéro de confiance, le coach est licencié : trois clubs moins cotés lui proposent un poste, il peut signer dans l'un d'eux (effectif, budget et classement repris) ou abandonner la partie. |
| CLUB-06 | Des dialogues humoristiques interpellent régulièrement le coach (président, joueurs, journaliste local, supporters, femme du président…) avec des choix de réponse qui ont des conséquences. |
| CLUB-07 | Chaque saison, le centre de formation promeut un jeune en équipe première, avec un potentiel et parfois une capacité spéciale déjà visible. Plus le centre est développé, plus sa note et son potentiel sont élevés. |
| CLUB-08 | La valeur d'un joueur au mercato est calculée à partir de sa note globale, de la rareté de sa capacité et de son niveau : à note égale, un joueur avec une capacité légendaire vaut nettement plus qu'un joueur avec une capacité commune, et chaque niveau de capacité ajoute 20 % (×1,8 au niveau 5). La rareté et la valeur sont affichées sur la fiche du joueur. |
| CLUB-09 | Le coach améliore cinq installations avec son budget (cinq niveaux chacune, de 10 000 € à 160 000 €) : buvette (recettes), tribunes (sponsors et avantage du terrain), vestiaires (récupération), centre d'entraînement (progression) et centre de formation (qualité du jeune promu). |

## Univers et compétitions

| ID | Exigence |
| --- | --- |
| UNIV-01 | Tous les clubs, joueurs et compétitions sont fictifs, avec des noms parodiques (ex. AS Saint-Pastis, Olympique de Biroute-sur-Loire, FC Gueule-de-Bois). |
| UNIV-02 | Le coach commence dans un club de district : terrain boueux, buvette, vestiaires qui fuient. |
| UNIV-03 | Le jeu comporte plusieurs divisions hiérarchisées, du district jusqu'à l'élite. |
| UNIV-04 | En fin de saison, les premiers montent et les derniers descendent. |
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
| CAP-04 | Chaque capacité définit : poste, cible (soi, coéquipier, adversaire, zone, équipe), effet chiffré, durée. Le coût dépend de la rareté. Chaque capacité ne sert qu'une fois par match : la jouer est un choix. Exception : les capacités d'occasion (penalty, coup franc, corner) resservent à chaque fois que l'événement se présente, tant que la jauge le permet. |
| CAP-05 | Les activations consomment la Jauge de Gueulante du coach (10 points max, 3 au coup d'envoi), qui se recharge de 1 point toutes les 10 minutes, +1 quand l'équipe encaisse un but : 4 à 6 activations par match. |
| CAP-06 | Une capacité n'a aucun effet en dehors du match : ni budget, ni confiance, ni blessure longue, ni fatigue pour la suite. |
| CAP-08 | La fiche du joueur détaille l'effet, la durée et le coût au niveau actuel et au niveau suivant. |
| CAP-09 | Pendant le match, chaque effet actif apparaît sur les joueurs concernés (halo et picto, vert pour un bonus, rouge pour un malus) avec un compte à rebours. |
| CAP-10 | Chaque capacité progresse sur 5 niveaux au fil de la carrière, grâce à l'expérience gagnée par activation (selon son impact sur le match) et à l'entraînement. Chaque niveau est plus dur à obtenir que le précédent : le niveau 5 demande presque une carrière. Les joueurs des autres clubs progressent chaque saison, et un joueur généré a le niveau de capacité de son âge : un vétéran arrive avec une capacité plus haute qu'un jeune. |
| CAP-11 | Chaque capacité progresse à chaque niveau : effet +10 %, durée +10 % (au moins une minute) ; une capacité sans chiffre à faire grandir gagne un petit bonus d'équipe. Le niveau 5 ajoute en plus une cible, sinon 50 % de durée, sinon un effet 25 % plus fort. Une capacité peut avoir une durée fixe (Le Bus de l'amicale) : ses niveaux ne renforcent alors que l'effet. Détail dans [equilibrage-capacites.md](equilibrage-capacites.md). |
| CAP-12 | Chaque capacité a une rareté. Commune : un effet simple, sûr et sans contrepartie. Rare : plus forte, avec une petite mécanique en plus. Légendaire : peut renverser un match. Mythique : change les règles du match, et l'IA y a droit aussi. Quelle que soit sa rareté, une capacité ne sert qu'une fois par match, sauf les capacités d'occasion (penalty, coup franc, corner), qui resservent à chaque occasion. Plus une capacité est forte, plus elle est rare à la génération des joueurs. |
| CAP-13 | Les capacités de Banc sont cachées jusqu'à l'arrivée du joueur au club ou à leur première activation. |
| CAP-16 | Quand une capacité cible un coéquipier ou un adversaire, le coach choisit lui-même la cible sur le terrain : les cibles valides sont mises en évidence, les autres grisées. Le choix se fait match en pause. |
| CAP-17 | Une cible est valide si elle est sur le terrain, n'est pas déjà hors jeu et appartient à la ligne visée. Pour une capacité à plusieurs cibles, le coach les choisit une à une. |
| CAP-18 | Les capacités de zone se déclenchent à l'emplacement du joueur : le coach choisit le moment, pas la cible. Seules les capacités décrites « au hasard » gardent une cible aléatoire. |
| CAP-19 | Les capacités liées à un événement (penalty, coup franc, corner) restent manuelles : le jeu se met en pause et propose de les activer, sans obligation. Certaines ne s'activent que sur un coup franc (pas sur un corner). |
| CAP-22 | Relancer une capacité dont l'effet est encore actif le prolonge sans le cumuler. |
| CAP-20 | Le coach peut annuler une activation tant qu'il n'a pas validé la cible : la capacité n'est alors pas consommée. |
| CAP-21 | Une activation, du coach comme de l'adversaire, s'annonce au centre de l'écran pendant 5 secondes avec l'avatar du joueur et la description de l'effet, match en pause. Flèches vers les cibles, zone colorée et textes s'affichent sur le terrain. |

## Catalogue des capacités

CAT-01 : le jeu contient les 55 capacités ci-dessous. Les chiffres des tableaux sont ceux de la conception d'origine. Les valeurs réelles, équilibrées par mesure, sont dans `src/domain/abilities/data/` et leurs cibles dans [equilibrage-capacites.md](equilibrage-capacites.md).

| Rareté | Part des joueurs générés | Coût | Utilisation | Multiplicateur de valeur |
| --- | --- | --- | --- | --- |
| Commune | ~70 % | 2 | Une fois par match | ×1 |
| Rare | ~25 % | 3 | Une fois par match | ×1,5 |
| Légendaire | ~4,5 % | 5 | Une fois par match | ×3 |
| Mythique | ~0,5 % | 7 | Une fois par match | ×10 |

### Communes (29)

| Capacité | Poste | Cible | Effet |
| --- | --- | --- | --- |
| Le Bedonnant | GB | Soi | +60 % d'arrêts, 15 min |
| Le Bavard | GB | Prochain tir adverse | −60 % de chances de but |
| Le Danseur | GB | Penalty adverse | +60 % d'arrêt |
| Le Dégagement de mule | GB | Équipe | +20 % au tir, 8 min |
| Le Jardinier | DEF | Sa zone | Adversaires à −30 % de vitesse, 15 min |
| L'Agriculteur | DEF | Soi | +70 % en défense, 23 min |
| Le Rugbyman reconverti | DEF | Action adverse | Annule l'action en cours |
| Haleine de Ricard | DEF | 1 adversaire | −30 % de technique, 15 min |
| Le Mur de saucisses | DEF | Coup franc adverse | −70 % de chances de but |
| Le Videur de boîte | DEF | 1 attaquant | −60 % au tir, 15 min |
| Le Lacet fou | MIL | 1 adversaire | Au sol, 5 min |
| Le Marchand de sable | MIL | 1 adversaire | −40 % de concentration, 15 min |
| Le Chien de la casse | MIL | Soi | +40 % de physique, 15 min |
| Le Ruisselant | MIL | Soi | +40 % de technique, 15 min |
| Les Pigeons | MIL | 2 adversaires au hasard | −30 % de concentration, 8 min |
| La Mobylette | ATT | Soi | +60 % de vitesse, 8 min |
| Le Buteur de comptoir | ATT | Soi | +40 % au tir, 15 min |
| Bière tiède | ATT | Penalty ou coup franc | +40 % de réussite |
| Le Bulldozer | ATT | 2 défenseurs | Au sol, 3 min |
| La Frappe de mule | ATT | Prochaine occasion | +40 % de chances de but |
| Le Chambreur | Tous | 1 adversaire | −30 % à toutes ses stats, 8 min |
| Short trop court | Tous | 2 adversaires | −25 % de concentration, 8 min |
| Le Porteur d'eau | Banc | 1 coéquipier | Efface 50 % de sa fatigue |
| Le DJ du vestiaire | Banc | Équipe | +15 % de vitesse, 15 min |
| Le Kiné douteux | Banc | 1 coéquipier au sol | Le relève immédiatement |
| Le Regard qui tue | ATT | Penalty pour toi | +réussite du penalty, puis bonus de tir pour le porteur |
| Le Gardien qui parle | GB | Penalty adverse | Gros bonus d'arrêts pour le gardien, quelques minutes |
| Le Pied de velours | MIL | Coup franc pour toi | +réussite, seulement en frappe directe |
| La Tête de pioche | DEF | Coup franc ou corner pour toi | +réussite, seulement sur un centre |

### Rares (15)

| Capacité | Poste | Cible | Effet et mécanique |
| --- | --- | --- | --- |
| Le Gardien kamikaze | GB | 2 prochaines occasions adverses | Les annule et rend 1 point de jauge |
| Le Gardien fumeur | GB | Soi | +50 % d'arrêts pendant 23 min, +30 % de plus par but encaissé dans ce match |
| Le Bus de l'amicale | DEF | Équipe | +70 % en défense, 15 min. Sans but encaissé pendant l'effet : +2 points de jauge |
| Le Boucher du village | DEF | 1 adversaire | Hors jeu 23 min |
| Le Vomisseur | MIL | Sa zone | Tous les adversaires de la zone au sol, 5 min |
| Le Retraité de 42 ans | MIL | Équipe | Les 2 prochaines occasions à +40 % |
| Le Pique-assiette | MIL | Coach adverse | Vole 2 points de jauge |
| Le Sombrero bourré | ATT | Soi | Prochaine occasion franche. S'il marque, il peut rejouer sa capacité |
| Le Revenant de la Feria | ATT | Soi | Bonus au tir égal à la minute de jeu pendant 23 min (70e = +70 %) |
| Le Chef de chant | Tous | Équipe | +20 % à toutes les stats, 15 min. Chaque but marqué prolonge de 5 min |
| Le Capitaine gueulard | Tous | Équipe | Retire tous les malus en cours. +1 point de jauge si au moins 3 sont retirés |
| Le Chien du président | Banc | 1 adversaire | Hors jeu 8 min, puis le chien poursuit un autre adversaire 8 min |
| Le Ballon déplacé | ATT | Coup franc pour toi | Le ballon avance d'un cran (lointain → moyen → proche) et la frappe directe gagne en réussite |
| La Bousculade dans le mur | DEF | Coup franc adverse | Annule le coup franc ; l'adversaire perd de la concentration |
| Le Ramasseur de balles | Banc | Penalty adverse | S'il est marqué, le penalty est à retirer ; l'adversaire perd de la concentration |

### Légendaires (7)

| Capacité | Poste | Effet |
| --- | --- | --- |
| La Panenka ivre | ATT | Crée immédiatement une occasion à 75 % de but |
| L'Échange de maillots | Tous | Inverse les niveaux des deux équipes pendant 15 min |
| La Mêlée générale | Tous | 3 adversaires choisis et le porteur hors jeu, 15 min |
| La Coupure de courant | Banc | Annule le dernier but adverse s'il date de moins de 5 min |
| La Malédiction de mémé | Banc | −30 % à toute l'équipe adverse, 23 min |
| Le Plongeon d'Oscar | Tous | Sur un coup franc pour toi : il devient un penalty, et l'adversaire s'énerve (malus à toute l'équipe) |
| La Panenka de légende | ATT | Sur un penalty pour toi : réussite quasi sûre, puis toute l'équipe s'envole (bonus à toutes les stats) |

### Mythiques (4)

| Capacité | Poste | Effet |
| --- | --- | --- |
| Le Transfert du parking | MIL | Le meilleur joueur de champ adverse rejoint ton équipe jusqu'à la fin du match |
| Le But en or massif | ATT | Pendant 15 min, chaque but compte double et toute l'équipe gagne +30 % à toutes les stats |
| Le Kebab du siècle | Banc | 6 adversaires au hasard hors jeu pendant 15 min |
| Le Miracle du kiné | DEF | Tes exclus et tes blessés reviennent, toute l'équipe repart à 100 % d'énergie et gagne +30 % à toutes les stats pendant 15 min |

## Entraînement

| ID | Exigence |
| --- | --- |
| TRAIN-01 | Chaque semaine, chaque joueur non blessé travaille le programme que le coach lui a donné : un attribut ou sa capacité spéciale. |
| TRAIN-02 | Le programme se règle joueur par joueur et reste actif tant qu'il n'est pas changé. |
| TRAIN-03 | Aucun coût : le rythme dépend de l'âge. Passé son potentiel, un joueur progresse 4 fois moins vite, et de 5 points au maximum. |
| TRAIN-04 | Le programme donne un petit bonus au prochain match : +5 % au tir, en défense ou aux arrêts, +3 % en vitesse, technique ou physique. |
| TRAIN-05 | L'écran Effectif affiche l'évolution de la note de chaque joueur depuis le début de la saison. |

## Progression, rejouabilité et interface

Section à compléter.
