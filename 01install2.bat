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
if "%API_KEY_VALUE%"=="\"\"" (
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
