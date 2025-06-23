@echo off
setlocal

:: =============================================================================
:: �� �T�v
:: ���̃X�N���v�g�́A�N���C�A���g�A�T�[�o�[�APython����
:: �Z�b�g�A�b�v�ƋN�������������܂��B
::
:: �� ����
:: ���̃o�b�`�t�@�C���͕����R�[�h�uANSI (Shift_JIS)�v�ŕۑ����Ă��������B
:: =============================================================================


:: =============================================================================
:: �� �����F�o�b�`�t�@�C�����g�̏ꏊ����ɂ���
:: ����ɂ��A�ǂ�������s���Ă����������삵�܂��B
:: =============================================================================
cd /d "%~dp0"


:: =================================================================
:: �� API�L�[�̃`�F�b�N (.env�t�@�C��)
:: =================================================================
echo.
echo [INFO] Checking for GOOGLE_API_KEY in .env file...

:: .env�t�@�C�������݂��Ȃ��ꍇ�̓G���[
if not exist ".env" (
    echo [WARNING] .env file not found.
    echo           Please create it and set your GOOGLE_API_KEY.
    goto :show_api_error
)

:: .env����GOOGLE_API_KEY�̍s��ǂݎ��A'='�ŕ������ăL�[������FOR���[�v�Ŏ󂯎��
set "API_KEY_VALUE="
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"GOOGLE_API_KEY" ".env"') do (
    set "API_KEY_VALUE=%%b"
)

:: �L�[�̒l���󂩁A�_�u���N�H�[�g�����̏ꍇ�̓G���[
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
:: ���̍s�́A�`�F�b�N�����������ꍇ�ɃX�N���v�g�𑱍s�����邽�߂̂��̂ł��B


:: =============================================================================
:: �� �X�e�b�v2�F�N���C�A���g�T�C�h�̃Z�b�g�A�b�v
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
:: �� �X�e�b�v3�F�T�[�o�[�T�C�h�̃Z�b�g�A�b�v�ƋN��
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
:: �� �X�e�b�v4�F�X�N���C�s���O�A�v���̋N��
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
:: �� �X�e�b�v5�FPython���̃Z�b�g�A�b�v��Streamlit�A�v���̋N��
:: =============================================================================
echo.
echo [INFO] 5/5: Setting up and activating Python environment...

:: ���z���t�H���_ 'venv' ���Ȃ���΍쐬����
if not exist "venv" (
    echo      Python virtual environment 'venv' not found. Creating...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment. Exiting.
        goto :error_exit
    )
)

:: ���z�����A�N�e�B�x�[�g
call "venv\Scripts\activate.bat"

:: �K�v�ȃp�b�P�[�W���C���X�g�[��/�X�V
echo      Installing/updating Python packages from requirements.txt...
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Exiting.
    goto :error_exit
)

:: Streamlit�A�v���P�[�V�������N��
echo      Starting Streamlit application...
start "Streamlit WebApp" streamlit run webapp_react.py


:: =============================================================================
:: �� ��������
:: =============================================================================
echo.
echo [SUCCESS] All processes have been started successfully.
echo This window can be closed.
goto :eof


:: =============================================================================
:: �� �G���[�����p�̃T�u���[�`��
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