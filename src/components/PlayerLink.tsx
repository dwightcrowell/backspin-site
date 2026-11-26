import { Link } from "react-router-dom";
import { useData } from "../data/context";
import { withSeason, useSeason } from "../hooks";
import { playerKey, slugify } from "../lib/names";

export function PlayerLink({ name, className = "" }: { name: string; className?: string }) {
  const { seasonId } = useSeason();
  const { players } = useData();
  const key = playerKey(name);
  const player = players.find((item) => item.key === key);
  const slug = player?.slug ?? slugify(name);
  return (
    <Link className={`player-link ${className}`.trim()} to={withSeason(`/players/${slug}`, seasonId)}>
      {player?.name ?? name}
    </Link>
  );
}
