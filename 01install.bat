@echo off
setlocal

:: =================================================================
:: ■ 概要
:: このスクリプトは、クライアント、サーバー、Python環境の
:: セットアップと起動を自動化します。
:: =================================================================


:: =================================================================
:: ■ 準備：バッチファイル自身の場所を基準にする
:: これにより、どこから実行しても正しく動作します。
:: =================================================================
cd /d "%~dp0"


:: =================================================================
:: ■ ステップ1：クライアントサイドのセットアップ
:: =================================================================
echo.
echo [INFO] 1/4: Checking client-side dependencies (mcp-client-typescript)...
if not exist "mcp-client-typescript\node_modules" (
    echo      'node_modules' not found. Running npm install...
    cd mcp-client-typescript
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install for client failed. Exiting.
        goto :error_exit
    )
    cd ..
) else (
    echo      Dependencies already installed. Skipping.
)


:: =================================================================
:: ■ ステップ2：サーバーサイドのセットアップと起動
:: =================================================================
echo.
echo [INFO] 2/4: Checking server-side dependencies (mcp-server-typescript)...
if not exist "mcp-server-typescript\node_modules" (
    echo      'node_modules' not found. Running npm install...
    cd mcp-server-typescript
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install for server failed. Exiting.
        goto :error_exit
    )
    cd ..
) else (
    echo      Dependencies already installed. Skipping.
)

echo [INFO] Starting server-side development server...
cd mcp-server-typescript
start "MCP Server" npm run dev
cd ..


:: =================================================================
:: ■ ステップ3：スクレイピングアプリの起動
:: =================================================================
echo.
echo [INFO] 3/4: Starting YourScrapingApp.exe...
if exist "mcp-server-typescript\bin\YourScrapingApp.exe" (
    cd mcp-server-typescript\bin
    start "Scraping App" YourScrapingApp.exe
    cd ..\..
) else (
    echo [WARNING] YourScrapingApp.exe not found. Skipping.
)


:: =================================================================
:: ■ ステップ4：Python環境のセットアップとStreamlitアプリの起動
:: =================================================================
echo.
echo [INFO] 4/4: Setting up and activating Python environment...

:: 仮想環境フォルダ 'venv' がなければ作成する
if not exist "venv" (
    echo      Python virtual environment 'venv' not found. Creating...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment. Exiting.
        goto :error_exit
    )
)

:: 仮想環境をアクティベート
call "venv\Scripts\activate.bat"

:: 必要なパッケージをインストール/更新
echo      Installing/updating Python packages from requirements.txt...
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Exiting.
    goto :error_exit
)

:: Streamlitアプリケーションを起動
echo      Starting Streamlit application...
start "Streamlit WebApp" streamlit run webapp_react.py


:: =================================================================
:: ■ 完了処理
:: =================================================================
echo.
echo [SUCCESS] All processes have been started successfully.
echo This window will close in 10 seconds...
timeout /t 10 >nul
goto :eof


:: =================================================================
:: ■ エラー発生時の終了処理
:: =================================================================
:error_exit
echo.
echo [FATAL] An error occurred. Please check the messages above.
endlocal
pause
exit /b 1