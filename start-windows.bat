@echo off
echo ============================================
echo   Starting GramSwasthya AI Platform
echo ============================================
echo.

echo [1/2] Starting Backend server...
start "GramSwasthya Backend" cmd /k "cd backend && title Backend Server && ..\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt && ..\\.venv\\Scripts\\python.exe -m uvicorn main:app --reload --port 8000"

echo [2/2] Starting Frontend server...
start "GramSwasthya Frontend" cmd /k "cd frontend && title Frontend Server && npm install && npm run dev"

echo.
echo ============================================
echo   Both services launched in separate windows!
echo ============================================
echo.
echo   Backend API Docs : http://localhost:8000/api/docs
echo   Frontend Web App : http://localhost:3000
echo.
echo   Demo Logins:
echo     Admin   - username: admin      password: admin
echo     Doctor  - username: doctor     password: doctor
echo     Patient - username: 9100000001 password: patient123
echo.
echo   Check the opened console windows for any errors.
echo ============================================
