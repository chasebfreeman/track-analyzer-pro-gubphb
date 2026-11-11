// constants/nhraTracks.ts
//
// Canonical NHRA national-event venues. Names are the short venue names
// (no title sponsors) so they stay stable when sponsorships change.
// Location is the venue's actual city, formatted "City, ST".
// Source: 2026 NHRA Mission Foods Drag Racing Series schedule.

export interface NhraTrack {
  /** Canonical venue name saved to tracks.name */
  name: string;
  /** "City, ST" saved to tracks.location */
  location: string;
  /** Usual national event(s) at this venue, shown as a hint */
  events: string[];
  /** Nicknames and common shorthand people type ("Indy", "Thunder Valley") */
  aliases: string[];
}

export const NHRA_TRACKS: NhraTrack[] = [
  { name: 'Gainesville Raceway', location: 'Gainesville, FL', events: ['Gatornationals'], aliases: ['gainesville', 'gators'] },
  { name: 'Firebird Motorsports Park', location: 'Chandler, AZ', events: ['Arizona Nationals'], aliases: ['phoenix', 'firebird', 'wild horse pass', 'chandler'] },
  { name: 'Pomona Dragstrip', location: 'Pomona, CA', events: ['Winternationals', 'Finals'], aliases: ['pomona', 'in-n-out', 'auto club', 'winternationals', 'world finals'] },
  { name: 'zMAX Dragway', location: 'Concord, NC', events: ['4-Wide Nationals'], aliases: ['zmax', 'z max', 'charlotte', 'concord', '4-wide', '4 wide'] },
  { name: 'South Georgia Motorsports Park', location: 'Adel, GA', events: ['Southern Nationals'], aliases: ['south georgia', 'adel', 'sgmp', 'valdosta'] },
  { name: 'Route 66 Raceway', location: 'Joliet, IL', events: ['Route 66 Nationals'], aliases: ['route 66', 'chicago', 'joliet'] },
  { name: 'Maryland International Raceway', location: 'Mechanicsville, MD', events: ['Potomac Nationals'], aliases: ['maryland', 'mir', 'mechanicsville', 'budds creek'] },
  { name: 'New England Dragway', location: 'Epping, NH', events: ['New England Nationals'], aliases: ['new england', 'epping'] },
  { name: 'Bristol Dragway', location: 'Bristol, TN', events: ['Thunder Valley Nationals'], aliases: ['bristol', 'thunder valley'] },
  { name: 'Summit Motorsports Park', location: 'Norwalk, OH', events: ['Summit Racing Equipment Nationals'], aliases: ['norwalk', 'summit'] },
  { name: 'Sonoma Raceway', location: 'Sonoma, CA', events: ['Sonoma Nationals'], aliases: ['sonoma', 'sears point'] },
  { name: 'Pacific Raceways', location: 'Kent, WA', events: ['Northwest Nationals'], aliases: ['seattle', 'kent', 'pacific'] },
  { name: 'Brainerd International Raceway', location: 'Brainerd, MN', events: ['Brainerd Nationals'], aliases: ['brainerd', 'bir'] },
  { name: 'Indianapolis Raceway Park', location: 'Brownsburg, IN', events: ['U.S. Nationals'], aliases: ['indy', 'indianapolis', 'irp', 'lucas oil', 'brownsburg', 'us nationals', 'u.s. nationals'] },
  { name: 'US 131 Motorsports Park', location: 'Martin, MI', events: ['Great Lakes Nationals'], aliases: ['us 131', 'u.s. 131', '131', 'martin', 'michigan'] },
  { name: 'Rockingham Dragway', location: 'Rockingham, NC', events: ['Nationals at The Rock'], aliases: ['rockingham', 'the rock'] },
  { name: 'World Wide Technology Raceway', location: 'Madison, IL', events: ['Midwest Nationals'], aliases: ['st. louis', 'st louis', 'gateway', 'wwt', 'wwtr', 'madison'] },
  { name: 'Texas Motorplex', location: 'Ennis, TX', events: ['FallNationals'], aliases: ['ennis', 'dallas', 'motorplex'] },
  { name: 'Las Vegas Motor Speedway', location: 'Las Vegas, NV', events: ['Las Vegas Nationals'], aliases: ['vegas', 'las vegas', 'the strip', 'lvms'] },
  { name: 'Maple Grove Raceway', location: 'Mohnton, PA', events: ['Reading Nationals'], aliases: ['maple grove', 'reading', 'mohnton'] },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Find NHRA venues matching free text (name, city, event, or nickname).
 * Returns at most `limit` results, best matches first.
 */
export function searchNhraTracks(query: string, limit = 5): NhraTrack[] {
  const q = norm(query);
  if (q.length < 2) return [];

  const scored = NHRA_TRACKS.map((track) => {
    const name = norm(track.name);
    const haystack = [track.location, ...track.events, ...track.aliases].map(norm);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (haystack.some((h) => h === q)) score = 70;
    else if (haystack.some((h) => h.startsWith(q))) score = 50;
    else if (name.includes(q) || haystack.some((h) => h.includes(q))) score = 30;
    return { track, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.track);
}

/** Exact NHRA venue for a typed name (case/spacing-insensitive), if any. */
export function findNhraTrack(name: string): NhraTrack | undefined {
  const q = norm(name);
  return NHRA_TRACKS.find((t) => norm(t.name) === q || t.aliases.some((a) => norm(a) === q));
}

/** Trim and collapse whitespace in a free-typed track name or location. */
export function tidyText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Build the stored track name from a venue and an optional tag, e.g. "Pomona Dragstrip – Finals". */
export function buildTrackName(venue: string, tag?: string): string {
  const v = tidyText(venue);
  const t = tidyText(tag ?? '');
  return t ? `${v} – ${t}` : v;
}
