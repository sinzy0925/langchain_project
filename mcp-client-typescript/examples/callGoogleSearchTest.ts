// examples/callGoogleSearchTest.ts
import {
    McpClient,
    McpClientOptions,
    // ★★★ インポートする型を新しいファイルからに変更 ★★★
    GoogleSearchArgs,
    GoogleSearchResult,
    // ★★★ ここまで ★★★
    McpClientRequestOptions,
    McpToolExecutionError,
    McpResponseParseError
  } from '../src/index';
  
  // サーバーのURLは同じ
  const SERVER_URL = 'http://localhost:3001/mcp';
  
  async function main() {
    console.log('MCP Client Call Tool Test (google_search)');
    console.log(`Connecting to server: ${SERVER_URL}`);
  
    const clientOptions: McpClientOptions = {
      serverUrl: SERVER_URL,
      clientName: 'mcp-test-client-googlesearch',
      clientVersion: '1.0.1', // バージョンアップ
      defaultTimeout: 60000,
    };
  
    const client = new McpClient(clientOptions);
  
    try {
      console.log('\nAttempting to connect...');
      await client.connect();
      console.log('Successfully connected!');
  
      if (client.isConnected) {
        console.log('\n--- Calling google_search tool ---');
  
        const toolArgs: GoogleSearchArgs = {
          query: 'Playwrightとは',
          search_pages: 2,
        };
  
        const callOptions: McpClientRequestOptions = {
          timeout: 300000, // 5分
        };
  
        console.log(`Args: ${JSON.stringify(toolArgs)}`);
        console.log('Calling tool, please wait...');
  
        // ★★★ 呼び出し部分は変更なし ★★★
        const result: GoogleSearchResult = await client.googleSearch(toolArgs, callOptions);
  
        // ★★★ 結果表示部分も変更なし ★★★
        console.log('\n--- Tool Result (Google Search) ---');
        
        if (result.metadata) {
            console.log('Metadata:');
            console.log(`  Query Used: ${result.metadata.query_used}`);
            console.log(`  Timestamp: ${result.metadata.timestamp}`);
            console.log(`  Total URLs Processed: ${result.metadata.total_urls_processed}`);
            console.log(`  Valid Results Count: ${result.metadata.valid_results_count}`);
        }
  
        console.log('\nSearch Results:');
        if (result.search_results && result.search_results.length > 0) {
          result.search_results.forEach((item, index) => {
            console.log(`\n  Result #${index + 1}:`);
            console.log(`    Title: ${item.title}`);
            console.log(`    URL: ${item.url}`);
            console.log(`    Source Category: ${item.source_category}`);
            console.log(`    Emails: ${item.emails.length > 0 ? item.emails.join(', ') : 'N/A'}`);
            console.log(`    Phones: ${item.phones.length > 0 ? item.phones.join(', ') : 'N/A'}`);
            console.log(`    Content Preview: ${item.content_preview?.substring(0, 100) || '(No content)'}...`);
            if (item.error_details) {
              console.log(`    ERROR: ${item.error_details}`);
            }
          });
        } else {
          console.log('  No search results found or processed.');
        }
        console.log('-------------------------------------------');
  
      } else {
        console.error('Failed to connect or client is not marked as connected.');
      }
  
    } catch (error: any) {
      // エラーハンドリング部分は変更なし
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
      // 接続終了処理も変更なし
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
    
    console.log('\nCall google_search tool test finished.');
  }
  
  main().catch(e => {
    console.error("Unhandled error in main:", e);
  });