import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "sample");

const games = [
  "Brickbreaker",
  "Bingo",
  "CannonBlast",
  "Pool",
  "Solitaire",
  "21 Jack",
  "Bowling",
  "Bubble",
  "Blocks",
  "Cooking",
];

/** Three rounds: BO3, BO3, and BO5 unless a match overrides the last format. Letters are who won. */
const nights = [
  {
    date: "2027-01-07",
    type: "Fight Night",
    matches: [
      ["sweetnsour", "cyphon", "aaa", "BO7"],
      ["va311299", "vitamea", "aaa"],
      ["jeana99", "LucasK", "aab"],
      ["Rowney", "jasonoakey", "aba"],
    ],
  },
  {
    date: "2027-01-14",
    type: "Fight Night",
    matches: [
      ["sweetnsour", "va311299", "aaa"],
      ["cyphon", "jeana99", "aaa"],
      ["plantmomma", "Ally10509", "aab"],
      ["DonPancho", "SSc00ter", "aba"],
    ],
  },
  {
    date: "2027-01-21",
    type: "Fight Night",
    matches: [
      ["sweetnsour", "vitamea", "aaa"],
      ["cyphon", "LucasK", "aaa"],
      ["bella575", "Dionysius", "aab"],
      ["jasonoakey", "plantmomma", "bab"],
      ["KhaloodSsS", "Shawww", "bbb"],
    ],
  },
  {
    date: "2027-01-28",
    type: "Bracket",
    matches: [
      ["sweetnsour", "jeana99", "aaa"],
      ["va311299", "Rowney", "aab"],
      ["TakemyHand", "Momele31", "aaa"],
      ["Sid4123", "NilsforPez", "aab"],
    ],
  },
  {
    date: "2027-02-04",
    type: "Fight Night",
    matches: [
      ["sweetnsour", "Rowney", "aaa"],
      ["cyphon", "va311299", "aab"],
      ["vitamea", "jasonoakey", "aaa"],
      ["LucasK", "plantmomma", "aaa"],
      ["Ally10509", "DonPancho", "aab"],
      ["steman", "mamaj85", "aaa"],
      ["Jucagonpi", "Seru26", "aaa"],
    ],
  },
];

const rounds = [];

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function addRound({ date, type, round, game, format, a, b, winner, score, season, notes = "", prize = "" }) {
  const gamesA = winner ? (winner === a ? score[0] : score[1]) : score[0];
  const gamesB = winner ? (winner === a ? score[1] : score[0]) : score[1];
  rounds.push([date, type, round, game, format, a, b, gamesA, gamesB, winner, prize, notes, season]);
}

function scoreLine(format, close) {
  if (format === "BO3") return close ? [2, 1] : [2, 0];
  if (format === "BO5") return close ? [3, 2] : [3, 1];
  return close ? [4, 2] : [4, 1];
}

function playCoded(date, type, a, b, code, lastFormat = "BO5", season = "BSG 1 - Regular") {
  const plan = [
    ["Round 1", "BO3"],
    ["Round 2", "BO3"],
    ["Round 3", lastFormat],
  ];
  plan.forEach(([round, format], index) => {
    const winner = code[index] === "b" ? b : a;
    addRound({
      date,
      type,
      round,
      game: games[(rounds.length + index) % games.length],
      format,
      a,
      b,
      winner,
      score: scoreLine(format, index === 2),
      season,
    });
  });
}

for (const night of nights) {
  for (const [a, b, code, lastFormat] of night.matches) playCoded(night.date, night.type, a, b, code, lastFormat);
}

addRound({
  date: "2026-12-18",
  type: "Fight Night",
  round: "Round 1",
  game: "Bingo",
  format: "BO3",
  a: "sweetnsour",
  b: "cyphon",
  winner: "sweetnsour",
  score: [2, 1],
  season: "Non-BSG",
  notes: "Exhibition before the season",
});

addRound({
  date: "2027-02-04",
  type: "Fight Night",
  round: "Round 3",
  game: "Pool",
  format: "BO5",
  a: "Sid4123",
  b: "steman",
  winner: "",
  score: [1, 1],
  season: "BSG 1 - Regular",
  notes: "Disconnected before a winner",
});

rounds[0][10] = "25";

function ordinal(round) {
  if (round === "Round 1") return 1;
  if (round === "Round 2") return 2;
  if (round === "Round 3") return 3;
  return 9;
}

function pointsFor(format) {
  if (format === "BO3") return 1;
  if (format === "BO5") return 2;
  if (format === "BO7") return 3;
  return 0;
}

function seasonScores() {
  const decisive = rounds
    .map((row, index) => ({ row, index }))
    .filter((item) => item.row[12] === "BSG 1 - Regular" && item.row[9]);
  decisive.sort((a, b) => {
    if (a.row[0] !== b.row[0]) return a.row[0] < b.row[0] ? -1 : 1;
    return ordinal(a.row[2]) - ordinal(b.row[2]) || a.index - b.index;
  });

  const scores = new Map();
  const used = new Map();
  for (const item of decisive) {
    const [a, b, winner, format] = [item.row[5], item.row[6], item.row[9], item.row[4]];
    for (const name of [a, b]) {
      const bag = scores.get(name) ?? { points: 0, played: 0, counted: 0 };
      bag.played += 1;
      const count = used.get(name) ?? 0;
      if (count < 20) {
        used.set(name, count + 1);
        bag.counted += 1;
        if (winner === name) bag.points += pointsFor(format);
      }
      scores.set(name, bag);
    }
  }
  return scores;
}

function ranked(scores) {
  return [...scores.entries()].sort((a, b) => b[1].points - a[1].points || a[0].localeCompare(b[0]));
}

function pointsOf(name) {
  return seasonScores().get(name)?.points ?? 0;
}

const topUpDates = ["2027-01-07", "2027-01-14", "2027-01-21", "2027-01-28", "2027-02-04"];
const topUpOpponents = ["noob", "Amek", "KhaloodSsS", "Momele31", "mamaj85", "Seru26", "Doku", "popeye99", "Taneva", "mtucker"];
let topUpSerial = 0;

function raiseTo(name, target) {
  let step = 0;
  while (pointsOf(name) < target) {
    const current = seasonScores().get(name);
    const room = 20 - (current?.counted ?? 0);
    const gap = target - pointsOf(name);
    if (room <= 0) throw new Error(`${name} hit the 20-round cap at ${pointsOf(name)} points`);
    const extra = gap - room;
    const format = extra >= 2 ? "BO7" : extra === 1 ? "BO5" : "BO3";
    const score = format === "BO7" ? [4, 1] : format === "BO5" ? [3, 1] : [2, 0];
    step += 1;
    topUpSerial += 1;
    const opponent = topUpOpponents[topUpSerial % topUpOpponents.length];
    addRound({
      date: topUpDates[topUpSerial % topUpDates.length],
      type: "Fight Night",
      round: step % 3 === 1 ? "Round 1" : step % 3 === 2 ? "Round 2" : "Round 3",
      game: games[topUpSerial % games.length],
      format,
      a: name,
      b: opponent === name ? "noob" : opponent,
      winner: name,
      score,
      season: "BSG 1 - Regular",
    });
    if (step > 40) throw new Error(`Could not raise ${name} to ${target}`);
  }
  if (pointsOf(name) !== target) throw new Error(`${name} finished on ${pointsOf(name)}, not ${target}`);
}

const targets = [
  ["cyphon", 22],
  ["va311299", 19],
  ["vitamea", 17],
  ["jeana99", 15],
  ["LucasK", 13],
  ["Rowney", 12],
  ["jasonoakey", 11],
  ["plantmomma", 9],
  ["Ally10509", 9],
  ["DonPancho", 7],
  ["SSc00ter", 6],
];

for (const [name, target] of targets) raiseTo(name, target);

for (const [opponent, date] of [
  ["Amek", "2027-02-06"],
  ["Seru26", "2027-02-07"],
  ["mamaj85", "2027-02-07"],
]) {
  playCoded(date, "Fight Night", "sweetnsour", opponent, "aaa");
}

const finalScores = seasonScores();
const sweet = finalScores.get("sweetnsour");
if (!sweet || sweet.counted !== 20 || sweet.played <= 20) {
  throw new Error(`sweetnsour cap failed: ${JSON.stringify(sweet)}`);
}

const board = ranked(finalScores);
if (board[0][0] !== "sweetnsour") throw new Error(`Leader is ${board[0][0]}`);
if (board[0][1].points <= board[1][1].points) throw new Error("Leader is not ahead");

const tied = board.filter((row, index) => index > 0 && row[1].points === board[index - 1][1].points);
if (!tied.some((row) => row[0] === "plantmomma" || row[0] === "Ally10509")) {
  throw new Error("Expected plantmomma and Ally10509 to tie");
}

function writeCsv(name, header, rows) {
  const body = [header, ...rows.map((row) => row.map(csvEscape).join(","))].join("\n") + "\n";
  writeFileSync(join(outDir, name), body);
}

mkdirSync(outDir, { recursive: true });
writeCsv(
  "rounds.csv",
  ["Stream date", "Stream type", "Round", "Game", "Format", "Player A", "Player B", "Games won A", "Games won B", "Winner", "Prize money", "Notes", "Season"],
  rounds,
);

const streamers = [
  ["jeana99", "Inactive", "English", "Bingo", "CannonBlast", "Brickbreaker"],
  ["Doku", "Inactive", "English", "21 Jack", "Bowling", ""],
  ["SSc00ter", "Active", "English", "Bingo", "Brickbreaker", "Pool"],
  ["sweetnsour", "Active", "English", "Brickbreaker", "CannonBlast", ""],
  ["vitamea", "Inactive", "English", "Solitaire", "21 Jack", "Brickbreaker"],
  ["Momele31", "Active", "English", "21 Jack", "", ""],
  ["cyphon", "Active", "English", "Brickbreaker", "CannonBlast", "Pool"],
  ["DonPancho", "Inactive", "English", "Solitaire", "Brickbreaker", ""],
  ["bella575", "Active", "English", "Solitaire", "Brickbreaker", "Bowling"],
  ["TakemyHand", "Active", "English", "Bingo", "Solitaire", "Brickbreaker"],
  ["va311299", "Active", "English", "Bowling", "Cooking", "CannonBlast"],
  ["jasonoakey", "Active", "English", "Solitaire", "Pool", "CannonBlast"],
  ["Rowney", "Active", "English", "Pool", "Brickbreaker", "Solitaire"],
  ["Sid4123", "Active", "English", "21 Jack", "Bingo", "Brickbreaker"],
  ["mamaj85", "Active", "English", "21 Jack", "Solitaire", "Bingo"],
  ["Soysalas", "Inactive", "English", "Bingo", "", ""],
  ["noob", "On hold", "English", "Bingo", "CannonBlast", ""],
  ["Ally10509", "Active", "English", "Solitaire", "Brickbreaker", "CannonBlast"],
  ["mtucker", "On hold", "English", "Brickbreaker", "21 Jack", "Bingo"],
  ["steman", "Active", "Spanish", "Solitaire", "21 Jack", "Bubble"],
  ["Estrada", "Inactive", "Spanish", "", "", ""],
  ["Shawww", "Active", "English", "21 Jack", "Bingo", "Cooking"],
  ["KhaloodSsS", "Active", "English", "Bingo", "21 Jack", "Solitaire"],
  ["NilsforPez", "Active", "English", "Solitaire", "Brickbreaker", "21 Jack"],
  ["plantmomma", "Active", "English", "Brickbreaker", "Bubble", "Blocks"],
  ["popeye99", "Inactive", "English", "Bubble", "Brickbreaker", "Pool"],
  ["LucasK", "Active", "English", "21 Jack", "Pool", "Bingo"],
  ["Jucagonpi", "Active", "English", "Bingo", "Pool", "Solitaire"],
  ["El Libanes", "On hold", "English", "Bingo", "21 Jack", "Solitaire"],
  ["Dionysius", "Active", "English", "Bingo", "Brickbreaker", "21 Jack"],
  ["Taneva", "Inactive", "English", "Brickbreaker", "Pool", "21 Jack"],
  ["Amek", "Active", "English", "Blocks", "Bubble", "21 Jack"],
  ["Seru26", "Active", "English", "Solitaire", "Bingo", ""],
  ["Jose Abel 1221", "Inactive", "Spanish", "", "", ""],
];

writeCsv(
  "streamers.csv",
  ["Player", "Status", "Language", "Game 1", "Game 2", "Game 3", "Wildcard 1", "Wildcard 2", "Last outreach", "Notes"],
  streamers.map((row) => [...row, "", "", "", ""]),
);

function streamRowsForNight(night) {
  const rows = [];
  for (let index = 0; index < night.matches.length; index += 2) {
    const first = night.matches[index];
    const second = night.matches[index + 1];
    rows.push([
      night.date,
      "Thursday",
      "1:00 PM",
      night.type,
      first[0],
      first[1],
      second?.[0] ?? "",
      second?.[1] ?? "",
      "Brickbreaker BO3",
      "Bingo BO5",
      index === 0 && night.date === "2027-01-07" ? "CannonBlast BO7" : "CannonBlast BO3",
      "",
    ]);
  }
  return rows;
}

const upcoming = [
  ["2027-02-11", "Thursday", "1:00 PM", "Fight Night", "cyphon", "jeana99", "", "", "Bingo BO5", "Brickbreaker BO3", "CannonBlast BO3", ""],
  ["2027-02-18", "Thursday", "1:00 PM", "Fight Night", "sweetnsour", "va311299", "Rowney", "LucasK", "Brickbreaker BO3", "CannonBlast BO5", "Pool BO3", ""],
  ["2027-03-04", "Thursday", "1:00 PM", "Bracket", "plantmomma", "Ally10509", "DonPancho", "SSc00ter", "Solitaire BO3", "Bingo BO5", "21 Jack BO7", ""],
];

writeCsv(
  "streams.csv",
  ["Date", "Day", "Start time (ET)", "Stream type", "Player 1", "Player 2", "Player 3", "Player 4", "Round 1", "Round 2", "Round 3", "Notes"],
  [...nights.flatMap(streamRowsForNight), ...upcoming],
);

writeCsv(
  "matchups.csv",
  ["Stream type", "Player 1", "Player 2", "Player 3", "Player 4", "Status", "Date", "Time (ET)", "Round 1", "Round 2", "Round 3", "Feedback"],
  [
    ["Fight Night", "cyphon", "jeana99", "", "", "Suggested", "2027-02-09", "1:00 PM", "Bingo BO3", "Bingo BO5", "Brickbreaker BO3", "Still being planned"],
    ["Fight Night", "sweetnsour", "va311299", "", "", "Finalized", "2027-02-10", "1:00 PM", "Pool BO5", "Pool BO3", "CannonBlast BO3", "Finalized in Matchups, not on the Streams tab yet"],
    ["Bracket", "bella575", "Dionysius", "TakemyHand", "Momele31", "Agreed", "2027-02-25", "1:00 PM", "Bubble BO3", "Blocks BO3", "21 Jack BO5", "Waiting on a calendar hold"],
  ],
);

console.log("Sample standings");
for (const [index, [name, score]] of board.entries()) {
  console.log(
    `${String(index + 1).padStart(2, " ")}  ${name.padEnd(16)} ${String(score.points).padStart(3)} pts   ${score.counted}/20   played ${score.played}`,
  );
}
console.log(`sweetnsour played ${sweet.played}, counted ${sweet.counted}, points ${sweet.points}`);
