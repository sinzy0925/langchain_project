// src/interfaces/toolArgs/getGoogleAiSummaryArgs.ts
export interface GetGoogleAiSummaryArgs {
  query: string;
  headless_mode?: boolean; // from Zod schema (maps to --headless or --no-headless)
  wait_seconds?: number;   // from Zod schema (maps to --wait)
}