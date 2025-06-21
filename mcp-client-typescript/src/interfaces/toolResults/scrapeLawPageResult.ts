// src/interfaces/toolResults/scrapeLawPageResult.ts
export interface LawPageHierarchy {
  chapter?: string;
  section?: string;
  subsection?: string;
  article_title?: string;
  article_number?: string;
  paragraph_number?: string;
  item_number?: string;
}
export interface LawPageContextEntry {
  id: string;
  source_url: string;
  hierarchy: LawPageHierarchy;
  context_snippet: string;
  keyword_for_this_snippet: string;
  keyword_occurrence_in_snippet: number;
  full_sentence_or_block: string;
}
export interface ScrapeLawPageResult {
  source_url: string;
  search_keyword: string;
  total_keyword_occurrences_in_snippets: number;
  total_context_entries: number;
  results: LawPageContextEntry[];
}