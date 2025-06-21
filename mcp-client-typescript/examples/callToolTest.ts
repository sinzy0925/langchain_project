// examples/callToolTest.ts
import {
    McpClient,
    McpClientOptions,
    GetGoogleAiSummaryArgs, // get_google_ai_summary ツールの引数型
    GetGoogleAiSummaryResult, // get_google_ai_summary ツールの結果型
    McpClientRequestOptions,
    McpToolExecutionError, // ツール実行エラーをキャッチするため
    McpResponseParseError // 結果パースエラーをキャッチするため
  } from '../src/index';
  
  // --- 設定項目 (ご自身の環境に合わせて変更してください) ---
  const SERVER_URL = 'http://localhost:3001/mcp'; // 実際のMCPサーバーのURL
  // ----------------------------------------------------
  
  async function main() {
    console.log('MCP Client Call Tool Test (get_google_ai_summary)');
    console.log(`Connecting to server: ${SERVER_URL}`);
  
    const clientOptions: McpClientOptions = {
      serverUrl: SERVER_URL,
      clientName: 'mcp-test-client-calltool',
      clientVersion: '1.0.2',
      defaultTimeoutMs: 30000, // デフォルトタイムアウトを30秒に設定 (検索とAI処理のため長め)
    };
  
    const client = new McpClient(clientOptions);
  
    try {
      // 1. 接続
      console.log('\nAttempting to connect...');
      await client.connect();
      console.log('Successfully connected!');
  
      if (client.isConnected) {
        console.log('\n--- Calling get_google_ai_summary tool ---');
  
        // ツールに渡す引数を準備
        const toolArgs: GetGoogleAiSummaryArgs = {
          query: 'aiとは', // ★ テストしたい検索クエリに変更してください
          // numResults: 5, // オプショナルな引数。必要に応じて設定
          // lang: 'ja',    // オプショナルな引数
        };
  
        // ツール呼び出し時のオプション (必要であれば)
        const callOptions: McpClientRequestOptions = {
          timeout: 45000, // このツール呼び出し専用のタイムアウト (45秒)
        };
  
        console.log(`Args: ${JSON.stringify(toolArgs)}`);
        console.log('Calling tool, please wait...');
  
        // 専用メソッドを使ってツールを呼び出す
        const result: GetGoogleAiSummaryResult = await client.getGoogleAiSummary(toolArgs, callOptions);
  
        console.log('\n--- Tool Result ---');
        console.log('AI Summary:', result.ai_summary_results || 'N/A');
        console.log('\nSearch Results:');
        if (result.google_search_results && result.google_search_results.length > 0) {
          result.google_search_results.forEach((item, index) => {
            console.log(`  #${index + 1}:`);
            console.log(`    Title: ${item.title}`);
            console.log(`    URL: ${item.url}`);
            if (item.content) {
              console.log(`    Snippet: ${item.content}`);
            }
          });
        } else {
          console.log('  No search results found.');
        }
        if (result.google_search_results) { // _meta があれば表示 (SDKの仕様による)
          console.log('\nMeta:', JSON.stringify(result.ai_summary_results));
        }
        console.log('-------------------');
  
      } else {
        console.error('Failed to connect or client is not marked as connected.');
      }
  
    } catch (error: any) {
      console.error('\n--- ERROR ---');
      if (error instanceof McpToolExecutionError) {
        console.error('Tool Execution Error:', error.message);
        console.error('  Tool Result (if available):', error.toolResult);
        console.error('  Tool Output Content (if available):', error.toolOutputContent);
      } else if (error instanceof McpResponseParseError) {
        console.error('Response Parse Error:', error.message);
        console.error('  Raw Response (if available):', error.rawResponse);
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
      // 3. 切断
      if (client.isConnected) {
        try {
          console.log('\nAttempting to close connection...');
          await client.close();
          console.log('Connection closed successfully.');
        } catch (closeError: any) {
          // ... (エラーハンドリング)
          console.error('\n--- ERROR during close ---');
          console.error('Failed to close connection:', closeError.message);
          if (closeError.originalError) {
            console.error('Original error:', closeError.originalError);
          }
          console.error('--------------------------');
        }
      } else {
        console.log('\nClient was not connected or already closed, no need to explicitly close again.');
      }
    }
  
    console.log('\nCall tool test finished.');
  }
  
  main().catch(e => {
    console.error("Unhandled error in main:", e);
  });