// src/interfaces/toolResults/googleSearchResult.ts

/**
 * Represents a single scraped item from the Google search results.
 */
export interface GoogleSearchResultItem {
    url: string;
    title: string;
    content_preview: string | null;
    full_content_length: number;
    emails: string[];
    phones: string[];
    source_category: "ai_summary_source" | "organic_search_result";
    error_details?: string;
  }
  
  /**
   * Represents the overall result of the google_search tool execution.
   */
  export interface GoogleSearchResult {
    /**
     * Metadata about the search execution.
     */
    metadata: {
      source_type: string;
      query_used: string;
      description: string;
      timestamp: string;
      total_urls_processed: number;
      valid_results_count: number;
    };
  
    /**
     * An array of all processed search results.
     */
    search_results: GoogleSearchResultItem[];
  }