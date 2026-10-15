@echo off
set ELECTRON_RUN_AS_NODE=
set PHASE101_MODE=GN
"%~dp0..\node_modules\electron\dist\electron.exe" "%~dp0phase101-smart-snap-validation.cjs"
