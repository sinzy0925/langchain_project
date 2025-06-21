// src/interfaces/toolArgs/crawlWebsiteArgs.ts
export interface CrawlWebsiteArgs {
  url: string;
  selector: string;
  max_depth?: number;         // from Zod schema & exe help
  parallel?: number;          // from Zod schema & exe help
  timeout?: number;           // from Zod schema & exe help (operation timeout)
  apply_stealth?: boolean;    // from Zod schema (maps to --stealth or --no-stealth)
  headless_mode?: boolean;    // from Zod schema (maps to --headless or --no-headless)
  ignore_robots_txt?: boolean; // from Zod schema & exe help
  user_agent?: string;        // from Zod schema & exe help
  request_delay?: number;     // from Zod schema & exe help
  no_samedomain?: boolean;    // from Zod schema & exe help
  main_content_only?: boolean;    // from Zod schema & exe help
}