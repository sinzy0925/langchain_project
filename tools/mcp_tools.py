# tools/mcp_tools.py (完全同期・安定版)

import json
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any, Literal
import sys

from langchain_core.tools import tool
from pydantic import BaseModel, Field

# --- 定数定義 ---
PROJECT_ROOT = Path(__file__).parent.parent
CLIENT_PROJECT_PATH = PROJECT_ROOT / "mcp-client-typescript"
CLIENT_SCRIPT_PATH = CLIENT_PROJECT_PATH / "src" / "run_tool.ts"
EXECUTION_TIMEOUT = 300.0
TSX_EXECUTABLE_NAME = "tsx.cmd" if sys.platform == "win32" else "tsx"
TSX_EXECUTABLE_PATH = CLIENT_PROJECT_PATH / "node_modules" / ".bin" / TSX_EXECUTABLE_NAME

# --- Pydanticモデル定義 (変更なし) ---
class CrawlWebsiteArgs(BaseModel):
    url: str = Field(description="クロールを開始するURL。")
    selector: str = Field(description="辿るリンクを指定するCSSセレクタ。例: 'a', '.content a'")
    max_depth: Optional[int] = Field(None)
    main_content_only: Optional[bool] = Field(None)
class GetGoogleAiSummaryArgs(BaseModel):
    query: str = Field(description="Googleで検索するクエリ文字列。")
class ScrapeLawPageArgs(BaseModel):
    url: str = Field(description="スクレイピング対象の法令ページのURL。")
    keyword: str = Field(description="条文テキスト内で検索するキーワード。")
class GoogleSearchArgs(BaseModel):
    query: str = Field(description="Googleで検索するクエリ文字列。")
    search_pages: Optional[int] = Field(None)

# --- 共通ヘルパー関数 (完全同期に変更) ---
def _run_mcp_tool_sync(tool_name: str, args_dict: Dict[str, Any]) -> str:
    """
    subprocessを同期的に使用してTypeScriptのクライアントスクリプトを実行する。
    """
    if not TSX_EXECUTABLE_PATH.is_file():
        return f"Error: tsx executable not found at '{TSX_EXECUTABLE_PATH}'. Please run 'npm install' in 'mcp-client-typescript'."
    
    command = [
        str(TSX_EXECUTABLE_PATH),
        str(CLIENT_SCRIPT_PATH),
        tool_name,
        json.dumps(args_dict, ensure_ascii=False)
    ]
    
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            encoding='utf-8',
            errors='ignore',
            timeout=EXECUTION_TIMEOUT,
            cwd=CLIENT_PROJECT_PATH,
            check=False
        )

        if result.returncode == 0:
            output = result.stdout.strip()
            try:
                data = json.loads(output)
                if isinstance(data, dict) and data.get("error") is True:
                    error_msg = data.get("message", "Unknown error from client script.")
                    if "api usage limit exceeded" in error_msg.lower():
                        return f"FATAL_ERROR: {error_msg}"
                    else:
                        return f"Error from tool '{tool_name}': {error_msg}"
            except json.JSONDecodeError:
                pass # JSONでなければ正常な出力とみなす
            return output or f"Tool '{tool_name}' returned no output."
        else:
            return (
                f"Error executing tool '{tool_name}': Subprocess failed with exit code {result.returncode}\n"
                f"Stderr: {result.stderr.strip() or 'N/A'}"
            )
            
    except subprocess.TimeoutExpired:
        return f"Error: Tool '{tool_name}' timed out after {EXECUTION_TIMEOUT} seconds."
    except FileNotFoundError:
        return f"Error: Command not found. Path: '{TSX_EXECUTABLE_PATH}'."
    except Exception as e:
        return f"An unexpected Python error occurred in subprocess execution for '{tool_name}': {e}"

# --- LangChainツール定義 (同期) ---

discripsion1 = """
google_search
インターネット上の情報を検索する必要がある場合に使用します。
ユーザーの質問に答えるために、時事問題、特定のトピック、製品、人物など、
あらゆる事柄について最新の情報をウェブから検索し、関連ページのコンテンツを取得します。

crawl_website
特定のウェブサイトの構造や内容を詳細に調査する場合に使用します。
指定されたURLからリンクを辿り、複数のページからテキスト、メールアドレス、電話番号を網羅的に収集します。


"""

@tool(args_schema=GoogleSearchArgs)
def google_search(query: str, search_pages: Optional[int] = 1) -> str:
    """
ユーザーの質問に答えるための初期調査として、まずこのツールを使用する。
広範なトピックについてウェブを検索し、概要、関連情報、そしてより詳細な情報源となるウェブサイトのURLを特定する。

    """
    args = {"query": query, "search_pages": search_pages}
    # Pydanticモデルの exclude_unset=True を使わないように引数を渡す
    validated_args = GoogleSearchArgs(**args).model_dump()
    return _run_mcp_tool_sync("google_search", validated_args)

@tool(args_schema=CrawlWebsiteArgs)
def crawl_website(url: str, selector: str = 'a', max_depth: Optional[int] = 1, main_content_only: Optional[bool] = False) -> str:
    """
google_searchで見つけた特定のウェブサイトについて、より深く、詳細な情報を得るために使用する。
指定されたURLのページ内容を直接読み取り、google_searchの結果では得られない具体的な情報を抽出する。
指定されたURLからリンクを辿り、複数のページからテキスト、メールアドレス、電話番号を網羅的に収集します。
    """
    args = {"url": url, "selector": selector, "max_depth": max_depth, "main_content_only": main_content_only}
    validated_args = CrawlWebsiteArgs(**args).model_dump()
    return _run_mcp_tool_sync("crawl_website", validated_args)

@tool(args_schema=GetGoogleAiSummaryArgs)
def get_google_ai_summary(query: str) -> str:
    """
    特定の検索クエリに対するGoogleのAI要約の「情報源」を調査したい、という特殊な場合にのみ使用する。
    """
    args = {"query": query}
    validated_args = GetGoogleAiSummaryArgs(**args).model_dump()
    return _run_mcp_tool_sync("get_google_ai_summary", validated_args)

@tool(args_schema=ScrapeLawPageArgs)
def scrape_law_page(url: str, keyword: str) -> str:
    """
法律や規則のウェブページから、特定のキーワードを含む条文を正確に抜き出す、法務調査に特化したツール.
    """
    args = {"url": url, "keyword": keyword}
    validated_args = ScrapeLawPageArgs(**args).model_dump()
    return _run_mcp_tool_sync("scrape_law_page", validated_args)

all_tools = [
    google_search,
    crawl_website,
    get_google_ai_summary,
    scrape_law_page,
]

def aaaa():
    # --- 直接実行によるテスト用のコード ---
    async def main_test():
        """
        このモジュールを直接実行した際のテスト用関数。
        各ツールを個別にテストできます。
        """
        print("--- Testing 'google_search' tool ---")
        test_args_google_search = {
            "query": "LangChain ReAct Agent",
            "search_pages": 1
        }
        result_google_search = await google_search.ainvoke(test_args_google_search)
        print("Result:")
        # 結果がJSON文字列なので、見やすくするためにパースして表示
        try:
            print(json.dumps(json.loads(result_google_search), indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print(result_google_search) # パース失敗時は生の結果を表示

        print("\n" + "="*50 + "\n")

        print("--- Testing 'crawl_website' tool (with local file) ---")
        # テスト用のローカルHTMLファイルを作成
        test_html_content = """
        <html><head><title>Test Page</title></head>
        <body><h1>Local Test</h1><a href="https://langchain.com">LangChain Official</a></body>
        </html>
        """
        test_html_path = PROJECT_ROOT / "test_page.html"
        test_html_path.write_text(test_html_content, encoding='utf-8')
        
        test_args_crawl = {
            "url": test_html_path.as_uri(), # 'file:///...' 形式のURL
            "selector": "a"
        }
        result_crawl = await crawl_website.ainvoke(test_args_crawl)
        print("Result:")
        try:
            print(json.dumps(json.loads(result_crawl), indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print(result_crawl)
        
        # テスト用ファイルを削除
        test_html_path.unlink()


    if __name__ == "__main__":
        # このスクリプトを直接実行した場合、非同期のテスト関数を実行
        # 注: このテストを実行するには、MCPサーバーと`run_tool.ts`が正しくセットアップされている必要があります。
        print("Running mcp_tools.py standalone test...")
        asyncio.run(main_test())