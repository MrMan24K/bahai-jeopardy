# Bahá'í Jeopardy!

[![Play online](https://img.shields.io/badge/play-bahaijeopardy.com-060ce9?style=for-the-badge)](https://bahaijeopardy.com)

A browser-based Jeopardy-style trivia game about the Bahá'í Faith — built for youth gatherings, study groups, and community events. No install required: open the site, name your teams, pick a difficulty, and play.

**Live site:** [bahaijeopardy.com](https://bahaijeopardy.com)

## About

Bahá'í Jeopardy! is a single-page game with a classic Jeopardy board, Daily Doubles, and Final Jeopardy. It supports up to four teams and three difficulty levels (Easy, Medium, Hard), each with its own category lineup and question pool.

The question bank includes **430+ clues** across topics such as:

- The Central Figures (the Báb, Bahá'u'lláh, 'Abdu'l-Bahá, Shoghi Effendi)
- Holy places and writings
- Principles and teachings
- History, calendar, institutions, and persecution & resilience

Questions are filtered at runtime to avoid vague clues and weak duplicates where possible.

## How to play

1. Visit [bahaijeopardy.com](https://bahaijeopardy.com) (or open `index.html` locally).
2. Enter team names (1–4 teams).
3. Choose **Easy**, **Medium**, or **Hard**.
4. Click a dollar value to reveal a clue.
5. Use the on-screen buttons or keyboard shortcuts to score:

| Key | Action |
| --- | --- |
| **Space** | Reveal answer |
| **1–4** | Select active team |
| **C** | Correct |
| **I** | Incorrect |
| **Esc** | Return to board |

During play you can load a **new board** (keeps scores) or **reset the game** (clears scores). Switching difficulty mid-game reloads the board with new categories for that level.

## Question history

The game remembers which clues you have already seen **per difficulty, category, and dollar value** using a persistent ID stored in your browser (`localStorage`). Refreshing the page or loading a new board will not repeat a question until every clue in that slot has been used.

- History is scoped to the selected difficulty — Easy, Medium, and Hard track separately.
- Questions are never pulled from other categories, price tiers, or difficulty modes to fill a slot.
- Use **Reset Game** and confirm the history prompt if you want to clear your seen-questions list for the current difficulty.

## Feedback and suggestions

Use the **Contact** button on the title or final screen to send feedback or suggest a new clue. Submissions are delivered by [FormSubmit](https://formsubmit.co) and require the live site (they do not work when opening `index.html` as a local file).

## Local development

This project is plain HTML, CSS, and JavaScript — no build step.

```bash
git clone https://github.com/MrMan24K/bahai-jeopardy.git
cd bahai-jeopardy
```

Serve the folder with any static file server, for example:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

### Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page layout, styles, and screens |
| `game.js` | Game logic, board generation, scoring |
| `question-bank.js` | Question and Final Jeopardy data |
| `question-history.js` | Persistent per-slot question tracking |

## Deployment

The site is hosted on **[Cloudflare Pages](https://pages.cloudflare.com)** at [bahaijeopardy.com](https://bahaijeopardy.com). Pushes to the `main` branch deploy automatically via GitHub integration.

To deploy your own fork:

1. Create a Cloudflare Pages project connected to this repository.
2. Set **Build command** to empty and **Build output directory** to `/` (root).
3. Add your custom domain in the Pages project settings.

## Contributing

Contributions are welcome, especially:

- New or improved clues (accuracy, clarity, and age-appropriateness matter)
- Bug fixes and accessibility improvements
- Translations or localization

Please open an issue or pull request with a clear description of the change. For question suggestions, you can also use the in-game Contact form on the live site.

## Credits

**Created by Kabir Ahmadi**

An unofficial fan project for educational and community use. **Not affiliated with or endorsed by the Bahá'í International Community.**

If you use or adapt this project, please keep the credit line and this disclaimer intact.
