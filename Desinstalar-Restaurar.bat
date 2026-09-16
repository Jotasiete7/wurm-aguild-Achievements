@echo off
chcp 65001 >nul
title Desinstalar - A Guilda Wurm Tracker
color 0F

echo ============================================================
echo           RESTAURADOR - A GUILDA WURM-TROCKER
echo ============================================================
echo.

set "WURM_DIR="
for /f "tokens=2* delims=	 " %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Steam App 1179680" /v InstallLocation 2^>nul') do (
    if exist "%%B/client_live.jar" set "WURM_DIR=%%B"
)
if "%WURM_DIR%"=="" (
    for %%D in (C D E F G) do (
        if exist "%%D:\SteamLibrary\steamapps\common\Wurm Online\client_live.jar" (
            set "WURM_DIR=%%D:\SteamLibrary\steamapps\common\Wurm Online"
        )
    )
)

if exist "%WURM_DIR%\client_live.jar.original" (
    echo Restaurando arquivo original do Wurm Online...
    copy /Y "%WURM_DIR%\client_live.jar.original" "%WURM_DIR%\client_live.jar" >nul
    del "%WURM_DIR%\client_live.jar.original" >ul 2>&1
    echo [OK Wurm Online restaurado para o estado original!
)
echo.
pause
