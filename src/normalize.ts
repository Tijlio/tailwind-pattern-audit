import { twMerge } from "tailwind-merge";

export interface NormalizedClassValue {
  normalized: string;
  tokens: string[];
}

export function normalizeClassValue(raw: string): NormalizedClassValue | undefined {
  const inputTokens = raw.trim().split(/\s+/).filter(Boolean);

  if (inputTokens.length === 0) {
    return undefined;
  }

  const dedupedInput = Array.from(new Set(inputTokens)).join(" ");
  const merged = twMerge(dedupedInput);
  const tokens = merged.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return undefined;
  }

  return {
    normalized: [...tokens].sort((a, b) => a.localeCompare(b)).join(" "),
    tokens,
  };
}
