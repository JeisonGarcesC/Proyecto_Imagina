@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
node_modules\electron\dist\electron.exe electron\phase82-esm-then.mjs
exit /b %errorlevel%
