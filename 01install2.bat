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
:: ���̍s�́A�`�F�b�N�����������ꍇ�ɃX�N���v�g�𑱍s�����邽�߂̂��̂ł��B
