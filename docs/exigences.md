# Non, moi je suis coach — Exigences

Version du 9 nov. 2026. Chaque exigence porte un identifiant pour être suivie pendant le développement.

## Présentation

*Non, moi je suis coach* est un jeu de gestion de club de foot amateur, jouable en solo dans le navigateur. Le joueur prend la tête d'un club de district et tente de le hisser jusqu'à l'élite, saison après saison.

Le jeu mêle une vraie couche de gestion (effectif, tactique, mercato, budget) et un humour franchement adulte : alcool, troisième mi-temps, grivoiserie, scatologie. Chaque blague doit avoir une conséquence mécanique sur le jeu : on rit, mais on gère.

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
| EFF-03 | Le coach choisit le onze de départ, les remplaçants et la formation (4-4-2, 4-3-3, 3-5-2, 5-3-2…). |
| EFF-04 | Les joueurs accumulent de la fatigue en jouant et récupèrent au repos ; un joueur fatigué joue moins bien et se blesse plus souvent. |
| EFF-05 | Les joueurs peuvent se blesser (en match ou à cause d'une capacité spéciale) et sont indisponibles pendant une durée affichée. |
| EFF-06 | Chaque joueur a un moral qui varie selon le temps de jeu, les résultats, les sanctions et les événements ; un moral bas réduit ses performances. |
| EFF-07 | Un joueur au moral très bas peut râler publiquement, refuser de jouer ou demander son transfert. |
| EFF-08 | Chaque joueur possède une seule capacité personnelle, activable par le coach pendant le match. |

## Matchs

| ID | Exigence |
| --- | --- |
| MATCH-01 | Le match est simulé par le jeu à partir des notes, de la forme, du moral, de la tactique et des capacités activées par les deux coachs. |
| MATCH-02 | Le match se déroule en temps accéléré, avec pause et plusieurs vitesses (×1, ×2, ×4), pour laisser au coach le temps d'activer ses capacités. |
| MATCH-03 | L'activation des capacités pendant le match est la mécanique centrale du jeu. |
| MATCH-04 | Le match s'affiche en live texte minute par minute, avec les actions, les buts et chaque capacité activée, commentés avec humour. |
| MATCH-05 | Avant le match et pendant les pauses, le coach donne des consignes tactiques (défensif, équilibré, offensif, pressing haut, jeu long…) qui modifient la simulation. |
| MATCH-06 | À la fin du match, un résumé affiche le score, les buteurs, les cartons, les blessures et l'impact de chaque capacité utilisée. |
| MATCH-07 | L'équipe adverse, pilotée par l'IA, active elle aussi ses capacités ; le coach les voit annoncées et peut riposter. |
| MATCH-08 | Les remplacements en cours de match ne font pas partie de la première version. |

## Club, mercato et président

| ID | Exigence |
| --- | --- |
| CLUB-01 | Le club dispose d'un budget, alimenté par les résultats, les sponsors, la buvette et les amendes, et dépensé en salaires et transferts. |
| CLUB-02 | Le mercato permet d'acheter et de vendre des joueurs, dans la limite du budget, pendant des fenêtres définies dans la saison. |
| CLUB-03 | Les clubs adverses font aussi des offres sur les joueurs du coach, qu'il peut accepter ou refuser. |
| CLUB-04 | Le président fixe des objectifs en début de saison (maintien, montée, parcours en coupe…). |
| CLUB-05 | La confiance du président évolue selon les résultats et les frasques ; à zéro, le coach est licencié et la partie se termine (ou il rebondit dans un autre club). |
| CLUB-06 | Des dialogues humoristiques interpellent régulièrement le coach (président, joueurs, journaliste local, supporters, femme du président…) avec des choix de réponse qui ont des conséquences. |
| CLUB-07 | Le centre de formation produit chaque saison quelques jeunes joueurs, avec un potentiel et parfois une capacité spéciale déjà visible. |
| CLUB-08 | La valeur d'un joueur au mercato est calculée à partir de sa note globale et de la rareté de sa capacité : à note égale, un joueur avec une capacité légendaire vaut nettement plus qu'un joueur avec une capacité commune. La rareté et la valeur sont affichées sur la fiche du joueur. |

## Univers et compétitions

| ID | Exigence |
| --- | --- |
| UNIV-01 | Tous les clubs, joueurs et compétitions sont fictifs, avec des noms parodiques (ex. AS Saint-Pastis, Olympique de Biroute-sur-Loire, FC Gueule-de-Bois). |
| UNIV-02 | Le coach commence dans un club de district : terrain boueux, buvette, vestiaires qui fuient. |
| UNIV-03 | Le jeu comporte plusieurs divisions hiérarchisées, du district jusqu'à l'élite. |
| UNIV-04 | En fin de saison, les premiers montent et les derniers descendent. |
| UNIV-05 | Chaque saison suit un calendrier de championnat complet avec classement mis à jour (points, différence de buts). |
| UNIV-06 | Une coupe à élimination directe se joue en parallèle du championnat, ouverte aux clubs de toutes les divisions. |

## Capacités spéciales : règles générales

Le gameplay repose sur les capacités : chaque joueur en a une, personnelle, que le coach déclenche pendant le match au bon moment. Chacune a un effet chiffré réel sur le terrain, et presque toujours un revers.

| ID | Exigence |
| --- | --- |
| CAP-01 | Chaque joueur possède exactement une capacité personnelle, liée à lui pour toute sa carrière (elle le suit en cas de transfert). |
| CAP-02 | Dans un même effectif, deux joueurs n'ont jamais la même capacité. |
| CAP-03 | Toutes les capacités s'activent manuellement par le coach pendant le match : aucune ne se déclenche automatiquement. Le coach active une capacité en touchant le joueur sur le terrain. Les capacités marquées « Banc » s'activent depuis le banc (un proche en tribune, un remplaçant…). |
| CAP-04 | Chaque capacité définit : poste conseillé, cible (soi, coéquipier, adversaire, zone, équipe), effet chiffré, durée, temps de recharge ou nombre d'utilisations, coût, malus et risques. |
| CAP-05 | Les activations consomment la Jauge de Gueulante du coach (10 points max), qui se recharge de 1 point toutes les 5 minutes de jeu, +2 quand l'équipe encaisse un but. |
| CAP-06 | Une partie des capacités attaque directement les adversaires : blessure temporaire, chute, perte de concentration, expulsion provoquée, action annulée. |
| CAP-07 | Avant d'activer, le coach voit les chances de réussite et de malus en pourcentage (carton, échec, effet retourné contre son équipe). |
| CAP-08 | Toutes les stats sont affichées : la fiche du joueur détaille l'effet, la durée, la recharge, le coût, les bonus et malus chiffrés au niveau actuel et au niveau suivant. |
| CAP-09 | Pendant le match, chaque effet actif apparaît sur les joueurs concernés (bonus en vert, malus en rouge) avec un compte à rebours. |
| CAP-10 | Chaque capacité progresse sur 5 niveaux au fil de la carrière, grâce à l'expérience gagnée par activation réussie et selon son impact sur le match. |
| CAP-11 | Chaque niveau améliore l'effet, la durée ou la recharge ; le niveau 5 débloque un effet supplémentaire propre à la capacité (colonne Niv. 5 du catalogue). |
| CAP-12 | Chaque capacité a une rareté : commune, rare ou légendaire. Plus une capacité est rare, plus elle est forte et utile : effet plus puissant, recharge plus courte, risque plus faible. Les légendaires ne s'utilisent qu'une fois par saison mais peuvent retourner un match. Les capacités rares et légendaires sont aussi plus rares à la génération des joueurs. |
| CAP-13 | Certaines capacités sont cachées jusqu'à l'arrivée du joueur au club ou à leur première activation. |
| CAP-14 | Le contexte modifie l'efficacité : forme, soirée de la veille, règlement intérieur (ex. les capacités liées à l'alcool gagnent +50 % après une grosse soirée). |
| CAP-15 | Deux capacités compatibles activées à moins de 5 minutes d'intervalle déclenchent un combo (voir catalogue). |
| CAP-16 | Quand une capacité cible un coéquipier ou un adversaire, le coach choisit lui-même la cible sur le terrain après l'activation : les cibles valides sont mises en évidence, les autres grisées. Le choix se fait match en pause. |
| CAP-17 | Une cible est valide si elle est sur le terrain, n'est pas déjà hors jeu et se trouve dans la portée de la capacité (ex. « vis-à-vis » = adversaires dans sa zone, « 5 m » = joueurs proches). Pour une capacité à plusieurs cibles, le coach les choisit une à une. |
| CAP-18 | Les capacités de zone (ex. Le Vomisseur, Le Jardinier) se déclenchent à l'emplacement du joueur : le coach choisit le moment, pas la cible. Seules les capacités décrites « au hasard » gardent une cible aléatoire. |
| CAP-19 | Les capacités liées à un événement (après un but, sur penalty, sur coup franc, à la mi-temps) restent manuelles : le jeu se met en pause et propose de les activer pendant une courte fenêtre, sans obligation. |
| CAP-20 | Le coach peut annuler une activation tant qu'il n'a pas validé la cible : la capacité n'est alors ni consommée ni mise en recharge. |

## Catalogue des capacités

CAT-01 : la première version contient au minimum les 72 capacités et 7 combos ci-dessous. Valeurs données au niveau 1, à équilibrer en test. Coût = points de Jauge de Gueulante.

### Barème des raretés

Le catalogue compte 45 capacités communes, 22 rares et 5 légendaires.

| Rareté | Part des joueurs générés | Puissance des effets | Risque de malus | Multiplicateur de valeur |
| --- | --- | --- | --- | --- |
| Commune | ~70 % | Bonus ou malus de 10 à 30 %, effets courts, une seule cible | 20 à 40 % | ×1 |
| Rare | ~25 % | Bonus ou malus de 30 à 50 %, blessures, expulsions ou actions annulées | 5 à 30 % | ×1,5 |
| Légendaire | ~5 % | Peut retourner un match à elle seule, une fois par saison | Faible, mais revers lourd après le match | ×3 |

### Sabotage de l'adversaire

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Le Boucher du village | Rare | DEF | Tacle par derrière : 1 adversaire choisi blessé, hors jeu 15 min | 1×/match · 3 | 30 % carton jaune, 5 % rouge | Blessure de 25 min et −10 % de moral pour toute l'équipe adverse |
| Le Vomisseur | Rare | MIL | Vomit : tous les joueurs à 5 m glissent et tombent, hors jeu 3 min | 25 min · 2 | Touche aussi les coéquipiers proches | Ne touche plus que les adversaires |
| Le Kebab piégé | Rare | Banc | Kebab offert au vestiaire adverse à la mi-temps : 2 adversaires au hasard aux toilettes 10 min en 2de période | 1×/match · 3 | 10 % qu'il en ait mangé aussi : lui-même sort 10 min | 3 adversaires touchés |
| Le Lanceur de saucisson | Rare | Banc | Saucisson jeté sur la pelouse pendant une contre-attaque adverse : l'action est annulée | 1×/match · 2 | 40 % d'exclusion du banc | Utilisable 2 fois |
| Haleine de Ricard | Commune | DEF | Souffle sur son vis-à-vis : −20 % en duels et passes pendant 10 min | 20 min · 1 | Coéquipiers proches −5 % de précision | Touche 3 adversaires dans la zone |
| Le Crampon dévissé | Commune | Tous | Crampon envoyé sur un adversaire : 35 % de l'assommer 4 min | 30 min · 2 | 20 % de toucher l'arbitre : match arrêté 5 min et carton jaune | Deux crampons, deux cibles |
| Le Jardinier | Commune | DEF | Arrose sa zone : les adversaires qui y passent ont −20 % de vitesse pendant 10 min | 25 min · 1 | 25 % carton jaune pour antijeu | Zone deux fois plus grande |
| Le Lacet fou | Commune | MIL | Noue les lacets d'un adversaire au sol : il tombe à sa prochaine accélération, hors jeu 1 min | 15 min · 1 | 30 % carton jaune | Les deux pieds noués : 4 min |
| Le Marchand de sable | Commune | MIL | Raconte sa vie à un adversaire : −30 % de vigilance au marquage pendant 5 min | 20 min · 1 | −20 % de vigilance pour lui aussi | Endort 2 adversaires |
| Le Laser du cousin | Commune | Banc | Laser vert sur le gardien adverse : −20 % d'arrêts pendant 5 min | 1×/match · 2 | 35 % repéré : amende pour le club et fin de l'effet | Dure 10 min |
| Le Faux arbitre | Commune | ATT | Sifflet caché : les adversaires s'arrêtent net, +30 % de chances sur la contre-attaque | 20 min · 2 | 30 % carton jaune pour antijeu | Recharge 10 min |
| Le Péteur | Commune | ATT | Sur coup de pied arrêté offensif, les défenseurs s'écartent : +25 % de chances de but | 20 min · 2 | Si raté : −10 % en défense pour son équipe pendant 5 min | Utilisable aussi sur corners défensifs |

### Provoc et coups de vice

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Le Beau Gosse | Rare | Tous | Clin d'œil à l'arbitre : les 3 prochaines fautes de l'équipe ne sont pas sifflées | 25 min · 2 | 15 % d'arbitre jaloux : les 3 suivantes sont sifflées double | 5 fautes couvertes |
| L'Ex de la femme du président | Rare | Tous | Joue sous les yeux du président : +40 % à toutes ses stats pendant 20 min | 1×/match · 2 | Confiance du président −5 à chaque activation | +60 % |
| Le Tombeur de tribunes | Rare | ATT | Drague la tribune adverse : l'avantage du terrain adverse est annulé pendant 20 min | 1×/match · 2 | 15 % de bagarre sur le parking après le match : blessé 1 semaine | La tribune change de camp : +5 % pour son équipe |
| Le Chambreur | Commune | Tous | Insulte son vis-à-vis : 20 % qu'il craque et prenne un rouge, sinon −15 % de concentration pendant 10 min | 20 min · 1 | 10 % de bagarre : un rouge de chaque côté | 35 % de rouge provoqué |
| La Bouche d'égout | Commune | Tous | Insulte l'arbitre : −15 % d'agressivité pour les adversaires, intimidés, pendant 15 min | 30 min · 1 | L'arbitre se venge : +30 % de fautes sifflées contre l'équipe pendant 15 min | Vengeance réduite à +15 % |
| Short trop court | Commune | Tous | Remonte son short : son vis-à-vis perd 20 % de concentration pendant 10 min | 20 min · 1 | 20 % carton pour tenue indécente | Déconcentre 2 adversaires |
| Torse nu | Commune | ATT | Retire son maillot après un but : +10 % de moral pour l'équipe jusqu'à la fin | Après chaque but · 0 | Carton jaune automatique, rouge à la 2e fois | L'arbitre rigole : carton une fois sur deux |
| Le Mytho | Commune | MIL | Fait croire au capitaine adverse qu'il a signé dans un grand club : −15 % de moral pour le capitaine | 30 min · 1 | 30 % de démenti : −10 % de moral pour sa propre équipe | Touche toute l'équipe adverse (−10 %) |
| Le Plongeur | Commune | ATT | Simule une faute dans la surface : 25 % de penalty accordé | 20 min · 2 | 35 % carton jaune pour simulation | 40 % de penalty |
| Le Pleureur | Commune | Tous | Se roule par terre : le match se fige 3 min, moins d'occasions des deux côtés | 15 min · 1 | L'arbitre ajoute 2 min de temps additionnel | Aucun temps ajouté |

### Attaque

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Pilier de buvette | Rare | Tous | +40 % à toutes ses stats pendant 15 min (+15 % de plus après une grosse soirée) | 1×/match · 2 | Puis −30 % jusqu'à la fin du match | Chute limitée à −15 % |
| Le Retraité de 42 ans | Rare | MIL | Passe décisive : la prochaine occasion devient une occasion franche (+50 % de but) | 15 min · 2 | Ne défend jamais : −10 % en défense pour l'équipe en permanence | Recharge 10 min |
| Le Sombrero bourré | Rare | ATT | Dribble en titubant : élimine 3 adversaires à coup sûr | 25 min · 2 | 15 % qu'il s'écroule tout seul : −30 % d'équilibre pendant 5 min | Enchaîne avec un tir automatique |
| Le Revenant de la Feria | Rare | ATT | Après 70' : +45 % au tir pendant 15 min | 1×/match · 2 | −10 % à toutes ses stats avant la 70e | Activable dès la 60e |
| Flasque dans la chaussette | Commune | Tous | Récupère 100 % de son énergie | 1×/match · 1 | 30 % que l'arbitre le voie : carton jaune | Utilisable 2 fois |
| Bière tiède | Commune | ATT | Prochain penalty ou coup franc : +30 % de réussite | 15 min · 1 | −15 % de vitesse pendant 10 min | Vaut aussi pour les tirs dans la surface |
| Pied carré | Commune | ATT | Prochain tir : 25 % de finir en but contre son camp adverse | 20 min · 1 | Ses tirs suivants partent en tribune : −5 % de moral d'équipe | 40 % |
| Le Bulldozer | Commune | ATT | Charge plein axe : 2 défenseurs adverses au sol pendant 1 min | 20 min · 2 | 25 % de faute offensive | 3 défenseurs au sol |
| La Mobylette | Commune | ATT | Sprint : +40 % de vitesse pendant 3 min | 15 min · 1 | +20 de fatigue | Dure 5 min |
| Le Ruisselant | Commune | MIL | Insaisissable : aucune faute de maillot possible sur lui, +20 % en dribble pendant 10 min | 20 min · 1 | Rate ses touches pendant 10 min | Dure 15 min |
| Le Buteur de comptoir | Commune | ATT | Annonce qu'il va marquer : +10 % au tir pendant 10 min, et +20 % de moral d'équipe s'il marque | 20 min · 1 | S'il ne marque pas : −10 % de moral d'équipe | +25 % au tir |
| La Frappe de mule | Commune | ATT | Tir de 40 m : 10 % de but, 10 % de blesser le gardien adverse 10 min | 20 min · 2 | 60 % que le ballon finisse dans le champ voisin : match arrêté 2 min | 20 % de but |

### Défense

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Le Videur de boîte | Rare | DEF | Marque un attaquant à la culotte : il ne touche plus le ballon pendant 10 min | 25 min · 2 | 15 % de faute grossière : carton jaune | Dure 15 min |
| Le Bus de l'amicale | Rare | DEF | Toute l'équipe recule : +45 % en défense pendant 10 min | 30 min · 2 | −35 % en attaque pendant ce temps | Malus réduit à −15 % |
| Le Gendarme du dimanche | Rare | DEF | Fait la police : aucun carton pour son équipe pendant 10 min | 30 min · 2 | −10 % d'agressivité pour l'équipe | Dure 15 min |
| L'Hypocondriaque | Commune | DEF | Quand l'équipe mène : se tord de douleur, le match se fige 3 min | 20 min · 1 | Si l'équipe est menée : −10 % de moral d'équipe | Gèle 6 min |
| Le Rugbyman reconverti | Commune | DEF | Plaquage : annule l'action adverse en cours | 15 min · 1 | 40 % carton jaune | 25 % de carton |
| Le Chien de la casse | Commune | MIL | Pressing fou : +20 % de récupérations dans sa zone pendant 10 min | 20 min · 1 | Fatigue doublée pendant l'effet | Fatigue ×1,5 seulement |
| Le Hors-jeu du village | Commune | DEF | Fait monter la ligne : 40 % de piéger l'attaque adverse suivante | 15 min · 1 | Sinon, un attaquant seul face au gardien | 60 % |
| L'Agriculteur | Commune | DEF | Mollets de taureau : +30 % dans les duels aériens pendant 10 min | 20 min · 1 | Odeur de fumier : −5 % de passes vers lui | Dure 15 min |
| Mémé en tribune | Commune | Banc | La grand-mère hurle sur son petit-fils : +30 % en défense pour lui pendant 5 min | 20 min · 1 | Humilié : −20 % de moral pour lui | Moral −5 % seulement |
| Le Mur de saucisses | Commune | DEF | Sur coup franc adverse : +30 % de chances que le mur bloque | Chaque coup franc · 1 | 15 % que le mur saute en reculant : but quasi assuré | +50 % |

### Soutien et vestiaire

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Le Chef de chant | Rare | Tous | Chant de buvette : +15 % de moral et +10 % à toutes les stats de l'équipe pendant 10 min | 25 min · 2 | Il chante au lieu de jouer : −20 % pour lui | Dure 15 min |
| Le Capitaine gueulard | Rare | Tous | Annule toutes les baisses de moral en cours dans l'équipe | 30 min · 2 | Ses cris déconcentrent : −5 % de concentration pour l'équipe 5 min | Sans malus |
| Les Vitamines du cousin | Rare | Banc | +40 % d'énergie pour 3 coéquipiers | 1×/match · 2 | 10 % de contrôle antidopage : suspendu 2 matchs | 5 % de contrôle |
| Le Kiné douteux | Commune | Banc | Soigne aussitôt un coéquipier blessé ou au sol | 20 min · 1 | 25 % qu'il aggrave tout : blessé 1 semaine | 10 % de risque |
| Le Discours de mi-temps | Commune | Tous | À la pause, discours enflammé : +5 % pour l'équipe en 2de mi-temps | Mi-temps · 1 | 20 % qu'il soit trop éméché pour être compris : −5 % | +10 %, jamais raté |
| Le Pote du président | Commune | Tous | Calme le président : aucune perte de confiance sur ce match | 1×/match · 1 | Jalousie : −5 % de moral d'équipe | Sans jalousie |
| Le DJ du vestiaire | Commune | Banc | Enceinte au bord du terrain : +5 % de vitesse pour l'équipe pendant 10 min | 25 min · 1 | 20 % que l'arbitre confisque l'enceinte : effet perdu | +10 % |
| Le Doyen sage | Commune | Tous | Calme un coéquipier : annule un rouge provoqué par une provocation adverse | 20 min · 1 | Sermon interminable : le coéquipier a −10 % de vitesse 5 min | Peut calmer 2 joueurs |
| Le Porteur d'eau | Commune | Banc | Bidon « spécial » : +50 % d'énergie pour un coéquipier | 20 min · 1 | 30 % que ce soit du rosé : −20 % de précision 10 min | 10 % de rosé |

### Gardiens

| Capacité | Rareté | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- |
| Le Gardien fumeur | Rare | Pause clope au poteau, puis +45 % de réflexes pendant 15 min | 30 min · 2 | Cages vides pendant 1 min | Fume dans ses cages : plus de cages vides |
| Le Gardien kamikaze | Rare | Sortie suicide : annule un face-à-face | 15 min · 2 | 15 % de rouge s'il rate le ballon | 5 % de rouge |
| Le Bedonnant | Commune | Gonfle le ventre : +30 % d'arrêts sur les tirs au centre pendant 10 min | 20 min · 1 | Aucune chance sur les lucarnes pendant l'effet | +50 % |
| Le Philosophe | Commune | Reste sur sa ligne : impossible à lober pendant 15 min | 20 min · 1 | +30 % de réussite sur les centres adverses | Malus réduit à +10 % |
| Le Danseur | Commune | Gesticule sur penalty : +25 % d'arrêt | Chaque penalty · 1 | 15 % carton s'il sort trop tôt | +40 % |
| Le Bavard | Commune | Parle à l'attaquant : prochain tir adverse −20 % de précision | 15 min · 1 | 10 % que l'attaquant, vexé, frappe 20 % plus fort | Touche les 2 prochains tirs |
| Le Goal volant | Commune | Monte en attaque : +1 attaquant pendant 5 min | 30 min · 2 | Cages vides pendant ce temps | Remonte en courant : cages vides 2 min seulement |
| Mains au miel | Commune | Capte tout, aucun rebond pendant 10 min | 25 min · 1 | 35 % de relances à la main ratées | Relances ratées 10 % |

### Chaos

| Capacité | Rareté | Poste | Effet (niv. 1) | Recharge · coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Le Streaker | Rare | Banc | Un pote nu envahit le terrain : l'action adverse en cours est annulée | 1×/match · 3 | Amende pour le club et article dans la presse locale | Utilisable 2 fois |
| Le Chien du président | Rare | Banc | Lâche le chien sur le terrain : un joueur est poursuivi, hors jeu 3 min | 1×/match · 2 | 30 % que ce soit un de ses joueurs | 90 % de viser un adversaire |
| La Coupure de courant | Rare | Banc | Match en nocturne : 3 min de noir, et un but adverse marqué dans la minute précédente est annulé | 1×/match · 3 | 30 % d'échec et amende pour le club | 85 % de réussite |
| Le Fumigène | Commune | Banc | 5 min de brouillard : −50 % sur les tirs de loin pour tout le monde | 1×/match · 2 | Amende pour le club | Le brouillard ne couvre que la moitié adverse |
| Les Pigeons | Commune | MIL | Graines dans les poches : un adversaire au hasard reçoit une fiente, −30 % de concentration 5 min | 20 min · 1 | 20 % que la fiente tombe sur lui | 2 adversaires visés |
| Le Rot du siècle | Commune | Tous | Rot monumental : −10 % de moral pour toute l'équipe adverse | 1×/match · 1 | Carton jaune au premier contact qui suit | −20 % |

### Légendaires (une fois par saison)

| Capacité | Poste | Effet (niv. 1) | Coût | Malus / risque | Niv. 5 |
| --- | --- | --- | --- | --- | --- |
| Mi-temps au pastis | Tous | +30 % pour toute l'équipe en 2de mi-temps | 3 | Le lendemain, −30 % de forme pour tout l'effectif | Lendemain à −15 % |
| La Tournée du patron | Tous | Le président paie sa tournée : malus d'alcool annulés et bonus doublés pour tout le match | 3 | Coût important pour le budget | Le président paie de sa poche |
| La Panenka ivre | ATT | Penalty transformé à coup sûr… presque | 3 | 5 % d'échec : moqué par tout le district, −30 % de moral pendant un mois | 1 % d'échec |
| La Malédiction de mémé | Banc | Mémé jette un sort : −20 % à toutes les stats adverses pendant 15 min | 3 | 20 % que le sort se retourne contre l'équipe | 5 % de retour |
| La Mêlée générale | Tous | Bagarre organisée : 3 adversaires et 1 de ses joueurs expulsés | 3 | Suspensions et amende lourde, presse à scandale garantie | 4 adversaires expulsés |

### Combos

Déclenchés quand les deux capacités sont activées à moins de 5 minutes d'intervalle (CAP-15).

| Combo | Capacités | Effet | Revers |
| --- | --- | --- | --- |
| Zone chimique | Le Vomisseur + Le Péteur | La surface adverse est évacuée 1 min : occasion franche quasi garantie | Les deux sont bannis de la soirée d'équipe : −10 % de moral |
| Drame conjugal | Le Beau Gosse + L'Ex de la femme du président | +20 % à toutes les stats pour les deux pendant 15 min | Le président apprend tout : confiance −15 |
| Les Frères Picon | Pilier de buvette + Flasque dans la chaussette | +50 % pour les deux pendant 10 min | Les deux s'effondrent ensuite à −50 % |
| Le Barbecue | Le Boucher du village + Le Lanceur de saucisson | Adversaire blessé, action annulée, et la buvette rapporte un bonus au budget | Double risque de carton |
| Bagarre générale | Le Chambreur + La Bouche d'égout | 60 % que l'adversaire perde 2 joueurs | Sinon, 2 rouges chez soi |
| Brouillard total | Le Fumigène + Le Gardien fumeur | Le gardien adverse ne voit plus rien : −60 % d'arrêts pendant 3 min | Son propre gardien tousse : −20 % de réflexes |
| Nuit blanche | Le DJ du vestiaire + Le Chef de chant | +20 % pour toute l'équipe pendant 10 min | Puis −10 % pendant 10 min |

## Gestion des frasques

C'est ici que l'humour devient de la gestion : le coach choisit entre laisser vivre ses énergumènes (et leurs bonus) ou les tenir (et leur moral).

| ID | Exigence |
| --- | --- |
| FRAS-01 | Le coach définit un règlement intérieur (couvre-feu, interdiction d'alcool la veille, buvette fermée aux joueurs…). Chaque règle réduit les malus des capacités, mais aussi leurs bonus, et fait baisser le moral des joueurs concernés. |
| FRAS-02 | Le coach peut infliger des amendes : elles rapportent au budget du club mais font baisser le moral du joueur sanctionné, qui peut se rebeller. |
| FRAS-03 | Les frasques (bagarre, vomi, streaker, drame conjugal…) peuvent faire la une de la presse locale, avec un titre humoristique généré. |
| FRAS-04 | Un article de presse modifie la confiance du président et l'humeur des sponsors (en bien ou en mal : certains sponsors adorent le scandale). |
| FRAS-05 | Au mercato, la capacité d'un joueur est affichée s'il est connu ; une partie des capacités reste cachée jusqu'à son arrivée (voir CAP-13). |
| FRAS-06 | La semaine entre deux matchs propose un choix de soirée d'équipe (aucune, apéro léger, grosse soirée) qui alimente les capacités de troisième mi-temps. |

## Progression, rejouabilité et interface

Section à compléter.
