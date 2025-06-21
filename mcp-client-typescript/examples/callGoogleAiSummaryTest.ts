// examples/callGoogleAiSummaryTest.ts
import {
    McpClient,
    McpClientOptions,
    GetGoogleAiSummaryArgs,
    GetGoogleAiSummaryResult,
    AiSummaryResultItem,
    McpClientRequestOptions,
    McpToolExecutionError,
    McpResponseParseError
  } from '../src/index';
  
  const SERVER_URL = 'http://localhost:3001/mcp';
  
  async function main() {
    console.log('MCP Client Call Tool Test (get_google_ai_summary)');
    console.log(`Connecting to server: ${SERVER_URL}`);
  
    const clientOptions: McpClientOptions = {
      serverUrl: SERVER_URL,
      clientName: 'mcp-test-client-googleai',
      clientVersion: '1.0.4',
      defaultTimeout: 60000,
    };
  
    const client = new McpClient(clientOptions);
  
    try {
      console.log('\nAttempting to connect...');
      await client.connect();
      console.log('Successfully connected!');
  
      if (client.isConnected) {
        console.log('\n--- Calling get_google_ai_summary tool ---');
  
        const toolArgs: GetGoogleAiSummaryArgs = {
          query: 'AIとは何か', // テストしたい検索クエリ
        };
  
        const callOptions: McpClientRequestOptions = {
          timeout: 90000,
        };
  
        console.log(`Args: ${JSON.stringify(toolArgs)}`);
        console.log('Calling tool, please wait...');
  
        const result: GetGoogleAiSummaryResult = await client.getGoogleAiSummary(toolArgs, callOptions);
  
        console.log('\n--- Tool Result (Get Google AI Summary) ---');
        console.log('Query:', result.query);
        if(result.execution_datetime) console.log('Execution Datetime:', result.execution_datetime);
  
        console.log('\nAI Summary Results Count:', result.ai_summary_results_count ?? 'N/A');
        console.log('AI Summary Source List:');
        if (result.ai_summary_results && result.ai_summary_results.length > 0) {
          result.ai_summary_results.forEach((item, index) => {
            console.log(`  AI Source #${index + 1}:`);
            console.log(`    Title: ${item.title}`);
            console.log(`    URL: ${item.url}`);
            console.log(`    Source Type: ${item.source_type}`);
          });
        } else {
          console.log('  No AI summary sources found.');
        }
  
        console.log('\nGoogle Search Results Count:', result.google_search_results_count ?? 'N/A');
        console.log('Google Search Results List:');
        if (result.google_search_results && result.google_search_results.length > 0) {
          result.google_search_results.forEach((item, index) => {
            console.log(`  Search Result #${index + 1}:`);
            console.log(`    Title: ${item.title}`);
            console.log(`    URL: ${item.url}`);
            console.log(`    Source Type: ${item.source_type}`);
          });
        } else {
          console.log('  No Google search results found.');
        }
        console.log('-------------------------------------------');
  
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
  
    console.log('\nCall get_google_ai_summary tool test finished.');
  }
  
  main().catch(e => {
    console.error("Unhandled error in main:", e);
  });