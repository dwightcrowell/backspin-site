export function playerKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "player";
}

export function assignSlugs(players: { key: string; name: string }[]): Map<string, string> {
  const slugs = new Map<string, string>();
  const used = new Map<string, string>();
  const ordered = [...players].sort((a, b) => a.key.localeCompare(b.key) || a.name.localeCompare(b.name));
  for (const player of ordered) {
    let slug = slugify(player.name);
    if (!used.has(slug)) {
      used.set(slug, player.key);
      slugs.set(player.key, slug);
      continue;
    }
    if (used.get(slug) === player.key) {
      slugs.set(player.key, slug);
      continue;
    }
    let suffix = 2;
    while (used.has(`${slug}-${suffix}`)) suffix += 1;
    const unique = `${slug}-${suffix}`;
    used.set(unique, player.key);
    slugs.set(player.key, unique);
  }
  return slugs;
}
