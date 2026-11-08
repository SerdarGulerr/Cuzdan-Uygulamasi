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
  `index.html`, `style.css`, `wallet.css`, `app.js`, `wallet.js`, `notifications.js`, `excel-sync.js`, `xlsx.full.min.js`, `icon.svg`, `manifest.json`, `sw.js`.
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

---

### 5. 📱 Cihaz ve Ekran Standardı (Samsung Galaxy Note 10+)
- **Birincil Hedef Cihaz:** Tüm tasarım, tipografi, buton, modal, kart ve yerleşim işlerinde **Samsung Galaxy Note 10 Plus** (6.8" Dynamic AMOLED, 412×869 / 412×915 px viewport, 3.5x DPR) fiziksel ekranı ve tek el ergonomisi esas alınır.
- **Yazı Okunabilirliği ve Kontrast:**
  - Buton içlerindeki yazılar, kart özetleri ve seçim çipleri ASLA soluk gri, düşük kontrastlı veya okunaksız açık pastel renklerde bırakılamaz.
  - Aksiyon butonları (`Borç Öde`, `Ödemeyi Kaydet`, vb.) her zaman yüksek kontrastlı, canlı arkaplanlı (ör. zümrüt yeşili degrade), net beyaz (`#ffffff`) ve kalın (`font-weight: 700-800`) yazılar içermelidir.
  - Metin boyutları butonlarda ve bilgi panellerinde en az `0.85rem - 0.95rem` seviyesinde tutulmalı; `0.72rem` gibi aşırı küçük, mobil ekranda göz yoran ve okunmayan puntolardan kaçınılmalıdır.
- **Dokunmatik Alanlar:** Dokunmatik butonlar ve çipler en az 42px - 48px dokunma yüksekliğine (`min-height`) ve rahat tıklanabilir iç boşluklara (`padding`) sahip olmalıdır.
