# BSG

Public standings site for Backspin Games' BSG seasons. It reads the **Backspin Stream Tracker** Google Sheet and calculates points, payouts, records, and the playoff bracket in the browser. There is no account, no database, and nothing to type twice.

While the sheet links are empty, the site shows bundled sample data and a notice that says so. The sample clock is **February 8, 2027**, so Season 1 looks mid-season (the next stream is Thursday, February 11).

## What updates the site

Edit the Google Sheet, then refresh the website. You do not rebuild the site when you add a round.

You do rebuild (or let Netlify, Vercel, or GitHub Pages rebuild) only when you change `src/config.ts`, for example the first time you paste the CSV links.

## Connect the Google Sheet

Open the Backspin Stream Tracker. For each of these four tabs, publish that tab by itself:

1. Rounds
2. Streamers
3. Matchups
4. Streams

For each tab:

1. Click **File → Share → Publish to web**.
2. Choose that one tab (not "Entire document").
3. Choose **Comma-separated values (.csv)**.
4. Turn on **Automatically republish when changes are made**.
5. Click **Publish** and copy the link.

The link should look like this:

```text
https://docs.google.com/spreadsheets/d/e/2PACX-..../pub?gid=0&single=true&output=csv
```

Use that published CSV link. The normal edit link will not work.

Open `src/config.ts`. Paste each link between the quotes:

```ts
export const csvUrls = {
  rounds: "",
  streamers: "",
  matchups: "",
  streams: "",
};
```

Leave a pair of quotes empty to keep sample data for that tab.

The public schedule is the **Streams** tab. A row is shown when it has no Status column, a blank status, or a status of `Finalized`. The **Matchups** tab is planning only and is not shown on the site. Copy a matchup onto the Streams tab when it is ready to announce.

If a column header in the sheet is renamed, change the matching name in the `columns` section of `src/config.ts`.

### Columns the site expects

Rounds (one row per round): Stream date, Stream type, Round, Game, Format, Player A, Player B, Games won A, Games won B, Winner, Prize money, Notes, Season.

Season is one of `BSG 1 - Regular`, `BSG 1 - Playoffs`, and the same pattern through BSG 4, or `Non-BSG`. Format is `BO3`, `BO5`, or `BO7`. Winner is a player name, or blank if the round is not decided.

Streamers: column A is the player name. Status, language, games, and wildcards are shown on the player page. Outreach notes are not.

Streams: Date, Day, Start time (ET), Stream type, Player 1–4, Round 1–3, Notes. A round cell such as `Bingo BO5` is the game and the format. Player 1 vs Player 2 is one matchup. If Player 3 and Player 4 are filled in, they are a second matchup.

## Scoring

These rules come from the BSG competition document.

- A round is one best-of series. The winner gets **1** point for a BO3, **2** for a BO5, and **3** for a BO7. The other player gets none.
- Only a player's **first 20 regular-season rounds** count, in order of stream date and then round number. The table shows that as `N/20`.
- Playoff rounds and `Non-BSG` rounds do not add season points. They do count in all-time records.
- Ties and blank winners are not wins or losses, and they do not use up one of the 20 rounds.
- Leaderboard bonus cash, from a $1,500 pool: 1st $350, 2nd $250, 3rd $200, 4th $150, 5th $125, 6th $100, 7th $80, 8th $70, 9th $60, 10th $50, 11th $40, 12th $25. 13th and below get no leaderboard bonus.
- If a tie would change bonus cash or a playoff seed, both players are marked tied. A tie-break Fight Night decides who finishes higher.
- The top 8 make a single-elimination bracket: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6. Semifinals are the winner of 1/8 vs the winner of 4/5, and the winner of 2/7 vs the winner of 3/6, then the final.
- Playoff bonus, from a $1,000 pool: champion $400, runner-up $200, each semifinal loser $100, each quarterfinal loser $50.
- Seeds stay **TBD** until the regular season ends, or until playoff rounds are in the sheet. A tie in the top 8 also keeps the bracket TBD.
- A playoff series is decided by who has won more recorded rounds between that pair. A 1–1 series stays open. One finished round is enough to advance if that is all that has been entered.

Seasons in 2027 are BSG 1 (Jan–Mar), BSG 2 (Apr–Jun), BSG 3 (Jul–Sep), and BSG 4 (Oct–Dec). Each one is 10 weeks of regular season, 2 weeks of playoffs, and 1 off week. The planned dates are in `src/lib/seasons.ts`.

## Run it on your computer

Install Node.js 22 from [https://nodejs.org](https://nodejs.org). Then, in this folder:

```bash
npm install
npm test
npm run dev
```

Open http://127.0.0.1:43123

`npm test` checks the scoring rules. `npm run build` creates the `dist` folder, which is the site you upload.

## Put it on the internet

Pick one host. All three are free for a site like this.

### Netlify (simplest if you do not want Git)

1. Run `npm run build` on your computer.
2. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `dist` folder onto the page.

To have it rebuild when you change `src/config.ts`, connect the Git repository instead. Build command: `npm run build`. Publish folder: `dist`.

### Vercel

Import the repository at [https://vercel.com](https://vercel.com). The `vercel.json` file already sets the build. Framework preset: Vite.

### GitHub Pages

1. Push this project to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The workflow in `.github/workflows/pages.yml` runs the tests, builds the site, and publishes it on every push to `main`. The address will be `https://<your-name>.github.io/<repository>/`. Links use a hash (`/#/players/sweetnsour`), so they work there without extra setup.

## Pages

- **Leaderboard** is the home page. Pick BSG 1–4 in the header. Click a player name to open their page.
- **Schedule** lists upcoming Streams rows and past rounds.
- **Bracket** is the playoff path for the selected season.
- **Players** lists the roster. Each player has a shareable URL.

## If the live sheet does not show up

- The link must be the published CSV link, not the edit link.
- Each tab is published separately. Four tabs means four links.
- Google can take a minute to republish. Refresh the page.
- If a tab fails to load, that tab falls back to sample data and a note appears at the top. The rest of the site still works.
- Player names match even if the capitalization differs (`Cyphon` and `cyphon` are the same person). The Streamers tab is the spelling shown on the site.
