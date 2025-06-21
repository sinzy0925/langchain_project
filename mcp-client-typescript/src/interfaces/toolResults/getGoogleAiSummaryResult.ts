// src/interfaces/toolResults/getGoogleAiSummaryResult.ts
export interface AiSummaryResultItem {
  title: string;
  url: string;
  source_type: "ai_summary" | "organic_search"; // EXEの出力に合わせて
  // content?: string; // EXEの出力例には見当たらないため、オプショナルまたは削除検討
  // snippet?: string; // EXEの出力例には見当たらないため、オプショナルまたは削除検討
}

export interface GetGoogleAiSummaryResult {
  query: string;
  execution_datetime: string; // EXEの出力では必須
  ai_summary_results_count?: number; // EXEの出力に合わせて追加 (オプショナルか必須か)
  ai_summary_results?: AiSummaryResultItem[]; // EXEの出力に合わせて変更
  google_search_results_count?: number; // EXEの出力に合わせて追加 (オプショナルか必須か)
  google_search_results?: AiSummaryResultItem[]; // EXEの出力に合わせて変更
  // _meta はEXEの出力例には直接見当たらないため、一旦コメントアウトまたは削除。
  // もしサーバーが parseToolResult の結果として _meta を付与する場合は別途考慮。
  // _meta?: AiSummaryResultItem[];
}