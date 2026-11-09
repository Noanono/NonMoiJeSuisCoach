# Non Moi Je Suis Coach

Jeu de management de football sur navigateur, absurde et loufoque. Tu prends les rênes d'un club, tu recrutes, tu composes ton équipe et tu essaies de survivre à la saison, le tout avec un sens de l'humour un peu tordu.

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

## Architecture

- `src/domain/` : les règles du jeu en TypeScript pur, testées avec `bun test`.
  - `abilities/` : catalogue des 42 capacités, progression sur 5 niveaux.
  - `match/` : moteur de match minute par minute, activation des capacités, IA adverse, live texte.
  - `world/`, `league/` : monde fictif, divisions, calendrier, classement, coupe.
  - `club/` : finances, mercato, président, vie du vestiaire, frasques, presse, dialogues.
  - `game/` : la partie et la boucle de saison qui assemblent le tout.
  - `save/` : emplacements de sauvegarde locale.
- `src/ui/` : interface Svelte 5, selon le [design system](./docs/design-system.md).

Les exigences sont dans [docs/exigences.md](./docs/exigences.md) et les conventions de code dans [docs/conventions.md](./docs/conventions.md). Chaque règle cite l'identifiant de son exigence (ex. `CAP-05`) dans le code ou les tests.

## Contribuer

Les contributions sont les bienvenues : idées de features, corrections de bugs, textes absurdes, équilibrage, design.

- Lire le guide [CONTRIBUTING.md](./CONTRIBUTING.md) avant d'ouvrir une PR.
- Respecter le [code de conduite](./CODE_OF_CONDUCT.md).
- Signaler une faille de sécurité en privé, voir [SECURITY.md](./SECURITY.md).

## Licence

Distribué sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour le texte complet.
