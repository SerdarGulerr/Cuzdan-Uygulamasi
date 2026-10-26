# 📱 Aile Faiz & Kasa Takip Uygulaması - Kurulum ve APK Rehberi

Bu uygulama; bankada tek bir vadeli/günlük mevduat hesabında duran **Sizin, Kızınızın ve Eşinizin** paralarını ayrı ayrı takip etmek, günlük bileşik faizi hesaplamak ve girdiğiniz faiz oranını yeni bir oran girene kadar gün gün otomatik işletmek için özel olarak geliştirilmiştir.

---

## 🚀 1. Bilgisayarda Hemen Denemek ve Kullanmak İçin
Masaüstünüzdeki **`FaizHesaplayici`** klasörünün içindeki **`baslat.bat`** dosyasına çift tıklayın:
- Tarayıcınızda uygulama mobil uygulama görünümüyle hemen açılacaktır.
- İstediğiniz zaman doğrudan `index.html` dosyasını tarayıcınıza sürükleyerek de açabilirsiniz.

---

## 📦 2. Saf Android APK Dosyası (.apk) Nasıl Alınır?

Hazırladığımız projeden doğrudan telefonunuza kurulabilir `.apk` dosyası elde etmek için en pratik yöntemler:

### 🌟 Yöntem A: GitHub Actions ile Otomatik APK Çıktısı (Resmi Yöntem)

Projenizin içine `.github/workflows/build-apk.yml` Android derleme motoru eklenmiştir.

#### 1. Adım: GitHub'da Yeni Depo (Repository) Açın
1. [GitHub.com](https://github.com) sitesine gidin ve hesabınıza giriş yapın.
2. Sağ üstteki **`+`** simgesine tıklayıp **"New repository"** seçin.
3. Repository name (Depo Adı) kısmına: `faiz-takip` yazın.
4. İsteğe bağlı olarak **"Private"** (Gizli) seçebilirsiniz (Kişisel verileriniz ve kodlarınız size özel kalır).
5. En alttaki yeşil **"Create repository"** butonuna tıklayın.

#### 2. Adım: Dosyaları Depoya Yükleyin
1. Açılan sayfada **"uploading an existing file"** (veya üstteki **"Add file" > "Upload files"**) seçeneğine tıklayın.
2. Masaüstünüzdeki **`FaizHesaplayici`** klasörünü açın.
3. Klasör içindeki tüm dosyaları (özellikle `.github`, `index.html`, `style.css`, `wallet.css`, `app.js`, `wallet.js`, `icon.svg`, `manifest.json`, `sw.js`) seçip tarayıcıdaki kutunun içine sürükleyip bırakın.
4. Dosyalar yüklendikten sonra sayfanın altındaki yeşil **"Commit changes"** butonuna tıklayın.

#### 3. Adım: APK'nın Otomatik Derlenmesini İzleyin
1. Deponuzun üst menüsündeki **"Actions"** sekmesine tıklayın.
2. Karşınıza **"Android APK Derleyici"** başlıklı bir iş çıkacak (Sarı dönen simge GitHub'ın bulut sunucularında Android SDK çalıştırdığını gösterir).
3. Yaklaşık 2-3 dakika içinde bu sarı simge yeşil onay işaretine (**✓**) dönecektir.

#### 4. Adım: APK Dosyasını İndirin ve Telefona Kurun
1. Yeşil olan derlemenin üzerine tıklayın.
2. Sayfanın en altına doğru kaydırdığınızda **"Artifacts"** (Eserler/Çıktılar) başlığı altında **`AileFaizTakip-APK`** linkini göreceksiniz.
3. Buna tıkladığınızda telefonunuza yüklenebilir APK dosyanız bilgisayarınıza inecektir!
4. İnen dosyayı WhatsApp Web üzerinden kendinize göndererek veya USB kablosuyla telefonunuza atıp açın ve **"Yükle"** deyin.

---

### ⚡ Yöntem B: Online Web2APK Dönüştürücüler (30 Saniyede APK Alma)
Bilgisayarınızda karmaşık Android Studio veya SDK kurmaya gerek kalmadan:
1. `FaizHesaplayici` klasöründeki dosyaları sağ tıklayıp **.ZIP** haline getirin.
2. [Web2Apk](https://www.web2apk.com/) veya [AppsGeyser](https://appsgeyser.com/) gibi ücretsiz HTML-to-APK platformlarından birini açın.
3. "HTML / Zip Archive" seçeneğini seçip zip dosyanızı yükleyin.
4. "Uygulama Adı: Aile Faiz Takip" yazıp **Generate APK** butonuna basın.
5. İndirdiğiniz `.apk` dosyasını WhatsApp veya kablo ile telefonunuza atıp açın.

---

### 📲 Yöntem C: Telefona Doğrudan "Uygulama Olarak Yükle" (PWA / APK Benzeri)
Bu uygulama bir **Progressive Web App (PWA)** olarak kodlanmıştır.
- Herhangi bir ücretsiz hostinge (örn: Vercel, Netlify veya GitHub Pages) tek tıkla yükleyip linki telefonunuzdaki Chrome tarayıcısında açtığınızda:
- Sağ üstteki 3 noktadan **"Ana Ekrana Ekle"** veya ekranda çıkan **"Uygulamayı Yükle"** butonuna bastığınızda telefonunuzun menüsüne tıpkı Google Play'den indirilmiş gibi logosuyla birlikte yüklenir.
- Tam ekran çalışır ve **hiç internet bağlantısı olmadan da telefonunuzda her gün faizi hesaplamaya devam eder**.

---

## 💡 Uygulamanın Özellikleri
1. **%17,5 Gelir Vergisi (Stopaj) Kesintisi**: Günlük brüt faiz kazancından yasal %17,5 stopaj vergisi otomatik olarak düşülür ve net kazanç anaparaya eklenir.
2. **Otomatik Oran Devamı**: Girdiğiniz faiz oranı, siz yeni bir oran girene kadar gün gün otomatik olarak bir önceki günün oranını kullanır.
3. **Günlük Bileşik Faiz**: Her günün net faizi gün sonunda kişinin anaparasına eklenerek büyüme sağlar.
4. **Kişi Bazlı Şeffaf Dağılım**: Ben, Kızım, Eşim (veya eklediğiniz yeni kişiler) için anapara, net faiz, vergi kesintisi, günlük net getiri ve toplam bakiye anında listelenir.
5. **Günlük Döküm Çizelgesi**: Geçmişten bugüne hangi gün ne kadar brüt faiz, ne kadar vergi (%17,5) ve ne kadar net faiz işlediğini kuruşu kuruşuna inceleyebilirsiniz.
6. **Yedekleme**: Ayarlar menüsünden tüm verilerinizi tek tıkla telefonunuza `.json` olarak yedekleyebilir veya geri yükleyebilirsiniz.
