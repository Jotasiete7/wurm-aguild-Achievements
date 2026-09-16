@echo off
chcp 65001 >nul
title Instalador - A Guilda Wurm Tracker
color 0F

echo ================================================================
echo           A GUILDA - INSTALADOR AUTOMATICO DO TRACKER
echo ================================================================
echo.
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

:: Copiar o JAR do tracker para a pasta do Wurm
echo Copiando arquivo seguro do tracker (wurm_achievements.jar)...
copy /Y "%~dp0wurm_achievements.jar" "%WURM_DIR%\wurm_achievements.jar" >nul
if errorlevel 1 (
    echo [ERRO] Falha ao copiar o arquivo. Tente executar este instalador como Administrador.
    pause
    exit /b
)

:: Criar o inicializador oficial na pasta do Wurm
echo Configurando launcher com Tracker integrado...
(
echo @echo off
echo cd /d "%%~dp0"
echo set JAVA_TOOL_OPTIONS=-javaagent:wurm_achievements.jar
echo start "" "WurmLauncher64.exe"
echo exit
) > "%WURM_DIR%\iniciar_wurm_com_tracker.bat"

:: Criar Atalho na Area de Trabalho do jogador via PowerShell
echo Criando atalho na sua Area de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Wurm Online (Guilda Tracker).lnk')); $sc.TargetPath = '%WURM_DIR%\iniciar_wurm_com_tracker.bat'; $sc.WorkingDirectory = '%WURM_DIR%'; if (Test-Path '%WURM_DIR%\WurmLauncher64.exe') { $sc.IconLocation = '%WURM_DIR%\WurmLauncher64.exe,0' }; $sc.Save()"

echo.
echo ================================================================
echo           INSTALACAO CONCLUIDA COM SUCESSO!
echo ================================================================
echo.
echo [1] Um novo atalho foi criado na sua Area de Trabalho:
echo     "Wurm Online (Guilda Tracker)"
echo.
echo [2] Basta abrir o Wurm atraves desse atalho.
echo     Ele vai ler suas conquistas normalmente enquanto voce joga
echo     e gerar seus dados de forma 100%% segura!
echo.
pause
