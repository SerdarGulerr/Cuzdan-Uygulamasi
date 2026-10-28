# Aile Finansı - Proje ve Geliştirme Kuralları

Bu kurallar projede çalışan tüm yapay zeka asistanları (Gemini, Claude vb.) için bağlayıcıdır ve varsayılan olarak kesinlikle değiştirilmemelidir.

---

### 1. 🔑 Android Dijital İmza (Keystore) ve Güvenlik Kuralı (Kritik)
- **Asla Depoya Yükleme:** `debug.keystore`, `*.keystore` ve `*.jks` dosyaları KESİNLİKLE GitHub deposuna (public/private) pushlanamaz ve commit edilemez.
- **.gitignore Koruması:** `debug.keystore` ve imza uzantıları her zaman `.gitignore` içinde yer almalıdır.
- **Sadece GitHub Secrets:** APK imzalama anahtarı SADECE GitHub Secrets (`KEYSTORE_BASE64`) üzerinden okunur.
- **Rastgele Anahtar Üretme Yasağı:** `.github/workflows/build-apk.yml` derleme iş akışında `KEYSTORE_BASE64` secret'ı eksikse veya boşsa **KESİNLİKLE rastgele geçici anahtar üretilmeyecek**, derleme `exit 1` ile kasıtlı olarak durdurulacaktır. (Rastgele anahtar üretilirse kullanıcının telefonundaki kurulu sürüm ile yeni APK'nın imzası çakışır ve güncelleme bozulur).
- **Parmak İzi Denetimi:** Her derlemede imza anahtarının SHA-256 parmak izi loga yazdırılır.

---

### 2. 📦 APK Derleme Paket Bütünlüğü (.github/workflows/build-apk.yml)
- Web dosyaları `dist/` klasörüne kopyalanırken tüm bağımlılıklar eksiksiz dahil edilmelidir:
  `index.html`, `style.css`, `wallet.css`, `app.js`, `wallet.js`, `excel-sync.js`, `xlsx.full.min.js`, `icon.svg`, `manifest.json`, `sw.js`.
- Projeye yeni bir JS veya kütüphane eklendiğinde `build-apk.yml` dosyasındaki kopyalama komutu da güncellenmelidir.

---

### 3. 🎨 Arayüz ve Kullanıcı Deneyimi Standartları
- **Tarayıcı Prompt Yasağı:** Grup ve alt başlık yönetimi, hesap ekleme gibi alanlarda tarayıcının varsayılan `prompt()` / `alert()` pencereleri yerine her zaman projenin dark/glass tasarımına uygun özel `<dialog class="app-modal">` pencereleri kullanılır.
- **Grup ve Kategori Modalları:**
  - `modalWalletCategoryEdit`: Canlı kart önizlemesi, 40+ ikonluk logo/emoji seçici, özel emoji girişi ve 9 tonlu renk paleti içermelidir.
  - `modalWalletSubCategory`: Hangi üst gruba ait olduğunu gösteren rozet ve kategoriye göre akıllı hızlı öneri çipleri içermelidir.
  - `modalWalletAccount`: Hesap türü, ikon seçici ve bakiye giriş alanlarını korumalıdır.

---

### 4. 💾 Çevrimdışı ve PWA Uyumluluğu
- Veriler `localStorage` tabanlıdır. `sw.js` (Service Worker) ve `excel-sync.js` dosyaları çevrimdışı çalışabilirlik ve Excel yedekleme/içe aktarma fonksiyonlarını sağlar.
