import { mount } from 'svelte';
import '@fontsource/anton/latin-400.css';
import '@fontsource/archivo/latin-400.css';
import '@fontsource/archivo/latin-700.css';
import '@fontsource/space-mono/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.svelte';
import { lang } from './i18n/locale';

const target = document.getElementById('app');
if (!target) throw new Error('Élément #app introuvable');
// Langue choisie par le joueur (I18N-01) : lecteurs d'écran et césure suivent.
document.documentElement.lang = lang();

export default mount(App, { target });
