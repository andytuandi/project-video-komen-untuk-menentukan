# World, props and actors (see `docs/katalog-aset.jpg`)

## World map (same in every episode)

- Flat green land with grass, flowers, trees, rocks, glowing crystals, mountains on the horizon and floating
  islands in the sky. Day/night sky follows the HUD clock (stars + moon at night).
- Dirt road from the gate at z = +18 down to a round dirt clearing at the origin (radius 9).
- Used spots in the example world (reuse them or choose new free land):

| Spot | Position | Notes |
|---|---|---|
| Gate + RAKYAT sign | gate [0, 18], sign [3.7, 18.6] | road runs toward +z behind the gate |
| Throne stump | [2.5, -1] | leader stands on it with `y: 0.92` |
| Royal tent | [-5.5, -6] rot 25 | |
| Campfire | [-1, -1.5] | |
| Mosque + church | [-5.2, -19], [4.6, -19.5] | plaza [-0.3, -18.5, 11.5] |
| Guard post | [5.5, 13.2] | plaza [5.5, 13.2, 4.2] |
| Rice fields + hut | paddy [19, 2] (3x4 plots of 4.2), hut [28.6, 0] | reserved [10, -12, 31, 15] |

Free land for new buildings: west (x −30…−12, z −5…15), north-east (x 12…30, z −30…−14),
south-west (x −25…−8, z 10…30). Keep 2 units between buildings. Add a `plazas` circle under new
building groups and a `reserved` rectangle so no tree grows inside them.

## Prop types

| type | params | size (w × d × h) |
|---|---|---|
| `gate` | `title` (board text) | 5.6 × 0.3 × 5 |
| `sign` | `text` (`{pop}` = live follower count, `\n` = new line) | 1.9 wide |
| `throne` | — (tree stump with cushion) | Ø 1.4 |
| `tent` | — (striped royal tent) | Ø 4.9 × 3.6 |
| `campfire` | `lit: {beat, at}` | Ø 1.4 |
| `mosque` | — (dome + minaret) | 6.4 × 6.4 × 8 |
| `church` | — (bell tower + cross) | 5.2 × 8 × 8.5 |
| `guardpost` | `lines: ["DAFTAR PRAJURIT", "(masih kosong)"]` (notice board) | 3 × 3 × 6 |
| `paddy` | `cols`, `rows`, `size`; prop-level `grow`, `ripe` | (cols·size) × (rows·size) |
| `hut` | — (saung) | 2.3 × 2.3 × 3.6 |
| `scarecrow` | — | |
| `crate`, `sack`, `hammer` | — | small |

Every building appears piece by piece with `build`. If the audience asks for something that does not
exist yet (houses, market, palace, school, well, bridge…), add a new function in
`engine/renderer/assets.js` built from boxes/cylinders/cones with `step(object, 0..1)` on each piece
(the order in which pieces pop in), register it in `makeProp` in `engine/renderer/main.js`, and add the
type to `PROP_TYPES` in `engine/build.py`. Keep it low-poly, flat-shaded, bright colours, roughly to the
scale above (a person is 2 units tall). Check it with one still before the full render.

## Actor types

| type | options |
|---|---|
| `king` | the leader. Look set once per episode in top-level `leader`: `shirt`, `cape`, `skin`, `mustache: false`, `beard: false`, `hair: "bun"` (→ a queen: `{"mustache": false, "hair": "bun", "shirt": "#c2185b"}`) |
| `villager` | `shirt`, `skin`, `hat: "straw"`, `hair: "bun" \| "hijab"`, `hijab` colour, `mustache: false` |
| `soldier` | helmet, spear, shield, tabard |
| `dragon` | the pet (any name you like) |
| `buffalo`, `cart` | animals/vehicles; they animate while moving |
| `crowd` | up to 60 varied citizens (men, women, hijab, straw hats, different skin tones) |

Skin tones used by the crowd: `#c68a5a #b97a4c #d9a27a #a8693f #e0b48c`.
