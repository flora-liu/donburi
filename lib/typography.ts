import type { CSSProperties } from "react";

export const FONT_BODY = "var(--font-geist), sans-serif";
export const FONT_DISPLAY = "var(--font-fraunces), serif";
export const FONT_STAMP = "'BigBird', serif";

// All live on var(--brown-dark) by default. Callers can override color
// (e.g. on red grounds, pass color: 'var(--cream)').
export const TYPE = {
  display1: {
    fontFamily: FONT_DISPLAY,
    fontSize: "64px",
    fontWeight: 300,
    fontStyle: "italic",
    letterSpacing: "-0.04em",
    color: "var(--brown-dark)",
    lineHeight: 1.1,
  },
  display2: {
    fontFamily: FONT_DISPLAY,
    fontSize: "48px",
    fontWeight: 300,
    letterSpacing: "-0.03em",
    color: "var(--brown-dark)",
    lineHeight: 1.15,
  },
  display3: {
    fontFamily: FONT_DISPLAY,
    fontSize: "32px",
    fontWeight: 300,
    letterSpacing: "-0.02em",
    color: "var(--brown-dark)",
    lineHeight: 1.2,
  },
  display4: {
    fontFamily: FONT_DISPLAY,
    fontSize: "24px",
    fontWeight: 300,
    fontStyle: "italic",
    letterSpacing: "-0.015em",
    color: "var(--brown-dark)",
    lineHeight: 1.3,
  },
  stampHeading: {
    fontFamily: FONT_STAMP,
    textTransform: "uppercase",
    fontSize: "16px",
    color: "var(--brown-dark)",
  },
  stampLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: "18px",
    fontWeight: 300,
    letterSpacing: "-0.015em",
    color: "var(--brown-dark)",
    lineHeight: 1.3,
  },
  bodyLg: {
    fontFamily: FONT_BODY,
    fontSize: "17px",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "var(--brown-mid)",
  },
  inputLabel: {
    fontFamily: FONT_BODY,
    fontSize: "12px",
    color: "var(--kraft)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  body: {
    fontFamily: FONT_BODY,
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: 1.55,
    color: "var(--brown-mid)",
  },
  bodySm: {
    fontFamily: FONT_BODY,
    fontSize: "12.5px",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "var(--brown-mid)",
  },
  label: {
    fontFamily: FONT_BODY,
    fontSize: "14px",
    fontWeight: 400,
    color: "var(--brown-dark)",
  },
} satisfies Record<string, CSSProperties>;

// Team badge — both teams share identical styling per the design system.
export const teamBadge: CSSProperties = {
  fontFamily: FONT_STAMP,
  textTransform: "uppercase",
  fontSize: "14px",
  padding: "4px 10px",
  borderRadius: "4px",
  background: "var(--cream)",
  color: "var(--brown-dark)",
  border: "1.5px solid var(--linen)",
};
