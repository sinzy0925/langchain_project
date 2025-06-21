// src/interfaces/toolArgs/googleSearchArgs.ts

export interface GoogleSearchArgs {
    /**
     * The search query string for Google.
     */
    query: string;
  
    /**
     * Number of search result pages to process. Defaults to 1 if not provided.
     * @optional
     */
    search_pages?: number;
  
    /**
     * Maximum number of parallel browser tasks for scraping result pages.
     * @optional
     */
    parallel?: number;
  
    /**
     * Operation timeout in milliseconds for page loads/actions.
     * @optional
     */
    timeout?: number;
  
    /**
     * Whether to run the browser in headless mode.
     * @optional
     */
    headless_mode?: boolean;
  }