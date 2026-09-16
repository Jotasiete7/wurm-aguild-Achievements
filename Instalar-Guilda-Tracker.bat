@echo off
chcp 65001 >nul
title Instalador - Wurm Online Conquistas (A Guilda)
color 0F

echo ================================================================
echo           A GUILDA - INSTALADOR DE CONQUISTAS DO WURM
echo          (Feito pela Guilda para toda a comunidade)
echo ================================================================
echo.

:: 1. Verificar se o Wurm Online esta aberto
tasklist /FI "IMAGENAME eq javaw.exe" 2>nul | find /I "javaw.exe" >nul
if not errorlevel 1 (
    echo [AVISO IMPORTANTE] O Wurm Online parece estar aberto agora!
    echo Por favor, FECHE O JOGO antes de continuar para que a atualizacao seja aplicada.
    echo.
    echo Pressione qualquer tecla apos fechar o jogo...
    pause >nul
)

echo Procurando onde seu Wurm Online esta instalado...

set "WURM_DIR="

:: 1. Tentar ler do Registro do Windows (Steam)
for /f "tokens=2* delims=	 " %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Steam App 1179680" /v InstallLocation 2^>nul') do (
    if exist "%%B\WurmLauncher64.exe" set "WURM_DIR=%%B"
)

:: 2. Se nao achou, procurar nas pastas comuns da Steam (discos C ate G)
if "%WURM_DIR%"=="" (
    for %%D in (C D E F G) do (
        if exist "%%D:\SteamLibrary\steamapps\common\Wurm Online\WurmLauncher64.exe" (
            set "WURM_DIR=%%D:\SteamLibrary\steamapps\common\Wurm Online"
        )
        if exist "%%D:\Program Files (x86)\Steam\steamapps\common\Wurm Online\WurmLauncher64.exe" (
            set "WURM_DIR=%%D:\Program Files (x86)\Steam\steamapps\common\Wurm Online"
        )
    )
)

:: 3. Se nao achou, verificar pasta padrao local (nao-Steam)
if "%WURM_DIR%"=="" (
    if exist "%USERPROFILE%\wurm\WurmLauncher64.exe" set "WURM_DIR=%USERPROFILE%\wurm"
    if exist "%LOCALAPPDATA%\Wurm Online\WurmLauncher64.exe" set "WURM_DIR=%LOCALAPPDATA%\Wurm Online"
)

:: Se ainda assim nao achou, pedir para o usuario arrastar o icone ou colar a pasta
if "%WURM_DIR%"=="" (
    echo [!] Nao foi possivel detectar automaticamente a pasta do jogo.
    echo.
    set /p "WURM_DIR=Por favor, digite ou cole o caminho da pasta do Wurm Online: "
)

if not exist "%WURM_DIR%\WurmLauncher64.exe" (
    echo.
    echo [ERRO] Nao encontramos o WurmLauncher64.exe nessa pasta:
    echo "%WURM_DIR%"
    echo.
    pause
    exit /b
)

echo [OK] Pasta do Wurm encontrada com sucesso!
echo      "%WURM_DIR%"
echo.

:: 5. Identificacao do Personagem
echo ----------------------------------------------------------------
echo           SELECAO DO SEU PERSONAGEM NO WURM ONLINE
echo ----------------------------------------------------------------
set "PLAYER_NAME="

:: Verificar se ja existe config salva
if exist "%WURM_DIR%\wurm_tracker.cfg" (
    for /f "tokens=2 delims==" %%P in ('findstr /i "player_name=" "%WURM_DIR%\wurm_tracker.cfg" 2^>nul') do (
        set "PLAYER_NAME=%%P"
    )
)

if not "%PLAYER_NAME%"=="" (
    echo Encontramos configuracao anterior para o personagem: [%PLAYER_NAME%]
    echo Pressione ENTER para continuar com ele, ou digite outro nome:
    set /p "NOVO_NOME=> "
    if not "%NOVO_NOME%"=="" set "PLAYER_NAME=%NOVO_NOME%"
)

if "%PLAYER_NAME%"=="" (
    echo.
    echo Personagens encontrados na sua pasta do jogo:
    if exist "%WURM_DIR%\gamedata\players" (
        for /d %%G in ("%WURM_DIR%\gamedata\players\*") do (
            if /i not "%%~nxG"=="configs" (
                echo   - %%~nxG
            )
        )
    )
    echo.
    set /p "PLAYER_NAME=Digite o nome exato do seu personagem (ex: Calvos): "
)

set "PLAYER_NAME=%PLAYER_NAME: =%"

if "%PLAYER_NAME%"=="" (
    echo [ERRO] Nenhum nome digitado. Cancelando instalacao.
    pause
    exit /b
)

:: Gerar ou manter claim_token de seguranca unico para este PC/personagem
set "CLAIM_TOKEN="
if exist "%WURM_DIR%\wurm_tracker.cfg" (
    for /f "tokens=2 delims==" %%G in ('findstr /b "claim_token=" "%WURM_DIR%\wurm_tracker.cfg" 2^>nul') do set "CLAIM_TOKEN=%%G"
)
if "%CLAIM_TOKEN%"=="" (
    for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"`) do set "CLAIM_TOKEN=%%T"
)

:: Salvar configuracao
(
echo player_name=%PLAYER_NAME%
echo claim_token=%CLAIM_TOKEN%
) > "%WURM_DIR%\wurm_tracker.cfg"

if exist "%WURM_DIR%\gamedata" (
    (
    echo player_name=%PLAYER_NAME%
    echo claim_token=%CLAIM_TOKEN%
    ) > "%WURM_DIR%\gamedata\wurm_tracker.cfg"
)

echo [OK] Personagem configurado: [%PLAYER_NAME%]
echo.

:: 6. Integrar o leitor de conquistas diretamente ao client do Wurm
echo ----------------------------------------------------------------
echo           INTEGRANDO O LEITOR AO CLIENT DO JOGO
echo ----------------------------------------------------------------
set "JAVA_EXE=%WURM_DIR%\21-win64\runtime\bin\java.exe"
if not exist "%JAVA_EXE%" set "JAVA_EXE=java"

"%JAVA_EXE%" -cp "%~dp0wurm_tracker_patch.jar" wurm.tracker.ClientPatcher "%WURM_DIR%"
if errorlevel 1 (
    echo.
    echo [AVISO] Houve um problema ao aplicar o patch no client_live.jar.
    echo Copiando biblioteca de suporte...
    copy /Y "%~dp0wurm_achievements.jar" "%WURM_DIR%\wurm_achievements.jar" >nul
) else (
    echo [OK] client_live.jar atualizado com sucesso com o leitor da Guilda!
)

:: 7. Registrar no Supabase via PowerShell sem sobrescrever conquistas existentes
echo.
echo Sincronizando registro no Ranking da Guilda...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$name = '%PLAYER_NAME%'; $token = '%CLAIM_TOKEN%'; $url = 'https://gzhvqprdrtudyokhgxlj.supabase.co/rest/v1/player_achievements'; $key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aHZxcHJkcnR1ZHlva2hneGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTQ2MTUsImV4cCI6MjA4MzMzMDYxNX0.aSJIhfViQsb0dBjb5bOup49GCrQBt93uSkZySZAXcNo'; $h = @{ 'apikey' = $key; 'Authorization' = 'Bearer ' + $key; 'Content-Type' = 'application/json'; 'Prefer' = 'resolution=merge-duplicates' }; try { $existing = Invoke-RestMethod -Uri ($url + '?player_name=eq.' + [uri]::EscapeDataString($name)) -Headers $h; if (!$existing -or $existing.Count -eq 0) { $body = @(@{ player_name = $name; claim_token = $token; total_count = 0; gold_count = 0; score = 0; max_counter = 0; top_achievement = ''; achievements = @(); updated_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }) | ConvertTo-Json; Invoke-RestMethod -Uri $url -Method Post -Headers $h -Body $body -TimeoutSec 5 | Out-Null; Write-Host '[OK] Personagem registrado pela primeira vez no ranking da guilda!' -ForegroundColor Green } else { Write-Host '[OK] Personagem ja existente no ranking. Conquistas preservadas!' -ForegroundColor Green } } catch { Write-Host '[!] Conexao com a nuvem sera confirmada ao abrir o jogo.' -ForegroundColor Yellow }"

:: Limpar atalhos antigos caso existam
if exist "%USERPROFILE%\Desktop\Wurm Online (Guilda Tracker).lnk" (
    del /f /q "%USERPROFILE%\Desktop\Wurm Online (Guilda Tracker).lnk" >nul 2>&1
)

echo.
echo ================================================================
echo               INSTALACAO CONCLUIDA COM SUCESSO!
echo ================================================================
echo.
echo [1] O personagem [%PLAYER_NAME%] esta pronto e ativo!
echo [2] Abra o Wurm Online NORMALMENTE (pela Steam ou como de costume).
echo [3] Dentro do jogo, abra a janela de Conquistas (tecla P ou menu).
echo     Suas conquistas serao lidas e enviadas para o ranking!
echo.
echo Abrindo o site com seu personagem conectado...
start "" "https://wurm-aguild-achievements.pages.dev/?mychar=%PLAYER_NAME%"
echo.
pause
