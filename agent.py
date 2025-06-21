# agent.py

import asyncio
import os
import getpass
import json
from typing import Dict, Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

# 作成したカスタムツールをインポート
from tools.mcp_tools import all_tools

# --- セットアップ ---
def _set_env_var(var: str, prompt: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(prompt)

_set_env_var("GOOGLE_API_KEY", "Google API Key: ")

# --- 初期化 ---
console = Console()

model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", convert_system_message_to_human=True)
memory = MemorySaver()
agent_executor = create_react_agent(model, all_tools, checkpointer=memory)

def _print_message(message: BaseMessage, role: str):
    """メッセージの種類に応じて色付きで表示するヘルパー関数"""
    if not message:
        return

    if role.lower() == "user":
        console.print(Panel(str(message.content), title="[bold green]You[/bold green]", title_align="left"))

    elif role.lower() == "assistant":
        if isinstance(message, AIMessage):
            content = message.content or ""
            tool_calls = message.tool_calls or []

            if tool_calls:
                thought = f"🤔 **Thinking:**\n{content}\n\n" if content else "🤔 **Thinking...**\n"
                tool_calls_md = "🛠️ **Tool Calls:**\n"
                for tc in tool_calls:
                    tc_name = tc.get("name", "N/A")
                    tc_args = tc.get("args", {})
                    tool_calls_md += f"- **Tool:** `{tc_name}`\n- **Args:** `{json.dumps(tc_args)}`\n"
                console.print(Panel(Markdown(thought + tool_calls_md), title="[bold blue]Agent[/bold blue]", title_align="left", border_style="blue"))
            elif content:
                console.print(Panel(Markdown(content), title="[bold blue]Agent's Final Answer[/bold blue]", title_align="left", border_style="cyan"))

    elif role.lower() == "tool":
        if isinstance(message, ToolMessage):
            content_str = message.content or ""
            is_error = content_str.lower().startswith("error")
            panel_title = "[bold red]Tool Error[/bold red]" if is_error else "[bold yellow]Tool Output (Summarized)[/bold yellow]"
            panel_style = "red" if is_error else "yellow"
            
            # ▼▼▼▼▼ 変更点: JSONをパースして要約する ▼▼▼▼▼
            summary_md = ""
            try:
                data = json.loads(content_str)
                # google_searchの結果の要約
                if "metadata" in data and "search_results" in data:
                    summary_md += f"**Tool:** `google_search`\n"
                    summary_md += f"**Query:** `{data['metadata'].get('query_used', 'N/A')}`\n"
                    summary_md += f"**Results Found:** {len(data['search_results'])}\n\n"
                    summary_md += "**Top 3 Results:**\n"
                    for i, res in enumerate(data["search_results"][:3]):
                        summary_md += f"{i+1}. **{res.get('title', 'No Title')}**\n   - URL: {res.get('url', 'N/A')}\n"
                # crawl_websiteの結果の要約
                elif "crawl_summary" in data and "results_by_domain" in data:
                    summary_md += f"**Tool:** `crawl_website`\n"
                    summary_md += f"**Start URL:** `{data['crawl_summary'].get('start_url', 'N/A')}`\n"
                    summary_md += f"**URLs Visited:** {data['crawl_summary'].get('unique_urls_visited', 'N/A')}\n"
                    summary_md += f"**Emails Found:** {len(data.get('all_unique_emails_found', []))}\n"
                else:
                    # その他のJSONは短く表示
                    summary_md = f"```json\n{content_str[:1000]}...\n```"

            except json.JSONDecodeError:
                # JSONでなければそのまま表示
                summary_md = f"```\n{content_str[:1500]}...\n```"
            
            tool_call_id_str = message.tool_call_id or "N/A"
            md_output = f"Tool `{tool_call_id_str}` returned:\n\n{summary_md}"
            # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            console.print(Panel(Markdown(md_output), title=panel_title, title_align="left", border_style=panel_style))


async def main():
    """エージェントとの対話を実行するメイン関数"""
    console.print("[bold cyan]Scraping Agent Initialized (Model: Gemini).[/bold cyan]")
    console.print("MCPサーバーが起動していることを確認してください。")
    console.print("質問を入力してください（'exit' または 'quit' で終了）。")
    console.print("\n[italic gray]質問例:[/italic gray]")
    console.print("[italic gray]- LangChainとは何か、Webで検索して。[/italic gray]")
    console.print("[italic gray]- `https://www.langchain.com/` をクロールして、主要な機能をリストアップして。[/italic gray]")

    config = {"configurable": {"thread_id": "main_thread_gemini_v3"}}

    while True:
        try:
            user_input = await asyncio.to_thread(console.input, "[bold green]You:[/bold green] ")
            if user_input.lower() in ["exit", "quit"]:
                console.print("[bold cyan]Session ended. Goodbye![/bold cyan]")
                break
            if not user_input.strip():
                continue

            input_message = {"messages": [HumanMessage(content=user_input)]}

            # ▼▼▼▼▼ 変更点: stream_eventsのループを簡潔にし、最終結果を待つ ▼▼▼▼▼
            final_answer_message = None
            async for step in agent_executor.astream_events(input_message, config=config, version="v1"):
                kind = step["event"]
                data = step.get("data", {})
                
                # ユーザーの入力を表示 (一度だけ)
                if kind == "on_chain_start" and step.get("name") == "agent" and data.get("input", {}).get("messages"):
                     _print_message(data["input"]["messages"][-1], "user")
                
                # AIの思考（ツールコール）を表示
                elif kind == "on_chat_model_end" and data.get("output") and isinstance(data["output"], AIMessage) and data["output"].tool_calls:
                    _print_message(data["output"], "assistant")

                # ツールの実行結果を表示
                elif kind == "on_tool_end":
                    tool_output = data.get("output")
                    tool_call = data.get("tool_call")
                    if tool_output is not None and tool_call:
                        _print_message(ToolMessage(content=str(tool_output), tool_call_id=tool_call.get("id")), "tool")

                # エージェントの実行が完了した時点での最終的なメッセージを取得
                if kind == "on_chain_end" and step.get("name") == "agent":
                    output = data.get("output", {})
                    messages = output.get("messages")
                    if messages:
                        final_answer_message = messages[-1]
            
            # ループ終了後に最終回答を表示
            if final_answer_message:
                _print_message(final_answer_message, "assistant")
            else:
                 console.print("[bold red]Agent did not produce a final answer.[/bold red]")
            # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        except Exception as e:
            console.print(f"[bold red]An error occurred:[/bold red] {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[bold yellow]Interrupted by user. Exiting...[/bold yellow]")