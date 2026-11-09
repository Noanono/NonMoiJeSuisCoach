<script lang="ts">
  import { avatarTraits, type AvatarPlayer } from './avatar';

  /** Trombine dessinée d'un joueur, en vignette autocollante. Décorative : le nom est toujours affiché à côté. */
  interface Props {
    player: AvatarPlayer;
    size?: number;
  }

  let { player, size = 48 }: Props = $props();

  const INK = '#14130f';
  const t = $derived(avatarTraits(player));
  const headWidth = $derived(t.face === 'round' ? 15 : t.face === 'long' ? 12.5 : 14);
  const headHeight = $derived(t.face === 'long' ? 17.5 : 15);
  const jawRadius = $derived(t.face === 'square' ? 5 : headWidth);
</script>

<svg class="trombine" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
  <rect width="64" height="64" fill={t.backdrop} />

  <!-- Maillot -->
  <path d="M4 64 Q6 49 23 46 L41 46 Q58 49 60 64 Z" fill={t.jerseyColor} stroke={INK} stroke-width="2" />
  {#if t.jersey === 'stripes'}
    <path d="M18 48 L16 64 M32 46 L32 64 M46 48 L48 64" stroke={t.trimColor} stroke-width="4" fill="none" />
  {:else if t.jersey === 'sash'}
    <path d="M14 50 L40 64 L50 64 L22 47 Z" fill={t.trimColor} />
  {/if}
  <path d="M25 46 L32 53 L39 46" fill={t.trimColor} stroke={INK} stroke-width="2" stroke-linejoin="round" />

  <!-- Cou et oreilles -->
  <rect x="26.5" y="38" width="11" height="10" fill={t.skin} />
  <circle cx={32 - headWidth} cy="28" r="3.2" fill={t.skin} stroke={INK} stroke-width="2" />
  <circle cx={32 + headWidth} cy="28" r="3.2" fill={t.skin} stroke={INK} stroke-width="2" />
  {#if t.extra === 'earring'}
    <circle cx={32 + headWidth} cy="32.5" r="1.8" fill="#f6d743" stroke={INK} stroke-width="1" />
  {/if}

  <!-- Nuque longue, sous la tête -->
  {#if t.hair === 'mullet'}
    <path d="M18 24 L15 45 L24 42 L40 42 L49 45 L46 24 Z" fill={t.hairColor} stroke={INK} stroke-width="2" stroke-linejoin="round" />
  {/if}

  <!-- Tête -->
  <rect
    x={32 - headWidth}
    y={28 - headHeight}
    width={headWidth * 2}
    height={headHeight * 2}
    rx={jawRadius}
    ry={t.face === 'square' ? 6 : headHeight}
    fill={t.skin}
    stroke={INK}
    stroke-width="2"
  />

  <!-- Cheveux -->
  {#if t.hair === 'crew'}
    <path d="M18 22 Q20 11 32 11 Q44 11 46 22 Q40 17 32 17 Q24 17 18 22 Z" fill={t.hairColor} stroke={INK} stroke-width="2" stroke-linejoin="round" />
  {:else if t.hair === 'side' || t.hair === 'mullet'}
    <path d="M17 25 Q17 9 34 9 Q47 10 47 25 Q44 17 36 16 Q30 22 22 19 Q19 21 17 25 Z" fill={t.hairColor} stroke={INK} stroke-width="2" stroke-linejoin="round" />
  {:else if t.hair === 'curly'}
    <g fill={t.hairColor} stroke={INK} stroke-width="2">
      <circle cx="20" cy="17" r="5.5" /><circle cx="27" cy="12" r="6" /><circle cx="36" cy="12" r="6" /><circle cx="44" cy="17" r="5.5" />
    </g>
  {:else if t.hair === 'mohawk'}
    <path d="M28 15 L27 3 L32 6 L37 3 L36 15 Z" fill={t.hairColor} stroke={INK} stroke-width="2" stroke-linejoin="round" />
  {:else if t.hair === 'combover'}
    <path d="M18 23 Q24 13 45 16" fill="none" stroke={t.hairColor} stroke-width="3" stroke-linecap="round" />
    <path d="M19 26 Q26 17 46 20" fill="none" stroke={t.hairColor} stroke-width="2.5" stroke-linecap="round" />
  {/if}

  {#if t.extra === 'headband'}
    <rect x={32 - headWidth} y="18" width={headWidth * 2} height="4" fill={t.trimColor} stroke={INK} stroke-width="1.5" />
  {/if}

  <!-- Sourcils et yeux -->
  {#if t.brows === 'unibrow'}
    <path d="M23 23 Q32 26 41 23" stroke={t.hairColor === '#b9b6ad' ? '#77746b' : INK} stroke-width="2.6" fill="none" stroke-linecap="round" />
  {:else if t.brows === 'angry'}
    <path d="M23 22 L29 25 M41 22 L35 25" stroke={INK} stroke-width="2.4" stroke-linecap="round" />
  {:else}
    <path d="M23 24 L29 23.5 M35 23.5 L41 24" stroke={INK} stroke-width="2.2" stroke-linecap="round" />
  {/if}
  {#if t.eyes === 'wide'}
    <circle cx="26" cy="28" r="3" fill="#fff" stroke={INK} stroke-width="1.5" /><circle cx="38" cy="28" r="3" fill="#fff" stroke={INK} stroke-width="1.5" />
    <circle cx="26" cy="28" r="1.2" fill={INK} /><circle cx="38" cy="28" r="1.2" fill={INK} />
  {:else if t.eyes === 'tired'}
    <path d="M23 28 L29 28 M35 28 L41 28" stroke={INK} stroke-width="2" stroke-linecap="round" />
    <circle cx="26" cy="29.5" r="1.3" fill={INK} /><circle cx="38" cy="29.5" r="1.3" fill={INK} />
  {:else}
    <circle cx="26" cy="28" r="1.8" fill={INK} /><circle cx="38" cy="28" r="1.8" fill={INK} />
  {/if}

  <!-- Nez -->
  {#if t.nose === 'small'}
    <path d="M32 29 L30 34 L33 34" fill="none" stroke={INK} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
  {:else}
    <ellipse cx="32" cy="33" rx={t.nose === 'red' ? 4 : 3.6} ry="3.2" fill={t.nose === 'red' ? '#d9483b' : t.skin} stroke={INK} stroke-width="1.8" />
  {/if}

  <!-- Barbe, puis bouche par-dessus -->
  {#if t.facialHair === 'beard'}
    <path d="M{32 - headWidth + 1} 33 Q{32 - headWidth + 2} 44 32 44 Q{32 + headWidth - 2} 44 {32 + headWidth - 1} 33 Q40 38 32 37 Q24 38 {32 - headWidth + 1} 33 Z" fill={t.hairColor} stroke={INK} stroke-width="1.6" />
  {:else if t.facialHair === 'goatee'}
    <path d="M28 40 Q32 46 36 40 Z" fill={t.hairColor} stroke={INK} stroke-width="1.6" />
  {:else if t.facialHair === 'stubble'}
    <g fill={INK}>
      <circle cx="24" cy="37" r=".7" /><circle cx="27" cy="40" r=".7" /><circle cx="32" cy="41.5" r=".7" /><circle cx="37" cy="40" r=".7" /><circle cx="40" cy="37" r=".7" />
    </g>
  {/if}
  {#if t.mouth === 'smile'}
    <path d="M27 38 Q32 42 37 38" fill="none" stroke={INK} stroke-width="2" stroke-linecap="round" />
  {:else if t.mouth === 'frown'}
    <path d="M27 40 Q32 36.5 37 40" fill="none" stroke={INK} stroke-width="2" stroke-linecap="round" />
  {:else if t.mouth === 'gap'}
    <path d="M27 38 Q32 43 37 38 Z" fill="#fff" stroke={INK} stroke-width="1.8" stroke-linejoin="round" />
    <rect x="31" y="38.4" width="2" height="2.8" fill={INK} />
  {:else}
    <path d="M28 39 L36 39" stroke={INK} stroke-width="2" stroke-linecap="round" />
  {/if}
  {#if t.facialHair === 'moustache'}
    <path d="M24 37.5 Q28 33.5 32 36 Q36 33.5 40 37.5 Q36 38.5 32 37.6 Q28 38.5 24 37.5 Z" fill={t.hairColor} stroke={INK} stroke-width="1.5" stroke-linejoin="round" />
  {/if}

  {#if t.extra === 'plaster'}
    <rect x="37" y="19" width="7" height="3.2" transform="rotate(-30 40 20)" fill="#f4e9cf" stroke={INK} stroke-width="1.2" />
  {/if}
</svg>

<style>
  .trombine {
    display: block;
    flex: none;
    border: var(--trait-fin) solid var(--encre-fixe);
    background: var(--craie-fixe);
  }
</style>
