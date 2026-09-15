@echo off
title Wurm Online com Rastreador de Conquistas
echo ========================================================
echo  Iniciando Wurm Online com Rastreador de Conquistas...
echo ========================================================
cd /d "D:\SteamLibrary\steamapps\common\Wurm Online"
set "JAVA_TOOL_OPTIONS=-javaagent:\"D:\SteamLibrary\steamapps\common\Wurm Online\wurm_achievements.jar\""
start "" "D:\SteamLibrary\steamapps\common\Wurm Online\WurmLauncher64.exe"
exit
