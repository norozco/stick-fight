# Stick-Fight Session Checkpoint

**Last updated:** 2026-04-17 (active session)
**Repo:** https://github.com/norozco/stick-fight (user is collaborator `AzuXo`)
**Working branch:** `main` (auto-deploys to GitHub Pages ~30s after push)
**Local path:** `Z:\Claude\stick-fight`

---

## Session objectives (in order tackled)

1. ✅ **Fix ring-out red-screen freeze** — game froze on edge KO finisher
2. ✅ **Add single-player button layout selection** (DEFAULT vs ALT: A/D/W/J/K/H/I)
3. ✅ **Make movement more fluid** (accel ramp + pivot detection + smooth stop)
4. ✅ **Redesign Aurora visually** to match Jade's art style, winter warrior theme
5. 🔄 **(in progress)** Give Aurora high-quality PNG sprite frames — currently copied from Jade; next step is custom frames from the Frost Vanguard reference sheet

---

## Completed work

### 1. Ring-out freeze fix
**Problem:** Finisher near edge → red screen, game halts.
**Root cause:** `js/game.js` speed-line code referenced removed variables (`MAX_BOUNCES`, `f.ringoutBounces`, `f.ringoutRestTime`). ReferenceError thrown every frame stopped the RAF loop.
**Fix:** Replaced with phase-name-based intensity calc driven by `RINGOUT_PHASES`:
- LAUNCH: ramp 0→1 over 6 frames
- APPROACH: full 1.0
- FREEFALL: 0.35
- CRASH: ramp down over 10 frames
- SETTLE: 0

Also added diagnostic error overlay (`window.__lastErr`) drawn on canvas as a safety net.
**Commit:** `d073529` + `8bab07d`

### 2. Button layout picker (single-player)
**Added:** Pre-game `#layout` overlay with two cards (DEFAULT / ALT) shown only in `cpu` or `training` mode.
**Wiring:**
- `startGame()` routes CPU/Training → layout picker → setup
- `pickLayout(name)` sets global `p1Layout` and advances to setup
- `getP1Input()` has an alt branch: A=back, D=forward, W=jump, J=light, K=heavy, H=throw, I=block
- `backToMenu()` also hides `#layout`

### 3. Fluid movement (`js/fighter.js`)
```javascript
const reversing = this.onGround && targetVx !== 0 &&
                  Math.sign(targetVx) !== Math.sign(this.vx) &&
                  Math.abs(this.vx) > 1;
const accel = this.onGround ? (reversing ? 0.38 : 0.55) : 0.62;
this.vx += (targetVx - this.vx) * accel;
if(targetVx === 0 && this.onGround) this.vx *= 0.80;
// walkPhase fade tuned 0.92 → 0.86 for snappier stop anim
```

### 4. Aurora visual redesign (`js/sprites.js` `drawAurora`, lines 301–441)
- **Palette:** warm olive skin (`#dca878/#b87c48/#8a5828`), near-black hair (`#0c0a18/#18162c/#282442`), white fur trim (`#e8ecf6/#b8c0d0/#8898a8`), dark armor (`#1a1c2a/#2a2c3e/#3c3e54`)
- **Features:** high ponytail, fur collar, dark armored chest, exposed midriff, waistband, fur-trimmed boots, flowing ice cape
- **Proportions:** `_s.scale(1.35, 1.35)` to match Jade; `nY=gy-100, hY=gy-128`
- **Eyes:** dark-blue irises (`#203090/#0e1c60`), serious expression
- Also updated `data.js` `visual` block for Aurora (used by procedural pose renderer)
- **Commits:** `cb94a3b`, `53775e6`, `0964b59`, `3881a80`

### 5. Aurora PNG sprite frames
- `sprites/jade/` had AI-generated `idle_0..5.png` + `walk_0..7.png` — these PNGs override the procedural `drawJade` for those animations, giving Jade her polished look.
- **Action taken:** copied those 14 PNG files from `sprites/jade/` → `sprites/aurora/` so Aurora's idle+walk now use the same high-quality art (identical to Jade for now).
- **Commit:** `d274bda`

---

## Active / next step

**Goal:** Give Aurora her own unique high-quality PNG frames.
**Reference:** User provided a Frost Vanguard character sheet (dark ponytail, fur collar, ice cape, winter warrior) with clear animation rows:
- Walk (5 frames), Dash/Frost Glide (6), Back Dash (6), Jump (5), Fall (6), Air Dash (6), Landing (5), Step Forward/Backward/Diagonal (4 each)
- Turnaround poses + facial expressions + FX examples also present

**Plan:**
1. User saves reference image to `Z:\Claude\stick-fight\frost_vanguard_ref.png`
2. Python/Pillow script crops animation rows into individual frames
3. Save as `sprites/aurora/<anim>_<n>.png` matching the naming convention
4. Commit + push to main, GitHub Pages redeploys

**Tools confirmed available:** Python 3 with Pillow (`py -3`)
**Tools NOT available locally:** ImageMagick, node-canvas

---

## Key file map

| File | What's in it |
|------|--------------|
| `js/sprites.js` | Procedural `drawAurora/Jade/Crimson/Noir`; sprite cache; `loadSpriteFrames` (loads PNGs from `sprites/<id>/`) |
| `js/data.js` | `CHARACTERS` array with `visual` blocks (used by pose renderer, not sprite renderer) |
| `js/fighter.js` | Fighter class, movement physics, state machine |
| `js/game.js` | Main game loop, ring-out phase system, menu routing, layout picker hook |
| `js/poses.js` | `renderFilledPose` — procedural body shape renderer (separate path from sprites) |
| `index.html` | Menus, `#layout` overlay, `p1Layout` global, diagnostic error capture |
| `sprites/jade/idle_*.png, walk_*.png` | Jade's PNG frames (override procedural) |
| `sprites/aurora/idle_*.png, walk_*.png` | NEW — copied from Jade, placeholder |

---

## Critical code locations (line numbers may drift)

- `drawAurora`: `js/sprites.js:301`
- `generateSpritesForCharacter`: `js/sprites.js:1390` — PNG-override happens at line 1395
- `loadSpriteFrames`: `js/sprites.js:1348` — reads `sprites/<id>/<anim>_<n>.png`
- Ring-out speed-line code: `js/game.js` (search `RINGOUT_PHASES[ringoutPhaseIdx]`)
- Movement accel/pivot: `js/fighter.js` (search `reversing`)
- Layout picker wiring: `index.html` + `js/game.js` `startGame`/`pickLayout`/`getP1Input`

---

## Agents / tools used this session

- **Bash** — git operations, file ops, tool availability checks, copying sprite files
- **Read / Edit / Write / Grep / Glob** — direct file edits on js sources
- **Claude in Chrome MCP** — attempted to open game for visual verification (extension was disconnected)
- **No sub-agents (`general-purpose`, `Explore`, `Plan`) spawned** — all work done directly in main thread

---

## Recent commits (origin/main)

```
d274bda Aurora: copy Jade PNG frames so sprite renderer uses high-quality art style
3881a80 Aurora: full winter-warrior redesign based on reference image
0964b59 Aurora sprite: match Jade's 1.35x scale + taller proportions
53775e6 Aurora visual: match Jade art style exactly, ice-blue palette
cb94a3b Aurora: Jade-weight winter-armour visual redesign
7a947b8 auto-deploy (norozco)
```

---

## Known gotchas for session resume

1. **PNGs override procedural.** If `sprites/<char>/<anim>_<n>.png` exists, `drawX` is never called for that animation. To restore procedural, delete the PNGs.
2. **Two render paths.** `renderFilledPose` (poses.js, reads `visual.body` from data.js) and `drawFighterSprite` (sprites.js cache). Changing one doesn't affect the other.
3. **`norozco` auto-deploy commits** periodically rewrite `index.html` — rebase/pull before major edits if conflicts appear.
4. **Working branch is `main`** (not `claude/work` as memory file suggests — that's stale for this repo).
5. **Chrome MCP extension** was disconnected last time it was tried; may need user to reconnect.

---

## How to resume

1. `cd Z:\Claude\stick-fight && git pull`
2. Read this file
3. Check if user still wants custom Aurora frames from Frost Vanguard sheet — if yes, ask them to save the image to `frost_vanguard_ref.png`
4. Write Python crop script, extract frames, commit, push
