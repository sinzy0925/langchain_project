// src/errors/mcpClientError.ts
import type {
  CallToolResult as SdkCallToolResult,
  // SDK の types.d.ts を確認し、CallToolResult の content プロパティの要素の型を正確に把握する
  // 例: TextContent, ImageContent, AudioContent, ResourceContent など
  // これらをまとめた ContentItem のような型がエクスポートされていればそれを使う
  // エクスポートされていなければ、ここでユニオン型を定義するか、any[] にする（最終手段）
  TextContent, // 基本として
  ImageContent, // エラーメッセージにあったので追加
  AudioContent, // 追加の可能性
  //ResourceContent, // 追加の可能性
  // もしSDKが ContentItem[] のような型エイリアスを提供していればそれがベスト
} from '@modelcontextprotocol/sdk/types';

// SDKの content 配列の要素の型 (仮の定義、SDKの型定義に合わせて修正)
type AnyContentItem = TextContent | ImageContent | AudioContent ;//| ResourceContent; // 他にもあれば追加

// ベースとなるエラークラス
export class McpClientError extends Error {
public readonly originalError?: unknown;

constructor(message: string, originalError?: unknown) {
  super(message);
  this.name = this.constructor.name;
  this.originalError = originalError;
  Object.setPrototypeOf(this, McpClientError.prototype);
}
}

// 接続関連のエラー
export class McpConnectionError extends McpClientError {
constructor(message: string, originalError?: unknown) {
  super(message, originalError);
  this.name = 'McpConnectionError';
  Object.setPrototypeOf(this, McpConnectionError.prototype);
}
}

// ツール実行時のエラー (サーバー側でエラーが報告された場合)
export class McpToolExecutionError extends McpClientError {
public readonly toolResult?: SdkCallToolResult;
public readonly toolOutputContent?: AnyContentItem[]; // ★ 型を AnyContentItem[] に変更

constructor(message: string, content?: AnyContentItem[], toolResult?: SdkCallToolResult) { // ★ 型を変更
  super(message, toolResult);
  this.name = 'McpToolExecutionError';
  this.toolResult = toolResult;
  this.toolOutputContent = content;
  Object.setPrototypeOf(this, McpToolExecutionError.prototype);
}
}

// レスポンス解析時のエラー
export class McpResponseParseError extends McpClientError {
public readonly rawResponse?: string | SdkCallToolResult;

constructor(message: string, rawResponse?: string | SdkCallToolResult, originalError?: unknown) {
  super(message, originalError);
  this.name = 'McpResponseParseError';
  this.rawResponse = rawResponse;
  Object.setPrototypeOf(this, McpResponseParseError.prototype);
}
}