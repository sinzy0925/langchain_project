// examples/callScrapeLawPageTest.ts
import {
    McpClient,
    McpClientOptions,
    ScrapeLawPageArgs,
    ScrapeLawPageResult,
    LawPageContextEntry, // 結果のアイテム型もインポート
    McpClientRequestOptions,
    McpToolExecutionError,
    McpResponseParseError
  } from '../src/index';
  
  // --- 設定項目 (ご自身の環境に合わせて変更してください) ---
  const SERVER_URL = 'http://localhost:3001/mcp'; // 実際のMCPサーバーのURL
  // ----------------------------------------------------
  
  async function main() {
    console.log('MCP Client Call Tool Test (scrape_law_page)');
    console.log(`Connecting to server: ${SERVER_URL}`);
  
    const clientOptions: McpClientOptions = {
      serverUrl: SERVER_URL,
      clientName: 'mcp-test-client-lawscraper',
      clientVersion: '1.0.5',
      defaultTimeout: 60000, // デフォルトタイムアウトを60秒に設定
    };
  
    const client = new McpClient(clientOptions);
  
    try {
      // 1. 接続
      console.log('\nAttempting to connect...');
      await client.connect();
      console.log('Successfully connected!');
  
      if (client.isConnected) {
        console.log('\n--- Calling scrape_law_page tool ---');
  
        // ツールに渡す引数を準備
        const toolArgs: ScrapeLawPageArgs = {
          url: 'https://laws.e-gov.go.jp/law/325AC0000000201', // ★ テストしたい法令ページのURLに変更してください (例: 著作権法)
          keyword: '階段', // ★ テストしたいキーワードに変更してください
          headless_mode: false, // オプショナル
          // wait_selector: '#elaws_content', // オプショナル: ページ読み込み後に待機するセレクタ
          // timeout: 30000, // オプショナル: ページごとのタイムアウト
          // browser_type: 'chromium', // オプショナル
          // context_window: 150, // オプショナル
          // merge_threshold: 70, // オプショナル
        };
  
        // ツール呼び出し時のオプション (必要であれば)
        const callOptions: McpClientRequestOptions = {
          timeout: 90000, // このツール呼び出し専用のタイムアウト (90秒)
        };
  
        console.log(`Args: ${JSON.stringify(toolArgs)}`);
        console.log('Calling tool, please wait (this might take some time)...');
  
        // 専用メソッドを使ってツールを呼び出す
        const result: ScrapeLawPageResult = await client.scrapeLawPage(toolArgs, callOptions);
  
        console.log('\n--- Tool Result (Scrape Law Page) ---');
        console.log('Source URL:', result.source_url);
        console.log('Search Keyword:', result.search_keyword);
        console.log('Total Keyword Occurrences in Snippets:', result.total_keyword_occurrences_in_snippets);
        console.log('Total Context Entries:', result.total_context_entries);
  
        console.log('\nResults:');
        if (result.results && result.results.length > 0) {
          result.results.slice(0, 5).forEach((entry: LawPageContextEntry, index: number) => { // 最初の5件まで表示
            console.log(`  Entry #${index + 1}:`);
            console.log(`    ID: ${entry.id}`);
            console.log(`    Hierarchy:`);
            if (entry.hierarchy) {
              if (entry.hierarchy.chapter) console.log(`      Chapter: ${entry.hierarchy.chapter}`);
              if (entry.hierarchy.section) console.log(`      Section: ${entry.hierarchy.section}`);
              if (entry.hierarchy.subsection) console.log(`      Subsection: ${entry.hierarchy.subsection}`);
              if (entry.hierarchy.article_title) console.log(`      Article Title: ${entry.hierarchy.article_title}`);
              if (entry.hierarchy.article_number) console.log(`      Article Number: ${entry.hierarchy.article_number}`);
              if (entry.hierarchy.paragraph_number) console.log(`      Paragraph Number: ${entry.hierarchy.paragraph_number}`);
              if (entry.hierarchy.item_number) console.log(`      Item Number: ${entry.hierarchy.item_number}`);
            }
            console.log(`    Keyword for this snippet: ${entry.keyword_for_this_snippet}`);
            console.log(`    Occurrence in snippet: ${entry.keyword_occurrence_in_snippet}`);
            console.log(`    Context Snippet: "${entry.context_snippet.substring(0, 150)}..."`); // 先頭150文字
            // console.log(`    Full Sentence/Block: "${entry.full_sentence_or_block}"`); // 全文表示は長くなる可能性
          });
          if (result.results.length > 5) {
              console.log('  ... and more entries.');
          }
        } else {
          console.log('  No context entries found.');
        }
        console.log('-------------------------------------');
  
      } else {
        console.error('Failed to connect or client is not marked as connected.');
      }
  
    } catch (error: any) {
      console.error('\n--- ERROR ---');
      if (error instanceof McpToolExecutionError) {
        console.error('Tool Execution Error:', error.message);
        if (error.toolResult) console.error('  Tool Result:', JSON.stringify(error.toolResult, null, 2));
        if (error.toolOutputContent) console.error('  Tool Output Content:', JSON.stringify(error.toolOutputContent, null, 2));
      } else if (error instanceof McpResponseParseError) {
        console.error('Response Parse Error:', error.message);
        console.error('  Raw Response:', error.rawResponse);
      } else {
        console.error('Test failed:', error.message);
      }
  
      if (error.originalError) {
        console.error('Original error:', error.originalError);
      }
      if (error.stack) {
        console.error('Stack trace:\n', error.stack);
      }
      console.error('-------------');
    } finally {
      if (client.isConnected) {
        try {
          console.log('\nAttempting to close connection...');
          await client.close();
          console.log('Connection closed successfully.');
        } catch (closeError: any) {
          console.error('\n--- ERROR during close ---');
          console.error('Failed to close connection:', closeError.message);
        }
      } else {
        console.log('\nClient was not connected or already closed, no need to explicitly close again.');
      }
    }
  
    console.log('\nCall scrape_law_page tool test finished.');
  }
  
  main().catch(e => {
    console.error("Unhandled error in main:", e);
  });