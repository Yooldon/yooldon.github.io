@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================
echo   自动发布模式
echo   监听 docs/ 目录，停手 2 分钟后自动提交并推送
echo   本窗口要一直开着；按 Ctrl+C 停止
echo  ============================================
echo.
call pnpm watch:push
echo.
echo  自动发布已停止。按任意键关闭...
pause >nul
