@echo off
chcp 65001 > nul
echo ===================================================
echo     Aile Faiz & Kasa Takip Uygulaması Başlatılıyor...
echo ===================================================
echo.
echo Tarayıcınız açılıyor...
start http://localhost:8080/index.html?r=%random%
python -m http.server 8080
pause
