# webapp.py (完全同期・最終安定版)

import streamlit as st
import os
import json
from uuid import uuid4
import traceback

from dotenv import load_dotenv

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# 同期的に呼び出せるツールをインポート
from tools.mcp_tools import all_tools

# --- 1. 初期設定 ---
load_dotenv()
st.set_page_config(page_title="ReAct-ive Web Agent", page_icon="🧠", layout="wide")

# --- 2. エージェントのセットアップ ---
@st.cache_resource
def setup_agent():
    if not os.getenv("GOOGLE_API_KEY"):
        raise ValueError("GOOGLE_API_KEYが設定されていません。.envファイルを確認してください。")
    
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning, module="langchain_google_genai")

    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", convert_system_message_to_human=True)
    memory = MemorySaver()
    agent_executor = create_react_agent(model, all_tools, checkpointer=memory)
    
    return agent_executor

# --- 3. セッション状態の初期化 ---
#SYSTEM_INSTRUCTION = """
#あなたは、優秀なWeb調査アシスタントです。ユーザーの指示に基づき、与えられたツールを駆使して情報を収集し、要約して回答します。
#あなたの行動原則は「思考-行動-観察-反復」です。一度のツール実行で結果が得られなかったり、エラーが出たりした場合は、決して諦めず、検索クエリを変えるなどアプローチを修正して、粘り強くタスクを遂行してください。
#"""
SYSTEM_INSTRUCTION = """
あなたは、優秀なWeb調査アシスタントです。ユーザーの指示に基づき、与えられたツールを駆使して情報を収集し、要約して回答します。

あなたの基本ワークフローと行動原則は以下の通りです:

**基本ワークフロー:**
1.  **一次調査 (google_search)**: まず、ユーザーの質問に関連する情報を `google_search` ツールを使って幅広く収集します。これにより、概要、関連キーワード、そして最も重要ないくつかのURLを特定します。
2.  **二次調査 (crawl_website)**: 一次調査で見つかった**最も重要そうなURL**に対して、`crawl_website` ツールを使って詳細な情報を収集します。これにより、特定のウェブサイトのコンテンツを深く掘り下げます。
3.  **情報統合と回答**: 上記の調査で得られたすべての情報を統合し、要約して、ユーザーに包括的な回答を生成します。

**行動原則:**
1.  **思考せよ (Thought)**: ユーザーの要求を分析し、タスクを達成するための計画を立てます。
2.  **行動せよ (Action)**: 計画に基づき、利用可能なツールの中から最適なものを選択し、実行します。
3.  **観察せよ (Observation)**: ツールの実行結果を注意深く観察します。
    **重要**: もしツールの結果が `FATAL_ERROR:` という文字列で始まる場合は、そのエラーは回復不能です。**それ以上のツール使用を直ちに中止し**、そのエラー内容をユーザーに分かりやすく報告してください。
4.  **反復せよ (Iteration)**: 観察結果が最終的な回答を生成するのに十分かどうかを判断します。
    - もし情報が不十分な場合や、ツールがエラーを返した場合は、諦めずに**計画を修正し、異なるツールや異なる引数で再度行動**します。例えば、検索クエリを変えたり、別のウェブサイトをクロールしたりします。
    - ユーザーに質問を投げかけ、調査の方向性を確認することも有効な手段です。
5.  **回答せよ**: すべての情報が揃った、あるいはFATAL_ERRORにより調査が続行不能になったと判断した場合にのみ、収集した情報を統合し、ユーザーに最終的な回答を生成します。

常にこの「思考-行動-観察-反復」のサイクルを意識して、粘り強くタスクを遂行してください。
このワークフローに従い、徹底的な調査を行ってください。
"""

if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid4())
if "messages" not in st.session_state:
    st.session_state.messages = [AIMessage(content=SYSTEM_INSTRUCTION)]

# --- 4. メイン処理 ---
try:
    agent_executor = setup_agent()
except ValueError as e:
    st.error(e)
    st.stop()

st.title("🧠 ReAct-ive Web Agent")
st.caption("I reason and act to fulfill your requests.")

with st.sidebar:
    st.header("Conversation Control")
    if st.button("New Chat", type="primary"):
        st.session_state.thread_id = str(uuid4())
        st.session_state.messages = [AIMessage(content=SYSTEM_INSTRUCTION)]
        st.rerun()
    st.markdown("---")
    st.markdown(f"**Thread ID:**\n`{st.session_state.thread_id}`")

# チャット履歴を表示 (最初のシステム指示は表示しない)
# スライスする前にリストの長さを確認
if len(st.session_state.messages) > 1:
    for msg in st.session_state.messages[1:]:
        if isinstance(msg, AIMessage):
            with st.chat_message("assistant", avatar="🤖"):
                # msg.content を安全に文字列に変換
                content_str = ""
                if isinstance(msg.content, str):
                    content_str = msg.content
                elif isinstance(msg.content, list):
                    # リストの場合は、テキスト部分を結合して一つの文字列にする
                    for part in msg.content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            content_str += part.get("text", "")

                # FATAL_ERRORの判定と表示
                if content_str.strip().startswith("FATAL_ERROR:"):
                    error_detail = content_str.replace("FATAL_ERROR:", "").strip()
                    if "api usage limit exceeded" in error_detail.lower():
                        st.error("APIリミットの上限(100回/月)に達しました。\n上限を超えて活用する場合は課金してください。")
                    else:
                        st.error(f"回復不能なエラーが発生しました: {error_detail}")
                
                # 通常のAIMessageの処理
                else:
                    if msg.tool_calls:
                         with st.status("🤔 Agent decided to use tools", expanded=False):
                            st.json([dict(tc) for tc in msg.tool_calls])
                    if content_str:
                        st.markdown(content_str)
                # --- ここまでが修正箇所 ---

        elif isinstance(msg, HumanMessage):
            with st.chat_message("user", avatar="👤"):
                st.markdown(msg.content)
        elif isinstance(msg, ToolMessage):
            with st.chat_message("tool", avatar="🛠️"):

                # msg.content を安全に文字列に変換
                content_str = str(msg.content) if msg.content is not None else ""

                with st.expander(f"Tool Output (ID: {msg.tool_call_id[:8]}...)", expanded=False):
                    is_error = content_str.lower().startswith("error") or content_str.lower().startswith("fatal_error:")
                    if is_error:
                        st.error(f"Tool Error: {content_str}")
                    else:
                        try:
                            st.json(json.loads(content_str))
                        except json.JSONDecodeError:
                            st.text(content_str)
                # --- ここまでが修正箇所 ---


# --- 5. ユーザー入力とエージェント実行 (完全同期) ---
if prompt := st.chat_input("Ask me to research something..."):
    # ユーザーのメッセージを現在の履歴に追加
    st.session_state.messages.append(HumanMessage(content=prompt))
    
    with st.chat_message("user", avatar="👤"):
        st.markdown(prompt)

    with st.spinner("🤖 Agent is processing... Please wait."):
        try:
            config = {"configurable": {"thread_id": st.session_state.thread_id}}
            
            # ▼▼▼▼▼ 変更点: 入力形式を 'messages' のみに統一 ▼▼▼▼▼
            agent_input = {"messages": st.session_state.messages}
            
            # ▼▼▼▼▼ 変更点: ainvokeから同期的なinvokeに全面変更 ▼▼▼▼▼
            response = agent_executor.invoke(agent_input, config)

            if response and "messages" in response:
                st.session_state.messages = response["messages"]
            else:
                st.session_state.messages.append(AIMessage(content="Sorry, I received an unexpected response from the agent."))

        except Exception:
            error_message = f"Sorry, a critical error occurred:\n\n```\n{traceback.format_exc()}\n```"
            st.session_state.messages.append(AIMessage(content=error_message))
    
    # 処理完了後にUIを再描画
    st.rerun()