/**
 * BSG site configuration
 * ---------------------
 * This is the only file you need to edit to connect the live Google Sheet.
 *
 * 1. Open the Backspin Stream Tracker spreadsheet.
 * 2. For each tab below, choose File → Share → Publish to web.
 * 3. Publish that one tab as a CSV (check "Republish automatically").
 * 4. Paste the published CSV link into the matching quotes.
 * 5. Leave a pair of quotes empty ("") to keep using the bundled sample file.
 *
 * A published link looks like this (yours will be different):
 * https://docs.google.com/spreadsheets/d/e/2PACX-..../pub?gid=0&single=true&output=csv
 *
 * Use the Published CSV link, not the normal edit link. The site reads these
 * files in the browser whenever someone opens or refreshes a page.
 */

export const csvUrls = {
  /** Rounds tab. One row per round. This is the source of results and points. */
  rounds: "",
  /** Streamers tab. Column A is the player name. */
  streamers: "",
  /**
   * Matchups tab. Loaded so the column map stays in one place.
   * These rows are planning notes. They are not shown on the public schedule.
   */
  matchups: "",
  /**
   * Streams tab. This is the public schedule.
   * A row is shown when it has no Status column, a blank status, or a status
   * listed in `scheduleStatus.allow` (Finalized, by default).
   */
  streams: "",
};

/**
 * Header text from row 1 of each tab. If a column is renamed in the sheet,
 * change the string here to match. Names are matched ignoring capitalization
 * and extra spaces.
 */
export const columns = {
  rounds: {
    date: "Stream date",
    streamType: "Stream type",
    round: "Round",
    game: "Game",
    format: "Format",
    playerA: "Player A",
    playerB: "Player B",
    gamesWonA: "Games won A",
    gamesWonB: "Games won B",
    winner: "Winner",
    prizeMoney: "Prize money",
    notes: "Notes",
    season: "Season",
  },
  streamers: {
    /** Column A header. The cell values are player names. */
    player: "Player",
    /**
     * Shown on a player's page. Anything else on the Streamers tab
     * (outreach notes, for example) stays off the website.
     */
    publicColumns: [
      "Status",
      "Language",
      "Game 1",
      "Game 2",
      "Game 3",
      "Wildcard 1",
      "Wildcard 2",
    ],
  },
  matchups: {
    streamType: "Stream type",
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    status: "Status",
    date: "Date",
    time: "Time (ET)",
    rounds: ["Round 1", "Round 2", "Round 3"],
    notes: "Feedback",
  },
  streams: {
    date: "Date",
    day: "Day",
    time: "Start time (ET)",
    streamType: "Stream type",
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    rounds: ["Round 1", "Round 2", "Round 3"],
    notes: "Notes",
    /**
     * Optional. The Streams tab does not have this column today.
     * If you add it, only the statuses listed below are treated as public.
     * A blank status is still shown, because a row on the Streams tab is
     * already the committed schedule.
     */
    status: "Status",
  },
};

/** Status values that may appear on the public schedule. Blank is always allowed. */
export const scheduleStatus = {
  allow: ["Finalized"],
};

/**
 * While every URL above is empty, the site pretends "now" is this moment so
 * the sample season is mid-stream (a Thursday night still ahead, standings
 * already underway). Live CSV links switch the clock back to the real date.
 */
export const samplePreview = {
  year: 2027,
  month: 2,
  day: 8,
  hour: 16,
  minute: 0,
};

/** Where the Watch Live button sends people. */
export const kickUrl = "https://kick.com/backspingamestv";

export type RoundColumns = typeof columns.rounds;
export type StreamColumns = typeof columns.streams;
export type MatchupColumns = typeof columns.matchups;
