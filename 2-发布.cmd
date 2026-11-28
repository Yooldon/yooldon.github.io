@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================
echo   发布到 GitHub
echo   会自动 add + commit + push，约 1 分钟后上线
echo  ============================================
echo.
set /p MSG=提交说明（直接回车 = 自动用时间）: 
if "%MSG%"=="" (
  call pnpm ship
) else (
  call pnpm ship "%MSG%"
)
echo.
echo  按任意键关闭...
pause >nul
