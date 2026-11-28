@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================
echo   本地预览  http://localhost:5173
echo   写完笔记后：另开一个窗口运行 发布.cmd
echo   关闭预览：按 Ctrl+C，或直接关掉本窗口
echo  ============================================
echo.
call pnpm dev
echo.
echo  预览已停止。按任意键关闭...
pause >nul
