# Playbook: interactive "built by the audience" series

## The loop that makes people follow and comment

1. **Follow = citizen.** The follower count is the population ("RAKYAT: N" sign + HUD badge). Start Day 1 at 1.
2. **Comment = proposal.** The comment with the most likes is built in the next episode. Always say who
   proposed it (`name` tag `@username`, title "Penasihat Raja") — people comment to see their name.
3. **Gift / support = rank.** Prajurit (any gift) → Ksatria → Panglima → Bangsawan (see table below). Ranks are
   cosmetic: name on a banner, a soldier with their name, a building named after them.
4. Every episode ends asking: "Follow, jadi rakyat ke-(N+1). Komen, besok bangun apa?" + end card with 3 example chips.

## Episode structure (60–80 s)

| # | Beat | Example |
|---|---|---|
| 1 | Hook: day + population jump (popKeys ramp) | "Hari ketiga. Rakyatnya sekarang… lima ratus delapan puluh satu." |
| 2 | Credit the winning comment (name tag) | "Usulan terbanyak dari Budi: sawah, buat sumber makanan." |
| 3 | Small reward / title for the proposer | "Mulai hari ini, gelarnya: Penasihat Raja." |
| 4 | Time-lapse build with the crowd working | clock 07:00 → 12:00, loops hammering |
| 5–7 | 2–3 jokes (the leader fails, the pet, an animal "followed" but has no ID card) | "Raja ikut nanam… nyangkut di lumpur." |
| 8 | Reveal shot of the result + a warm line | "Kerajaan ini milik semua rakyat." |
| 9 | Optional second proposal or a teaser | |
| 10 | Night, CTA + popup FOLLOW | "Follow, jadi rakyat ke-…" |
| 11 | End card + one last dry joke | "Oh iya. Raja masih tidur di tenda." |

## Voice & humour

- First person, the leader talks dryly and a bit lazily; short sentences; Indonesian everyday language
  (nggak, banget, kok). Numbers are written in words in `say` so the voice reads them right
  ("lima ratus delapan puluh satu"); usernames as readable words ("Budi Santoso" for @budi_santoso).
- Running gags work: the pet "doesn't count, no ID card yet"; the leader does everything alone; the palace
  still doesn't exist. Callback to them every few days.
- Respectful about religion, ethnicity and people. Places of worship are shown with dignity; jokes are
  about the leader, never about a faith or group. Avoid politics, real people, real brands.

## Ranks (example for the bio / highlight)

| Rank | How | Reward in the video |
|---|---|---|
| Rakyat | follow | counted on the sign |
| Rakyat bernama | comment (drawn by lot) | name tag on a citizen |
| Penasihat Raja | top-liked comment | proposal built + name said by the leader |
| Prajurit | any gift | name on the "DAFTAR PRAJURIT" board |
| Ksatria / Panglima / Bangsawan | support via a donation link (e.g. Rp10k / 50k / 100k) | soldier with their name / chosen class / building named after them |

`tools/count_votes.py --file komentar.txt` ranks proposals (comments + likes) and draws names.
Format: one comment per line, `username | text | likes`.

## Posting

- Instagram Reels (also fine on TikTok/Shorts). Cover = `videos/…-cover.jpg`. Caption = `episodes/…/dayNN.caption.txt`.
- Post daily, same hour (11–13 or 18–21 WIB). Pin a comment: "Komen usulanmu di sini 👇".
- Turn on the platform's AI label (the voice is synthetic).
