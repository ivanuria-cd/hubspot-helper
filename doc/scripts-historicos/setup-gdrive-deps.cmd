@echo off
REM ============================================================================
REM SPEC-0004 - Instalacion de dependencias del conector Google Drive
REM Cumple SPEC-0000 paragraph 11 (seguridad de cadena de suministro npm).
REM Ejecutar desde la raiz del repositorio: scripts\setup-gdrive-deps.cmd
REM ============================================================================
setlocal

echo.
echo === SPEC-0004 :: dependencias Google Drive ===
echo Dependencias a instalar: googleapis (keytar ya forma parte del proyecto).
echo.
echo SPEC-0000 paragraph 11: antes de instalar, verifica que la version a usar
echo tenga AL MENOS 10 dias de antiguedad. Fechas de publicacion de googleapis:
echo.
call npm view googleapis time --json
echo.
echo Revisa arriba la fecha de la ultima version. Si tiene menos de 10 dias,
echo cancela (Ctrl+C) y fija una version anterior que si los cumpla con:
echo     npm install googleapis@^^X.Y.Z --save-exact
echo.
pause

echo.
echo === Auditoria previa ===
call npm audit

echo.
echo === Instalando googleapis (se anade a package.json) ===
call npm install googleapis --save
if errorlevel 1 (
  echo ERROR: fallo la instalacion de googleapis.
  exit /b 1
)

echo.
echo === Verificando keytar (modulo nativo, ya declarado) ===
call npm install keytar@^7.9.0 --save

echo.
echo === Auditoria posterior ===
call npm audit

echo.
echo === Comprobacion de tipos y tests unitarios ===
call npm run typecheck
call npm run test:unit

echo.
echo Hecho. Recuerda fijar GOOGLE_CLIENT_ID y GOOGLE_API_KEY en tu .env (ver .env.example).
endlocal
