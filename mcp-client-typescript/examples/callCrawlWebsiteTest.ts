// examples/callCrawlWebsiteTest.ts
import {
  McpClient,
  McpClientOptions,
  CrawlWebsiteArgs,
  CrawlWebsiteResult,
  McpClientRequestOptions,
  McpToolExecutionError,
  McpResponseParseError
} from '../src/index';

const SERVER_URL = 'http://localhost:3001/mcp';

async function main() {
  console.log('MCP Client Call Tool Test (crawl_website)');
  console.log(`Connecting to server: ${SERVER_URL}`);

  const clientOptions: McpClientOptions = {
    serverUrl: SERVER_URL,
    clientName: 'mcp-test-client-crawl',
    clientVersion: '1.0.3',
    defaultTimeout: 60000, // ★ defaultTimeoutMs から defaultTimeout に変更
  };

  const client = new McpClient(clientOptions);

  try {
    console.log('\nAttempting to connect...');
    await client.connect(); // connect時のタイムアウトは clientOptions.defaultTimeout が使われる
    console.log('Successfully connected!');

    if (client.isConnected) {
      console.log('\n--- Calling crawl_website tool ---');

      const toolArgs: CrawlWebsiteArgs = {
        url: 'file:///C:/Users/sinzy/interceptor01/generated_links02.html',
        selector: 'a', // サーバーのスキーマでは必須
        max_depth: 1,
        headless_mode: false,
        apply_stealth: false,
        no_samedomain: true, 
        main_content_only: true,
        // ★ 直接実行時の --no-samedomain に合わせる
        // 他の引数も必要に応じて設定 (サーバーのスキーマとexeのヘルプを参照)
      };

      const callOptions: McpClientRequestOptions = {
        timeout: 90000, // このツール呼び出し専用のタイムアウト (ミリ秒)
        // 他の SdkRequestOptions プロパティも設定可能
      };

      console.log(`Args: ${JSON.stringify(toolArgs)}`);
      console.log('Calling tool, please wait (this might take a while)...');

      const result: CrawlWebsiteResult = await client.crawlWebsite(toolArgs, callOptions);

      console.log('\n--- Tool Result (Crawl Website) ---');
      // ★★★ CrawlWebsiteResult の型定義に合わせて結果を表示 ★★★
      console.log('Crawl Summary:', result.crawl_summary);
      console.log('All Crawled URLs:', result.all_crawled_urls_unique);
      console.log('All Unique Emails:', result.all_unique_emails_found);
      console.log('All Unique Phones:', result.all_unique_phones_found);
      if (result.results_by_domain) {
          console.log('Results by Domain (first domain, first entry):', Object.values(result.results_by_domain)[0]?.[0]);
      }
      console.log('----------------------------------');

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

  console.log('\nCall crawl_website tool test finished.');
}

main().catch(e => {
  console.error("Unhandled error in main:", e);
});