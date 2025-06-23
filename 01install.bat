@echo off
setlocal

:: =============================================================================
:: ■ 概要
:: このスクリプトは、クライアント、サーバー、Python環境の
:: セットアップと起動を自動化します。
::
:: ■ 注意
:: このバッチファイルは文字コード「ANSI (Shift_JIS)」で保存してください。
:: =============================================================================


:: =============================================================================
:: ■ 準備：バッチファイル自身の場所を基準にする
:: これにより、どこから実行しても正しく動作します。
:: =============================================================================
cd /d "%~dp0"


:: =================================================================
:: ■ APIキーのチェック (.envファイル)
:: =================================================================
echo.
echo [INFO] Checking for GOOGLE_API_KEY in .env file...

:: .envファイルが存在しない場合はエラー
if not exist ".env" (
    echo [WARNING] .env file not found.
    echo           Please create it and set your GOOGLE_API_KEY.
    goto :show_api_error
)

:: .envからGOOGLE_API_KEYの行を読み取り、'='で分割してキー部分をFORループで受け取る
set "API_KEY_VALUE="
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"GOOGLE_API_KEY" ".env"') do (
    set "API_KEY_VALUE=%%b"
)

:: キーの値が空か、ダブルクォートだけの場合はエラー
if not defined API_KEY_VALUE (
    goto :show_api_error
)
if "%API_KEY_VALUE%"=="''" (
    goto :show_api_error
)
if "%API_KEY_VALUE%"=="" (
    goto :show_api_error
)

echo      GOOGLE_API_KEY is set.
goto :continue_script

:show_api_error
echo.
echo [ERROR] GOOGLE_API_KEY is not set or empty in the .env file.
echo         Please open the '.env' file and add your API key.
echo         Example: GOOGLE_API_KEY="AIzaSy...YourKey...SyQ"
echo.
echo         Get your key from: https://aistudio.google.com/app/apikey
echo.
echo         Opening Google AI Studio in your browser...
start https://aistudio.google.com/app/apikey
goto :error_exit


:continue_script
:: この行は、チェックが成功した場合にスクリプトを続行させるためのものです。


:: =============================================================================
:: ■ ステップ2：クライアントサイドのセットアップ
:: =============================================================================
echo.
echo [INFO] 2/5: Checking client-side dependencies (mcp-client-typescript)...
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


:: =============================================================================
:: ■ ステップ3：サーバーサイドのセットアップと起動
:: =============================================================================
echo.
echo [INFO] 3/5: Checking server-side dependencies (mcp-server-typescript)...
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


:: =============================================================================
:: ■ ステップ4：スクレイピングアプリの起動
:: =============================================================================
echo.
echo [INFO] 4/5: Starting YourScrapingApp.exe...
if exist "mcp-server-typescript\bin\YourScrapingApp.exe" (
    cd mcp-server-typescript\bin
    start "Scraping App" YourScrapingApp.exe
    cd ..\..
) else (
    echo [WARNING] YourScrapingApp.exe not found. Skipping.
)


:: =============================================================================
:: ■ ステップ5：Python環境のセットアップとStreamlitアプリの起動
:: =============================================================================
echo.
echo [INFO] 5/5: Setting up and activating Python environment...

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


:: =============================================================================
:: ■ 完了処理
:: =============================================================================
echo.
echo [SUCCESS] All processes have been started successfully.
echo This window can be closed.
goto :eof


:: =============================================================================
:: ■ エラー処理用のサブルーチン
:: =============================================================================
:show_api_error
echo.
echo [ERROR] GOOGLE_API_KEY is not set or empty in the .env file.
echo         Please open the '.env' file and add your API key.
echo         Example: GOOGLE_API_KEY="AIzaSy...YourKey...SyQ"
echo.
echo         Get your key from: https://aistudio.google.com/app/apikey
echo.
echo         Opening Google AI Studio in your browser...
start https://aistudio.google.com/app/apikey
goto :error_exit


:error_exit
echo.
echo [FATAL] An error occurred. Please check the messages above.
endlocal
pause
exit /b 1