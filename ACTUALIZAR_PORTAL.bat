@echo off
title Actualizador de Datos - Portal Asistente Supervisor
color 0A

:: Asegurar que siempre ejecute en la carpeta del proyecto D:\Asistente Supervisor
cd /d "%~dp0"

echo ==============================================================================
echo           ACTUALIZADOR DE REPORTES FLOW PRO - ASISTENTE SUPERVISOR
echo ==============================================================================
echo.
echo Carpeta de trabajo: %CD%
echo.
echo [1/3] Procesando y cruzando todos los reportes Excel de Reportes...
call node scripts/process_all_reports_deep.cjs
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Hubo un error al procesar los archivos Excel.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compilando la aplicacion web para produccion...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Error en la compilacion de la aplicacion.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Subiendo los datos actualizados a GitHub y Vercel...
git add .
git commit -m "Actualizacion automatica de reportes Flow Pro - %DATE% %TIME%"
git push origin main

echo.
echo ==============================================================================
echo   EXITO: Todos los reportes fueron procesados y la app quedo 100%% actualizada!
echo ==============================================================================
echo.
pause
