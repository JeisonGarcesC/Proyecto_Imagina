@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
node_modules\electron\dist\electron.exe electron\phase83-interactive.cjs
exit /b %errorlevel%
