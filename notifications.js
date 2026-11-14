/**
 * Aile Finansı - Kredi Kartı Hesap Kesim Bildirim Motoru (notifications.js)
 * 
 * Kural: Kredi kartı hesap kesim tarihi geldiğinde borç ödenene kadar
 * her gün saat 11:30'da telefona borcu olan kartlarla ilgili AYRI AYRI bildirim gönderir.
 * 
 * - Capacitor 7 Android ortamında (@capacitor/local-notifications) native AlarmManager ile çalışır (uygulama kapalıyken bile çalar).
 * - Web / PWA ortamında Service Worker / Web Notification API ile çalışır.
 * - Borç ödendiğinde veya bakiye kapandığında bildirimleri otomatik durdurur / iptal eder.
 * - Bildirime tıklandığında doğrudan ilgili kredi kartının "Borç Öde" modalını açar.
 */

const NOTIF_CONFIG_STORAGE_KEY = 'aile_finansi_cutoff_notif_config_v1';
const NOTIF_LOG_STORAGE_KEY = 'aile_finansi_cutoff_notif_log_v1';
const NOTIF_READ_STATUS_STORAGE_KEY = 'aile_finansi_cutoff_read_status_v2';

// Tarih Yardımcısı (YYYY-MM-DD)
function getNotifTodayDateString(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Okundu Bilgilerini Oku
function getNotificationReadMap() {
  try {
    const raw = localStorage.getItem(NOTIF_READ_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Okundu Bilgilerini Kaydet
function saveNotificationReadMap(map) {
  try {
    localStorage.setItem(NOTIF_READ_STATUS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Read status save error:', e);
  }
}

// Belirli bir kart bugün okundu mu?
function isNotificationReadToday(cardId, now = new Date()) {
  if (!cardId) return false;
  const map = getNotificationReadMap();
  const todayStr = getNotifTodayDateString(now);
  return !!(map[cardId] && map[cardId].date === todayStr);
}

// Varsayılan Bildirim Ayarları
const DEFAULT_NOTIF_CONFIG = {
  enabled: true,
  time: '11:30', // Her gün saat 11:30
  sound: true,
  vibrate: true
};

// Bildirim Ayarlarını Oku
function getCutoffNotificationConfig() {
  try {
    const raw = localStorage.getItem(NOTIF_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_CONFIG };
    return { ...DEFAULT_NOTIF_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Bildirim ayarı okunamadı:', e);
    return { ...DEFAULT_NOTIF_CONFIG };
  }
}

// Bildirim Ayarlarını Kaydet
function saveCutoffNotificationConfig(newCfg) {
  try {
    const current = getCutoffNotificationConfig();
    const merged = { ...current, ...newCfg };
    localStorage.setItem(NOTIF_CONFIG_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Bildirim ayarı kaydedilemedi:', e);
    return DEFAULT_NOTIF_CONFIG;
  }
}

/**
 * Hesap ID'sinden Capacitor ve Android NotificationManager için
 * çakışmayan, sabit ve pozitif 32-bit integer ID üretir.
 */
function getCardNotificationId(accId) {
  let hash = 0;
  const str = 'cutoff_acc_' + (accId || 'default');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Android Java int pozitif aralığı: 10,000 - 99,999,999
  return Math.abs(hash % 90000000) + 10000;
}

/**
 * Bir kredi kartının bildirim durumunu analiz eder:
 * - Kart türü 'credit' mi?
 * - Kartın güncel toplam borcu var mı? (acc.balance < 0)
 * - Hesap kesim tarihi geldi mi? (ayın kesim günü veya sonrası)
 * - Ya da önceki aydan kalan ödenmemiş ekstre borcu var mı?
 */
function getCreditCardNotificationDetails(acc, now = new Date()) {
  if (!acc || acc.type !== 'credit') {
    return { shouldNotify: false, debt: 0, reason: 'not_credit' };
  }

  const totalDebt = Math.max(0, -acc.balance);
  if (totalDebt <= 0) {
    return { shouldNotify: false, debt: 0, reason: 'no_debt' };
  }

  const billingDay = parseInt(acc.billingDay, 10) || 15;
  const currentD = now.getDate();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isCustom = !!(acc.isCustomPeriod && acc.customPeriodEnd);

  // wallet.js içindeki detaylı dönem borç motorunu çağır
  const periodData = (typeof calculateCreditCardPeriodDebt === 'function')
    ? calculateCreditCardPeriodDebt(acc.id, billingDay)
    : null;

  let shouldNotify = false;
  let notifDebt = totalDebt;
  let statusText = '';
  let reason = '';

  const isCutoffArrived = isCustom ? (todayStr >= acc.customPeriodEnd) : (currentD >= billingDay);
  const periodDebt = (periodData && typeof periodData.netDebt === 'number') ? periodData.netDebt : (periodData && periodData.statsA ? periodData.statsA.net : 0);

  if (isCutoffArrived) {
    // 1. Durum: Bugün bu ayın hesap kesim gününe ulaştı veya geçti (örn: Ayın 15'i ve sonrası veya revize tarih)
    // Kesim gerçekleşti, borç varsa ödenene kadar bildirim aktiftir.
    shouldNotify = periodDebt > 0;
    notifDebt = shouldNotify ? Math.min(totalDebt, periodDebt) : 0;
    reason = isCustom ? 'custom_cutoff_arrived' : 'current_cutoff_arrived';
    const cutoffDateText = (typeof getCreditCardCutoffDateDisplay === 'function') ? getCreditCardCutoffDateDisplay(acc, periodData ? periodData.endDate : null) : (isCustom ? acc.customPeriodEnd : `Ayın ${billingDay}'i`);
    statusText = shouldNotify
      ? `${cutoffDateText} tarihinde kesildi. Borç (${formatWalletTL(notifDebt)}) ödenene kadar her gün 11:30'da bildirim aktif.`
      : `${cutoffDateText} tarihinde kesilen dönem borcu tamamen ödenmiştir.`;
  } else {
    // 2. Durum: Bugün henüz bu ayın kesim gününe gelmedi (örn: Bugün ayın 14'ü, kesim 15'i)
    // Kesimi gerçekleşen önceki ekstreden (periodData) kalan ödenmemiş borç var mı?
    if (periodDebt > 0) {
      shouldNotify = true;
      notifDebt = Math.min(totalDebt, periodDebt);
      reason = 'previous_cutoff_unpaid';
      const cutoffDateText = (typeof getCreditCardCutoffDateDisplay === 'function') ? getCreditCardCutoffDateDisplay(acc, periodData ? periodData.endDate : null) : `Ayın ${billingDay}'i`;
      statusText = `Önceki ekstre borcu (${cutoffDateText} kesimi: ${formatWalletTL(notifDebt)}) henüz ödenmedi. Her gün 11:30'da bildirim aktif.`;
    } else {
      // Önceki ekstre ödenmiş, mevcut harcamalar henüz kesilmemiş bir sonraki ekstreye ait
      shouldNotify = false;
      reason = 'upcoming_cutoff_pending';
      const nextCutoffText = (typeof getCreditCardCutoffDateDisplay === 'function') ? getCreditCardCutoffDateDisplay(acc, periodData ? periodData.endDate : null) : `Ayın ${billingDay}'i`;
      statusText = `Mevcut harcamalar bir sonraki kesim (${nextCutoffText}) için bekliyor.`;
    }
  }

  return {
    shouldNotify,
    debt: Math.round(notifDebt * 100) / 100,
    totalDebt: Math.round(totalDebt * 100) / 100,
    billingDay,
    cardId: acc.id,
    cardName: acc.name,
    cardIcon: acc.icon || '💳',
    reason,
    statusText
  };
}

/**
 * Şu an bildirimi yapılması gereken tüm borçlu kredi kartlarını döndürür
 */
function getActivePendingCutoffCards(now = new Date()) {
  if (typeof walletState === 'undefined' || !walletState || !walletState.accounts) {
    return [];
  }
  return walletState.accounts
    .filter(a => a.type === 'credit')
    .map(a => ({ account: a, info: getCreditCardNotificationDetails(a, now) }))
    .filter(item => item.info.shouldNotify);
}

/**
 * Şu an bildirimi yapılması gereken ve BUGÜN HENÜZ OKUNDU YAPILMAMIŞ kartları döndürür
 */
function getUnreadActiveCutoffCards(now = new Date()) {
  const pending = getActivePendingCutoffCards(now);
  return pending.filter(item => !isNotificationReadToday(item.account.id, now));
}

/**
 * Tek bir kartın bildirimini hem Android hem de Web bildirim çekmecesinden siler
 */
async function dismissNativeAndWebNotification(cardId) {
  if (!cardId) return;
  const notifId = getCardNotificationId(cardId);
  const plugin = getCapacitorLocalNotifications();

  // 1. Android Native (Capacitor)
  if (plugin) {
    try {
      if (plugin.removeDeliveredNotifications) {
        await plugin.removeDeliveredNotifications({
          notifications: [{ id: notifId }]
        });
      }
      if (plugin.cancel) {
        await plugin.cancel({
          notifications: [{ id: notifId }]
        });
      }
    } catch (e) {
      console.warn('Native bildirim silme uyarısı:', e);
    }
  }

  // 2. Web Service Worker & Notification API
  if ('serviceWorker' in navigator) {
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CARD_NOTIFICATIONS',
          accountId: cardId
        });
      }
      if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.getNotifications().then(list => {
            list.forEach(n => {
              if ((n.data && n.data.accountId === cardId) || (n.tag && n.tag.includes(cardId))) {
                n.close();
              }
            });
          });
        });
      }
    } catch (e) {
      console.warn('Web SW notification close notice:', e);
    }
  }
}

/**
 * Tüm borçlu kartların bildirimlerini hem Android hem de Web bildirim çekmecesinden siler
 */
async function dismissAllNativeAndWebNotifications() {
  const plugin = getCapacitorLocalNotifications();

  // 1. Android Native (Capacitor)
  if (plugin) {
    try {
      if (plugin.removeAllDeliveredNotifications) {
        await plugin.removeAllDeliveredNotifications();
      }
      const pending = await plugin.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await plugin.cancel({ notifications: pending.notifications });
      }
    } catch (e) {
      console.warn('Native dismissAll uyarısı:', e);
    }
  }

  // 2. Web Service Worker & Notification API
  if ('serviceWorker' in navigator) {
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CARD_NOTIFICATIONS'
        });
      }
      if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.getNotifications().then(list => {
            list.forEach(n => n.close());
          });
        });
      }
    } catch (e) {
      console.warn('Web SW dismissAll notice:', e);
    }
  }
}

/**
 * Bir kartın bildirimini okundu olarak işaretler ve telefondan siler
 */
async function markCardNotificationAsRead(cardId, now = new Date()) {
  if (!cardId) return;
  const map = getNotificationReadMap();
  const todayStr = getNotifTodayDateString(now);
  map[cardId] = {
    date: todayStr,
    timestamp: Date.now()
  };
  saveNotificationReadMap(map);

  // Telefondan bildirimi sil
  await dismissNativeAndWebNotification(cardId);

  // Rozetleri ve modal listesini güncelle
  updateNotificationBadgeCount(now);
  renderNotificationsModalList();
}

/**
 * Tüm bekleyen kart bildirimlerini okundu olarak işaretler ve telefondan siler
 */
async function markAllCardNotificationsAsRead(now = new Date()) {
  const pending = getActivePendingCutoffCards(now);
  const map = getNotificationReadMap();
  const todayStr = getNotifTodayDateString(now);

  pending.forEach(item => {
    map[item.account.id] = {
      date: todayStr,
      timestamp: Date.now()
    };
  });
  saveNotificationReadMap(map);

  // Telefondan tüm bildirimleri sil
  await dismissAllNativeAndWebNotifications();

  // Rozetleri ve modal listesini güncelle
  updateNotificationBadgeCount(now);
  renderNotificationsModalList();
}

/**
 * Sağ üstteki bildirim butonlarının üzerindeki okunmamış rozetini günceller
 */
function updateNotificationBadgeCount(now = new Date()) {
  const unreadCards = getUnreadActiveCutoffCards(now);
  const count = unreadCards.length;

  const bellButtons = document.querySelectorAll('.btn-notification-bell');
  bellButtons.forEach(btn => {
    const badge = btn.querySelector('.notif-badge-count');
    if (badge) {
      if (count > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = count > 9 ? '9+' : String(count);
        btn.classList.add('has-unread');
        btn.setAttribute('title', `${count} adet bekleyen ödeme bildirimi var (Görmek için tıklayın)`);
      } else {
        badge.style.display = 'none';
        badge.textContent = '0';
        btn.classList.remove('has-unread');
        btn.setAttribute('title', 'Ödeme Bildirimleri');
      }
    }
  });
}

// Capacitor LocalNotifications Eklentisini Güvenli Şekilde Al
function getCapacitorLocalNotifications() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    return window.Capacitor.Plugins.LocalNotifications;
  }
  return null;
}

// Android Bildirim Kanalını Oluştur (Yüksek Öncelik & Titreşim)
async function ensureAndroidNotificationChannel() {
  const plugin = getCapacitorLocalNotifications();
  if (!plugin || !plugin.createChannel) return;

  try {
    await plugin.createChannel({
      id: 'credit_card_cutoff_reminders',
      name: 'Kredi Kartı Kesim Bildirimleri',
      description: 'Hesap kesim tarihi gelen ve borcu olan kartlar için her gün 11:30 hatırlatmaları',
      importance: 5, // High: Heads-up pop-up banner ve ses
      visibility: 1, // Kilit ekranında tam görünür
      sound: 'beep.wav',
      vibration: true,
      lights: true,
      lightColor: '#f43f5e'
    });
  } catch (err) {
    console.warn('Notification channel creation notice:', err);
  }
}

// Bildirim İzni Kontrolü
async function checkNotificationPermissionStatus() {
  const plugin = getCapacitorLocalNotifications();
  if (plugin && plugin.checkPermissions) {
    try {
      const res = await plugin.checkPermissions();
      return res.display === 'granted';
    } catch (e) {
      console.warn('Capacitor checkPermissions error:', e);
    }
  }

  if ('Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
}

// Kullanıcıdan Bildirim İzni İste
async function requestNotificationPermissionPrompt() {
  const plugin = getCapacitorLocalNotifications();
  if (plugin && plugin.requestPermissions) {
    try {
      const res = await plugin.requestPermissions();
      const isGranted = (res.display === 'granted');
      updateNotificationUIBadges(isGranted);
      if (isGranted) {
        await syncCreditCardCutoffNotifications();
      }
      return isGranted;
    } catch (e) {
      console.warn('Capacitor requestPermissions error:', e);
    }
  }

  if ('Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      const isGranted = (perm === 'granted');
      updateNotificationUIBadges(isGranted);
      if (isGranted) {
        await syncCreditCardCutoffNotifications();
      }
      return isGranted;
    } catch (e) {
      console.warn('Web Notification request error:', e);
    }
  }

  return false;
}

/**
 * Kredi Kartı Hesap Kesim Bildirimlerini Senkronize Et
 * - Her borcu olan kart için AYRI AYRI bildirim planlar.
 * - Borcu ödenen veya kesim tarihi gelmemiş kartların alarmlarını iptal eder.
 * - Her gün saat 11:30'da tetiklenecek şekilde native veya web planlaması yapar.
 */
async function syncCreditCardCutoffNotifications() {
  const cfg = getCutoffNotificationConfig();
  const plugin = getCapacitorLocalNotifications();
  const now = new Date();

  if (typeof walletState === 'undefined' || !walletState || !walletState.accounts) {
    return;
  }

  const creditCards = walletState.accounts.filter(a => a.type === 'credit');
  if (creditCards.length === 0) return;

  // Saat 11:30 ayrıştırması
  const [hourStr, minStr] = (cfg.time || '11:30').split(':');
  const targetHour = parseInt(hourStr, 10) || 11;
  const targetMinute = parseInt(minStr, 10) || 30;

  const toSchedule = [];
  const toCancel = [];

  creditCards.forEach(card => {
    const notifId = getCardNotificationId(card.id);
    const details = getCreditCardNotificationDetails(card, now);

    if (cfg.enabled && details.shouldNotify) {
      // Bu kart için AYRI bildirim planla
      // Not: Kullanıcı isteği gereği autoCancel: false ve ongoing: true ayarlandı.
      // Böylece kullanıcı bildirime dokunup uygulamaya girse bile telefonun bildirim penceresinde KAPANMAZ!
      // Yalnızca kullanıcı sağ üstteki bildirim butonuna tıklayıp okundu yapınca telefondan silinir.
      toSchedule.push({
        id: notifId,
        channelId: 'credit_card_cutoff_reminders',
        title: `💳 ${card.name} - Hesap Kesim Hatırlatması`,
        body: `Hesap kesim tarihiniz geldi. Güncel borcunuz: ${formatWalletTL(details.debt)}. Borç ödenene kadar her gün ${cfg.time || '11:30'}'da hatırlatılacaktır.`,
        autoCancel: false,
        ongoing: true,
        schedule: {
          on: {
            hour: targetHour,
            minute: targetMinute
          },
          allowWhileIdle: true
        },
        extra: {
          accountId: card.id,
          cardName: card.name,
          debt: details.debt,
          type: 'credit_card_cutoff'
        }
      });
    } else {
      // Borç ödendiyse veya bildirim kapalıysa bu kartın alarmını kaldır ve telefondaki açık bildirimi sil
      toCancel.push({ id: notifId });
      dismissNativeAndWebNotification(card.id);
    }
  });

  // 1. NATIVE ANDROID (Capacitor) Senkronizasyonu
  if (plugin) {
    try {
      await ensureAndroidNotificationChannel();

      if (toCancel.length > 0) {
        await plugin.cancel({ notifications: toCancel });
      }

      if (toSchedule.length > 0) {
        // İzin kontrolü
        const permStatus = await plugin.checkPermissions();
        if (permStatus.display === 'granted') {
          await plugin.schedule({ notifications: toSchedule });
        }
      }
    } catch (nativeErr) {
      console.warn('Native LocalNotifications schedule error:', nativeErr);
    }
  }

  // 2. WEB / PWA FALLBACK (Tarayıcı açıldığında veya sekme açıkken kontrol)
  checkAndTriggerWebNotificationsIfDue(toSchedule, targetHour, targetMinute, now);

  // 3. UI'daki kart durumlarını ve sağ üst bildirim rozetini güncelle
  updateNotificationUIBadges();
  updateNotificationBadgeCount(now);
}

/**
 * Web / PWA ortamı için günlük kontrol:
 * Eğer bugün saat 11:30 geçtiyse ve bugün bu kart için henüz bildirim gösterilmediyse gösterir.
 */
function checkAndTriggerWebNotificationsIfDue(scheduledList, targetHour, targetMinute, now = new Date()) {
  if (scheduledList.length === 0) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const todayStr = now.toISOString().split('T')[0];
  const curHour = now.getHours();
  const curMin = now.getMinutes();

  // Saat 11:30 veya sonrası mı?
  const isPastTime = (curHour > targetHour) || (curHour === targetHour && curMin >= targetMinute);
  if (!isPastTime) return;

  scheduledList.forEach(item => {
    const accId = item.extra ? item.extra.accountId : item.id;
    const sentKey = `cc_notif_sent_${accId}_${todayStr}`;
    
    // Bugün bu kart için zaten gösterildiyse veya kullanıcı okundu yaptıysa tekrar etme
    if (localStorage.getItem(sentKey)) return;
    if (isNotificationReadToday(accId, now)) return;

    // Bildirimi fırlat
    displayBrowserNotification(item.title, item.body, {
      tag: `cc_debt_${accId}`,
      data: { accountId: accId }
    });

    localStorage.setItem(sentKey, Date.now().toString());
  });
}

/**
 * Tarayıcı / PWA Bildirimi Göster (ServiceWorker veya Notification API)
 */
function displayBrowserNotification(title, body, options = {}) {
  const defaultOpts = {
    body: body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    ...options
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, defaultOpts);
    }).catch(() => {
      try { new Notification(title, defaultOpts); } catch (e) { /* fallback */ }
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, defaultOpts);
      if (options.data && options.data.accountId) {
        n.onclick = () => {
          window.focus();
          handleNotificationCardClick(options.data.accountId);
        };
      }
    } catch (e) {
      console.warn('Web notification direct show error:', e);
    }
  }
}

/**
 * Bildirime tıklandığında tetiklenir:
 * Kart borç ödeme modalını açar ve kart detayına odaklanır.
 */
function handleNotificationCardClick(accountId) {
  if (!accountId) return;

  // Cüzdan modülüne geç
  if (typeof switchMainModule === 'function') {
    switchMainModule('wallet');
  }

  // Hesaplar sekmesine geç
  if (typeof switchWalletSubView === 'function') {
    switchWalletSubView('accounts');
  }

  // Kart Borç Ödeme modalını aç
  setTimeout(() => {
    if (typeof openPayCreditCardModal === 'function') {
      openPayCreditCardModal(accountId);
    } else if (typeof openAccountDetailModal === 'function') {
      openAccountDetailModal(accountId);
    }
  }, 250);
}

/**
 * Kullanıcı Testi:
 * Şimdi test bildirimi gönderir, böylece kullanıcı telefonunda veya ekranında
 * ayrı ayrı gelen bildirimleri anında görüp deneyimleyebilir.
 */
async function testCreditCardCutoffNotifications() {
  const isGranted = await checkNotificationPermissionStatus();
  if (!isGranted) {
    const userAccepted = await requestNotificationPermissionPrompt();
    if (!userAccepted) {
      alert('⚠️ Bildirim gönderilebilmesi için tarayıcı veya cihaz ayarlarından bildirim izni vermelisiniz.');
      return;
    }
  }

  const now = new Date();
  let pending = getActivePendingCutoffCards(now);

  // Eğer şu anda borçlu kesilmiş kart yoksa, kullanıcıya test edebilmesi için kayıtlı kartlardan örnek oluştur
  if (pending.length === 0) {
    const anyCreditCard = (walletState && walletState.accounts)
      ? walletState.accounts.find(a => a.type === 'credit')
      : null;

    if (anyCreditCard) {
      pending = [{
        account: anyCreditCard,
        info: {
          shouldNotify: true,
          debt: Math.abs(anyCreditCard.balance) || 2750.50,
          billingDay: anyCreditCard.billingDay || 15,
          cardName: anyCreditCard.name,
          cardIcon: anyCreditCard.icon || '💳',
          statusText: 'Test Bildirimi'
        }
      }];
    } else {
      alert('Sistemde kayıtlı kredi kartı bulunamadı. Lütfen önce Cüzdanım sekmesinden Kredi Kartı ekleyiniz.');
      return;
    }
  }

  const plugin = getCapacitorLocalNotifications();

  // Her kart için ayrı ayrı bildirim fırlat
  let sentCount = 0;
  for (const item of pending) {
    const card = item.account;
    const debt = item.info.debt || Math.abs(card.balance) || 1500;
    const title = `💳 ${card.name} - Hesap Kesim Hatırlatması`;
    const body = `Hesap kesim tarihiniz geldi. Güncel borcunuz: ${formatWalletTL(debt)}. Borç ödenene kadar her gün 11:30'da hatırlatılacaktır.`;
    const notifId = getCardNotificationId(card.id) + Math.floor(Math.random() * 100);

    if (plugin) {
      try {
        await ensureAndroidNotificationChannel();
        await plugin.schedule({
          notifications: [
            {
              id: notifId,
              channelId: 'credit_card_cutoff_reminders',
              title: title,
              body: body,
              autoCancel: false,
              ongoing: true,
              schedule: { at: new Date(Date.now() + 1000 * (sentCount + 1)) }, // 1 sn arayla ayrı ayrı
              extra: { accountId: card.id, type: 'credit_card_cutoff_test' }
            }
          ]
        });
        sentCount++;
      } catch (err) {
        console.warn('Native test notif error:', err);
        displayBrowserNotification(title, body, { data: { accountId: card.id } });
        sentCount++;
      }
    } else {
      displayBrowserNotification(title, body, { data: { accountId: card.id } });
      sentCount++;
    }
  }

  // Kullanıcıya bilgi ver
  const msgEl = document.getElementById('notifTestFeedbackMsg');
  if (msgEl) {
    msgEl.textContent = `✓ ${sentCount} adet kart için bildirim başarıyla gönderildi!`;
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
  } else {
    alert(`✓ ${sentCount} adet kart için bildirim bildirimi telefonunuza gönderildi.`);
  }
}

/**
 * Ayarlar Modalındaki Bildirim Arayüzünü Çizer
 */
function renderNotificationSettingsUI() {
  const container = document.getElementById('notifSettingsContainer');
  if (!container) return;

  const cfg = getCutoffNotificationConfig();
  const now = new Date();
  const creditCards = (walletState && walletState.accounts) 
    ? walletState.accounts.filter(a => a.type === 'credit')
    : [];

  const toggleInput = document.getElementById('toggleCardCutoffNotif');
  if (toggleInput) toggleInput.checked = !!cfg.enabled;

  const timeInput = document.getElementById('inputNotifTime');
  if (timeInput) timeInput.value = cfg.time || '11:30';

  const listContainer = document.getElementById('notifPendingCardsList');
  if (listContainer) {
    if (creditCards.length === 0) {
      listContainer.innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-muted); padding:8px 0;">
          Kayıtlı kredi kartınız bulunmuyor. Kredi kartı eklediğinizde hesap kesim günleri burada listelenir.
        </div>
      `;
    } else {
      let cardsHtml = '';
      creditCards.forEach(card => {
        const details = getCreditCardNotificationDetails(card, now);
        const hasDebt = details.debt > 0;
        const isNotifActive = cfg.enabled && details.shouldNotify;

        cardsHtml += `
          <div class="notif-card-status-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; margin-bottom:6px;">
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:1.1rem;">${card.icon || '💳'}</span>
                <strong style="font-size:0.88rem; color:#fff;">${card.name}</strong>
                <span class="account-cutoff-pill" style="font-size:0.65rem;">📅 Kesim: ${(typeof getCreditCardCutoffDateDisplay === 'function') ? getCreditCardCutoffDateDisplay(card) : (card.billingDay || 15)}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-dim); margin-top:3px;">
                Borç: <strong style="color:${hasDebt ? 'var(--rose)' : 'var(--emerald)'};">${formatWalletTL(details.debt)}</strong> 
                | ${details.statusText}
              </div>
            </div>
            <div>
              ${isNotifActive ? `
                <span class="notif-active-pill" title="Her gün saat 11:30'da bildirim gönderilir">
                  🔔 11:30 Aktif
                </span>
              ` : hasDebt ? `
                <span class="notif-waiting-pill" title="Kesim tarihi geldiğinde bildirim başlayacaktır">
                  ⏳ Kesim Bekliyor
                </span>
              ` : `
                <span class="notif-paid-pill" title="Borç bulunmuyor">
                  ✓ Borç Yok
                </span>
              `}
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = cardsHtml;
    }
  }

  updateNotificationUIBadges();
}

/**
 * İzin Rozetlerini Günceller
 */
async function updateNotificationUIBadges(forceState = null) {
  const badge = document.getElementById('notifPermissionBadge');
  if (!badge) return;

  const isGranted = (forceState !== null) ? forceState : await checkNotificationPermissionStatus();
  if (isGranted) {
    badge.textContent = 'İzin Verildi ✓';
    badge.className = 'notif-perm-badge perm-granted';
    badge.title = 'Bildirim izni aktif';
  } else {
    badge.textContent = 'İzin Ver ⚠️';
    badge.className = 'notif-perm-badge perm-needed';
    badge.title = 'Bildirim alabilmek için tıklayıp izin verin';
  }
}

// Ayar Değişiklikleri Tetikleyicileri
function toggleNotificationEnabled(isEnabled) {
  saveCutoffNotificationConfig({ enabled: !!isEnabled });
  syncCreditCardCutoffNotifications();
  renderNotificationSettingsUI();
}

function handleNotificationTimeChange(newTime) {
  if (!newTime) return;
  saveCutoffNotificationConfig({ time: newTime });
  syncCreditCardCutoffNotifications();
  renderNotificationSettingsUI();
}

function handleNotificationPermissionClick() {
  requestNotificationPermissionPrompt();
}

/**
 * Bildirimler Modalını Açar
 */
function openNotificationsModal() {
  renderNotificationsModalList();
  if (typeof openModal === 'function') {
    openModal('modalNotifications');
  }
}

/**
 * Modal İçindeki Kart Listesini ve Durumları Çizer
 */
function renderNotificationsModalList() {
  const banner = document.getElementById('notifModalHeaderBanner');
  const container = document.getElementById('notifCardsListContainer');
  const btnAll = document.getElementById('btnDismissAllNotifs');

  if (!banner || !container) return;

  const now = new Date();
  const activePending = getActivePendingCutoffCards(now);
  const unreadPending = getUnreadActiveCutoffCards(now);

  if (activePending.length === 0) {
    banner.className = 'notif-banner-box all-clear';
    banner.innerHTML = `
      <span style="font-size: 1.5rem;">🎉</span>
      <div>
        <div style="font-weight: 800; color: #10b981;">Harika! Borçlu Kesilmiş Kart Yok</div>
        <div style="font-size: 0.80rem; color: #a7f3d0; margin-top: 2px;">
          Tüm kredi kartlarınızın dönem borçları kapalı veya henüz hesap kesim tarihi gelmedi.
        </div>
      </div>
    `;

    container.innerHTML = `
      <div style="text-align: center; padding: 24px 10px; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">💳</div>
        <p style="margin: 0; font-size: 0.88rem; font-weight: 600;">Şu anda telefonunuza gönderilecek aktif bir ödeme uyarısı bulunmuyor.</p>
      </div>
    `;

    if (btnAll) {
      btnAll.disabled = true;
      btnAll.innerHTML = '<span>✓ Bekleyen Bildirim Yok</span>';
    }
    return;
  }

  // Borçlu kesilmiş kartlar var
  const hasUnread = unreadPending.length > 0;
  if (hasUnread) {
    banner.className = 'notif-banner-box active-debts';
    banner.innerHTML = `
      <span style="font-size: 1.5rem;">⚠️</span>
      <div>
        <div style="font-weight: 800; color: #f43f5e;">${unreadPending.length} Kart İçin Bildirim Bekliyor</div>
        <div style="font-size: 0.80rem; color: #fecdd3; margin-top: 2px;">
          Bildirimler siz "Okundu Say" diyene kadar telefonunuzun bildirim ekranında görünmeye devam edecektir.
        </div>
      </div>
    `;
    if (btnAll) {
      btnAll.disabled = false;
      btnAll.innerHTML = '<span>✓ Tümünü Okundu Say & Telefondan Sil</span>';
    }
  } else {
    banner.className = 'notif-banner-box all-clear';
    banner.innerHTML = `
      <span style="font-size: 1.5rem;">✓</span>
      <div>
        <div style="font-weight: 800; color: #10b981;">Bugünkü Bildirimler Okundu Olarak İşaretlendi</div>
        <div style="font-size: 0.80rem; color: #a7f3d0; margin-top: 2px;">
          Bildirimler telefonunuzun bildirim çekmecesinden temizlendi. Borç ödenmediği takdirde yarın 11:30'da tekrar hatırlatılacaktır.
        </div>
      </div>
    `;
    if (btnAll) {
      btnAll.disabled = true;
      btnAll.innerHTML = '<span>✓ Tüm Bildirimler Okundu</span>';
    }
  }

  let html = '';
  activePending.forEach(item => {
    const card = item.account;
    const details = item.info;
    const isRead = isNotificationReadToday(card.id, now);
    const cutoffText = (typeof getCreditCardCutoffDateDisplay === 'function') 
      ? getCreditCardCutoffDateDisplay(card) 
      : (card.billingDay || 15);

    html += `
      <div class="notif-card-item ${isRead ? 'is-read' : ''}">
        <div class="notif-card-top">
          <div class="notif-card-brand">
            <span class="notif-card-icon">${card.icon || '💳'}</span>
            <div style="min-width: 0;">
              <div class="notif-card-name" title="${card.name}">${card.name}</div>
              <div class="notif-card-sub">📅 Kesim: Ayın ${cutoffText} | ${details.reason === 'custom_cutoff_arrived' ? 'Özel Dönem' : 'Normal Dönem'}</div>
            </div>
          </div>
          <div class="notif-card-debt-badge">
            <div class="notif-card-debt-val">${formatWalletTL(details.debt)}</div>
            <div class="notif-card-debt-label">Kesim Borcu</div>
          </div>
        </div>

        <div style="font-size: 0.78rem; color: ${isRead ? 'var(--emerald)' : 'var(--text-dim)'}; display: flex; align-items: center; gap: 6px;">
          ${isRead ? '<span>✓ Bugün okundu işaretlendi (telefondan silindi)</span>' : '<span>🔔 Telefonda bildirim aktif ve görünür durumda</span>'}
        </div>

        <div class="notif-card-actions">
          <button type="button" class="btn-notif-pay" onclick="handlePayNotificationCardClick('${card.id}')">
            <span>💳 Borcu Öde</span>
          </button>
          ${!isRead ? `
            <button type="button" class="btn-notif-single-dismiss" onclick="markCardNotificationAsRead('${card.id}')" title="Bu bildirimi telefondan sil ve okundu yap">
              <span>✓ Okundu Say</span>
            </button>
          ` : `
            <button type="button" class="btn-notif-single-dismiss" style="opacity: 0.6; cursor: default;" disabled>
              <span>✓ Okundu</span>
            </button>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Tümünü Okundu Say Tıklaması
 */
async function handleDismissAllNotificationsClick() {
  await markAllCardNotificationsAsRead();
}

/**
 * Bildirim Modalından Borç Öde Butonuna Tıklanınca
 */
function handlePayNotificationCardClick(cardId) {
  if (typeof closeModal === 'function') {
    closeModal('modalNotifications');
  }
  handleNotificationCardClick(cardId);
}

/**
 * Bildirim Modalından Ayarlar Sayfasına Git
 */
function openAppSettingsWithNotifSection() {
  if (typeof closeModal === 'function') {
    closeModal('modalNotifications');
  }
  if (typeof openAppSettings === 'function') {
    openAppSettings();
  }
  setTimeout(() => {
    const el = document.getElementById('notifSettingsContainer');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

// Global Erişime Aç
window.getCutoffNotificationConfig = getCutoffNotificationConfig;
window.saveCutoffNotificationConfig = saveCutoffNotificationConfig;
window.getCreditCardNotificationDetails = getCreditCardNotificationDetails;
window.getActivePendingCutoffCards = getActivePendingCutoffCards;
window.getUnreadActiveCutoffCards = getUnreadActiveCutoffCards;
window.dismissNativeAndWebNotification = dismissNativeAndWebNotification;
window.dismissAllNativeAndWebNotifications = dismissAllNativeAndWebNotifications;
window.markCardNotificationAsRead = markCardNotificationAsRead;
window.markAllCardNotificationsAsRead = markAllCardNotificationsAsRead;
window.updateNotificationBadgeCount = updateNotificationBadgeCount;
window.openNotificationsModal = openNotificationsModal;
window.renderNotificationsModalList = renderNotificationsModalList;
window.handleDismissAllNotificationsClick = handleDismissAllNotificationsClick;
window.handlePayNotificationCardClick = handlePayNotificationCardClick;
window.openAppSettingsWithNotifSection = openAppSettingsWithNotifSection;
window.syncCreditCardCutoffNotifications = syncCreditCardCutoffNotifications;
window.testCreditCardCutoffNotifications = testCreditCardCutoffNotifications;
window.renderNotificationSettingsUI = renderNotificationSettingsUI;
window.toggleNotificationEnabled = toggleNotificationEnabled;
window.handleNotificationTimeChange = handleNotificationTimeChange;
window.handleNotificationPermissionClick = handleNotificationPermissionClick;
window.handleNotificationCardClick = handleNotificationCardClick;

/**
 * Servis Başlatma (Init)
 */
function initNotificationService() {
  // 1. Android Notification Channel'ı hazırla
  ensureAndroidNotificationChannel();

  // 2. Capacitor Bildirim Tıklama Dinleyicisi
  const plugin = getCapacitorLocalNotifications();
  if (plugin && plugin.addListener) {
    try {
      plugin.addListener('localNotificationActionPerformed', (notification) => {
        const accId = notification.notification?.extra?.accountId;
        if (accId) {
          handleNotificationCardClick(accId);
        }
      });
    } catch (e) {
      console.warn('Capacitor action listener error:', e);
    }
  }

  // 3. Service Worker Mesaj Dinleyicisi
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'OPEN_CARD_PAY_MODAL' && event.data.accountId) {
        handleNotificationCardClick(event.data.accountId);
      }
    });
  }

  // 4. URL Parametresi Kontrolü (?openCard=acc_id)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const cardToOpen = urlParams.get('openCard');
    if (cardToOpen) {
      setTimeout(() => handleNotificationCardClick(cardToOpen), 600);
    }
  } catch (e) { /* ignore */ }

  // 5. İlk Bildirim Senkronizasyonunu ve Rozet Sayısını Çalıştır
  setTimeout(() => {
    syncCreditCardCutoffNotifications();
    updateNotificationBadgeCount();
  }, 1000);

  // 6. Sayfaya her odaklanıldığında (Focus) rozeti ve bildirim durumlarını güncelle
  window.addEventListener('focus', () => {
    updateNotificationBadgeCount();
  });

  // 7. Web / PWA için Arka Plan Kontrol Zamanlayıcısı (Her 60 saniyede bir saati yoklar)
  setInterval(() => {
    const now = new Date();
    const cfg = getCutoffNotificationConfig();
    const [hourStr, minStr] = (cfg.time || '11:30').split(':');
    const targetHour = parseInt(hourStr, 10) || 11;
    const targetMinute = parseInt(minStr, 10) || 30;

    if (now.getHours() === targetHour && now.getMinutes() === targetMinute) {
      syncCreditCardCutoffNotifications();
    }
    updateNotificationBadgeCount(now);
  }, 60000);
}

// DOM Yüklendiğinde Başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotificationService);
} else {
  initNotificationService();
}
