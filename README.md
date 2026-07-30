# Bahá'í Jeopardy!

A browser-based Jeopardy-style trivia game about the Bahá'í Faith — built for youth gatherings, study groups, and community events. No install required: open the page, name your teams, pick a difficulty, and play.

## Description

Bahá'í Jeopardy! is a single-page game with a classic Jeopardy board, Daily Doubles, and Final Jeopardy. It supports up to four teams and three difficulty levels (Easy, Medium, Hard), each with its own category lineup and question pool. The question bank includes 430+ clues across topics like the Central Figures, holy places, writings, history, institutions, and more.

## How to play

1. Open `index.html` in a browser (or visit the deployed site).
2. Enter team names (1–4 teams).
3. Choose **Easy**, **Medium**, or **Hard**.
4. Click a dollar value to reveal a clue; use keyboard shortcuts to score:
   - **Space** — reveal answer
   - **1–4** — select team
   - **C** / **I** — correct / incorrect
   - **Esc** — return to board

## Run locally

```bash
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765).

## Deploy to Netlify via GitHub Actions

Every push to `main` deploys to Netlify automatically once secrets are configured. This is a static site — no build step needed.

### 1. Create a Netlify site

1. Sign in at [Netlify](https://app.netlify.com/).
2. **Add new site** → **Import an existing project** → **GitHub** → select `MrMan24K/bahai-jeopardy`.
3. Build settings: **leave build command empty**. Publish directory: **`.`** (root).

### 2. Get your Netlify Personal Access Token (PAT)

Create a token at: [Netlify user applications → Personal access tokens](https://app.netlify.com/user/applications#personal-access-tokens)

### 3. Get your Netlify Site ID

In the Netlify dashboard: open your site → **Site configuration** → **General** → **Site details** → **Site ID** (also called API ID).

### 4. Add secrets in GitHub Actions

Open this page and add two repository secrets:

**https://github.com/MrMan24K/bahai-jeopardy/settings/secrets/actions**

| Secret name | Value |
|-------------|--------|
| `NETLIFY_AUTH_TOKEN` | Your Netlify personal access token |
| `NETLIFY_SITE_ID` | Your Netlify site ID |

After both secrets are saved, merge to `main` or re-run the **Deploy to Netlify** workflow under the Actions tab.

You can also deploy manually via [Netlify Drop](https://app.netlify.com/drop) by dragging the project folder.

## Credits

**Created by Kabir Ahmadi**

An unofficial fan project for educational and community use. Not affiliated with or endorsed by the Bahá'í International Community.
