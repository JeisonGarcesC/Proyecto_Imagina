@echo off
set ELECTRON_RUN_AS_NODE=
"%~dp0..\node_modules\electron\dist\electron.exe" "%~dp0phase84-composition.cjs"
