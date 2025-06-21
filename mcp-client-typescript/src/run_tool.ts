// mcp-client-typescript/src/run_tool.ts

/**
 * MCP Client Tool Runner
 *
 * このスクリプトは、コマンドラインからツール名と引数を受け取り、
 * McpClientを通じてMCPサーバーのツールを実行します。
 * Pythonのsubprocessから呼び出されることを想定しています。
 *
 * 使い方:
 * tsx src/run_tool.ts <tool_name> '<json_arguments>'
 *
 * 例:
 * tsx src/run_tool.ts google_search '{"query": "LangChain"}'
 *
 * 出力:
 * - 成功時: ツールの実行結果がJSON文字列として標準出力(stdout)に出力されます。
 * - 失敗時: エラー情報がJSON形式で標準出力(stdout)に出力されます。
 * - 致命的なエラー時: エラーメッセージが標準エラー出力(stderr)に出力され、
 *   非ゼロの終了コードで終了します。
 */

import {
    McpClient,
    McpClientOptions,
    GoogleSearchArgs,
    CrawlWebsiteArgs,
    GetGoogleAiSummaryArgs,
    ScrapeLawPageArgs,
  } from './index'; // ライブラリのルートからインポート
  
  // --- 設定 ---
  const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
  const DEFAULT_TIMEOUT = 300000; // 5分 (Python側のタイムアウトより少し短くする)
  
  /**
   * 成功時の結果を標準出力に書き出す
   * @param result - 任意の成功結果オブジェクト
   */
  function printSuccess(result: any): void {
    // isError: false を含めるとより明確だが、シンプルにするため結果のみ出力
    process.stdout.write(JSON.stringify(result, null, 2));
  }
  
  /**
   * 失敗時のエラー情報をJSON形式で標準出力に書き出す
   * Python側でパースしてエラー内容を判断できるようにするため。
   * @param message - エラーの主メッセージ
   * @param details - エラーの詳細情報（スタックトレースなど）
   */
  function printError(message: string, details?: any): void {
    const errorResponse = {
      error: true,
      message: message,
      details: details instanceof Error ? { name: details.name, message: details.message, stack: details.stack } : details,
    };
    // エラーもstdoutに出力することで、Python側は常にstdoutを読むだけで済む
    process.stdout.write(JSON.stringify(errorResponse, null, 2));
  }
  
  /**
   * スクリプトのメイン実行関数
   */
  async function run(): Promise<void> {
    const args = process.argv.slice(2);
  
    if (args.length < 2) {
      console.error('Usage: tsx src/run_tool.ts <tool_name> \'<json_arguments>\'');
      process.exit(1);
    }
  
    const toolName = args[0];
    const jsonArgs = args[1];
  
    let parsedArgs: any;
    try {
      parsedArgs = JSON.parse(jsonArgs);
    } catch (e) {
      console.error(`Fatal: Failed to parse JSON arguments. Error: ${(e as Error).message}`);
      console.error(`Received args: ${jsonArgs}`);
      process.exit(1);
    }
  
    const clientOptions: McpClientOptions = {
      serverUrl: SERVER_URL,
      clientName: `mcp-client-runner-for-${toolName}`,
      clientVersion: '1.0.0',
      defaultTimeout: DEFAULT_TIMEOUT,
    };
  
    const client = new McpClient(clientOptions);
  
    try {
      await client.connect();
  
      let result: any;
      switch (toolName) {
        case 'google_search':
          result = await client.googleSearch(parsedArgs as GoogleSearchArgs);
          break;
        case 'crawl_website':
          result = await client.crawlWebsite(parsedArgs as CrawlWebsiteArgs);
          break;
        case 'get_google_ai_summary':
          result = await client.getGoogleAiSummary(parsedArgs as GetGoogleAiSummaryArgs);
          break;
        case 'scrape_law_page':
          result = await client.scrapeLawPage(parsedArgs as ScrapeLawPageArgs);
          break;
        default:
          // switchでエラーを投げるのではなく、printErrorで整形して出力
          printError(`Unsupported tool name: ${toolName}`);
          // この場合、正常終了(0)としてPython側に判断を委ねる
          return; 
      }
  
      printSuccess(result);
  
    } catch (error: unknown) {
      // McpClient内で発生したエラーをキャッチ
      const err = error as Error;
      printError(`Error during execution of tool '${toolName}': ${err.message}`, err);
    } finally {
      if (client.isConnected) {
        await client.close();
      }
    }
  }
  
  // スクリプトを実行し、予期せぬトップレベルのエラーをキャッチする
  run().catch(fatalError => {
    console.error(`A fatal, unhandled error occurred in run_tool.ts: ${(fatalError as Error).message}`);
    console.error((fatalError as Error).stack);
    process.exit(1);
  });