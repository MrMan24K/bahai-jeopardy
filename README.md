# bahai-jeopardy

A browser-based Jeopardy-style trivia game about the Bahá'í Faith for youth or community events. Up to 4 teams, 3 difficulty levels, 430+ questions. Created by Kabir Ahmadi.

## Push your local Mac files to GitHub

The cloud agent cannot read files directly from your Mac. If your game folder on your computer is not yet on GitHub, run these commands **in Terminal on your Mac** from your `bahai-jeopardy` folder:

```bash
cd /path/to/your/bahai-jeopardy

# If this folder is not already a git repo:
git init
git remote add origin https://github.com/MrMan24K/bahai-jeopardy.git

git add .
git commit -m "Add Bahá'í Jeopardy game files"
git pull origin main --rebase   # merge with README if needed
git push -u origin main
```

If the folder is already linked to this repo, just `git add .`, `git commit`, and `git push`.

Your site must include an `index.html` at the repository root (or update `publish` in `netlify.toml`).

## Deploy to Netlify via GitHub Actions

Every push to `main` deploys to Netlify automatically once secrets are configured.

### 1. Create a Netlify site

1. Sign in at [Netlify](https://app.netlify.com/).
2. **Add new site** → **Import an existing project** → **GitHub** → select `MrMan24K/bahai-jeopardy`.
3. Build settings: **leave build command empty** (static site). Publish directory: **`.`** (root).
4. You can skip Netlify’s own deploy hook if you only want GitHub Actions to deploy.

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

After both secrets are saved, push to `main` (or re-run the **Deploy to Netlify** workflow under the Actions tab).

## Local preview

Open `index.html` in a browser, or use any static server:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080
