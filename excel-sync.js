/**
 * Aile Finans & Cüzdan Portalı - Excel (.xlsx) Senkronizasyon Motoru
 * Bilgisayardan toplu veri girişi, şablon indirme ve Excel'den geri yükleme.
 * SheetJS (xlsx.full.min.js) ile %100 çevrimdışı çalışır.
 */

// --- Tarih ve Sayı Yardımcıları ---
function formatDateForExcel(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // GG.AA.YYYY
  }
  return dateStr;
}

function parseExcelDate(val) {
  if (!val) return getTodayDateString();
  // 1. Excel serial number (örn: 45220)
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  // 2. Date nesnesi
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  // 3. String (GG.AA.YYYY veya GG/AA/YYYY veya YYYY-MM-DD)
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  const parts = s.split(/[./-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const d = String(parseInt(parts[0], 10)).padStart(2, '0');
      const m = String(parseInt(parts[1], 10)).padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = String(parseInt(parts[1], 10)).padStart(2, '0');
      const d = String(parseInt(parts[2], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return getTodayDateString();
}

function parseExcelNumber(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).replace(/[^\d.,-]/g, '').trim();
  if (s.includes(',') && s.includes('.')) {
    // 1.250,50 formatı
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // 1250,50 formatı
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function getAccountTypeLabel(type) {
  if (type === 'cash') return 'Nakit Cüzdan';
  if (type === 'bank') return 'Vadesiz Banka';
  if (type === 'credit') return 'Kredi Kartı';
  if (type === 'savings') return 'Birikim / Altın';
  return 'Vadesiz Banka';
}

function parseAccountType(label) {
  if (!label) return 'bank';
  const l = String(label).toLowerCase().trim();
  if (l.includes('nakit') || l.includes('cash')) return 'cash';
  if (l.includes('kredi') || l.includes('kart') || l.includes('credit')) return 'credit';
  if (l.includes('birikim') || l.includes('altın') || l.includes('savings')) return 'savings';
  return 'bank';
}

// --- Excel İndirme (Export) ---
function exportDataToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel modülü (XLSX) yüklenemedi. Lütfen sayfayı yenileyin.');
    return;
  }

  // Durum kontrolü
  if (!walletState && typeof loadWalletState === 'function') loadWalletState();
  if (!appState && typeof loadState === 'function') loadState();

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SAYFA 1: Cüzdan Harcama ve Gelirleri
  // ==========================================
  const txHeaders = [
    'Tarih',
    'İşlem Türü',
    'Tutar (TL)',
    'Hesap / Kart',
    'Hedef Hesap (Transfer)',
    'Kategori',
    'Alt Kategori',
    'Açıklama / Not',
    'Kayıt ID'
  ];

  const txRows = [];
  const accounts = (walletState && walletState.accounts) || [];
  const expCats = (walletState && walletState.categories && walletState.categories.expense) || [];
  const incCats = (walletState && walletState.categories && walletState.categories.income) || [];
  const allCats = [...expCats, ...incCats];

  const transactions = (walletState && walletState.transactions) || [];

  if (transactions.length > 0) {
    transactions.forEach(tx => {
      const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
      const toAcc = accounts.find(a => a.id === tx.toAccountId);
      const cat = allCats.find(c => c.id === tx.categoryId);

      let turStr = 'Gider';
      if (tx.type === 'income') turStr = 'Gelir';
      else if (tx.type === 'transfer') turStr = 'Transfer';

      txRows.push([
        formatDateForExcel(tx.date),
        turStr,
        tx.amount,
        fromAcc ? fromAcc.name : '',
        toAcc ? toAcc.name : '',
        cat ? cat.name : '',
        tx.subCategory || '',
        tx.note || '',
        tx.id || ''
      ]);
    });
  } else {
    // Boş ise örnek rehber satırlar koy
    const todayTR = formatDateForExcel(getTodayDateString());
    const firstAcc = accounts[0] ? accounts[0].name : 'Banka Hesabı (Vadesiz)';
    txRows.push([todayTR, 'Gider', 350.50, firstAcc, '', 'Market & Gıda', 'Migros', 'Örnek: Haftalık market alışverişi', '']);
    txRows.push([todayTR, 'Gelir', 45000.00, firstAcc, '', 'Aylık Maaş', 'Ana Maaş', 'Örnek: Aylık net maaş', '']);
  }

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  wsTx['!cols'] = [
    { wch: 14 }, // Tarih
    { wch: 14 }, // İşlem Türü
    { wch: 15 }, // Tutar
    { wch: 26 }, // Hesap
    { wch: 26 }, // Hedef Hesap
    { wch: 22 }, // Kategori
    { wch: 20 }, // Alt Kategori
    { wch: 35 }, // Açıklama
    { wch: 20 }  // Kayıt ID
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Cüzdan_İşlemleri');

  // ==========================================
  // SAYFA 2: Hesaplar & Kartlar
  // ==========================================
  const accHeaders = ['Hesap Adı', 'Hesap Türü', 'Güncel Bakiye (TL)', 'İkon / Emoji', 'Hesap ID'];
  const accRows = [];
  accounts.forEach(a => {
    accRows.push([
      a.name,
      getAccountTypeLabel(a.type),
      a.balance,
      a.icon || '💳',
      a.id
    ]);
  });
  const wsAcc = XLSX.utils.aoa_to_sheet([accHeaders, ...accRows]);
  wsAcc['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAcc, 'Hesaplar_Cüzdanlar');

  // ==========================================
  // SAYFA 3: Kategori & Alt Başlık Rehberi
  // ==========================================
  const catHeaders = ['İşlem Türü', 'Kategori Başlığı', 'İkon', 'Tanımlı Alt Başlıklar (Referans)'];
  const catRows = [];
  expCats.forEach(c => {
    catRows.push(['Gider', c.name, c.icon || '', (c.subcategories || []).join(', ')]);
  });
  incCats.forEach(c => {
    catRows.push(['Gelir', c.name, c.icon || '', (c.subcategories || []).join(', ')]);
  });
  const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
  wsCat['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Kategori_Rehberi');

  // ==========================================
  // SAYFA 4: Faiz & Birikim Kasa Hareketleri
  // ==========================================
  if (appState && appState.members) {
    const faizHeaders = ['Tarih', 'Kişi', 'İşlem Türü', 'Tutar (TL)', 'Açıklama / Not', 'Kayıt ID'];
    const faizRows = [];
    const members = appState.members || [];
    const faizTxs = appState.transactions || [];

    faizTxs.forEach(tx => {
      const m = members.find(mem => mem.id === tx.memberId);
      faizRows.push([
        formatDateForExcel(tx.date),
        m ? m.name : 'Ben',
        tx.type === 'withdraw' ? 'Para Çekme' : 'Para Yatırma',
        tx.amount,
        tx.note || '',
        tx.id || ''
      ]);
    });

    const wsFaiz = XLSX.utils.aoa_to_sheet([faizHeaders, ...faizRows]);
    wsFaiz['!cols'] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsFaiz, 'Faiz_Kasa_Hareketleri');
  }

  // ==========================================
  // SAYFA 5: Faiz Oranları Geçmişi
  // ==========================================
  if (appState && appState.rateHistory) {
    const rateHeaders = ['Tarih', 'Yıllık Brüt Faiz Oranı (%)'];
    const rateRows = [];
    appState.rateHistory.forEach(r => {
      rateRows.push([formatDateForExcel(r.date), r.annualRate]);
    });
    const wsRate = XLSX.utils.aoa_to_sheet([rateHeaders, ...rateRows]);
    wsRate['!cols'] = [{ wch: 16 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsRate, 'Faiz_Oranları_Geçmişi');
  }

  // Dosyayı İndir
  const todayStr = getTodayDateString ? getTodayDateString() : new Date().toISOString().split('T')[0];
  const fileName = `AileFinans_Veriler_Sablon_${todayStr}.xlsx`;
  downloadExcelWorkbook(wb, fileName);
}

// --- Excel Dosyası İndirme Yönlendiricisi (Web / PC / Native APK) ---
function downloadExcelWorkbook(wb, filename) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Capacitor (Mobil APK) ortamı kontrolü
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins.Filesystem && cap.Plugins.Share) {
    const reader = new FileReader();
    reader.onloadend = function() {
      const base64data = reader.result.split(',')[1];
      cap.Plugins.Filesystem.writeFile({
        path: filename,
        data: base64data,
        directory: 'CACHE'
      }).then(res => {
        cap.Plugins.Share.share({
          title: 'Aile Finans Excel Şablonu',
          files: [res.uri]
        });
      }).catch(err => alert('Excel paylaşılamadı: ' + (err.message || err)));
    };
    reader.readAsDataURL(blob);
    return;
  }

  // Standart Tarayıcı / PC İndirme
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

// --- Excel'den Veri Yükleme (Import) ---
function importDataFromExcel(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    alert('Excel okuma kütüphanesi (XLSX) yüklenemedi. Lütfen sayfayı yenileyin.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });

      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
        alert('Seçilen Excel dosyasında okunabilir sekme bulunamadı!');
        return;
      }

      // Durumları yükle
      if (!walletState && typeof loadWalletState === 'function') loadWalletState();
      if (!appState && typeof loadState === 'function') loadState();

      let stats = {
        walletProcessed: 0,
        walletAdded: 0,
        walletUpdated: 0,
        accountsUpdated: 0,
        faizAdded: 0,
        faizUpdated: 0,
        newCategories: 0
      };

      // ----------------------------------------------------
      // 1. ADIM: Hesaplar Sekmesini İşleme (Hesaplar_Cüzdanlar)
      // ----------------------------------------------------
      const accSheetName = wb.SheetNames.find(s => s.toLowerCase().includes('hesap'));
      if (accSheetName) {
        const accSheet = wb.Sheets[accSheetName];
        const accRows = XLSX.utils.sheet_to_json(accSheet);

        accRows.forEach(row => {
          const accName = (row['Hesap Adı'] || row['Ad'] || row['Hesap'] || '').toString().trim();
          if (!accName) return;

          const accId = (row['Hesap ID'] || row['ID'] || '').toString().trim();
          const balance = parseExcelNumber(row['Güncel Bakiye (TL)'] || row['Bakiye'] || row['Tutar']);
          const typeStr = (row['Hesap Türü'] || row['Tür'] || '').toString().trim();
          const accType = parseAccountType(typeStr);
          const icon = (row['İkon / Emoji'] || row['İkon'] || '').toString().trim() || '💳';

          // Mevcut hesabı ID veya İsimle bul
          let existing = null;
          if (accId) {
            existing = walletState.accounts.find(a => a.id === accId);
          }
          if (!existing) {
            existing = walletState.accounts.find(a => a.name.toLowerCase() === accName.toLowerCase());
          }

          if (existing) {
            existing.name = accName;
            existing.type = accType;
            existing.balance = balance;
            if (icon) existing.icon = icon;
            stats.accountsUpdated++;
          } else {
            const newAcc = {
              id: accId || ('acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
              name: accName,
              type: accType,
              icon: icon,
              balance: balance
            };
            walletState.accounts.push(newAcc);
            stats.accountsUpdated++;
          }
        });
      }

      // ----------------------------------------------------
      // 2. ADIM: Cüzdan İşlemleri Sekmesini İşleme (Cüzdan_İşlemleri)
      // ----------------------------------------------------
      const txSheetName = wb.SheetNames.find(s => 
        s.toLowerCase().includes('cüzdan') || 
        s.toLowerCase().includes('harcama') || 
        s.toLowerCase().includes('işlem')
      );

      if (txSheetName) {
        const txSheet = wb.Sheets[txSheetName];
        const rawTxRows = XLSX.utils.sheet_to_json(txSheet);

        rawTxRows.forEach(row => {
          const amount = parseExcelNumber(row['Tutar (TL)'] || row['Tutar'] || row['Miktar']);
          if (!amount || amount <= 0) return; // Geçersiz veya boş satır

          const dateStr = parseExcelDate(row['Tarih']);
          const turRaw = (row['İşlem Türü'] || row['Tür'] || 'Gider').toString().toLowerCase().trim();
          let txType = 'expense';
          if (turRaw.includes('gelir') || turRaw.includes('income')) txType = 'income';
          else if (turRaw.includes('trans') || turRaw.includes('havale') || turRaw.includes('aktar')) txType = 'transfer';

          const fromAccName = (row['Hesap / Kart'] || row['Hesap'] || row['Kaynak Hesap'] || '').toString().trim();
          const toAccName = (row['Hedef Hesap (Transfer)'] || row['Hedef Hesap'] || '').toString().trim();
          const catName = (row['Kategori'] || '').toString().trim();
          const subCatName = (row['Alt Kategori'] || '').toString().trim();
          const note = (row['Açıklama / Not'] || row['Açıklama'] || row['Not'] || '').toString().trim();
          const kayitId = (row['Kayıt ID'] || row['ID'] || '').toString().trim();

          // Kaynak Hesap Eşleme / Bulma
          let fromAcc = null;
          if (fromAccName) {
            fromAcc = walletState.accounts.find(a => a.name.toLowerCase() === fromAccName.toLowerCase());
          }
          if (!fromAcc && walletState.accounts.length > 0) {
            fromAcc = walletState.accounts[0]; // Varsayılan ilk hesap
          }
          const fromAccountId = fromAcc ? fromAcc.id : 'acc_bank';

          // Hedef Hesap Eşleme (Transfer ise)
          let toAccountId = '';
          if (txType === 'transfer') {
            let toAcc = null;
            if (toAccName) {
              toAcc = walletState.accounts.find(a => a.name.toLowerCase() === toAccName.toLowerCase());
            }
            if (!toAcc && walletState.accounts.length > 1) {
              toAcc = walletState.accounts.find(a => a.id !== fromAccountId) || walletState.accounts[1];
            }
            toAccountId = toAcc ? toAcc.id : '';
          }

          // Kategori Eşleme & Gerekirse Otomatik Ekleme
          let categoryId = '';
          if (txType !== 'transfer') {
            const catGroup = txType === 'expense' ? walletState.categories.expense : walletState.categories.income;
            let catObj = null;
            if (catName) {
              catObj = catGroup.find(c => c.name.toLowerCase() === catName.toLowerCase());
            }
            if (!catObj && catName) {
              // Yeni kategori oluştur
              const newCatId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
              catObj = {
                id: newCatId,
                name: catName,
                icon: txType === 'expense' ? '📦' : '💵',
                color: txType === 'expense' ? '#64748b' : '#10b981',
                subcategories: subCatName ? [subCatName] : []
              };
              catGroup.push(catObj);
              stats.newCategories++;
            }
            if (catObj) {
              categoryId = catObj.id;
              if (subCatName && Array.isArray(catObj.subcategories) && !catObj.subcategories.includes(subCatName)) {
                catObj.subcategories.push(subCatName);
              }
            } else if (catGroup.length > 0) {
              categoryId = catGroup[0].id;
            }
          }

          // Kayıt ID ile güncelle veya yeni ekle
          let existingTx = null;
          if (kayitId) {
            existingTx = walletState.transactions.find(t => t.id === kayitId);
          }

          if (existingTx) {
            existingTx.type = txType;
            existingTx.amount = amount;
            existingTx.date = dateStr;
            existingTx.fromAccountId = fromAccountId;
            existingTx.toAccountId = toAccountId;
            existingTx.categoryId = categoryId;
            existingTx.subCategory = subCatName;
            existingTx.note = note;
            stats.walletUpdated++;
          } else {
            const newTx = {
              id: 'wtx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
              type: txType,
              amount: amount,
              fromAccountId: fromAccountId,
              toAccountId: toAccountId,
              categoryId: categoryId,
              subCategory: subCatName,
              date: dateStr,
              note: note
            };
            walletState.transactions.push(newTx);
            stats.walletAdded++;
          }
          stats.walletProcessed++;
        });

        // Tarihe göre yeniden sırala (en yeniden en eskiye)
        walletState.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      // ----------------------------------------------------
      // 3. ADIM: Faiz & Birikim Sekmesini İşleme (Faiz_Kasa_Hareketleri)
      // ----------------------------------------------------
      const faizSheetName = wb.SheetNames.find(s => 
        s.toLowerCase().includes('faiz') && s.toLowerCase().includes('hareket')
      );

      if (faizSheetName && appState) {
        const faizSheet = wb.Sheets[faizSheetName];
        const rawFaizRows = XLSX.utils.sheet_to_json(faizSheet);

        rawFaizRows.forEach(row => {
          const amount = parseExcelNumber(row['Tutar (TL)'] || row['Tutar']);
          if (!amount || amount <= 0) return;

          const dateStr = parseExcelDate(row['Tarih']);
          const kisiName = (row['Kişi'] || row['Ad'] || 'Ben').toString().trim();
          const turRaw = (row['İşlem Türü'] || row['Tür'] || 'Yatırma').toString().toLowerCase().trim();
          const txType = (turRaw.includes('çek') || turRaw.includes('withdraw')) ? 'withdraw' : 'deposit';
          const note = (row['Açıklama / Not'] || row['Açıklama'] || '').toString().trim();
          const kayitId = (row['Kayıt ID'] || '').toString().trim();

          // Kişi eşleme veya yeni kişi ekleme
          let member = appState.members.find(m => m.name.toLowerCase() === kisiName.toLowerCase());
          if (!member) {
            member = {
              id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              name: kisiName,
              avatar: 'avatar-me'
            };
            appState.members.push(member);
          }

          // Kayıt güncelleme veya ekleme
          let existingFaizTx = null;
          if (kayitId) {
            existingFaizTx = appState.transactions.find(t => t.id === kayitId);
          }

          if (existingFaizTx) {
            existingFaizTx.memberId = member.id;
            existingFaizTx.type = txType;
            existingFaizTx.amount = amount;
            existingFaizTx.date = dateStr;
            existingFaizTx.note = note;
            stats.faizUpdated++;
          } else {
            const newFaizTx = {
              id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              memberId: member.id,
              type: txType,
              amount: amount,
              date: dateStr,
              note: note
            };
            appState.transactions.push(newFaizTx);
            stats.faizAdded++;
          }
        });
      }

      // ----------------------------------------------------
      // 4. ADIM: Faiz Oranları Sekmesini İşleme
      // ----------------------------------------------------
      const rateSheetName = wb.SheetNames.find(s => 
        s.toLowerCase().includes('oran')
      );

      if (rateSheetName && appState) {
        const rateSheet = wb.Sheets[rateSheetName];
        const rawRateRows = XLSX.utils.sheet_to_json(rateSheet);

        rawRateRows.forEach(row => {
          const dateStr = parseExcelDate(row['Tarih']);
          const rateVal = parseExcelNumber(row['Yıllık Brüt Faiz Oranı (%)'] || row['Oran'] || row['Faiz']);
          if (!rateVal || rateVal <= 0) return;

          let existingRate = appState.rateHistory.find(r => r.date === dateStr);
          if (existingRate) {
            existingRate.annualRate = rateVal;
          } else {
            appState.rateHistory.push({
              id: 'rate_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              date: dateStr,
              annualRate: rateVal
            });
          }
        });

        appState.rateHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      // ----------------------------------------------------
      // 5. ADIM: Verileri Kaydet ve UI'ı Güncelle
      // ----------------------------------------------------
      if (typeof saveWalletState === 'function') saveWalletState();
      if (typeof saveState === 'function') saveState();

      if (typeof renderWalletUI === 'function') renderWalletUI();
      if (typeof renderUI === 'function') renderUI();
      if (typeof renderSettings === 'function') renderSettings();

      // Bilgilendirme Raporu Göster
      let msg = '🎉 Excel Verileri Başarıyla İçe Aktarıldı ve Güncellendi!\n\n';
      if (stats.walletAdded > 0 || stats.walletUpdated > 0) {
        msg += `• Cüzdan İşlemleri: ${stats.walletAdded} yeni eklendi, ${stats.walletUpdated} güncellendi.\n`;
      }
      if (stats.accountsUpdated > 0) {
        msg += `• Hesap & Bakiye: ${stats.accountsUpdated} hesap güncellendi.\n`;
      }
      if (stats.newCategories > 0) {
        msg += `• Yeni Kategoriler: ${stats.newCategories} yeni başlık otomatik oluşturuldu.\n`;
      }
      if (stats.faizAdded > 0 || stats.faizUpdated > 0) {
        msg += `• Faiz/Kasa Hareketleri: ${stats.faizAdded} eklendi, ${stats.faizUpdated} güncellendi.\n`;
      }

      alert(msg);

    } catch (err) {
      console.error('Excel okuma hatası:', err);
      alert('Excel dosyası işlenirken hata oluştu: ' + (err.message || err));
    } finally {
      // Inputu temizle ki aynı dosya tekrar seçilebilsin
      event.target.value = '';
    }
  };

  reader.readAsArrayBuffer(file);
}

// --- Excel Hızlı Eylemler Modalı Açıcı ---
function openExcelSyncModal() {
  const modal = document.getElementById('modalExcelSync');
  if (modal) {
    modal.showModal();
  } else {
    // Modal yoksa doğrudan indirmeyi tetikle
    exportDataToExcel();
  }
}
