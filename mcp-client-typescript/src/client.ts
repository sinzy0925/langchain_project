// src/client.ts
import { GoogleSearchArgs } from './interfaces/toolArgs/googleSearchArgs'; // ★★★ 追加
import { GoogleSearchResult } from './interfaces/toolResults/googleSearchResult'; // ★★★ 追加

import {
  Client as SdkClient,
} from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport as SdkClientTransport } from '@modelcontextprotocol/sdk/shared/transport.js';

import {
  McpError,
  ErrorCode,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type {
  RequestOptions as SdkRequestOptions,
  ProtocolOptions as SdkProtocolOptions,
} from '@modelcontextprotocol/sdk/shared/protocol.js';

import type {
  CallToolResult as SdkCallToolResultType,
  Tool as SdkToolType,
  TextContent as SdkTextContentType,
  ServerCapabilities as SdkServerCapabilitiesType,
  Implementation as SdkImplementationType,
  ClientCapabilities as SdkClientCapabilitiesType,
  CallToolRequest,
  ListToolsRequest,
  TextContent, ImageContent, AudioContent, 
  //ResourceContent, // SDKのContent型
} from '@modelcontextprotocol/sdk/types.js';

import {
  McpClientError,
  McpConnectionError,
  McpToolExecutionError,
  McpResponseParseError,
} from './errors/mcpClientError.js';
import type {
  GetGoogleAiSummaryArgs,
  CrawlWebsiteArgs,
  ScrapeLawPageArgs,
} from './interfaces/toolArgs/index.js';
import type {
  GetGoogleAiSummaryResult,
  CrawlWebsiteResult,
  ScrapeLawPageResult,
  CheckApiUsageResult, // ★★★ 追加
} from './interfaces/toolResults/index.js';
import type {
  RetryOptions,
  McpClientRequestOptions,
  McpClientProtocolOptions,
  ToolDefinition,
  CallToolResult, // common.ts で SdkCallToolResultType を再エクスポート
  // TextContent, // TextContentはSDKのtypesから直接使うか、common.tsで再エクスポート
  ServerCapabilities,
  Implementation,
} from './interfaces/common.js';

type AnyContentItemForClient = TextContent | ImageContent | AudioContent ;//| ResourceContent;


export interface McpServerInformation {
  serverInfo?: Implementation;
  serverCapabilities?: ServerCapabilities;
  instructions?: string;
  protocolVersion?: string;
}

export interface McpClientOptions {
  serverUrl: string;
  clientName?: string;
  clientVersion?: string;
  clientCapabilities?: SdkClientCapabilitiesType;
  defaultTimeout?: number;
  defaultRetryOptions?: RetryOptions;
  transportOptions?: Partial<StreamableHTTPClientTransportOptions>;
  protocolOptions?: McpClientProtocolOptions;
}

const DEFAULT_CLIENT_NAME = 'mcp-client-typescript';
const DEFAULT_CLIENT_VERSION = '0.1.0';
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

export class McpClient {
  private sdkClient: SdkClient;
  private serverUrl: URL;
  private options: Required<Omit<McpClientOptions, 'transportOptions' | 'clientCapabilities' | 'protocolOptions' | 'defaultTimeout'>> &
                   Pick<McpClientOptions, 'transportOptions' | 'clientCapabilities' | 'protocolOptions'> &
                   { defaultTimeout: number };

  private transport: SdkClientTransport | null = null;
  private _isConnected = false;

  constructor(options: McpClientOptions) {
    const clientImpl: SdkImplementationType = {
      name: options.clientName || DEFAULT_CLIENT_NAME,
      version: options.clientVersion || DEFAULT_CLIENT_VERSION,
    };

    this.options = {
      serverUrl: options.serverUrl,
      clientName: clientImpl.name,
      clientVersion: clientImpl.version,
      clientCapabilities: options.clientCapabilities || {},
      defaultTimeout: options.defaultTimeout || DEFAULT_TIMEOUT,
      defaultRetryOptions: options.defaultRetryOptions || {
        attempts: DEFAULT_RETRY_ATTEMPTS,
        delayMs: DEFAULT_RETRY_DELAY_MS,
      },
      transportOptions: options.transportOptions || {},
      protocolOptions: options.protocolOptions || {},
    };
    this.serverUrl = new URL(this.options.serverUrl);

    this.sdkClient = new SdkClient(
        clientImpl,
        this.options.protocolOptions
    );
  }

  public get isConnected(): boolean {
    return this._isConnected && this.transport !== null;
  }

  public get serverInformation(): McpServerInformation | null {
    if (!this.isConnected || !this.sdkClient) return null;
    const serverImpl = this.sdkClient.getServerVersion();
    const serverCaps = this.sdkClient.getServerCapabilities();
    const instructions = this.sdkClient.getInstructions();
    const protocolVersion = (this.transport as any)?.protocolVersion;

    return {
      serverInfo: serverImpl,
      serverCapabilities: serverCaps,
      instructions: instructions,
      protocolVersion: typeof protocolVersion === 'string' ? protocolVersion : undefined,
    };
  }

  async connect(transport?: SdkClientTransport): Promise<McpServerInformation> {
    if (this.isConnected) {
      console.warn('MCP Client is already connected.');
      const currentInfo = this.serverInformation;
      if (currentInfo) return currentInfo;
      throw new McpClientError("Already connected, but server information is unavailable.");
    }

    this.transport = transport || new StreamableHTTPClientTransport(
      this.serverUrl,
      this.options.transportOptions
    );

    try {
      const connectOptions: SdkRequestOptions = {
        timeout: this.options.defaultTimeout,
      };
      await this.sdkClient.connect(this.transport, connectOptions);

      this._isConnected = true;
      console.warn(`MCP Client connected to: ${this.serverUrl.toString()}`); // console.warn に変更
      const info = this.serverInformation;
      if (!info || !info.serverInfo || !info.serverCapabilities) {
          this._isConnected = false;
          await this.safelyCloseTransport();
          throw new McpConnectionError("Connected, but failed to retrieve essential server information from SDK client.");
      }
      return info;

    } catch (e: unknown) {
      this._isConnected = false;
      await this.safelyCloseTransport();
      const error = e instanceof Error ? e : new Error(String(e));
      if (error instanceof McpError && error.code === ErrorCode.ConnectionClosed && error.message.includes("Server's protocol version is not supported")) {
          throw new McpConnectionError(`Protocol version mismatch or other initialization failure: ${error.message}`, error);
      }
      if (error instanceof McpError && error.code === ErrorCode.RequestTimeout) {
        throw this.handleError(error, `Connection to ${this.serverUrl.toString()} failed (Timeout: ${ (error.data as any)?.timeout || this.options.defaultTimeout })`);
      }
      throw this.handleError(error, `Connection to ${this.serverUrl.toString()} failed`);
    }
  }

  private async safelyCloseTransport() {
    if (this.transport && typeof (this.transport as any).close === 'function') {
      try {
        await (this.transport as any).close();
      } catch (closeError: unknown) {
        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
        console.warn("MCP Client: Failed to close transport after an error:", err.message);
      }
    }
    this.transport = null;
  }

  async close(): Promise<void> {
    if (!this.isConnected && !this.transport) {
      console.warn('MCP Client is not connected or already closed.');
      return;
    }
    try {
      if (this.sdkClient) {
        await this.sdkClient.close();
      }
    } catch (sdkCloseError: unknown) {
        const error = sdkCloseError instanceof Error ? sdkCloseError : new Error(String(sdkCloseError));
        console.warn("MCP Client: Error during sdkClient.close():", error.message);
    } finally {
        if (this.transport && typeof (this.transport as any).close === 'function') {
            await this.safelyCloseTransport();
        }
        this._isConnected = false;
        console.warn(`MCP Client disconnected from: ${this.serverUrl.toString()}`); // console.warn に変更
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new McpConnectionError('Client is not connected. Call connect() first.');
    }
  }

  async listTools(params?: ListToolsRequest["params"], options?: McpClientRequestOptions): Promise<ToolDefinition[]> {
    this.ensureConnected();
    try {
      const requestParams: ListToolsRequest['params'] = params || {};
      const sdkOptions: SdkRequestOptions = {
        timeout: this.options.defaultTimeout,
        ...(options || {}),
      };
      if (options?.timeout !== undefined) {
        sdkOptions.timeout = options.timeout;
      }

      const result = await this.sdkClient.listTools(requestParams, sdkOptions);
      return result.tools as ToolDefinition[];
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to list tools');
    }
  }

  protected async callToolRaw(
    toolName: string,
    args: Record<string, any>,
    retryOptions?: RetryOptions,
    requestOptionsParam?: McpClientRequestOptions
  ): Promise<CallToolResult> {
    this.ensureConnected();
    const R_OPTIONS = retryOptions || this.options.defaultRetryOptions;
    let attempts = 0;
    let lastError: unknown;

    while (true) {
      attempts++;
      try {
        const callParams: CallToolRequest['params'] = { name: toolName, arguments: args };
        const sdkOptions: SdkRequestOptions = {
            timeout: this.options.defaultTimeout,
            ...(requestOptionsParam || {}),
        };
        if (requestOptionsParam?.timeout !== undefined) {
            sdkOptions.timeout = requestOptionsParam.timeout;
        }

        const resultFromSdk = await this.sdkClient.callTool(callParams, CallToolResultSchema, sdkOptions);

        if (!resultFromSdk || typeof resultFromSdk.content === 'undefined') {
            throw new McpResponseParseError(`Tool '${toolName}' response is missing 'content' property after Zod parsing.`, resultFromSdk as any);
        }
        const result: SdkCallToolResultType = resultFromSdk as SdkCallToolResultType;

        if (result.isError) {
          console.warn(`[MCP Client] Tool '${toolName}' execution returned isError: true from server.`);
          throw new McpToolExecutionError(
            `Tool '${toolName}' reported an execution error via isError flag.`,
            result.content as AnyContentItemForClient[],
            result
          );
        }
        return result;
      } catch (e: unknown) {
        lastError = e;
        const error = e instanceof Error ? e : new Error(String(e));

        if (error instanceof McpError && error.code === ErrorCode.InvalidParams) {
            throw new McpClientError(`Invalid parameters for tool '${toolName}': ${error.message}`, error.data || error);
        }

        const errorMessage = error.message;
        console.warn(`MCP Client: Attempt ${attempts} for tool '${toolName}' failed: ${errorMessage}`);

        if (attempts >= R_OPTIONS.attempts) {
          break;
        }
        if (this.isRetryableError(e)) {
          const delay = R_OPTIONS.delayMs * Math.pow(2, attempts - 1);
          console.log(`MCP Client: Retrying tool '${toolName}' in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
    if (lastError instanceof McpError && lastError.data && (lastError.data as SdkCallToolResultType).isError) {
        const toolResultFromError = lastError.data as SdkCallToolResultType;
        throw new McpToolExecutionError(
            `Tool '${toolName}' reported an execution error after ${attempts} attempts (from McpError.data).`,
            toolResultFromError.content as AnyContentItemForClient[],
            toolResultFromError
        );
    }
    throw this.handleError(lastError, `Failed to call tool '${toolName}' after ${attempts} attempts`);
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof McpError) {
      // ★ SDKのErrorCodeを確認し、適切なサーバーエラーコードを使用する
      // 例: ErrorCode.InternalError, ErrorCode.ServiceUnavailable など
      // ここでは仮に ErrorCode.InternalError を使用。実際のSDKの定義に合わせてください。
      const retryableSdkCodes = [ErrorCode.RequestTimeout, ErrorCode.ConnectionClosed, ErrorCode.InternalError];
      return retryableSdkCodes.includes(error.code);
    }
    if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
            return true;
        }
    }
    const errorMessage = String(error).toLowerCase();
    return errorMessage.includes('network error') ||
           errorMessage.includes('connection refused') ||
           errorMessage.includes('econnreset') ||
           errorMessage.includes('econnaborted');
  }

  async getGoogleAiSummary(args: GetGoogleAiSummaryArgs, requestOptions?: McpClientRequestOptions): Promise<GetGoogleAiSummaryResult> {
    const result = await this.callToolRaw('get_google_ai_summary', args as unknown as Record<string, any>, undefined, requestOptions);
    return this.parseToolResult<GetGoogleAiSummaryResult>(result, 'get_google_ai_summary');
  }

  async crawlWebsite(args: CrawlWebsiteArgs, requestOptions?: McpClientRequestOptions): Promise<CrawlWebsiteResult> {
    const result = await this.callToolRaw('crawl_website', args as unknown as Record<string, any>, undefined, requestOptions);
    return this.parseToolResult<CrawlWebsiteResult>(result, 'crawl_website');
  }

  async scrapeLawPage(args: ScrapeLawPageArgs, requestOptions?: McpClientRequestOptions): Promise<ScrapeLawPageResult> {
    const result = await this.callToolRaw('scrape_law_page', args as unknown as Record<string, any>, undefined, requestOptions);
    return this.parseToolResult<ScrapeLawPageResult>(result, 'scrape_law_page');
  }

  async googleSearch(args: GoogleSearchArgs,requestOptions?: McpClientRequestOptions): Promise<GoogleSearchResult> {
    const result = await this.callToolRaw('google_search', args as unknown as Record<string, any>, undefined, requestOptions);
    return this.parseToolResult<GoogleSearchResult>(result, 'google_search');
  }

  // ★★★ 新規追加: getCounter メソッド ★★★
  async getCounter(requestOptions?: McpClientRequestOptions): Promise<CheckApiUsageResult> {
    const result = await this.callToolRaw('get_counter', {}, undefined, requestOptions);
    return this.parseToolResult<CheckApiUsageResult>(result, 'get_counter');
  }
  // ★★★ ここまで ★★★

  private parseToolResult<T>(result: CallToolResult, toolName: string): T {
    if (result.isError) {
        console.warn(`[MCP Client] parseToolResult received a result with isError: true for tool '${toolName}'. This should ideally be caught before parseToolResult.`);
        throw new McpToolExecutionError(
            `Tool '${toolName}' reported an execution error (parsed in parseToolResult).`,
            result.content as AnyContentItemForClient[],
            result
        );
    }
    if (!result.content || result.content.length === 0) {
      throw new McpResponseParseError(`No content found in successful result for tool '${toolName}'.`, result);
    }
    const textContentItem = result.content.find(
        (c): c is SdkTextContentType => c.type === 'text'
    );
    if (!textContentItem || typeof textContentItem.text !== 'string') {
      throw new McpResponseParseError(`No text content found in successful result for tool '${toolName}'.`, result);
    }
    try {
      return JSON.parse(textContentItem.text) as T;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      throw new McpResponseParseError(
        `Failed to parse JSON result for tool '${toolName}': ${error.message}`,
        textContentItem.text,
        error
      );
    }
  }

  private handleError(error: unknown, contextMessage: string): McpClientError {
    if (error instanceof McpClientError) {
      return error;
    }
    if (error instanceof McpError) {
      let message = `${contextMessage}: SDK Error code ${error.code} - ${error.message}`;
      if (error.data && typeof error.data === 'object') {
        if ('timeout' in error.data && typeof (error.data as any).timeout === 'number') {
          message += ` (Timeout: ${(error.data as any).timeout})`;
        }
      }
      return new McpClientError(message, error.data || error);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network error') ||
        message.toLowerCase().includes('connection refused') ||
        message.toLowerCase().includes('econnreset') ||
        message.toLowerCase().includes('econnaborted')
    ) {
        return new McpConnectionError(`${contextMessage}: ${message}`, error);
    }
    return new McpClientError(`${contextMessage}: ${message}`, error);
  }
}
