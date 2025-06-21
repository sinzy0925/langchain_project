// examples/connectionTest.ts
//import { McpClient, McpClientOptions, McpServerInformation } from '../src/index.js'; // ★ MCPクライアントライブラリのルートからインポート
import { McpClient, McpClientOptions, McpServerInformation } from '../src/index';
// --- 設定項目 (ご自身の環境に合わせて変更してください) ---
const SERVER_URL = 'http://localhost:3001/mcp'; // ★ 実際のMCPサーバーのURLに変更
// ----------------------------------------------------

async function main() {
  console.log('MCP Client Connection Test');
  console.log(`Connecting to server: ${SERVER_URL}`);

  const clientOptions: McpClientOptions = {
    serverUrl: SERVER_URL,
    clientName: 'mcp-test-client',
    clientVersion: '1.0.0',
    defaultTimeoutMs: 10000, // 10秒のタイムアウト
    // 必要に応じて protocolOptions や transportOptions を設定
    // protocolOptions: {
    //   enforceStrictCapabilities: true,
    // },
  };

  const client = new McpClient(clientOptions);
  let serverInfo: McpServerInformation | null = null;

  try {
    // 1. 接続テスト
    console.log('\nAttempting to connect...');
    serverInfo = await client.connect();
    console.log('Successfully connected!');

    // 2. サーバー情報の表示
    if (client.isConnected && serverInfo) {
      console.log('\n--- Server Information ---');
      console.log('Server Name:', serverInfo.serverInfo?.name);
      console.log('Server Version:', serverInfo.serverInfo?.version);
      console.log('Protocol Version:', serverInfo.protocolVersion || 'N/A');
      console.log('Instructions:', serverInfo.instructions || 'N/A');
      console.log('Capabilities:');
      if (serverInfo.serverCapabilities && Object.keys(serverInfo.serverCapabilities).length > 0) {
        for (const [key, value] of Object.entries(serverInfo.serverCapabilities)) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      } else {
        console.log('  (No capabilities reported or capabilities object is empty)');
      }
      console.log('--------------------------');
    } else {
      console.error('Connection established, but server information is not available or client is not marked as connected.');
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
    // 3. 切断テスト
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
      console.log('\nClient was not connected, no need to close.');
    }
  }

  console.log('\nConnection test finished.');
}

main().catch(e => {
  console.error("Unhandled error in main:", e);
});