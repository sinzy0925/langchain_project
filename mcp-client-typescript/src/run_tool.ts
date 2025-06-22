// mcp-client-typescript/src/run_tool.ts (エラーハンドリング強化版)

import { McpClient, McpClientOptions, McpToolExecutionError } from './index';

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
const DEFAULT_TIMEOUT = 300000;

function printSuccess(result: any): void {
  process.stdout.write(JSON.stringify(result));
}

function printError(message: string, details?: any): void {
  const errorResponse = {
    error: true,
    message: message,
    details: details instanceof Error ? { name: details.name, message: details.message, stack: details.stack } : details,
  };
  // エラーもstdoutに出力する。Python側は常にstdoutだけを見ればよい。
  process.stdout.write(JSON.stringify(errorResponse));
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx src/run_tool.ts <tool_name> \'<json_arguments>\'');
    process.exit(1);
  }

  const toolName = args[0];
  const jsonArgs = args[1];
  const parsedArgs = JSON.parse(jsonArgs);

  const client = new McpClient({ serverUrl: SERVER_URL, defaultTimeout: DEFAULT_TIMEOUT });

  try {
    await client.connect();

    // ▼▼▼▼▼ 変更点: clientの各メソッドを直接呼び出す ▼▼▼▼▼
    let result;
    switch (toolName) {
      case 'google_search':
        result = await client.googleSearch(parsedArgs);
        break;
      case 'crawl_website':
        result = await client.crawlWebsite(parsedArgs);
        break;
      case 'get_google_ai_summary':
        result = await client.getGoogleAiSummary(parsedArgs);
        break;
      case 'scrape_law_page':
        result = await client.scrapeLawPage(parsedArgs);
        break;
      default:
        throw new Error(`Unsupported tool name: ${toolName}`);
    }
    
    printSuccess(result);

  } catch (error: unknown) {
    // ▼▼▼▼▼ 変更点: McpToolExecutionErrorを特別扱いする ▼▼▼▼▼
    if (error instanceof McpToolExecutionError) {
      // ツール実行エラーの場合、サーバーから返された詳細なエラー内容を抽出する
      const content = error.toolOutputContent;
      let detailedMessage = "Tool execution failed on the server.";
      // contentがテキスト形式で、その中にJSONが含まれている場合がある
      if (content && content.length > 0 && content[0].type === 'text') {
        try {
            const parsedError = JSON.parse(content[0].text);
            detailedMessage = parsedError.message || content[0].text;
        } catch (e) {
            detailedMessage = content[0].text;
        }
      }
      printError(detailedMessage, { originalStack: (error as Error).stack });
    } else {
      // その他の一般的なエラー
      printError(`Error in run_tool.ts: ${(error as Error).message}`, error);
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    
  } finally {
    if (client.isConnected) {
      await client.close();
    }
  }
}

run().catch(fatalError => {
  console.error(`A fatal, unhandled error occurred: ${(fatalError as Error).message}`);
  process.exit(1);
});