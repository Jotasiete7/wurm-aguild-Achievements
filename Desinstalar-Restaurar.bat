@echo off
chcp 65001 >nul
title Desinstalar - A Guilda Wurm Tracker
color 0F

echo ============================================================
echo           RESTAURADOR - A GUILDA WURM TRACKER
echo ============================================================
echo.

set "WURM_DIR="
for /f "tokens=2* delims=	 " %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Steam App 1179680" /v InstallLocation 2^>nul') do (
    if exist "%%B\client_live.jar" set "WURM_DIR=%%B"
)
if "%WURM_DIR%"=="" (
    for %%D in (C D E F G) do (
        if exist "%%D:\SteamLibrary\steamapps\common\Wurm Online\client_live.jar" (
            set "WURM_DIR=%%D:\SteamLibrary\steamapps\common\Wurm Online"
        )
    )
)
if "%WURM_DIR%"=="" (
    if exist "%USERPROFILE%\wurm\client_live.jar" set "WURM_DIR=%USERPROFILE%\wurm"
    if exist "%LOCALAPPDATA%\Wurm Online\client_live.jar" set "WURM_DIR=%LOCALAPPDATA%\Wurm Online"
)

set "RESTORED=0"

if exist "%WURM_DIR%\client_live_backup.jar" (
    echo Restaurando arquivo original do Wurm Online (backup)...
    copy /Y "%WURM_DIR%\client_live_backup.jar" "%WURM_DIR%\client_live.jar" >nul
    del /f /q "%WURM_DIR%\client_live_backup.jar" >nul 2>&1
    set "RESTORED=1"
)

if exist "%WURM_DIR%\client_live.jar.original" (
    echo Restaurando arquivo original do Wurm Online (backup legado)...
    copy /Y "%WURM_DIR%\client_live.jar.original" "%WURM_DIR%\client_live.jar" >nul
    del /f /q "%WURM_DIR%\client_live.jar.original" >nul 2>&1
    set "RESTORED=1"
)

if exist "%WURM_DIR%\wurm_achievements.jar" (
    del /f /q "%WURM_DIR%\wurm_achievements.jar" >nul 2>&1
)

if "%RESTORED%"=="1" (
    echo.
    echo [OK] Wurm Online restaurado com sucesso para o estado original!
) else (
    echo [!] Nenhum backup de modificacao foi encontrado. O jogo ja parece estar original.
)

echo.
pause
