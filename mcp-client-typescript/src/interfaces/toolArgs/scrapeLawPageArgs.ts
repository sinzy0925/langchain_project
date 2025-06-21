// src/interfaces/toolArgs/scrapeLawPageArgs.ts
export interface ScrapeLawPageArgs {
  url: string;
  keyword: string;
  wait_selector?: string;    // from Zod schema & exe help
  headless_mode?: boolean;   // from Zod schema (maps to --headless or --no-headless)
  timeout?: number;          // from Zod schema & exe help (operation timeout)
  browser_type?: "chromium" | "firefox" | "webkit"; // from Zod schema & exe help
  context_window?: number;   // from Zod schema & exe help
  merge_threshold?: number;  // from Zod schema & exe help
}