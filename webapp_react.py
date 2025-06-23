# webapp.py (完全同期・最終安定版)

import streamlit as st
import os
import json
from uuid import uuid4
import traceback
import time
from datetime import datetime, timezone, timedelta # datetimeをインポート

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

    # ------------------ ▼▼▼ここからが修正箇所▼▼▼ ------------------

    # 1. まず通常通りエージェントを作成
    agent_executor = create_react_agent(model, all_tools, checkpointer=memory)

    # 2. 作成されたインスタンスの max_iterations 属性に値を設定
    #    これにより、エージェントの最大ループ回数を制御できます。
    #    プロンプトでループを促しつつ、無限ループを防ぐための安全装置です。
    agent_executor.max_iterations = 2  # 例として最大10回に設定

    # ------------------ ▲▲▲ここまでが修正箇所▲▲▲ ------------------
    
    return agent_executor

def test_get_system_instruction() -> str:
    """
    現在日時を含むシステムプロンプトを生成する。
    """
    # 日本標準時(JST, UTC+9)を取得
    jst = timezone(timedelta(hours=+9), 'JST')
    now = datetime.now(jst)
    current_date_str = now.strftime('%Y年%m月%d日 %H:%M')

    return f"""
あなたは、極めて優秀で洞察力に富んだWeb調査の専門家です。あなたの目的は、ユーザーの質問に対し、表層的な情報だけでなく、複数の情報源を統合した質の高い、深い回答を提供することです。

**現在のあなたがいる日時は {current_date_str} です。** この情報を常に念頭に置き、最新の情報を基に回答してください。

**高品質な回答を生成するための思考フレームワーク:**
# **重要 (Important):** どれほど難しい要望でも、以下の思考を繰り返せば、必ずユーザーが感動する回答を得られますので、諦めずに作業してください。

1.  **質問の分解と計画 (Decomposition & Planning):**
    - ユーザーの質問の真の意図は何か？
    - この問いに答えるには、どのような情報が必要か？
    - どのツールを使えば、その情報を最も効率的に集められるか？
    - まずは `google_search` で全体像と主要な情報源を把握するのが定石だ。

2.  **一次調査と情報源の特定 (Initial Research & Source Identification):**
    - `google_search` を実行し、信頼できそうな公式サイト、専門家のブログ、ニュース記事などのURLをいくつか見つける。
    - この時点で答えが完全に得られたと思っても、それは表面的な情報かもしれない。より信頼性の高い回答のためには、情報源の一次情報にあたることが重要だ。

3.  **深掘り調査 (Deep Dive):**
    - 一次調査で見つけたURLの中から、最も有益と思われるものを選び、**`crawl_website` ツールを使ってそのページの内容を直接調査する。**
    - このステップを踏むことで、あなたの回答は他の誰にも真似できない、独自の価値を持つものになる。

4.  **統合と結論 (Synthesis & Conclusion):**
    - `google_search` の結果と `crawl_website` の結果を組み合わせ、矛盾がないか確認し、情報を統合する。
    - 複数の視点からの情報を基に、ユーザーにとって最も価値のある結論を導き出し、分かりやすく要約して提示する。

**エラーへの対処:**
- ツールが `FATAL_ERROR:` を返した場合、それは回復不能な問題です。調査を中止し、その旨を丁寧に報告してください。
- それ以外のエラーの場合は、クエリを変えるなど、別のアプローチを試みてください。

# **重要 (Important):** どれほど難しい要望でも、以下の思考を繰り返せば、必ずユーザーが感動する回答を得られますので、諦めずに作業してください。
このフレームワークに従い、ユーザーが感動するような、プロフェッショナルな調査と回答を提供してください。
"""


def get_system_instruction() -> str:
    """
    現在日時を含み、自己評価と改善のループを促すシステムプロンプトを生成する。
    """
    jst = timezone(timedelta(hours=+9), 'JST')
    now = datetime.now(jst)
    current_date_str = now.strftime('%Y年%m月%d日 %H:%M')

    return f"""
あなたは、極めて優秀で粘り強いWeb調査の専門家です。あなたの最終目的は、ユーザーの質問に対し、複数の信頼できる情報源を統合し、独自の洞察を加えた質の高い回答を生成することです。

**現在のあなたがいる日時は {current_date_str} です。** この情報を常に念頭に置き、最新の情報を基に回答してください。

**高品質な回答を生成するための思考と行動のループフレームワーク:**
あなたは以下の思考プロセスを、最終的な結論に自信が持てるまで、何度も何度も繰り返してください。
# 重要: 取得するべき情報や、取得した結果がが多すぎるからといって、諦めてはいけません。　時間がかかっても良いので、ユーザーの要望を満たす事だけに集中せよ！
# 重要: ユーザーは遅いことを気にしてません。どれだけ`google_search` や `crawl_website`を活用して求めている情報を見つけ出すかを気にしてます。

**ステップ1：質問の分解と戦略立案 (Decomposition & Strategy)**
- ユーザーの質問の核心は何か？ どのような背景情報や深い知識が求められているか？
- この問いに包括的に答えるための調査計画を立てる。
- 最初にどのツールで何を確認すべきか？ 定石は `google_search` で全体像を掴むことだ。

**ステップ2：ツールの実行と情報収集 (Tool Execution & Information Gathering)**
- 計画に基づき、`google_search` や `crawl_website` などのツールを **躊躇なく** 実行する。
- 1回の実行で満足せず、複数のキーワードや異なる情報源（URL）に対してツールを使い、多角的な情報を集める。

**ステップ3：自己評価と次の行動計画 (Self-Correction & Next Action Planning)**
- **【最重要】** ここまでの情報で、ユーザーが「感動するレベル」の回答を生成できるか？
- **もし答えが「いいえ」なら、以下を自問し、ステップ1または2に戻る。**
    - 「まだ情報が不足している部分はどこか？」
    - 「別のキーワードで検索すれば、新しい視点が得られないか？ (`google_search`)」
    - 「この情報源の一次情報を直接確認すべきではないか？ (`crawl_website`)」
    - 「これまでの調査結果に矛盾はないか？」
- **この自己評価プロセスこそが、あなたの回答の質を決定づける。決して省略してはならない。**

**ステップ4：最終統合と回答生成 (Final Synthesis & Answer Generation)**
- **上記のループを繰り返し、もうこれ以上調査する必要はないと確信できた場合のみ**、このステップに進む。
- すべての調査結果（`google_search`の結果、`crawl_website`で得た詳細情報など）を統合し、矛盾を解消する。
- ユーザーにとって最も価値のある結論を導き出し、簡潔かつ分かりやすく要約して最終回答として提示する。

**エラーへの対処:**
- ツールが `FATAL_ERROR:` を返した場合、調査を中止し、その旨を丁寧に報告してください。
- それ以外のエラーの場合は、クエリを変える、別のツールを使うなど、別のアプローチを試みてください。

# 重要: ユーザーは遅いことを気にしてません。どれだけ`google_search` や `crawl_website`を活用して求めている情報を見つけ出すかを気にしてます。
このループフレームワークを忠実に実行し、プロフェッショナルな調査と回答を提供してください。あなたの粘り強さと深い洞察力に期待しています。
"""

# --- 3. セッション状態の初期化 ---
if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid4())
if "messages" not in st.session_state:
    #st.session_state.messages = [AIMessage(content=SYSTEM_INSTRUCTION)]
    st.session_state.messages = [AIMessage(content=get_system_instruction())]

print(st.session_state.messages)

# ▼▼▼▼▼ 変更点: agent_is_thinkingフラグを追加 ▼▼▼▼▼
if "agent_is_thinking" not in st.session_state:
    st.session_state.agent_is_thinking = False
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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


# ▼▼▼▼▼ 変更点: UIロジック全体を修正 ▼▼▼▼▼

# エージェントが処理中でない場合にのみ、入力ボックスを表示
if not st.session_state.agent_is_thinking:
    if prompt := st.chat_input("Ask me to research something..."):
        # ユーザーの入力を受け付けたら、処理中フラグを立ててUIを再描画
        st.session_state.messages.append(HumanMessage(content=prompt))
        st.session_state.agent_is_thinking = True
        st.rerun()

# 処理中フラグが立っている場合、エージェントを実行
if st.session_state.agent_is_thinking:
    # 最後のメッセージがユーザーからのものであることを確認
    if st.session_state.messages and isinstance(st.session_state.messages[-1], HumanMessage):
        with st.chat_message("user", avatar="👤"):
             st.markdown(st.session_state.messages[-1].content)

        with st.spinner("🤖 Agent is processing... Please wait."):
            try:
                config = {"configurable": {"thread_id": st.session_state.thread_id}}
                agent_input = {"messages": st.session_state.messages}
                
                response = agent_executor.invoke(agent_input, config)

                if response and "messages" in response:
                    st.session_state.messages = response["messages"]
                else:
                    st.session_state.messages.append(AIMessage(content="Sorry, I received an unexpected response from the agent."))

            except Exception:
                error_message = f"Sorry, a critical error occurred:\n\n```\n{traceback.format_exc()}\n```"
                st.session_state.messages.append(AIMessage(content=error_message))
            
            # 処理が終わったら、処理中フラグを倒す
            st.session_state.agent_is_thinking = False
            
            # --- ここに10秒間の待機を挿入 ---
            time.sleep(20)
            
            # UIを再描画して結果を表示
            st.rerun()
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

def aaa():
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