import { Room, Player, Word, RoundType } from "@/types/game";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function assignTeam(players: Player[]): number {
  return players.length % 2;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawWord(
  bowl: Word[],
  skippedWordId: string | null,
): Word | null {
  const available = skippedWordId
    ? bowl.filter((w) => w.id !== skippedWordId)
    : bowl;
  if (available.length === 0) {
    if (bowl.length > 0) return bowl[0];
    return null;
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function getTeamPlayers(players: Player[], teamIndex: number): Player[] {
  return players.filter((p) => p.teamIndex === teamIndex);
}

export function nextTeamTurnIndex(room: Room, teamIndex: number): number {
  const team = getTeamPlayers(room.players, teamIndex);
  if (team.length === 0) return 0;
  return (room.teamTurnIndices[teamIndex] + 1) % team.length;
}

export function getCurrentActivePlayer(room: Room): Player | null {
  const team = getTeamPlayers(room.players, room.currentTeamIndex);
  if (team.length === 0) return null;
  const idx = room.teamTurnIndices[room.currentTeamIndex];
  return team[idx] ?? null;
}

export function createInitialScores(
  teamCount: number,
  roundCount: number,
): number[][] {
  return Array.from({ length: teamCount }, () => Array(roundCount).fill(0));
}

export const DEFAULT_ROUND_TYPES: RoundType[] = [
  "describe",
  "charades",
  "oneWord",
];

export function getRoundName(type: RoundType): string {
  const names: Record<RoundType, string> = {
    describe: "Describe It",
    charades: "Charades",
    oneWord: "One Word Only",
  };
  return names[type];
}

export function getRoundRule(type: RoundType): string {
  const rules: Record<RoundType, string> = {
    describe:
      "Use words to describe the word or phrase, no acting or gestures. Don’t use any part of the word itself & no spelling out!",
    charades:
      "Without speaking or sounds, act and use gestures to communicate the word or phrase.",
    oneWord:
      "Give exactly one word as your clue—nothing more. Choose carefully and wisely!",
  };
  return rules[type];
}

export function getTotalScore(scores: number[][], teamIndex: number): number {
  return (scores[teamIndex] ?? []).reduce((a, b) => a + b, 0);
}
