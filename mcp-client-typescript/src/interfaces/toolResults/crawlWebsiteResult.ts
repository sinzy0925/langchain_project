// src/interfaces/toolResults/crawlWebsiteResult.ts
// ★★★ この型定義は YourScrapingApp.exe の crawl タスクの実際の出力JSONに合わせてください ★★★
export interface CrawledPageInfo { // サーバーからの出力構造に合わせる必要あり
  url: string;
  title?: string;
  links?: string[];
  emails?: string[];
  phones?: string[];
  // その他、exeが出力する情報
}
export interface CrawlError {
  url: string;
  message: string;
}
export interface CrawlWebsiteResult {
  startUrl: string;         // exeの出力に合わせる
  timestamp: string;        // exeの出力に合わせる
  links?: string[];         // 収集された全ユニークリンクなど、exeの出力に合わせる
  emails?: string[];        // 収集された全ユニークEmailなど
  phoneNumbers?: string[];  // 収集された全ユニーク電話番号など
  crawledData?: CrawledPageInfo[]; // クロールされた各ページの情報
  errors?: CrawlError[];    // クロール中に発生したエラー
  summary?: string;         // クロールのサマリー
  _meta?: any;              // 必要であれば
  // ★ YourScrapingApp.exeの `crawl` タスクの出力JSONに合わせて、
  //    all_crawled_urls_unique や all_unique_emails_found など、
  //    正しいプロパティ名と型に修正してください。
  //    以前のログでは all_crawled_urls_unique: string[] のような形式でした。
  all_crawled_urls_unique?: string[];
  all_unique_emails_found?: string[];
  all_unique_phones_found?: string[];
  crawl_summary?: { // 以前のログにあった構造を参考に
      start_url: string;
      link_selector?: string; // exeの出力に含まれるか確認
      max_depth?: number;
      no_samedomain_check?: boolean;
      total_processed_entries_across_all_domains?: number;
      unique_base_urls_processed_or_disallowed?: number;
      user_agent_for_robots_check?: string;
  };
  results_by_domain?: Record<string, any[]>; // ドメインごとの結果
}