# README_rangchain_project.md

```markdown
# ReAct-ive Web Agent: 高度WebリサーチAIエージェント

## 1. プロジェクト概要

このプロジェクトは、大規模言語モデル（LLM）を活用した自律型WebリサーチAIエージェントです。ユーザーからの自然言語による調査依頼に基づき、エージェントが自ら思考し、計画を立て、複数のツールを駆使してWebから情報を収集・統合し、質の高い回答を生成します。

UIはStreamlitで構築されており、バックエンドではLangChain/LangGraphの**ReAct (Reason and Act)** フレームワークを採用。エージェントが利用するツール群は、**Model-Context-Protocol (MCP)** という独自のプロトコルを介して、外部のPython製高機能スクレイピングアプリケーションを呼び出すという、堅牢かつ拡張性の高いアーキテクチャを特徴としています。

### 主要技術スタック
- **AI / エージェント:**
  - **LangChain / LangGraph:** ReActエージェントの構築と実行
  - **Google Gemini:** 中核となるLLM (`gemini-2.5-flash`)
- **Webアプリケーション (UI):**
  - **Streamlit:** PythonによるインタラクティブなチャットUI
- **ツール実行バックエンド:**
  - **TypeScript / Node.js:** ツール実行を仲介するMCPサーバーとクライアント
  - **Express:** MCPサーバーの基盤となるWebフレームワーク
  - **Zod:** ツール入出力の厳密な型検証
- **外部ツール (依存関係):**
  - **高機能スクレイピングフレームワーク (Python/.exe):** 実際のWebアクセスやデータ抽出を行う、前回分析したアプリケーション（別途ビルド・配置が必要）

---

## 2. システムアーキテクチャ

本システムは、ユーザーの要求を達成するために複数のコンポーネントが連携する多層アーキテクチャを採用しています。

**処理フロー:**
`ユーザー入力 -> [1. Streamlit UI] -> [2. LangChain Agent] -> [3. MCP Tools (Python)] -> [4. Subprocess(tsx)] -> [5. MCP Client (TS)] -> [6. MCP Server (TS)] -> [7. Scraper.exe (Python)]`

1.  **UI層 (`webapp_react.py`)**:
    - Streamlitで構築されたチャットインターフェース。ユーザーからの入力を受け付け、エージェントの思考プロセスと最終的な回答を表示します。

2.  **エージェント層 (Python / LangChain)**:
    - `webapp_react.py`内で定義されるReActエージェント。
    - `get_system_instruction()`で定義された思考フレームワーク（計画→調査→深掘り→自己評価→統合）に従い、どのツールをどの引数で使うべきかを判断します。

3.  **ツール定義層 (`tools/mcp_tools.py`)**:
    - LangChainエージェントが利用可能なツール（`google_search`, `crawl_website`など）をPython関数として定義。
    - 各関数はPydanticモデルで引数を厳密に定義しています。

4.  **ツール実行ブリッジ層 (Python -> TypeScript)**:
    - `mcp_tools.py`内のツール関数は、実際には`_run_mcp_tool_sync`ヘルパーを呼び出します。
    - このヘルパーは`subprocess`を使い、TypeScriptで書かれたMCPクライアント (`run_tool.ts`) をコマンドラインから実行します。

5.  **MCPクライアント層 (`mcp-client-typescript/`)**:
    - TypeScriptで記述されたライブラリ。
    - `run_tool.ts`がPythonからの引数を受け取り、`McpClient`クラスを用いてMCPサーバーにHTTPリクエストを送信します。

6.  **MCPサーバー層 (`mcp-server-typescript/`)**:
    - Node.jsとExpressで動作するHTTPサーバー。
    - `/mcp`エンドポイントでリクエストを待ち受け、Model-Context-Protocolに従ってツール呼び出しを処理します。
    - 受け取ったリクエストに基づき、最終的なスクレイピングタスクを実行する**Python製の実行ファイル (`YourScrapingApp.exe`)** をサブプロセスとして呼び出します。

7.  **スクレイピング実行層 (Python/.exe)**:
    - 実際にWebサイトにアクセスし、HTMLやPDF、各種ドキュメントのスクレイピングを行うバックエンドの本体。
    - このプロジェクトでは、**前回分析した高機能スクレイピングフレームワークが`.exe`としてビルドされ、`mcp-server-typescript/bin/`に配置されていること**を前提としています。
    - 実行結果はJSON形式で標準出力に返され、MCPサーバーが受け取ります。

---

## 3. 主要コンポーネント解説

### `webapp_react.py` - Streamlitアプリケーション
- **役割**: ユーザーとの対話インターフェースと、LangChainエージェントのホスト。
- **特徴**:
  - ユーザー入力後にエージェントが思考を開始すると、入力欄を無効化し、スピナーを表示する非同期風のUIを実現。
  - セッションごとにユニークな`thread_id`を割り当て、`MemorySaver`で会話履歴を管理。
  - エージェントの思考過程（Tool Calls）やツールの実行結果を整形して表示。
  - エージェントの無限ループを防ぐため、`max_iterations`が設定されている。

### `tools/mcp_tools.py` - LangChainツール
- **役割**: LangChainエージェントに提供される「能力」の定義。
- **提供ツール**:
  - `google_search`: Web検索を行い、関連ページのコンテンツをまとめて取得する。初期調査に最適。
  - `crawl_website`: 特定のURLを起点にサイト内を深くクロールし、コンテンツやメールアドレスなどを網羅的に収集する。
  - `get_google_ai_summary`: Googleの「AIによる概要」の参照元URLリストを取得する特殊ツール。
  - `scrape_law_page`: 法令サイトからキーワードに関連する条文を構造的に抽出する専門ツール。

### `mcp-server-typescript/` - MCPサーバー
- **役割**: LangChainエージェント（Python）とスクレイピング実行部（Python/.exe）を疎結合にするための中間サーバー。
- **プロトコル**: Model-Context-Protocol (MCP) を実装し、ツールの一覧提供（listTools）と実行（callTool）を標準化。
- **実行**: `server.ts`がExpressサーバーを起動。Zodスキーマを用いて各ツールの入力値を厳格に検証し、`runYourScrapingAppTool`関数を介して`.exe`を安全に呼び出す。

### `mcp-client-typescript/` - MCPクライアント
- **役割**: MCPサーバーと通信するためのTypeScript製クライアントライブラリ。
- **実行**: `run_tool.ts`がエントリーポイント。Pythonの`subprocess`から呼び出され、指定されたツール名と引数でサーバーにリクエストを行う。
- **型定義**: Zodスキーマに基づいた厳密な型定義ファイル（`src/interfaces/`）を持ち、安全なデータ交換を実現。

---

## 4. セットアップと実行

本アプリケーションは複数のコンポーネントから構成されるため、それぞれのセットアップが必要です。

### 前提条件
- Node.js (v18.0.0以上)
- Python (3.9以上)
- 事前にビルドされた `YourScrapingApp.exe` (前回のスクレイピングフレームワークの成果物)

### 手順
1.  **リポジトリのクローンと依存関係のインストール:**
    ```bash
    git clone <repository_url>
    cd <repository_name>

    # Python環境のセットアップ
    python -m venv venv
    # Windows: .\venv\Scripts\activate | macOS/Linux: source venv/bin/activate
    pip install -r requirements.txt

    # MCPサーバーのセットアップ
    cd mcp-server-typescript
    npm install
    npm run build
    cd ..

    # MCPクライアントのセットアップ
    cd mcp-client-typescript
    npm install
    npm run build
    cd ..
    ```

2.  **環境変数の設定:**
    - ルートディレクトリに`.env`ファイルを作成します。
    - **Google Gemini APIキー**を設定します。
      ```.env
      GOOGLE_API_KEY="AIza..."
      ```
    - `mcp-server-typescript`ディレクトリにも`.env`ファイルを作成し、スクレイピング実行ファイルへのパスを設定します。
      ```.env
      # (mcp-server-typescript/.env)
      YOURSCRAPINGAPP_EXE_PATH="C:\\path\\to\\your\\project\\mcp-server-typescript\\bin\\YourScrapingApp.exe"
      ```

3.  **アプリケーションの起動:**
    - **ターミナル1:** MCPサーバーを起動します。
      ```bash
      cd mcp-server-typescript
      npm start
      ```
      サーバーが `http://localhost:3001/mcp` でリクエストを待ち受けます。

    - **ターミナル2:** Streamlit Webアプリケーションを起動します。
      ```bash
      # プロジェクトのルートディレクトリで実行
      streamlit run webapp_react.py
      ```
      ブラウザで `http://localhost:8501` が開きます。

4.  **利用:**
    - Streamlitのチャット画面で、調査したい内容を入力してください。エージェントが思考し、ツールを実行する様子がリアルタイムで表示されます。

---

## 5. 補足情報

- **ランディングページ (`index.html`, `my-website.html`)**: 本アプリケーションを商用サービスとして提供する場合のコンセプトページです。料金プランやポリシーが記載されており、Stripe決済の導入を想定していることが示唆されます。
- **Geminiモデルリスト (`list_gemini_models.py`)**: `google-generativeai`ライブラリで利用可能なモデルを確認するためのユーティリティスクリプトです。
```