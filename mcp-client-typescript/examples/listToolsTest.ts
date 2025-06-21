// examples/listToolsTest.ts
import { McpClient, McpClientOptions, ToolDefinition, McpClientRequestOptions } from '../src/index'; // クライアントライブラリのルートからインポート

// --- 設定項目 (ご自身の環境に合わせて変更してください) ---
const SERVER_URL = 'http://localhost:3001/mcp'; // ★ 実際のMCPサーバーのURL (ポート3001に変更済み)
// ----------------------------------------------------

async function main() {
  console.log('MCP Client List Tools Test');
  console.log(`Connecting to server: ${SERVER_URL}`);

  const clientOptions: McpClientOptions = {
    serverUrl: SERVER_URL,
    clientName: 'mcp-test-client-listtools',
    clientVersion: '1.0.1',
    defaultTimeoutMs: 15000, // 15秒のタイムアウト
  };

  const client = new McpClient(clientOptions);

  try {
    // 1. 接続
    console.log('\nAttempting to connect...');
    await client.connect();
    console.log('Successfully connected!');

    if (client.isConnected) {
      console.log('\n--- Server Information (from listToolsTest) ---');
      const serverInfo = client.serverInformation; // 接続後に serverInformation を取得
      if (serverInfo) {
        console.log('Server Name:', serverInfo.serverInfo?.name);
        console.log('Server Version:', serverInfo.serverInfo?.version);
      } else {
        console.log('Could not retrieve server information after connect.');
      }
      console.log('-------------------------------------------');


      // 2. listTools の呼び出し
      console.log('\nAttempting to list tools...');
      // 必要に応じて listTools にオプションを渡す
      const listToolsOptions: McpClientRequestOptions = {
        timeout: 10000, // listTools 専用のタイムアウト (10秒)
      };
      const tools: ToolDefinition[] = await client.listTools(undefined, listToolsOptions); // 第一引数のparamsはundefined

      if (tools && tools.length > 0) {
        console.log(`\n--- Available Tools (${tools.length}) ---`);
        tools.forEach((tool, index) => {
          console.log(`\nTool #${index + 1}:`);
          console.log(`  Name: ${tool.name}`);
          console.log(`  Description: ${tool.description || 'N/A'}`);
          // スキーマが巨大な場合があるので、inputSchema と outputSchema の表示は任意で
          // console.log(`  Input Schema: ${JSON.stringify(tool.inputSchema, null, 2)}`);
          // console.log(`  Output Schema: ${JSON.stringify(tool.outputSchema, null, 2)}`);
          if (tool.capabilities) {
            console.log(`  Capabilities: ${JSON.stringify(tool.capabilities)}`);
          }
          console.log('  --------------------');
        });
      } else {
        console.log('No tools available from the server or an empty list was returned.');
      }

    } else {
      console.error('Failed to connect or client is not marked as connected.');
    }

  } catch (error: any) {
    console.error('\n--- ERROR ---');
    console.error('Test failed:', error.message);
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

  console.log('\nList tools test finished.');
}

main().catch(e => {
  console.error("Unhandled error in main:", e);
});