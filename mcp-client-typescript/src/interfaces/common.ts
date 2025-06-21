// src/interfaces/common.ts
import type {
  CallToolResult as SdkCallToolResult,
  Tool as SdkTool,
  TextContent as SdkTextContent,
  ServerCapabilities as SdkServerCapabilities,
  Implementation as SdkImplementation,
  ClientCapabilities as SdkClientCapabilities,
} from '@modelcontextprotocol/sdk/types';

import type {
  RequestOptions as SdkRequestOptionsDefinition,
  ProtocolOptions as SdkProtocolOptionsDefinition,
} from '@modelcontextprotocol/sdk/shared/protocol'; // これが timeout を持つ

export interface RetryOptions {
  attempts: number;
  delayMs: number;
}

// クライアントライブラリがユーザーに提示するリクエストオプション
// SDKのRequestOptionsDefinitionをそのまま使うか、必要なら拡張する
export type McpClientRequestOptions = SdkRequestOptionsDefinition;

// クライアントライブラリがユーザーに提示するプロトコルオプション
export type McpClientProtocolOptions = SdkProtocolOptionsDefinition;

export type CallToolResult = SdkCallToolResult;
export type ToolDefinition = SdkTool;
export type TextContent = SdkTextContent;
export type ServerCapabilities = SdkServerCapabilities;
export type Implementation = SdkImplementation;
export type ClientCapabilities = SdkClientCapabilities;