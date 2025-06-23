# webapp.py (デバッグ強化・invoke版)

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

# 修正されたツールをインポート
from tools.mcp_tools import all_tools

# --- 1. 初期設定 ---
load_dotenv()
st.set_page_config(page_title="AI Web Research Agent", page_icon="🤖", layout="wide")

# --- 2. エージェントのセットアップ ---
@st.cache_resource
def setup_agent():
    if not os.getenv("GOOGLE_API_KEY"):
        st.error("GOOGLE_API_KEYが設定されていません。.envファイルを確認してください。")
        st.stop()
    
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning, module="langchain_google_genai")

    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash-preview-04-17-thinking", convert_system_message_to_human=True)
    memory = MemorySaver()
    # verbose=True を追加してデバッグログを有効化
    agent_executor = create_react_agent(model, all_tools, checkpointer=memory)
    return agent_executor

agent_executor = setup_agent()

# --- 3. セッション状態の管理 ---
if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid4())
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- 4. UI描画 ---
st.title("🤖 AI Web Research Agent")
st.caption("I can perform web searches and website crawling to answer your questions.")

with st.sidebar:
    # ... (サイドバーのコードは変更なし) ...
    st.header("Conversation Control")
    if st.button("New Chat", type="primary"):
        st.session_state.thread_id = str(uuid4())
        st.session_state.messages = []
        st.rerun()
    st.markdown("---")
    st.markdown(f"**Thread ID:**\n`{st.session_state.thread_id}`")
    st.markdown("---")
    # デバッグ用にセッション状態を表示
    with st.expander("Debug: Session State"):
        st.json(st.session_state.to_dict())


# チャット履歴を表示
for msg in st.session_state.messages:
    if msg.type == 'human':
        with st.chat_message("user", avatar="👤"):
            st.markdown(msg.content)
    elif msg.type == 'ai':
        with st.chat_message("assistant", avatar="🤖"):
            # 思考過程と最終回答を区別して表示
            if msg.tool_calls:
                st.info("Thinking: The agent decided to use tools.")
                st.json([dict(tc) for tc in msg.tool_calls])
            else:
                st.markdown(msg.content)
    elif msg.type == 'tool':
        with st.chat_message("tool", avatar="🛠️"):
            st.info(f"Tool Output (ID: {msg.tool_call_id})")
            st.code(msg.content)


# --- 5. ユーザー入力とエージェント実行 ---
if prompt := st.chat_input("Ask me to research something..."):
    # ユーザーのメッセージを履歴に追加してUIを更新
    st.session_state.messages.append(HumanMessage(content=prompt))
    
    with st.chat_message("user", avatar="👤"):
        st.markdown(prompt)

    with st.chat_message("assistant", avatar="🤖"):
        with st.spinner("🤖 Agent is processing..."):
            try:
                config = {"configurable": {"thread_id": st.session_state.thread_id}}
                # streamの代わりにinvokeを使い、一度に結果を取得
                response = agent_executor.invoke({"messages": st.session_state.messages}, config)
                
                # エージェントの実行結果（全メッセージ）をセッション状態に上書き
                st.session_state.messages = response['messages']

            except Exception as e:
                # エラーが発生した場合、エラーメッセージをAIの応答として表示
                error_content = f"Sorry, a critical error occurred:\n\n```\n{traceback.format_exc()}\n```"
                st.session_state.messages.append(AIMessage(content=error_content))
    
    # 処理完了後にUIを再描画
    st.rerun()