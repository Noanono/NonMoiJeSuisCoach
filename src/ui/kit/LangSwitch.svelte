<script lang="ts">
  import { LANGS, lang, setLang, t, type Lang } from '../../i18n/t';

  /** Sélecteur de langue (I18N-01) : FR / EN, tout l'affichage suit sans recharger. */
  const LABELS: Record<Lang, string> = { fr: 'FR', en: 'EN' };
</script>

<div class="langues" role="group" aria-label={t('lang.label')}>
  {#each LANGS as code (code)}
    <button
      type="button"
      class="tampon"
      class:actif={lang() === code}
      aria-pressed={lang() === code}
      title={t(`lang.${code}`)}
      onclick={() => setLang(code)}
    >
      {LABELS[code]}
    </button>
  {/each}
</div>

<style>
  .langues {
    display: inline-flex;
    border: var(--trait-epais) solid var(--encre);
    border-radius: var(--radius-pill);
    overflow: hidden;
    background: var(--craie);
  }
  button {
    border: none;
    background: transparent;
    color: var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
    font: inherit;
  }
  button + button {
    border-left: var(--trait-fin) solid var(--encre);
  }
  button.actif {
    background: var(--encre);
    color: var(--craie);
  }
  button:focus-visible {
    outline: var(--trait-epais) solid var(--scotch);
    outline-offset: -4px;
  }
</style>
