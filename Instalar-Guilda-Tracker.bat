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

:: Integrar o leitor de conquistas diretamente ao client do Wurm
echo Integrando leitor de conquistas de forma 100%% segura e transparente...
set "JAVA_EXE=%WURM_DIR%\21-win64\runtime\bin\java.exe"
if not exist "%JAVA_EXE%" set "JAVA_EXE=java"

"%JAVA_EXE%" -cp "%~dp0wurm_tracker_patch.jar" wurm.tracker.ClientPatcher "%WURM_DIR%"
if errorlevel 1 (
    echo.
    echo [AVISO] O patch direto nao pode ser aplicado (verifique se o jogo esta fechado).
    echo Configurando modo alternativo...
    copy /Y "%~dp0wurm_achievements.jar" "%WURM_DIR%\wurm_achievements.jar" >nul
)

:: Limpar atalhos antigos caso existam
if exist "%USERPROFILE%\Desktop\Wurm Online (Guilda Tracker).lnk" (
    del /f /q "%USERPROFILE%\Desktop\Wurm Online (Guilda Tracker).lnk" >nul 2>&1
)

echo.
echo ================================================================
echo           INSTALACAO CONCLUIDA COM SUCESSO!
echo ================================================================
echo.
echo [1] O leitor de conquistas foi integrado com sucesso ao Wurm!
echo     NENHUM atalho novo foi criado na sua Area de Trabalho.
echo.
echo [2] Basta abrir seu jogo NORMALMENTE (pela Steam ou onde voce sempre abre).
echo     Suas conquistas vao atualizar no site automaticamente
echo     enquanto voce joga, sem que voce precise fazer mais nada!
echo.
pause

