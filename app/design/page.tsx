"use client";

import { useState } from "react";
import Link from "next/link";
import { FONT_BODY, FONT_DISPLAY, FONT_STAMP } from "@/lib/typography";
import { TimerRing } from "@/components/TimerRing";

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS: { name: string; token: string; hex: string; usage: string }[] = [
  { name: "Cream", token: "--cream", hex: "#F2EDE3", usage: "Page background" },
  {
    name: "Parchment",
    token: "--parchment",
    hex: "#F5F2EB",
    usage: "Default card background",
  },
  {
    name: "Parchment deep",
    token: "--parchment-deep",
    hex: "#E8E0CC",
    usage: "Accent / special card background, stamped elements",
  },
  {
    name: "Red",
    token: "--red",
    hex: "#8B3A2A",
    usage: "Primary accent, buttons, team I, active states",
  },
  {
    name: "Red light",
    token: "--red-light",
    hex: "#C0503C",
    usage: "Hover / secondary red",
  },
  {
    name: "Brown dark",
    token: "--brown-dark",
    hex: "#2E1A14",
    usage: "Primary text, display type",
  },
  {
    name: "Brown mid",
    token: "--brown-mid",
    hex: "#6B4035",
    usage: "Body text, secondary labels",
  },
  {
    name: "Linen",
    token: "--linen",
    hex: "#D9CFC0",
    usage: "Borders, dividers, subtle fills",
  },
  {
    name: "Kraft",
    token: "--kraft",
    hex: "#B8A898",
    usage: "Muted text, placeholders, captions",
  },
];

// ─── Type scale ───────────────────────────────────────────────────────────────

type TypeEntry = {
  name: string;
  family: string;
  rule: string;
  sample: string;
  style: React.CSSProperties;
  usage: string;
};

const DISPLAY_SCALE: TypeEntry[] = [
  {
    name: "display/1",
    family: "Fraunces 300 italic",
    rule: "64px · weight 300 · italic · tracking -0.04em",
    sample: "Fishbowl",
    usage: 'App logo ("Fishbowl"). Only on the home screen.',
    style: {
      fontFamily: FONT_DISPLAY,
      fontSize: "64px",
      fontWeight: 300,
      fontStyle: "italic",
      letterSpacing: "-0.04em",
      color: "var(--brown-dark)",
      lineHeight: 1.1,
    },
  },
  {
    name: "display/2",
    family: "Fraunces 300",
    rule: "48px · weight 300 · tracking -0.03em",
    sample: "Fishbowl",
    usage: "Active word during a turn, round names on round-intro cards.",
    style: {
      fontFamily: FONT_DISPLAY,
      fontSize: "48px",
      fontWeight: 300,
      letterSpacing: "-0.03em",
      color: "var(--brown-dark)",
      lineHeight: 1.15,
    },
  },
  {
    name: "display/3",
    family: "Fraunces 300",
    rule: "32px · weight 300 · tracking -0.02em",
    sample: "Built for real teams.",
    usage: "Section-level headlines, subtitles.",
    style: {
      fontFamily: FONT_DISPLAY,
      fontSize: "32px",
      fontWeight: 300,
      letterSpacing: "-0.02em",
      color: "var(--brown-dark)",
      lineHeight: 1.2,
    },
  },
  {
    name: "display/4",
    family: "Fraunces 500 italic",
    rule: "22px · weight 500 · italic · tracking -0.015em",
    sample: "A quiet confidence.",
    usage: "Small display — supporting display type, pull quotes.",
    style: {
      fontFamily: FONT_DISPLAY,
      fontSize: "22px",
      fontWeight: 500,
      fontStyle: "italic",
      letterSpacing: "-0.015em",
      color: "var(--brown-dark)",
      lineHeight: 1.3,
    },
  },
];

const UI_SCALE: TypeEntry[] = [
  {
    name: "stamp heading",
    family: "Big Bird Standard",
    rule: "uppercase · 16px · color brown-dark",
    sample: "NEW GAME",
    usage: "Section headings, page titles, card labels.",
    style: {
      fontFamily: FONT_STAMP,
      textTransform: "uppercase",
      fontSize: "16px",
      color: "var(--brown-dark)",
    },
  },
  {
    name: "stamp label",
    family: "Fraunces 300",
    rule: "18px · weight 300 · tracking -0.015em · line-height 1.3",
    sample: "Players",
    usage: "Card section labels, team badges, round indicator.",
    style: {
      fontFamily: FONT_DISPLAY,
      fontSize: "18px",
      fontWeight: 300,
      letterSpacing: "-0.015em",
      color: "var(--brown-dark)",
      lineHeight: 1.3,
    },
  },
  {
    name: "body/lg",
    family: "Geist Mono 400",
    rule: "17px · weight 400 · line-height 1.5",
    sample:
      "Huddle brings your team into one space for quick conversations and deeper work.",
    usage: "Prominent body — intro paragraphs, hero copy.",
    style: {
      fontFamily: FONT_BODY,
      fontSize: "17px",
      fontWeight: 400,
      lineHeight: 1.5,
      color: "var(--brown-mid)",
    },
  },
  {
    name: "input label",
    family: "Geist Mono",
    rule: "uppercase · tracking 0.1em · 12px · color kraft",
    sample: "ROOM CODE",
    usage: "Labels above form inputs, column headers, small meta labels.",
    style: {
      fontFamily: FONT_BODY,
      fontSize: "12px",
      color: "var(--kraft)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    },
  },
  {
    name: "body",
    family: "Geist Mono 400",
    rule: "14px · weight 400 · line-height 1.55",
    sample:
      "This is the default text size — used for running copy, list items, and most interface surfaces.",
    usage: "Default text. Running copy, UI, list items, captions.",
    style: {
      fontFamily: FONT_BODY,
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: 1.55,
      color: "var(--brown-mid)",
    },
  },
  {
    name: "body/sm",
    family: "Geist Mono 400",
    rule: "12.5px · weight 400 · line-height 1.5",
    sample: "Secondary text, captions, and metadata.",
    usage: "Secondary info, captions, metadata.",
    style: {
      fontFamily: FONT_BODY,
      fontSize: "12.5px",
      fontWeight: 400,
      lineHeight: 1.5,
      color: "var(--brown-mid)",
    },
  },
  {
    name: "label",
    family: "Geist Mono 400",
    rule: "14px · weight 400 · color brown-dark",
    sample: "Section · Eyebrow · Category",
    usage: "Eyebrows, categories, bolder small labels.",
    style: {
      fontFamily: FONT_BODY,
      fontSize: "14px",
      fontWeight: 400,
      color: "var(--brown-dark)",
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: FONT_STAMP,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        fontSize: "0.85rem",
        color: "var(--brown-dark)",
        marginBottom: "1rem",
      }}
    >
      {children}
    </h2>
  );
}

function RoomCodeButton({ code = "NG5QK" }: { code?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="5 12 10 17 19 7" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        )}
      </span>
    </button>
  );
}

function TypeCard({ entry }: { entry: TypeEntry }) {
  return (
    <div className="card">
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "baseline",
            marginBottom: "4px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: FONT_STAMP,
              textTransform: "uppercase",
              fontSize: "0.8rem",
              color: "var(--brown-dark)",
            }}
          >
            {entry.name}
          </span>
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: "0.7rem",
              color: "var(--kraft)",
            }}
          >
            {entry.family}
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: "0.72rem",
            color: "var(--brown-mid)",
            lineHeight: 1.5,
          }}
        >
          {entry.rule}
        </div>
      </div>
      <div
        style={{
          padding: "16px",
          background: "var(--cream)",
          border: "1px dashed var(--linen)",
          borderRadius: "3px",
          marginBottom: "10px",
        }}
      >
        <div style={entry.style}>{entry.sample}</div>
      </div>
    </div>
  );
}

function CodeTag({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: FONT_BODY,
        fontSize: "0.7rem",
        background: "var(--linen)",
        color: "var(--brown-dark)",
        padding: "2px 6px",
        borderRadius: "3px",
      }}
    >
      {children}
    </code>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "2rem 1.25rem 4rem",
        maxWidth: "680px",
        margin: "0 auto",
      }}
    >
      <style>{`
        main input::placeholder {
          font-style: normal;
          font-family: var(--font-geist), sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--kraft);
          text-transform: none;
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <Link
          href="/"
          style={{
            fontFamily: FONT_BODY,
            fontSize: "0.8rem",
            color: "var(--brown-mid)",
            textDecoration: "none",
          }}
        >
          ← Back to app
        </Link>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(2.5rem, 9vw, 56px)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            color: "var(--brown-dark)",
            marginTop: "1rem",
            marginBottom: "0.5rem",
            lineHeight: 1.1,
          }}
        >
          Design System
        </h1>
        <p
          style={{
            fontFamily: FONT_BODY,
            color: "var(--brown-mid)",
            fontSize: "0.9rem",
            marginTop: "0.8rem",
            lineHeight: 1.6,
          }}
        >
          Vintage paper archive — warm, tactile, analog. Every surface is a slip
          of parchment, every label a rubber stamp, every heading a letter
          pressed in ink.
        </p>
      </div>

      {/* ── Colors ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Colors</SectionHeader>
        <div className="card">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {COLORS.map((c) => (
              <div
                key={c.token}
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: c.hex,
                    border: "1.5px solid var(--linen)",
                    borderRadius: "3px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_STAMP,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        color: "var(--brown-dark)",
                      }}
                    >
                      {c.name}
                    </span>
                    <CodeTag>{c.token}</CodeTag>
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: "0.7rem",
                        color: "var(--kraft)",
                      }}
                    >
                      {c.hex}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: "0.78rem",
                      color: "var(--brown-mid)",
                    }}
                  >
                    {c.usage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Typography ────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Fraunces · Display</SectionHeader>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "2rem",
          }}
        >
          {DISPLAY_SCALE.map((t) => (
            <TypeCard key={t.name} entry={t} />
          ))}
        </div>

        <SectionHeader>Geist Mono · Body &amp; UI</SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {UI_SCALE.map((t) => (
            <TypeCard key={t.name} entry={t} />
          ))}
        </div>
      </section>

      {/* ── Buttons ───────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Buttons</SectionHeader>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Primary
            </span>
            <CodeTag>{" .btn-primary"}</CodeTag>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
            <button className="btn-primary" style={{ flex: 1 }}>
              Create
            </button>
            <button className="btn-primary" style={{ flex: 1 }} disabled>
              Disabled
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Ghost
            </span>
            <CodeTag>{" .btn-ghost"}</CodeTag>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
            <button className="btn-ghost" style={{ flex: 1 }}>
              Join
            </button>
            <button className="btn-ghost" style={{ flex: 1 }} disabled>
              Disabled
            </button>
          </div>
        </div>
      </section>

      {/* ── Cards / surfaces ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Surfaces</SectionHeader>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Card / paper slip
            </span>
            <CodeTag>{" .card"}</CodeTag>
          </div>
          <div
            style={{
              padding: "12px",
              background: "var(--cream)",
              border: "1px dashed var(--linen)",
              borderRadius: "3px",
            }}
          >
            <div className="card" style={{ background: "var(--parchment)" }}>
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: "0.85rem",
                  color: "var(--brown-mid)",
                }}
              >
                Cards are parchment-colored rectangles with a thin linen border,
                a 3px radius, and a subtle stacked shadow that reads as paper
                lifted off paper.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Divider
            </span>
            <CodeTag>{" .divider"}</CodeTag>
          </div>
          <div className="divider">
            <span className="divider-line" />
            <svg width="18" height="24" viewBox="0 0 24 32" fill="none">
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
            <span className="divider-line" />
          </div>
        </div>
      </section>

      {/* ── Forms ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Forms</SectionHeader>
        <div className="card">
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                fontFamily: FONT_BODY,
                fontSize: "0.7rem",
                color: "var(--kraft)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Your Name
            </label>
            <input
              placeholder="Enter your name"
              defaultValue=""
              style={{
                textAlign: "left",
                fontFamily: FONT_BODY,
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.55,
                color: "var(--brown-mid)",
              }}
            />
          </div>
          <div style={{ marginBottom: "4px" }}>
            <label
              style={{
                fontFamily: FONT_BODY,
                fontSize: "0.7rem",
                color: "var(--kraft)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Stamp Input
            </label>
            <input
              placeholder="X-X-X-X-X-X"
              defaultValue=""
              style={{
                textAlign: "left",
                fontFamily: FONT_BODY,
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.55,
                color: "var(--brown-mid)",
                textTransform: "uppercase",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Special marks ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Marks & Stamps</SectionHeader>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Room code
            </span>
            <CodeTag>{" .room-code"}</CodeTag>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "18px 0",
            }}
          >
            <RoomCodeButton />
          </div>
        </div>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Team badges
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                textTransform: "uppercase",
                fontSize: "0.85rem",
                padding: "4px 10px",
                borderRadius: "4px",
                background: "var(--cream)",
                color: "var(--brown-dark)",
                border: "1.5px solid var(--linen)",
              }}
            >
              Team 1
            </span>
            <span
              style={{
                fontFamily: FONT_STAMP,
                textTransform: "uppercase",
                fontSize: "0.85rem",
                padding: "4px 10px",
                borderRadius: "4px",
                background: "var(--cream)",
                color: "var(--brown-dark)",
                border: "1.5px solid var(--linen)",
              }}
            >
              Team 2
            </span>
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                color: "var(--brown-dark)",
              }}
            >
              Round banner
            </span>
            <CodeTag>{" .round-banner"}</CodeTag>
          </div>
          <div
            style={{
              background: "var(--red)",
              padding: "16px 20px",
              textAlign: "center",
              width: "100%",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontFamily: FONT_STAMP,
                textTransform: "uppercase",
                fontSize: "14px",
                color: "var(--cream)",
                opacity: 0.85,
              }}
            >
              Round 1
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "32px",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                color: "var(--cream)",
                lineHeight: 1.1,
              }}
            >
              Describe It
            </div>
          </div>
        </div>
      </section>

      {/* ── Timer ──────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Timer</SectionHeader>
        <div className="card">
          <div style={{ marginBottom: "14px" }}>
            <span
              style={{
                fontFamily: FONT_STAMP,
                textTransform: "uppercase",
                fontSize: "0.8rem",
                color: "var(--brown-dark)",
              }}
            >
              Timer ring
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              padding: "16px",
              background: "var(--cream)",
              border: "1px dashed var(--linen)",
              borderRadius: "3px",
              marginBottom: "10px",
            }}
          >
            <TimerRing seconds={54} />
            <TimerRing seconds={8} />
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: "14px",
                color: "var(--brown-mid)",
                lineHeight: 1.5,
              }}
            >
              Ring fills clockwise.
              <br />
              Turns terracotta under 10s.
            </div>
          </div>
        </div>
      </section>

      {/* ── Motion ───────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <SectionHeader>Motion</SectionHeader>
        <div className="card">
          <ul
            style={{
              fontFamily: FONT_BODY,
              fontSize: "0.85rem",
              color: "var(--brown-mid)",
              lineHeight: 1.8,
              margin: 0,
              paddingLeft: "1.2rem",
            }}
          >
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Page transitions
              </strong>{" "}
              — 250ms fade through cream. No sliding.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Button press
              </strong>{" "}
              — translate(1px, 1px), 100ms. No scale.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Timer urgency
              </strong>{" "}
              — red bar pulses opacity 1 ↔ 0.4 at 0.8s under 10s.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>Bounce-in</strong>{" "}
              — reserved for celebratory moments (round end, game over).
            </li>
          </ul>
        </div>
      </section>

      {/* ── Principles ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Principles</SectionHeader>
        <div className="card">
          <ol
            style={{
              fontFamily: FONT_BODY,
              fontSize: "0.85rem",
              color: "var(--brown-mid)",
              lineHeight: 1.8,
              margin: 0,
              paddingLeft: "1.4rem",
            }}
          >
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Paper, not plastic.
              </strong>{" "}
              Surfaces should feel lifted, tactile, imperfect.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Three fonts, no more.
              </strong>{" "}
              Fraunces for display type, BigBird for stamps, Geist Mono for body
              and UI.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                One accent.
              </strong>{" "}
              Red is the only saturated color. Everything else is earth.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Tap targets ≥ 52px.
              </strong>{" "}
              This is a phone game. Be generous.
            </li>
            <li>
              <strong style={{ color: "var(--brown-dark)" }}>
                Rounded at 3–4px.
              </strong>{" "}
              Barely rounded. Never pill-shaped.
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
