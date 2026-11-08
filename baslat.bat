@echo off
chcp 65001 > nul
title Aile Finansi - Mobil Gelistirme

echo ===================================================
echo     Aile Finansi Uygulamasi Baslatiliyor...
echo ===================================================
echo.

set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo 1. BILGISAYARDA MOBIL GORUNUM:
echo    Samsung Note 10+ boyutunda aciliyor.
echo    Incelemek icin F12 tusuna basabilirsiniz.
echo.
echo 2. TELEFONDA CANLI IZLEME:
echo    Ayni Wi-Fi agindaki telefonunuzdan su adrese girin:
echo.
echo    http://%LOCAL_IP%:8080
echo.
echo    Telefonda sayfayi yenilediginizde degisiklikler aninda gorunur.
echo ===================================================
echo.

start chrome --new-window --window-size=430,920 http://localhost:8080/index.html?r=%random%

echo Sunucu calisiyor. Kapatmak icin Ctrl+C yapabilirsiniz.
echo.
python -m http.server 8080
pause
