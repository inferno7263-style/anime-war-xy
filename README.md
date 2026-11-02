# ALPHABET WAR: X vs Y

A playable 2D browser fighter built with Phaser 3, JavaScript, and Vite. Play as the red-and-black X-MAN against AI-controlled green-and-gold Y-MAN on **The Fracture**, a floating rocky island above blue-misted mountains.

## Develop

Requires Node.js 20.19+ or 22.12+ (Node 24 is supported).

```sh
npm ci
npm run dev
```

Vite prints the local development address. No keys, backend, database, or external asset services are required. Artwork, motion effects, and sound are generated locally; fonts are bundled with the build.

## Controls

| Action          | Key                   |
| --------------- | --------------------- |
| Move            | A / D or Left / Right |
| Jump            | W, Up, or Space       |
| Quick strike    | J                     |
| Heavy attack    | K                     |
| Hold guard      | L                     |
| Dash            | Shift                 |
| Start / rematch | Enter                 |
| Pause / resume  | Escape                |
| Restart match   | R                     |

Touch controls appear on narrow screens. Sound is off initially; toggle it in the header. Each round lasts 99 seconds. Knock out your opponent, or finish with more health when time expires. Guarding reduces damage and consumes stamina. Movement, attacks, knockback, collision, and AI run in a standalone combat simulation.

## Validate and build

```sh
npm test
npm run build
npm run preview
```

The combat tests exercise attack timing, damage, guarding, jump and bounds, AI behavior, knockout/reset, and timeout. The static production build is written to `dist/`.

## Publish

The production build uses relative asset URLs, so it can be hosted at the root
of a website or under a GitHub Pages repository path. Upload the contents of
`dist/` to a static host; no server-side runtime is needed.

For this repository, publish the prepared `gh-pages` branch through GitHub
**Settings → Pages**: choose **Deploy from a branch**, select **gh-pages** and
**/ (root)**, and save. GitHub then publishes the site at
`https://inferno7263-style.github.io/anime-war-xy/`. This address is live only
after Pages is enabled and its deployment succeeds.

## Project layout

- `src/main.js` — interface, dialogs, and browser controls
- `src/style.css` — responsive game interface
- `src/game/scene.js` — Phaser scene, input, match flow, HUD, and impact effects
- `src/game/combat.js` — independent combat and AI simulation
- `src/game/fighter.js` — articulated procedural warrior artwork
- `src/game/arena.js` — atmospheric procedural battlefield
- `src/game/audio.js` — optional synthesized combat audio
