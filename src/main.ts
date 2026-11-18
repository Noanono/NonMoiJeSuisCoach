import { mount } from 'svelte';
import '@fontsource/anton/latin-400.css';
import '@fontsource/archivo/latin-400.css';
import '@fontsource/archivo/latin-700.css';
import '@fontsource/space-mono/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.svelte';
import { GAME_SAVE_KEYS } from './domain/game/save';
import { IDENTITY_KEYS } from './ui/net/identity';
import { crazyGames } from './ui/platform/crazygames.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Élément #app introuvable');

// Sur CrazyGames, les sauvegardes viennent du compte du joueur : on les attend avant d'afficher l'accueil (PLAT-03).
await crazyGames.init([...GAME_SAVE_KEYS, ...IDENTITY_KEYS]);

const app = mount(App, { target });
crazyGames.loaded();

export default app;
