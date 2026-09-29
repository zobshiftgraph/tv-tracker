@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist "standalone\index.html" (
  echo Building standalone app...
  call npm run build:standalone
  if errorlevel 1 goto :fail
)

echo Opening TV Tracker standalone at http://localhost:5175
start "" "http://localhost:5175"
python -m http.server 5175 --directory standalone
goto :eof

:fail
echo.
echo Build failed. Install Node.js from https://nodejs.org if needed.
pause
exit /b 1
