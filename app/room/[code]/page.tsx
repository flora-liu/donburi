"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Pusher from "pusher-js";
import { Room, RoundType, Word } from "@/types/game";
import { getRoundName, getRoundRule, getTotalScore } from "@/lib/game-logic";
import { TYPE, teamBadge, FONT_STAMP } from "@/lib/typography";
import { TimerRing } from "@/components/TimerRing";
import confetti from "canvas-confetti";

const TURN_DURATION = 60;
const TEAM_LABELS = ["Team 1", "Team 2"];

function normalizeRoom(r: Room): Room {
  return {
    ...r,
    enabledRoundTypes: r.enabledRoundTypes?.length
      ? r.enabledRoundTypes
      : ["describe", "charades", "oneWord"],
    currentRoundIndex: r.currentRoundIndex ?? 0,
    scores: r.scores ?? [
      [0, 0, 0],
      [0, 0, 0],
    ],
  };
}

function TulipIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size * 0.75}
      height={size}
      viewBox="0 0 24 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 32 Q11 24 12 18"
        stroke="var(--brown-mid)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 20 Q10 16 12 18 Q14 16 16 20 Q14 26 12 24 Q10 26 8 20Z"
        fill="var(--linen)"
        stroke="var(--brown-mid)"
        strokeWidth="1"
      />
      <path
        d="M6 22 Q9 18 12 18"
        stroke="var(--linen)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 22 Q15 18 12 18"
        stroke="var(--linen)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="divider">
      <span className="divider-line" />
      <TulipIcon size={20} />
      <span className="divider-line" />
    </div>
  );
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerEndedRef = useRef(false);

  useEffect(() => {
    const id = localStorage.getItem(`player:${code}`);
    setPlayerId(id);
  }, [code]);

  useEffect(() => {
    fetch(`/api/room/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setRoom(normalizeRoom(data));
      })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    if (!playerId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      auth: { params: { user_id: playerId, user_name: "" } },
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`presence-room-${code}`);
    channel.bind("room-updated", (data: Room) => setRoom(normalizeRoom(data)));
    channel.bind("turn-started", () => {
      timerEndedRef.current = false;
      setCurrentWord(null);
    });
    channel.bind(
      "score-updated",
      (data: { scores: number[][]; bowlCount: number }) => {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                scores: data.scores,
                bowl: Array(data.bowlCount).fill(null),
              }
            : prev,
        );
      },
    );
    channel.bind("turn-ended", () => {
      setCurrentWord(null);
      if (timerRef.current) clearInterval(timerRef.current);
    });
    channel.bind("game-over", () => {
      confetti({
        particleCount: 200,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#8B3A2A", "#F2EDE3", "#E8E0CC", "#D9CFC0"],
      });
    });

    const privateChannel = pusher.subscribe(`private-player-${playerId}`);
    privateChannel.bind("word-drawn", (data: { word: Word }) => {
      setCurrentWord(data.word);
    });

    return () => {
      pusher.unsubscribe(`presence-room-${code}`);
      pusher.unsubscribe(`private-player-${playerId}`);
      pusher.disconnect();
    };
  }, [playerId, code]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!room?.turnStartedAt || !room.activePlayerId) return;

    const startAt = room.turnStartedAt;

    const tick = () => {
      const elapsed = (Date.now() - startAt) / 1000;
      const left = Math.max(0, TURN_DURATION - elapsed);
      setTimeLeft(Math.ceil(left));

      if (
        left <= 0 &&
        !timerEndedRef.current &&
        room.activePlayerId === playerId
      ) {
        timerEndedRef.current = true;
        clearInterval(timerRef.current!);
        handleEndTurn("timeout");
      }
    };
    tick();
    timerRef.current = setInterval(tick, 250);
    return () => clearInterval(timerRef.current!);
  }, [room?.turnStartedAt, room?.activePlayerId]);

  async function post(path: string, body: object) {
    setError("");
    const res = await fetch(`/api/room/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, playerId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Error");
    return data;
  }

  async function handleStartSubmission(
    wordsPerPerson: number,
    enabledRoundTypes: RoundType[],
  ) {
    setLoading(true);
    await post("start-submission", { wordsPerPerson, enabledRoundTypes });
    setLoading(false);
  }

  async function handleStartGame() {
    setLoading(true);
    await post("start-game", {});
    setLoading(false);
  }

  async function handleStartTurn() {
    setLoading(true);
    await post("start-turn", {});
    setLoading(false);
  }

  async function handleGuess() {
    if (!currentWord) return;
    await post("guess", { wordId: currentWord.id });
  }

  async function handleSkip() {
    if (!currentWord) return;
    await post("skip", { wordId: currentWord.id });
  }

  async function handleEndTurn(reason: "timeout" | "bowlEmpty" = "timeout") {
    await post("end-turn", { reason });
  }

  async function handleNextRound() {
    setLoading(true);
    await fetch("/api/room/next-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
  }

  async function handlePlayAgain() {
    setLoading(true);
    await fetch("/api/room/play-again", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
  }

  if (!room) {
    return (
      <div
        className="flex items-center justify-center fade-in"
        style={{ height: "100dvh" }}
      >
        <p style={TYPE.display4}>Loading…</p>
      </div>
    );
  }

  if (!playerId || !room.players.find((p) => p.id === playerId)) {
    return (
      <div
        className="flex flex-col items-center justify-center px-6"
        style={{ height: "100dvh" }}
      >
        <p style={{ ...TYPE.body, textAlign: "center" }}>
          You are not in this room. Please join from the home screen.
        </p>
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId)!;
  const isHost = room.hostId === playerId;
  const isActivePlayer = room.activePlayerId === playerId;
  const totalRounds = room.enabledRoundTypes?.length ?? 3;
  const currentRoundNumber = (room.currentRoundIndex ?? 0) + 1;

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* Top status strip */}
      <div
        style={{
          background: "var(--parchment)",
          borderBottom: "1px solid var(--linen)",
          padding: "8px 16px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ justifySelf: "start" }}>
          <span style={teamBadge}>{TEAM_LABELS[me.teamIndex]}</span>
        </span>
        <Link
          href="/"
          style={{
            ...TYPE.display1,
            fontSize: "22px",
            justifySelf: "center",
            textDecoration: "none",
          }}
        >
          Fishbowl
        </Link>
        <span style={{ justifySelf: "end" }}>
          {room.status === "playing" && (
            <span style={{ ...TYPE.stampHeading, color: "var(--brown-mid)" }}>
              Round {currentRoundNumber}/{totalRounds}
            </span>
          )}
        </span>
      </div>

      <div className="flex-1 flex flex-col px-5 py-4 max-w-lg mx-auto w-full">
        {error && (
          <div
            style={{
              background: "var(--parchment)",
              border: "1px solid var(--red)",
              borderRadius: "4px",
              padding: "8px 12px",
              marginBottom: "12px",
            }}
          >
            <p
              style={{
                ...TYPE.body,
                color: "var(--red)",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {room.status === "lobby" && (
          <LobbyPhase
            room={room}
            playerId={playerId}
            isHost={isHost}
            loading={loading}
            onStart={handleStartSubmission}
          />
        )}
        {room.status === "submitting" && (
          <SubmitPhase
            room={room}
            playerId={playerId}
            onSubmit={async (words) => {
              setLoading(true);
              await post("submit-words", { words });
              setLoading(false);
            }}
          />
        )}
        {room.status === "ready" && (
          <ReadyPhase room={room} loading={loading} onStart={handleStartGame} />
        )}
        {room.status === "playing" && (
          <PlayingPhase
            room={room}
            playerId={playerId}
            isActivePlayer={isActivePlayer}
            currentWord={currentWord}
            timeLeft={timeLeft}
            loading={loading}
            onStartTurn={handleStartTurn}
            onGuess={handleGuess}
            onSkip={handleSkip}
          />
        )}
        {room.status === "roundEnd" && (
          <RoundEndPhase
            room={room}
            loading={loading}
            onNext={handleNextRound}
          />
        )}
        {room.status === "gameOver" && (
          <GameOverPhase
            room={room}
            loading={loading}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>
    </div>
  );
}

// ─── Room code copy button ────────────────────────────────────────────────────

function RoomCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy room code"}
      style={{
        background: "var(--parchment)",
        border: "2.5px solid var(--red)",
        borderRadius: "4px",
        padding: "10px 18px",
        cursor: "pointer",
        transform: "rotate(-1deg)",
        display: "inline-flex",
        alignItems: "center",
        gap: "14px",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: FONT_STAMP,
          fontSize: "3rem",
          letterSpacing: "0.1rem",
          color: "var(--red)",
          textTransform: "uppercase",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {code}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "var(--red)",
          transition: "opacity 0.15s",
        }}
      >
        {copied ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="5 12 10 17 19 7" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        )}
      </span>
    </button>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

const ROUND_TYPE_OPTIONS: RoundType[] = ["describe", "charades", "oneWord"];

function LobbyPhase({
  room,
  playerId,
  isHost,
  loading,
  onStart,
}: {
  room: Room;
  playerId: string;
  isHost: boolean;
  loading: boolean;
  onStart: (wordsPerPerson: number, enabledRoundTypes: RoundType[]) => void;
}) {
  const [wordsPerPerson, setWordsPerPerson] = useState(room.wordsPerPerson);
  const [enabled, setEnabled] = useState<Set<RoundType>>(
    new Set(room.enabledRoundTypes),
  );

  function toggle(t: RoundType) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const enabledList = ROUND_TYPE_OPTIONS.filter((t) => enabled.has(t));

  return (
    <div className="flex flex-col gap-8 fade-in flex-1">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          paddingTop: "8px",
        }}
      >
        <p style={TYPE.inputLabel}>Tap code to copy & share</p>
        <RoomCodeButton code={room.code} />
      </div>

      <Divider />

      {[0, 1].map((teamIdx) => {
        const teamPlayers = room.players.filter((p) => p.teamIndex === teamIdx);
        return (
          <div key={teamIdx} className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span style={teamBadge}>{TEAM_LABELS[teamIdx]}</span>
              <span style={{ ...TYPE.body, color: "var(--kraft)" }}>
                {teamPlayers.length} player
                {teamPlayers.length !== 1 ? "s" : ""}
              </span>
            </div>
            {teamPlayers.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {teamPlayers.map((p) => {
                  const isMe = p.id === playerId;
                  const isHostPlayer = p.id === room.hostId;
                  const indicators = [
                    isMe && "You",
                    isHostPlayer && "Host",
                  ].filter(Boolean);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        border: "1.5px dashed var(--linen)",
                        borderRadius: "6px",
                      }}
                    >
                      <span
                        style={{ ...TYPE.body, color: "var(--brown-dark)" }}
                      >
                        {isMe ? "You" : p.name}
                      </span>
                      {indicators.length > 0 && (
                        <span
                          style={{
                            fontFamily: FONT_STAMP,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: isMe ? "var(--red)" : "var(--kraft)",
                          }}
                        >
                          {indicators.join(" · ")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p
                style={{
                  ...TYPE.body,
                  color: "var(--kraft)",
                }}
              >
                Waiting for players…
              </p>
            )}
          </div>
        );
      })}

      {isHost && (
        <>
          <div className="card">
            <p style={{ ...TYPE.stampLabel, marginBottom: "10px" }}>
              Words per person: {wordsPerPerson}
            </p>
            <input
              type="range"
              min={3}
              max={10}
              value={wordsPerPerson}
              onChange={(e) => setWordsPerPerson(Number(e.target.value))}
              style={{
                accentColor: "var(--red)",
                width: "100%",
                borderBottom: "none",
                padding: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                ...TYPE.bodySm,
                color: "var(--kraft)",
                marginTop: "4px",
              }}
            >
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <div className="card">
            <p style={{ ...TYPE.stampLabel, marginBottom: "12px" }}>Rounds</p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {ROUND_TYPE_OPTIONS.map((t) => (
                <label
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1.5px solid",
                    borderColor: enabled.has(t) ? "var(--red)" : "var(--linen)",
                    background: enabled.has(t)
                      ? "var(--parchment)"
                      : "transparent",
                    cursor: "pointer",
                    minHeight: "52px",
                  }}
                >
                  <span
                    style={{
                      ...TYPE.body,
                    }}
                  >
                    {getRoundName(t)}
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled.has(t)}
                    onChange={() => toggle(t)}
                    style={{
                      width: "auto",
                      borderBottom: "none",
                      padding: 0,
                      accentColor: "var(--red)",
                      cursor: "pointer",
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {!isHost && (
        <p style={{ ...TYPE.body, textAlign: "center" }}>
          Waiting for host to start...
        </p>
      )}

      {isHost && (
        <button
          className="btn-primary"
          onClick={() => onStart(wordsPerPerson, enabledList)}
          disabled={
            loading || room.players.length < 4 || enabledList.length === 0
          }
        >
          {room.players.length < 4
            ? `Need ${4 - room.players.length} more`
            : enabledList.length === 0
              ? "Pick at least 1 round"
              : loading
                ? "..."
                : "Everyone's In"}
        </button>
      )}
    </div>
  );
}

// ─── Word Submission ───────────────────────────────────────────────────────────

function SubmitPhase({
  room,
  playerId,
  onSubmit,
}: {
  room: Room;
  playerId: string;
  onSubmit: (words: string[]) => Promise<void>;
}) {
  const alreadySubmitted = room.submittedPlayerIds.includes(playerId);
  const [words, setWords] = useState<string[]>(
    Array(room.wordsPerPerson).fill(""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (words.some((w) => !w.trim())) {
      setError("Fill in all words");
      return;
    }
    setSubmitting(true);
    await onSubmit(words);
    setSubmitting(false);
  }

  const submitted = room.submittedPlayerIds.length;
  const total = room.players.length;

  if (alreadySubmitted) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 fade-in">
        <div className="card w-full text-center">
          <p style={TYPE.display4} className="mb-4">
            Submitted!
          </p>
          <p style={{ ...TYPE.bodySm, marginBottom: "10px" }}>
            {submitted} of {total} players submitted
          </p>
          <div
            style={{ height: "3px", background: "var(--linen)", width: "100%" }}
          >
            <div
              style={{
                height: "100%",
                background: "var(--red)",
                width: `${(submitted / total) * 100}%`,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
        <p style={{ ...TYPE.body, color: "var(--kraft)" }}>
          Waiting for everyone...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in flex-1">
      <div className="text-center mt-4">
        <h2 style={TYPE.display3}>Your Words</h2>
        <p style={{ ...TYPE.bodySm, color: "var(--kraft)", marginTop: "4px" }}>
          People, places, things, memories, movies...
        </p>
      </div>

      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "0" }}
      >
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              borderBottom:
                i < words.length - 1 ? "1px solid var(--linen)" : "none",
              paddingBottom: "4px",
              paddingTop: i === 0 ? 0 : "4px",
            }}
          >
            <span className="stamp-num" style={{ paddingBottom: "8px" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <input
              placeholder={`Word ${i + 1}`}
              value={w}
              onChange={(e) => {
                const next = [...words];
                next[i] = e.target.value;
                setWords(next);
              }}
              maxLength={40}
              style={TYPE.body}
            />
          </div>
        ))}
      </div>

      {error && (
        <p style={{ ...TYPE.body, color: "var(--red)", textAlign: "center" }}>
          {error}
        </p>
      )}

      <div
        style={{ ...TYPE.bodySm, color: "var(--kraft)", textAlign: "center" }}
      >
        {submitted} / {total} submitted
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "..." : "Submit Words"}
      </button>
    </div>
  );
}

// ─── Ready ────────────────────────────────────────────────────────────────────

function ReadyPhase({
  room,
  loading,
  onStart,
}: {
  room: Room;
  loading: boolean;
  onStart: () => void;
}) {
  const firstRoundType = room.enabledRoundTypes[0];
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 fade-in">
      <div style={{ textAlign: "center" }}>
        <p style={{ ...TYPE.stampHeading, color: "var(--kraft)" }}>
          Round 1 of {room.enabledRoundTypes.length}
        </p>
        <p style={{ ...TYPE.display3, marginTop: "4px" }}>
          {getRoundName(firstRoundType)}
        </p>
      </div>

      <div className="card w-full">
        <p style={TYPE.body}>{getRoundRule(firstRoundType)}</p>
      </div>

      <div
        style={{ ...TYPE.bodySm, color: "var(--kraft)", textAlign: "center" }}
      >
        {room.bowl.length} words in the bowl
      </div>

      <button className="btn-primary" onClick={onStart} disabled={loading}>
        {loading ? "..." : "Start Game"}
      </button>
    </div>
  );
}

// ─── Playing ─────────────────────────────────────────────────────────────────

function PlayingPhase({
  room,
  playerId,
  isActivePlayer,
  currentWord,
  timeLeft,
  loading,
  onStartTurn,
  onGuess,
  onSkip,
}: {
  room: Room;
  playerId: string;
  isActivePlayer: boolean;
  currentWord: Word | null;
  timeLeft: number;
  loading: boolean;
  onStartTurn: () => void;
  onGuess: () => void;
  onSkip: () => void;
}) {
  const bowlCount = room.bowl.length;
  const roundType = room.enabledRoundTypes[room.currentRoundIndex];
  const canSkip = !room.skippedWordId && bowlCount > 1;

  const activePlayer = room.players.find((p) => p.id === room.activePlayerId);
  const activeTeam = room.currentTeamIndex;

  if (!room.activePlayerId) {
    const team0 = room.players.filter((p) => p.teamIndex === 0);
    const team1 = room.players.filter((p) => p.teamIndex === 1);
    const currentTeam = room.currentTeamIndex === 0 ? team0 : team1;
    const currentActivePlayer =
      currentTeam[room.teamTurnIndices[room.currentTeamIndex]];
    const isMyTurn = currentActivePlayer?.id === playerId;

    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5 fade-in">
        <RoundBanner
          roundNumber={room.currentRoundIndex + 1}
          type={roundType}
        />

        <ScoreDisplay room={room} />

        <div className="card w-full text-center">
          <span
            style={{
              ...teamBadge,
              marginBottom: "6px",
              display: "inline-block",
            }}
          >
            {TEAM_LABELS[activeTeam]}
          </span>
          <p
            style={{
              ...TYPE.display3,
              fontStyle: "italic",
              color: "var(--red)",
              marginTop: "20px",
            }}
          >
            {currentActivePlayer?.name ?? "?"}
          </p>
          <p
            style={{ ...TYPE.bodySm, color: "var(--kraft)", marginTop: "12px" }}
          >
            is up next · {bowlCount} word{bowlCount !== 1 ? "s" : ""} left
          </p>
        </div>

        {isMyTurn ? (
          <button
            className="btn-primary"
            onClick={onStartTurn}
            disabled={loading}
          >
            {loading ? "..." : "It's My Turn"}
          </button>
        ) : (
          <p style={{ ...TYPE.body, textAlign: "center" }}>
            Waiting for {currentActivePlayer?.name}...
          </p>
        )}
      </div>
    );
  }

  // Active player giving clues
  if (isActivePlayer) {
    return (
      <div
        className="flex flex-col flex-1 fade-in"
        style={{ gap: 0, minHeight: 0 }}
      >
        <RoundBanner
          roundNumber={room.currentRoundIndex + 1}
          type={roundType}
        />

        <div
          className="flex-1 flex flex-col items-center"
          style={{
            background: "var(--parchment)",
            border: "1.5px solid var(--linen)",
            borderRadius: "4px",
            margin: "16px 0",
            boxShadow:
              "2px 3px 0px var(--linen), 4px 6px 12px rgba(46,26,20,0.08)",
            padding: "20px",
          }}
        >
          <TimerRing seconds={timeLeft} total={TURN_DURATION} />
          <div
            className="flex-1 flex items-center justify-center"
            style={{ width: "100%", padding: "16px 0" }}
          >
            {currentWord ? (
              <p className="active-word">{currentWord.text}</p>
            ) : (
              <p style={{ ...TYPE.body, color: "var(--kraft)" }}>Loading...</p>
            )}
          </div>
          <span style={{ ...TYPE.bodySm, color: "var(--kraft)" }}>
            {bowlCount} words left
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
          <button
            className="btn-primary"
            style={{ flex: 2 }}
            onClick={onGuess}
            disabled={!currentWord}
          >
            Got It ✓
          </button>
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={onSkip}
            disabled={!currentWord || !canSkip}
          >
            Skip ⟳
          </button>
        </div>
      </div>
    );
  }

  // Spectator view
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 fade-in">
      <RoundBanner roundNumber={room.currentRoundIndex + 1} type={roundType} />

      <div className="card w-full text-center">
        <span
          style={{ ...teamBadge, marginBottom: "8px", display: "inline-block" }}
        >
          {TEAM_LABELS[activeTeam]}
        </span>
        <p
          style={{ ...TYPE.body, fontWeight: 500, color: "var(--brown-dark)" }}
        >
          {activePlayer?.name}
        </p>
        <p style={{ ...TYPE.bodySm, color: "var(--kraft)", marginTop: "4px" }}>
          is giving clues
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "12px",
          }}
        >
          <TimerRing seconds={timeLeft} total={TURN_DURATION} />
        </div>
      </div>

      <ScoreDisplay room={room} />

      <p style={{ ...TYPE.bodySm, color: "var(--kraft)" }}>
        {bowlCount} word{bowlCount !== 1 ? "s" : ""} remaining in bowl
      </p>
    </div>
  );
}

// ─── Round End ────────────────────────────────────────────────────────────────

function RoundEndPhase({
  room,
  loading,
  onNext,
}: {
  room: Room;
  loading: boolean;
  onNext: () => void;
}) {
  const totalRounds = room.enabledRoundTypes.length;
  const currentRoundNumber = room.currentRoundIndex + 1;
  const nextIndex = room.currentRoundIndex + 1;
  const nextType = room.enabledRoundTypes[nextIndex];
  const currentType = room.enabledRoundTypes[room.currentRoundIndex];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: "20px",
      }}
      className="fade-in"
    >
      <div
        style={{
          background: "var(--brown-mid)",
          padding: "24px 32px",
          borderRadius: "4px",
          textAlign: "center",
          width: "100%",
          marginBottom: "4px",
        }}
      >
        <p
          style={{
            ...TYPE.stampHeading,
            color: "var(--cream)",
          }}
        >
          End of round {currentRoundNumber}
        </p>
        <p
          style={{ ...TYPE.display3, color: "var(--cream)", marginTop: "4px" }}
        >
          {getRoundName(currentType)}
        </p>
      </div>

      <div className="card w-full">
        <p style={{ ...TYPE.stampLabel, marginBottom: "14px" }}>Scores</p>
        {[0, 1].map((t) => (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span style={teamBadge}>{TEAM_LABELS[t]}</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {room.scores[t].map((s, r) => (
                <span
                  key={r}
                  style={{
                    ...TYPE.body,
                    fontSize: "13px",
                    padding: "2px 6px",
                    background:
                      r <= room.currentRoundIndex
                        ? "var(--linen)"
                        : "transparent",
                    color:
                      r <= room.currentRoundIndex
                        ? "var(--brown-dark)"
                        : "var(--kraft)",
                    borderRadius: "3px",
                  }}
                >
                  {r <= room.currentRoundIndex ? s : "—"}
                </span>
              ))}
              <span
                style={{
                  ...TYPE.stampLabel,
                  fontSize: "16px",
                  color: "var(--brown-dark)",
                  marginLeft: "6px",
                }}
              >
                {room.scores[t]
                  .slice(0, room.currentRoundIndex + 1)
                  .reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {nextType && (
        <div className="card w-full">
          <p
            style={{
              ...TYPE.stampLabel,
              color: "var(--red)",
              marginBottom: "4px",
            }}
          >
            Round {nextIndex + 1} of {totalRounds}
          </p>
          <p style={TYPE.display3}>{getRoundName(nextType)}</p>
          <p style={{ ...TYPE.body, marginTop: "6px" }}>
            {getRoundRule(nextType)}
          </p>
        </div>
      )}

      <button className="btn-primary" onClick={onNext} disabled={loading}>
        {loading
          ? "..."
          : nextType
            ? `Start Round ${nextIndex + 1}`
            : "Final Results"}
      </button>
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────

function GameOverPhase({
  room,
  loading,
  onPlayAgain,
}: {
  room: Room;
  loading: boolean;
  onPlayAgain: () => void;
}) {
  const totals = [getTotalScore(room.scores, 0), getTotalScore(room.scores, 1)];
  const winner = totals[0] > totals[1] ? 0 : totals[1] > totals[0] ? 1 : -1;
  const roundCount = room.enabledRoundTypes.length;
  const colWidth = `${Math.max(28, 80 / roundCount)}px`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: "20px",
      }}
      className="fade-in"
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ ...TYPE.stampHeading, color: "var(--kraft)" }}>
          Final Results
        </p>
        <p style={{ ...TYPE.display3, marginTop: "4px" }}>
          {winner >= 0 ? `${TEAM_LABELS[winner]} wins!` : "It's a tie!"}
        </p>
      </div>

      <div className="card w-full">
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }} />
          {room.enabledRoundTypes.map((_, r) => (
            <div
              key={r}
              style={{
                width: colWidth,
                textAlign: "center",
                ...TYPE.stampHeading,
                fontSize: "12px",
                color: "var(--kraft)",
              }}
            >
              Round {r + 1}
            </div>
          ))}
          <div
            style={{
              width: "40px",
              textAlign: "right",
              ...TYPE.stampHeading,
              fontSize: "12px",
              color: "var(--kraft)",
            }}
          >
            Total
          </div>
        </div>

        <div
          style={{
            height: "1px",
            background: "var(--linen)",
            marginBottom: "10px",
          }}
        />

        {[0, 1].map((t) => (
          <div
            key={t}
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={teamBadge}>{TEAM_LABELS[t]}</span>
            </div>
            {room.scores[t].map((s, r) => (
              <div
                key={r}
                style={{
                  width: colWidth,
                  textAlign: "center",
                  ...TYPE.body,
                  color: "var(--brown-dark)",
                }}
              >
                {s}
              </div>
            ))}
            <div
              style={{
                width: "40px",
                textAlign: "right",
                ...TYPE.body,
                color: winner === t ? "var(--red)" : "var(--brown-dark)",
              }}
            >
              {totals[t]}
            </div>
          </div>
        ))}

        <div
          style={{ height: "1px", background: "var(--linen)", margin: "4px 0" }}
        />
      </div>

      <button className="btn-primary" onClick={onPlayAgain} disabled={loading}>
        {loading ? "..." : "Play Again"}
      </button>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function RoundBanner({
  roundNumber,
  type,
}: {
  roundNumber: number;
  type: RoundType;
}) {
  return (
    <div
      style={{
        padding: "14px 20px",
        textAlign: "center",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        flexShrink: 0,
      }}
    >
      <div style={TYPE.stampHeading}>Round {roundNumber}</div>
      <div
        style={{
          ...TYPE.display3,
          color: "var(--brown-mid)",
        }}
      >
        {getRoundName(type)}
      </div>
    </div>
  );
}

function ScoreDisplay({ room }: { room: Room }) {
  return (
    <div style={{ display: "flex", gap: "10px", width: "100%" }}>
      {[0, 1].map((t) => (
        <div
          key={t}
          style={{
            flex: 1,
            borderRadius: "4px",
            padding: "10px",
            textAlign: "center",
            background: "var(--parchment)",
            border: "1.5px solid var(--linen)",
            color: "var(--brown-dark)",
          }}
        >
          <p style={{ ...TYPE.stampHeading, opacity: 0.8 }}>{TEAM_LABELS[t]}</p>
          <p style={{ ...TYPE.display3, margin: "4px 0" }}>
            {getTotalScore(room.scores, t)}
          </p>
          <p style={{ ...TYPE.bodySm, color: "var(--kraft)" }}>
            Round {room.currentRoundIndex + 1}:{" "}
            {room.scores[t][room.currentRoundIndex] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}
