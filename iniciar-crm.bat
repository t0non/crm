@echo off
title CRM - servidor de desenvolvimento
cd /d "%~dp0"

rem Se o CRM ja esta ligado, nao liga um segundo: so abre no navegador.
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo O CRM ja esta ligado. Abrindo http://localhost:3000 ...
  start "" http://localhost:3000
  timeout /t 3 >nul
  exit /b
)

echo Limpando a copia antiga (cache) para mostrar sempre a versao mais nova...
if exist ".next" rmdir /s /q ".next" 2>nul
echo Iniciando o CRM em http://localhost:3000 ...
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm dev
) else (
  npx --yes pnpm@9.15.9 dev
)
pause
