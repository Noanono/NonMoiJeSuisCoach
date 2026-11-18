# Non Moi Je Suis Coach

Jeu de management de football sur navigateur, absurde et loufoque. Tu prends les rênes d'un club, tu recrutes, tu composes ton équipe et tu essaies de survivre à la saison, le tout avec un sens de l'humour un peu tordu.

**Jouer en ligne : [non-moi-je-suis-coach.netlify.app](https://non-moi-je-suis-coach.netlify.app)**

Le projet est open source et distribué sous licence [MIT](./LICENSE).

## Démarrer

Prérequis : [Bun](https://bun.sh) 1.4 ou plus.

```bash
bun install
bun run dev      # serveur de développement sur http://localhost:5173
bun test         # tests du domaine
bun run check    # vérification des types (Svelte + TypeScript)
bun run build    # build de production dans dist/
```

Le jeu tourne entièrement dans le navigateur, hors ligne une fois chargé. Les parties sont sauvegardées dans le `localStorage` (3 emplacements).

### Jouer entre amis

Pas de serveur à lancer : sur l'accueil, l'hôte choisit **Héberger une partie**, ouvre une ligue et partage le **code** affiché (ou le lien). Les amis le collent dans **Rejoindre une partie**. L'hôte peut aussi **ouvrir son serveur au public** : il apparaît alors dans la liste sous le champ du code. Les navigateurs se parlent en pair-à-pair (WebRTC, via [Trystero](https://github.com/dmotz/trystero)) ; l'onglet de l'hôte doit rester ouvert.

### Version CrazyGames

```bash
bun run build:crazygames   # build dans dist-crazygames/, à zipper et téléverser sur le portail développeur
```

Cette version charge le SDK CrazyGames : compte du joueur (pseudo, avatar), parties solo sauvegardées dans son compte, salles et invitations pour la ligue entre amis, multijoueur instantané. En local, ajoute `?useLocalSdk=true` à l'adresse du serveur de dev pour simuler CrazyGames (joueur connecté « User1 »). Voir les exigences `PLAT-01` à `PLAT-07`.

Le serveur du réseau local (`bun run serveur`) fonctionne encore mais est **obsolète** et sera supprimé.

## Architecture

- `src/domain/` : les règles du jeu en TypeScript pur, testées avec `bun test`.
  - `abilities/` : catalogue des 42 capacités, progression sur 5 niveaux.
  - `match/` : moteur de match minute par minute, activation des capacités, IA adverse, live texte.
  - `world/`, `league/` : monde fictif, divisions, calendrier, classement, coupe.
  - `club/` : finances, mercato, président, vie du vestiaire, frasques, presse, dialogues.
  - `game/` : la partie et la boucle de saison qui assemblent le tout.
  - `save/` : emplacements de sauvegarde locale.
- `src/server/` : cœur du multijoueur sans réseau (`hub.ts`, `hostEngine.ts`, matchs en direct, envoi par différences) ; `main.ts` est l'adaptateur Node du réseau local, obsolète.
- `src/ui/` : interface Svelte 5, selon le [design system](./docs/design-system.md).
  - `net/` : pair-à-pair (hôte dans le navigateur, transports, code du serveur, annuaire public).
  - `platform/` : intégration du SDK CrazyGames et stockage compressé dans le compte du joueur.

Les exigences sont dans [docs/exigences.md](./docs/exigences.md) et les conventions de code dans [docs/conventions.md](./docs/conventions.md). Chaque règle cite l'identifiant de son exigence (ex. `CAP-05`) dans le code ou les tests.

## Contribuer

Les contributions sont les bienvenues : idées de features, corrections de bugs, textes absurdes, équilibrage, design.

- Lire le guide [CONTRIBUTING.md](./CONTRIBUTING.md) avant d'ouvrir une PR.
- Respecter le [code de conduite](./CODE_OF_CONDUCT.md).
- Signaler une faille de sécurité en privé, voir [SECURITY.md](./SECURITY.md).

## Licence

Distribué sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour le texte complet.
