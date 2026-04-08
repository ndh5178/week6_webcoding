@echo off
setlocal

set "VS_VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"

if not exist "%VS_VCVARS%" (
  echo Error: Visual Studio build tools not found.
  exit /b 1
)

if /I "%~1"=="clean" (
  del /Q *.obj 2>NUL
  del /Q ..\build\sql-engine.exe 2>NUL
  exit /b 0
)

call "%VS_VCVARS%"
if errorlevel 1 exit /b 1

cl /nologo /W4 /Fe:..\build\sql-engine.exe main.c parser.c executor.c storage.c schema.c /link /STACK:8388608
exit /b %ERRORLEVEL%
