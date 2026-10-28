@echo off
rem Arranca NEON SCRAP: LAST ORBIT y lo abre en el navegador.
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)
start "" http://localhost:5179/
echo Juego en http://localhost:5179/  (cierra esta ventana para apagarlo)
call npm run dev
