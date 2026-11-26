import { assignSlugs, playerKey } from "./names";
import type { DirectoryPlayer, Round, Streamer } from "./types";

export function buildDirectory(streamers: Streamer[], rounds: Round[]): DirectoryPlayer[] {
  const byKey = new Map<string, DirectoryPlayer>();

  for (const streamer of streamers) {
    byKey.set(streamer.key, {
      key: streamer.key,
      name: streamer.name,
      slug: "",
      status: streamer.status,
      language: streamer.language,
      games: streamer.games,
      wildcards: streamer.wildcards,
      onRoster: true,
    });
  }

  const remember = (key: string, raw: string) => {
    if (!key || byKey.has(key)) return;
    byKey.set(key, {
      key,
      name: raw.trim(),
      slug: "",
      status: "",
      language: "",
      games: [],
      wildcards: [],
      onRoster: false,
    });
  };

  for (const round of rounds) {
    remember(round.playerAKey, round.playerARaw);
    remember(round.playerBKey, round.playerBRaw);
    if (round.winnerKey) remember(round.winnerKey, round.winnerRaw);
  }

  const players = [...byKey.values()];
  const slugs = assignSlugs(players.map((player) => ({ key: player.key, name: player.name })));
  for (const player of players) player.slug = slugs.get(player.key) ?? player.key;
  players.sort((a, b) => a.name.localeCompare(b.name));
  return players;
}

export function nameMap(players: DirectoryPlayer[]): Map<string, string> {
  return new Map(players.map((player) => [player.key, player.name]));
}

export function playerBySlug(players: DirectoryPlayer[], slug: string): DirectoryPlayer | undefined {
  const decoded = decodeURIComponent(slug).toLowerCase();
  return players.find((player) => player.slug === decoded || player.key === playerKey(decoded));
}
