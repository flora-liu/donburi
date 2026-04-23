"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TYPE } from "@/lib/typography";

function TulipIcon() {
  return (
    <svg
      width="24"
      height="32"
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
      <TulipIcon />
      <span className="divider-line" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      localStorage.setItem(`player:${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) {
      setError("Enter your name and room code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: code.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      localStorage.setItem(`player:${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (view === "home") {
    return (
      <main
        className="flex flex-col items-center justify-center h-full px-6 fade-in"
        style={{ minHeight: "100dvh" }}
      >
        <div className="text-center mb-10">
          <h1
            style={{
              ...TYPE.display1,
              fontSize: "clamp(3rem, 11vw, 64px)",
              marginBottom: "0.5rem",
            }}
          >
            Fishbowl
          </h1>
          <p
            style={{
              ...TYPE.body,
              marginTop: "0.9rem",
              color: "var(--kraft)",
            }}
          >
            The ultimate party word game
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <h2 style={TYPE.stampLabel}>Host a new bowl</h2>
            <p style={TYPE.bodySm}>
              Gather 4–12 players. Submit words, then describe, act, and hint.
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                setView("create");
                setError("");
              }}
            >
              Create
            </button>
          </div>

          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <h2 style={TYPE.stampLabel}>Join my friends</h2>
            <button
              className="btn-ghost"
              onClick={() => {
                setView("join");
                setError("");
              }}
            >
              Join
            </button>
          </div>
        </div>

        <Divider />

        <p
          style={{ ...TYPE.bodySm, color: "var(--kraft)", textAlign: "center" }}
        >
          4+ players · 4 rounds
        </p>
      </main>
    );
  }

  return (
    <main
      className="flex flex-col h-full px-6 py-8 fade-in"
      style={{ minHeight: "100dvh" }}
    >
      <button
        style={{ ...TYPE.body, color: "var(--brown-mid)" }}
        className="self-start mb-8 flex items-center gap-2"
        onClick={() => {
          setView("home");
          setError("");
        }}
      >
        ← Back
      </button>

      <div className="flex flex-col items-center justify-center flex-1 gap-8">
        <div className="text-center">
          <h2 style={TYPE.display3}>
            {view === "create" ? "New Game" : "Join Game"}
          </h2>
        </div>

        <div className="card w-full max-w-sm flex flex-col gap-6">
          {view === "join" && (
            <div>
              <label style={TYPE.inputLabel}>Room Code</label>
              <input
                placeholder="XXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                autoCapitalize="characters"
                style={{ ...TYPE.body, textTransform: "uppercase" }}
              />
            </div>
          )}

          <div>
            <label style={TYPE.inputLabel}>Your Name</label>
            <input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (view === "create" ? handleCreate() : handleJoin())
              }
              autoFocus
              style={TYPE.body}
            />
          </div>

          {error && (
            <p
              style={{ ...TYPE.body, color: "var(--red)", textAlign: "center" }}
            >
              {error}
            </p>
          )}

          <button
            className="btn-primary"
            onClick={view === "create" ? handleCreate : handleJoin}
            disabled={loading}
          >
            {loading ? "..." : view === "create" ? "Create Room" : "Enter Room"}
          </button>
        </div>
      </div>
    </main>
  );
}
