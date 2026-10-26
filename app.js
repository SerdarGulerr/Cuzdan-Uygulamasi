/**
 * Aile Günlük Faiz & Kasa Takip Uygulaması
 * Tamamen yerel (offline) çalışan, günlük bileşik faiz motoru.
 */

// Varsayılan Kişiler ve Veri Yapısı
const DEFAULT_STATE = {
  members: [
    { id: 'me', name: 'Ben', avatar: 'avatar-me' },
    { id: 'daughter', name: 'Kızım', avatar: 'avatar-daughter' },
    { id: 'wife', name: 'Eşim', avatar: 'avatar-wife' }
  ],
  transactions: [
    {
      id: 'tx_init_1',
      memberId: 'me',
      type: 'deposit',
      amount: 100000,
      date: getDaysAgoDate(15),
      note: 'İlk hesap açılışı'
    },
    {
      id: 'tx_init_2',
      memberId: 'wife',
      type: 'deposit',
      amount: 80000,
      date: getDaysAgoDate(15),
      note: 'Birikim aktarımı'
    },
    {
      id: 'tx_init_3',
      memberId: 'daughter',
      type: 'deposit',
      amount: 30000,
      date: getDaysAgoDate(10),
      note: 'Harçlık hesabı'
    }
  ],
  rateHistory: [
    {
      id: 'rate_init_1',
      date: getDaysAgoDate(15),
      annualRate: 48.0
    }
  ],
  taxRate: 17.5 // %17.5 Yasal Gelir Vergisi (Stopaj) Kesintisi
};

let appState = null;

// Helper: X gün öncesinin YYYY-MM-DD tarihini al
function getDaysAgoDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Helper: Bugünün YYYY-MM-DD tarihi
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format: 12345.67 -> 12.345,67 ₺
function formatTL(num) {
  if (isNaN(num)) return '0,00 ₺';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + ' ₺';
}

// Format Date: 2026-10-23 -> 23 Eki 2026
function formatDateTR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

// --- LocalStorage State Management ---
function loadState() {
  try {
    const raw = localStorage.getItem('faiz_takip_data_v1');
    if (raw) {
      appState = JSON.parse(raw);
      if (typeof appState.taxRate === 'undefined') {
        appState.taxRate = 17.5;
        saveState();
      }
    } else {
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState();
    }
  } catch (e) {
    console.error('Veri yüklenemedi, varsayılan yüklendi', e);
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  localStorage.setItem('faiz_takip_data_v1', JSON.stringify(appState));
}

// --- Faiz Hesaplama Motoru (Bileşik Günlük Faiz) ---
// "Girdiğim oran ben değiştirene kadar bir önceki günün oranını kullanmaya devam edecek"
function calculateLedger() {
  const today = getTodayDateString();
  const membersMap = {};
  
  appState.members.forEach(m => {
    membersMap[m.id] = {
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      principal: 0,       // Net yatırılan anapara (Yatırılan - Çekilen)
      balance: 0,         // Anapara + bugüne kadar biriken faiz
      totalProfit: 0,     // Toplam biriken faiz
      todayProfit: 0      // Bugünkü 1 günlük faiz kazancı
    };
  });

  const taxRate = typeof appState.taxRate === 'number' ? appState.taxRate : 17.5;

  // Tarihleri sırala
  const rates = [...appState.rateHistory].sort((a, b) => a.date.localeCompare(b.date));
  const txs = [...appState.transactions].sort((a, b) => a.date.localeCompare(b.date));

  // Eğer hiç işlem yoksa
  if (txs.length === 0) {
    const latestRate = rates.length > 0 ? rates[rates.length - 1].annualRate : 0;
    return {
      members: Object.values(membersMap),
      totalBalance: 0,
      totalPrincipal: 0,
      totalProfit: 0,
      todayProfit: 0,
      todayGross: 0,
      todayTax: 0,
      totalTax: 0,
      taxRate: taxRate,
      currentRate: latestRate,
      dailyLogs: []
    };
  }

  // İlk işlem tarihinden bugüne kadar olan günleri belirle
  const startDateStr = txs[0].date;
  let currentDateObj = new Date(startDateStr);
  const targetDateObj = new Date(today);

  // Gün gün döngü için
  const dailyLogs = [];
  let txIndex = 0;

  // Verilen bir tarih için geçerli olan son oranı bulur
  function getRateForDate(dStr) {
    let activeRate = 0;
    for (const r of rates) {
      if (r.date <= dStr) {
        activeRate = r.annualRate;
      } else {
        break;
      }
    }
    return activeRate;
  }

  // Günlük simülasyon döngüsü (Bankacılık Gecelik Faiz / Valör Kuralı)
  // Kural: 22 Eylül'de yatırılan paranın faizi 22 gecesi işler, ilk getiri 23 Eylül sabahı hesaba geçer.
  while (currentDateObj <= targetDateObj) {
    const dStr = currentDateObj.toISOString().split('T')[0];

    // O gün geçerli olan yıllık brüt faiz oranını al
    const annualRate = getRateForDate(dStr);
    const dailyRate = (annualRate / 100) / 365;

    // 1. DÜN GECEDEN DEVREDEN BAKİYE ÜZERİNDEN SABAH HESABA YATAN FAİZ
    let dayTotalGross = 0;
    let dayTotalTax = 0;
    let dayTotalNet = 0;
    const memberSnapshots = {};

    for (const mId in membersMap) {
      const mem = membersMap[mId];
      let grossGain = 0;
      let taxAmount = 0;
      let netGain = 0;

      // Dün geceden devreden bakiye varsa bu sabah faizi yansır
      if (mem.balance > 0) {
        grossGain = mem.balance * dailyRate;
        taxAmount = grossGain * (taxRate / 100);
        netGain = grossGain - taxAmount;
      }

      // Hesaba ve kasaya net getiri eklenir (Bileşik büyüme)
      mem.balance += netGain;
      mem.totalProfit += netGain;
      mem.totalTax = (mem.totalTax || 0) + taxAmount;
      mem.todayProfit = netGain;
      mem.todayGross = grossGain;
      mem.todayTax = taxAmount;

      dayTotalGross += grossGain;
      dayTotalTax += taxAmount;
      dayTotalNet += netGain;

      memberSnapshots[mId] = {
        balance: mem.balance,
        grossGain: grossGain,
        taxAmount: taxAmount,
        netGain: netGain
      };
    }

    // 2. GÜN İÇİNDE YAPILAN PARA YATIRMA / ÇEKME HAREKETLERİ
    // (Bugün yatırılan para gün sonu bakiyesine eklenir, faizi yarın sabah yansır)
    while (txIndex < txs.length && txs[txIndex].date === dStr) {
      const tx = txs[txIndex];
      const member = membersMap[tx.memberId];
      if (member) {
        if (tx.type === 'deposit') {
          member.principal += tx.amount;
          member.balance += tx.amount;
        } else if (tx.type === 'withdraw') {
          member.principal -= tx.amount;
          member.balance -= tx.amount;
        }
        if (memberSnapshots[tx.memberId]) {
          memberSnapshots[tx.memberId].balance = member.balance;
        }
      }
      txIndex++;
    }

    let dailyTotalBalance = 0;
    for (const mId in membersMap) {
      dailyTotalBalance += membersMap[mId].balance;
    }

    dailyLogs.unshift({
      date: dStr,
      annualRate: annualRate,
      taxRate: taxRate,
      dayTotalGross: dayTotalGross,
      dayTotalTax: dayTotalTax,
      dayTotalNet: dayTotalNet,
      totalBalance: dailyTotalBalance,
      memberSnapshots: memberSnapshots
    });

    // Sonraki güne geç
    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  // Genel Toplamlar
  let grandTotalBalance = 0;
  let grandTotalPrincipal = 0;
  let grandTotalProfit = 0;
  let grandTodayProfit = 0;
  let grandTodayGross = 0;
  let grandTodayTax = 0;
  let grandTotalTax = 0;

  for (const mId in membersMap) {
    const mem = membersMap[mId];
    grandTotalBalance += mem.balance;
    grandTotalPrincipal += mem.principal;
    grandTotalProfit += mem.totalProfit;
    grandTodayProfit += mem.todayProfit;
    grandTodayGross += mem.todayGross || 0;
    grandTodayTax += mem.todayTax || 0;
    grandTotalTax += mem.totalTax || 0;
  }

  const currentActiveRate = getRateForDate(today);

  return {
    members: Object.values(membersMap),
    totalBalance: grandTotalBalance,
    totalPrincipal: grandTotalPrincipal,
    totalProfit: grandTotalProfit,
    todayProfit: grandTodayProfit,
    todayGross: grandTodayGross,
    todayTax: grandTodayTax,
    totalTax: grandTotalTax,
    taxRate: taxRate,
    currentRate: currentActiveRate,
    dailyLogs: dailyLogs
  };
}

// --- UI Render Metotları ---
function renderUI() {
  const result = calculateLedger();

  // Header & Tarih
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    const today = new Date();
    dateEl.innerText = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today);
  }

  // Hero Stats
  document.getElementById('displayTotalBalance').innerText = formatTL(result.totalBalance);
  document.getElementById('displayTodayInterest').innerText = '+' + formatTL(result.todayProfit);
  const taxDetailEl = document.getElementById('displayTodayTaxDetail');
  if (taxDetailEl) {
    taxDetailEl.innerText = `(Stopaj %${result.taxRate}: -${formatTL(result.todayTax)})`;
  }
  document.getElementById('displayTotalPrincipal').innerText = formatTL(result.totalPrincipal);
  document.getElementById('displayTotalProfit').innerText = '+' + formatTL(result.totalProfit);
  document.getElementById('displayCurrentRate').innerText = `%${result.currentRate.toFixed(2)}`;
  document.getElementById('memberCountTag').innerText = `${result.members.length} Kişi`;

  // Render Member Cards
  const membersContainer = document.getElementById('membersContainer');
  membersContainer.innerHTML = '';

  result.members.forEach(m => {
    const sharePercent = result.totalBalance > 0 ? ((m.balance / result.totalBalance) * 100).toFixed(1) : '0.0';
    const initial = m.name.charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = 'member-card member-card-clickable';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.title = `${m.name} - Sayfasına Git ve Günlük Gelir Grafiğini Gör`;
    card.onclick = () => navigateToMember(m.id);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToMember(m.id);
      }
    };
    card.innerHTML = `
      <div class="member-header">
        <div class="member-info">
          <div class="member-avatar ${m.avatar || 'avatar-other'}">${initial}</div>
          <div>
            <div class="member-name">${m.name}</div>
            <span class="member-share-pill">%${sharePercent} Pay</span>
          </div>
        </div>
        <div class="member-balance-box">
          <div class="member-balance">${formatTL(m.balance)}</div>
          <div class="member-daily-gain">+${formatTL(m.todayProfit)} / gün</div>
        </div>
      </div>

      <div class="share-bar-container">
        <div class="share-bar-fill" style="width: ${sharePercent}%; background: ${getAvatarColor(m.avatar)};"></div>
      </div>

      <div class="member-footer-stats">
        <span>Yatırılan: <strong>${formatTL(m.principal)}</strong></span>
        <span>Net Faiz: <strong class="gain-val">+${formatTL(m.totalProfit)}</strong></span>
        <span class="view-detail-hint">Detay & Grafik &rsaquo;</span>
      </div>
    `;
    membersContainer.appendChild(card);
  });

  // Render Person Selector in Deposit Modal
  const personSelector = document.getElementById('personSelector');
  personSelector.innerHTML = '';
  appState.members.forEach((m, idx) => {
    const label = document.createElement('label');
    label.className = 'segment-opt';
    label.innerHTML = `
      <input type="radio" name="personSelect" value="${m.id}" ${idx === 0 ? 'checked' : ''}>
      <span>${m.name}</span>
    `;
    personSelector.appendChild(label);
  });

  // Render Rate History in Rates Modal
  renderRateHistoryList();
}

function getAvatarColor(avatarClass) {
  if (avatarClass === 'avatar-daughter') return '#ec4899';
  if (avatarClass === 'avatar-wife') return '#8b5cf6';
  if (avatarClass === 'avatar-me') return '#3b82f6';
  return '#f59e0b';
}

// Render Rate History inside Rates Modal
function renderRateHistoryList() {
  const container = document.getElementById('rateHistoryList');
  if (!container) return;
  container.innerHTML = '';

  const sortedRates = [...appState.rateHistory].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedRates.length === 0) {
    container.innerHTML = '<p class="field-hint">Henüz oran kaydı yok.</p>';
    return;
  }

  sortedRates.forEach(r => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span><strong>%${r.annualRate.toFixed(2)}</strong> (${formatDateTR(r.date)} tarihinden itibaren)</span>
      <button class="btn-del" onclick="deleteRate('${r.id}')" title="Bu oranı sil">&times;</button>
    `;
    container.appendChild(item);
  });
}

// Render Daily Report Table
function renderDailyReport() {
  const result = calculateLedger();
  const theadRow = document.querySelector('#dailyReportTable thead tr');
  
  // Header sütunlarını dinamik yap
  let thHtml = `
    <th>Tarih</th>
    <th>Brüt Oran</th>
    <th>Brüt Faiz</th>
    <th>Stopaj (%${result.taxRate})</th>
    <th>Net Faiz</th>
  `;
  appState.members.forEach(m => {
    thHtml += `<th>${m.name}</th>`;
  });
  thHtml += `<th>Toplam Kasa</th>`;
  theadRow.innerHTML = thHtml;

  const tbody = document.getElementById('dailyReportBody');
  tbody.innerHTML = '';

  if (result.dailyLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">Kayıtlı işlem bulunamadı.</td></tr>';
    return;
  }

  result.dailyLogs.forEach(log => {
    const tr = document.createElement('tr');
    let rowHtml = `
      <td><strong>${formatDateTR(log.date)}</strong></td>
      <td>%${log.annualRate.toFixed(2)}</td>
      <td>+${formatTL(log.dayTotalGross)}</td>
      <td style="color: #fca5a5;">-${formatTL(log.dayTotalTax)}</td>
      <td style="color: var(--emerald); font-weight: 700;">+${formatTL(log.dayTotalNet)}</td>
    `;

    appState.members.forEach(m => {
      const snap = log.memberSnapshots[m.id];
      const bal = snap ? snap.balance : 0;
      rowHtml += `<td>${formatTL(bal)}</td>`;
    });

    rowHtml += `<td><strong>${formatTL(log.totalBalance)}</strong></td>`;
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
}

// Render Transactions History Modal
function renderTxHistory() {
  const container = document.getElementById('txHistoryContainer');
  container.innerHTML = '';

  const sortedTxs = [...appState.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedTxs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px; color: var(--text-muted);">Henüz para yatırma/çekme işlemi yok.</p>';
    return;
  }

  sortedTxs.forEach(tx => {
    const member = appState.members.find(m => m.id === tx.memberId) || { name: 'Bilinmeyen' };
    const isDeposit = tx.type === 'deposit';

    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-left">
        <span class="tx-person">${member.name} ${tx.note ? `<small style="font-weight: normal; color: var(--text-dim);">(${tx.note})</small>` : ''}</span>
        <span class="tx-meta">${formatDateTR(tx.date)} &bull; ${isDeposit ? 'Yatırıldı' : 'Çekildi'}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${isDeposit ? 'deposit' : 'withdraw'}">
          ${isDeposit ? '+' : '-'}${formatTL(tx.amount)}
        </span>
        <button class="btn-del" onclick="deleteTx('${tx.id}')" title="İşlemi Sil">&times;</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Render Settings Modal
function renderSettings() {
  const container = document.getElementById('membersManagerList');
  container.innerHTML = '';

  appState.members.forEach(m => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span><strong>${m.name}</strong></span>
      ${appState.members.length > 1 ? `<button class="btn-del" onclick="deleteMember('${m.id}')" title="Kişiyi Sil">&times;</button>` : ''}
    `;
    container.appendChild(item);
  });
}

// --- Form & Action Handlers ---
function handleDepositSubmit(e) {
  e.preventDefault();
  const personRadio = document.querySelector('input[name="personSelect"]:checked');
  const txTypeRadio = document.querySelector('input[name="txType"]:checked');
  const amountInput = document.getElementById('inputAmount');
  const dateInput = document.getElementById('inputTxDate');
  const noteInput = document.getElementById('inputNote');

  if (!personRadio || !amountInput.value || !dateInput.value) return;

  const newTx = {
    id: 'tx_' + Date.now(),
    memberId: personRadio.value,
    type: txTypeRadio.value,
    amount: parseFloat(amountInput.value),
    date: dateInput.value,
    note: noteInput.value.trim()
  };

  appState.transactions.push(newTx);
  saveState();
  renderUI();
  closeModal('modalDeposit');
  e.target.reset();
  if (currentActiveMemberId) {
    showMemberPage(currentActiveMemberId);
  }
}

function handleRateSubmit(e) {
  e.preventDefault();
  const rateInput = document.getElementById('inputRate');
  const dateInput = document.getElementById('inputRateDate');
  const taxInput = document.getElementById('inputTaxRate');

  if (!rateInput.value || !dateInput.value) return;

  if (taxInput && taxInput.value) {
    appState.taxRate = parseFloat(taxInput.value);
  }

  const newRate = {
    id: 'rate_' + Date.now(),
    date: dateInput.value,
    annualRate: parseFloat(rateInput.value)
  };

  // Varsa aynı tarihteki kaydı güncelle, yoksa ekle
  const existingIdx = appState.rateHistory.findIndex(r => r.date === newRate.date);
  if (existingIdx >= 0) {
    appState.rateHistory[existingIdx].annualRate = newRate.annualRate;
  } else {
    appState.rateHistory.push(newRate);
  }

  saveState();
  renderUI();
  closeModal('modalRates');
  if (currentActiveMemberId) {
    showMemberPage(currentActiveMemberId);
  }
}

function deleteTx(txId) {
  if (confirm('Bu para hareketini silmek istediğinize emin misiniz?')) {
    appState.transactions = appState.transactions.filter(t => t.id !== txId);
    saveState();
    renderUI();
    renderTxHistory();
    if (currentActiveMemberId) {
      showMemberPage(currentActiveMemberId);
    }
  }
}

function deleteRate(rateId) {
  if (appState.rateHistory.length <= 1) {
    alert('En az 1 adet faiz oranı kaydı bulunmalıdır.');
    return;
  }
  if (confirm('Bu faiz oranını silmek istediğinize emin misiniz?')) {
    appState.rateHistory = appState.rateHistory.filter(r => r.id !== rateId);
    saveState();
    renderUI();
  }
}

function addNewMember() {
  const input = document.getElementById('inputNewMemberName');
  const name = input.value.trim();
  if (!name) return;

  const id = 'mem_' + Date.now();
  appState.members.push({
    id: id,
    name: name,
    avatar: 'avatar-other'
  });

  input.value = '';
  saveState();
  renderUI();
  renderSettings();
}

function deleteMember(memberId) {
  const hasTx = appState.transactions.some(t => t.memberId === memberId);
  if (hasTx) {
    alert('Bu kişiye ait para hareketleri var! Önce geçmişten bu kişinin işlemlerini silmelisiniz.');
    return;
  }
  if (confirm('Bu kişiyi listeden çıkarmak istediğinize emin misiniz?')) {
    appState.members = appState.members.filter(m => m.id !== memberId);
    saveState();
    renderUI();
    renderSettings();
  }
}

// Backup & Restore (Tüm Sistem - Faiz + Cüzdan Tek Dosyada)
function exportDataBackup() {
  let currentWallet = null;
  try {
    if (typeof walletState !== 'undefined' && walletState) {
      currentWallet = walletState;
    } else {
      const rawW = localStorage.getItem('cuzdan_manager_data_v1');
      if (rawW) currentWallet = JSON.parse(rawW);
    }
  } catch(e) {}

  const masterBackup = {
    appName: "AileFinansPortali",
    version: 2,
    exportDate: new Date().toISOString(),
    faizData: appState,
    walletData: currentWallet
  };

  const jsonText = JSON.stringify(masterBackup, null, 2);
  const fileName = `AileFinans_Tam_Yedek_${getTodayDateString()}.json`;

  // APK (Capacitor) içinde: dosyayı yaz ve paylaşım menüsünü aç
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins.Filesystem && cap.Plugins.Share) {
    cap.Plugins.Filesystem.writeFile({ path: fileName, data: jsonText, directory: 'CACHE', encoding: 'utf8' })
      .then(res => cap.Plugins.Share.share({ title: 'Aile Finans Yedeği', files: [res.uri] }))
      .catch(err => alert('Yedek paylaşılamadı: ' + (err.message || err)));
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonText);
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", fileName);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function importDataBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      let faizRestored = false;
      let walletRestored = false;

      // 1. Yeni sürüm Master Backup (Faiz + Cüzdan birlikte)
      if (imported.faizData && imported.faizData.members) {
        appState = imported.faizData;
        saveState();
        faizRestored = true;
      }
      if (imported.walletData && imported.walletData.accounts) {
        if (typeof walletState !== 'undefined') {
          walletState = imported.walletData;
        }
        localStorage.setItem('cuzdan_manager_data_v1', JSON.stringify(imported.walletData));
        walletRestored = true;
      }

      // 2. Eski sürüm sadece Faiz yedeği
      if (!faizRestored && imported.members && imported.transactions && imported.rateHistory) {
        appState = imported;
        saveState();
        faizRestored = true;
      }

      // 3. Eski sürüm sadece Cüzdan yedeği
      if (!walletRestored && imported.accounts && imported.categories) {
        if (typeof walletState !== 'undefined') {
          walletState = imported;
        }
        localStorage.setItem('cuzdan_manager_data_v1', JSON.stringify(imported));
        walletRestored = true;
      }

      if (faizRestored || walletRestored) {
        renderUI();
        if (typeof renderWalletModule === 'function') {
          renderWalletModule();
        }
        renderSettings();
        alert('✓ Yedek başarıyla geri yüklendi!\n' + 
              (faizRestored ? '• Faiz ve Kasa verileri aktarıldı.\n' : '') +
              (walletRestored ? '• Gelir & Gider Cüzdan verileri aktarıldı.' : ''));
      } else {
        alert('Geçersiz veya bozuk yedek dosyası formatı!');
      }
    } catch (err) {
      alert('Dosya okunamadı: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('DİKKAT: Tüm işlemler, faiz oranları ve kişiler sıfırlanacak! Emin misiniz?')) {
    localStorage.removeItem('faiz_takip_data_v1');
    loadState();
    renderUI();
    closeModal('modalSettings');
    alert('Veriler sıfırlandı.');
  }
}

// Verileri (localStorage) KORUYARAK: Tarayıcı dosya/sayfa önbelleğini ve ServiceWorker'ı temizleyip en güncel sayfayı yükler
function forceHardRefresh() {
  const targetUrl = window.location.pathname + '?reload=' + Date.now();
  if ('caches' in window) {
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          return Promise.all(regs.map((r) => r.unregister()));
        }).then(() => {
          window.location.href = targetUrl;
        });
      } else {
        window.location.href = targetUrl;
      }
    }).catch(() => {
      window.location.href = targetUrl;
    });
  } else {
    window.location.href = targetUrl;
  }
}

// Çerezler ve Site Verilerini Sil (Girdiğiniz hesap ve para verilerini KORUR)
async function clearCookiesAndSiteData() {
  if (!confirm("Çerezler, tarayıcı önbelleği ve eski site verileri temizlensin mi?\n\n(NOT: Girdiğiniz kişiler, hesaplar ve para hareketleri KESİNLİKLE silinmeyecek, korunacaktır.)")) {
    return;
  }

  try {
    // 1. Kullanıcının girdiği finansal verileri garantiye al (Yedekle)
    const backupFaiz = localStorage.getItem('faiz_takip_data_v1');
    const backupWallet = localStorage.getItem('cuzdan_manager_data_v1');
    const backupActiveMod = localStorage.getItem('active_suite_module');

    // 2. Çerezleri (Cookies) temizle
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    // 3. sessionStorage'ı temizle
    sessionStorage.clear();

    // 4. CacheStorage (HTML, CSS, JS ve resim önbellekleri) temizle
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 5. Service Worker kayıtlarını temizle
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // 6. Finansal verilerin localStorage'da eksiksiz durduğundan emin ol
    if (backupFaiz) localStorage.setItem('faiz_takip_data_v1', backupFaiz);
    if (backupWallet) localStorage.setItem('cuzdan_manager_data_v1', backupWallet);
    if (backupActiveMod) localStorage.setItem('active_suite_module', backupActiveMod);

    // 7. Kullanıcıya bildirim ver ve taze sayfaya yönlendir
    alert("✅ Çerezler ve site önbelleği başarıyla temizlendi!\n\nGirdiğiniz tüm kişiler ve para verileriniz eksiksiz olarak korundu.");
    window.location.href = window.location.pathname + '?temizlendi=' + Date.now();
  } catch (err) {
    console.error("Site verileri temizleme hatası:", err);
    window.location.href = window.location.pathname + '?temizlendi=' + Date.now();
  }
}

// Modal Kontrolleri
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.showModal();
    // Default tarihleri bugün yap
    const today = getTodayDateString();
    if (id === 'modalDeposit') {
      const dInput = document.getElementById('inputTxDate');
      if (dInput && !dInput.value) dInput.value = today;
    }
    if (id === 'modalRates') {
      const rInput = document.getElementById('inputRateDate');
      if (rInput && !rInput.value) rInput.value = today;
      const taxInput = document.getElementById('inputTaxRate');
      if (taxInput) taxInput.value = typeof appState.taxRate === 'number' ? appState.taxRate : 17.5;
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.close();
}

// --- Kişi Özel Sayfası (SPA Sayfa Geçişleri & Günlük Gelir Grafiği) ---
let currentActiveMemberId = null;
let chartHoverListener = null;

function navigateToMember(memberId) {
  try {
    history.pushState({ page: 'member', memberId: memberId }, '', `#kisi-${memberId}`);
  } catch (e) {}
  showMemberPage(memberId);
}

function navigateToHome() {
  try {
    history.pushState({ page: 'home' }, '', window.location.pathname);
  } catch (e) {}
  showHomePage();
}

function showHomePage() {
  currentActiveMemberId = null;
  const pageHome = document.getElementById('pageHome');
  const pageMember = document.getElementById('pageMemberDetail');
  if (pageHome) pageHome.style.display = 'flex';
  if (pageMember) pageMember.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMemberPage(memberId) {
  currentActiveMemberId = memberId;
  const result = calculateLedger();
  const member = result.members.find(m => m.id === memberId);
  if (!member) {
    showHomePage();
    return;
  }

  const pageHome = document.getElementById('pageHome');
  const pageMember = document.getElementById('pageMemberDetail');
  if (pageHome) pageHome.style.display = 'none';
  if (pageMember) pageMember.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const sharePercent = result.totalBalance > 0 ? ((member.balance / result.totalBalance) * 100).toFixed(1) : '0.0';
  const initial = member.name.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(member.avatar);

  // 1. Top Nav Title (Avatar + Name)
  const navTitleEl = document.getElementById('memberPageNavTitle');
  if (navTitleEl) {
    navTitleEl.innerHTML = `
      <div class="member-avatar ${member.avatar || 'avatar-other'}" style="width:34px; height:34px; font-size:0.9rem;">${initial}</div>
      <h2>${member.name}</h2>
    `;
  }

  // 2. Member Hero Card
  const shareBadgeEl = document.getElementById('memberHeroShareBadge');
  if (shareBadgeEl) {
    shareBadgeEl.innerHTML = `<span class="pulse-dot"></span> %${sharePercent} Kasa Payı`;
  }
  const tagEl = document.getElementById('memberHeroTag');
  if (tagEl) {
    tagEl.innerText = `${member.name} Hesabı`;
  }
  const balanceEl = document.getElementById('memberHeroBalance');
  if (balanceEl) {
    balanceEl.innerText = formatTL(member.balance);
  }
  const todayGainEl = document.getElementById('memberHeroTodayGain');
  if (todayGainEl) {
    todayGainEl.innerText = `+${formatTL(member.todayProfit)} / gün`;
  }
  const principalEl = document.getElementById('memberHeroPrincipal');
  if (principalEl) {
    principalEl.innerText = formatTL(member.principal);
  }
  const profitEl = document.getElementById('memberHeroProfit');
  if (profitEl) {
    profitEl.innerText = `+${formatTL(member.totalProfit)}`;
  }

  // 3. Daily Income Rows for this member
  const memberDailyLogs = result.dailyLogs.map(log => {
    const snap = log.memberSnapshots[memberId] || { balance: 0, grossGain: 0, taxAmount: 0, netGain: 0 };
    return {
      date: log.date,
      annualRate: log.annualRate,
      grossGain: snap.grossGain || 0,
      taxAmount: snap.taxAmount || 0,
      netGain: snap.netGain || 0,
      balance: snap.balance || 0
    };
  });

  const incomeTbody = document.getElementById('memberIncomeTableBody');
  if (incomeTbody) {
    incomeTbody.innerHTML = '';
    if (memberDailyLogs.length === 0) {
      incomeTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Henüz gelir kaydı bulunmuyor.</td></tr>';
    } else {
      memberDailyLogs.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${formatDateTR(d.date)}</strong></td>
          <td>+${formatTL(d.grossGain)}</td>
          <td style="color:#fca5a5;">-${formatTL(d.taxAmount)}</td>
          <td style="color:var(--emerald); font-weight:700;">+${formatTL(d.netGain)}</td>
          <td>${formatTL(d.balance)}</td>
        `;
        incomeTbody.appendChild(tr);
      });
    }
  }

  const incomeCountEl = document.getElementById('memberIncomeCount');
  if (incomeCountEl) incomeCountEl.innerText = memberDailyLogs.length;

  // 4. Member Transactions
  const memberTxs = appState.transactions
    .filter(t => t.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const txContainer = document.getElementById('memberTxListContainer');
  if (txContainer) {
    txContainer.innerHTML = '';
    if (memberTxs.length === 0) {
      txContainer.innerHTML = '<p style="text-align:center; padding:20px; color: var(--text-muted);">Bu kişiye ait para yatırma/çekme işlemi yok.</p>';
    } else {
      memberTxs.forEach(tx => {
        const isDeposit = tx.type === 'deposit';
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
          <div class="tx-left">
            <span class="tx-person">${isDeposit ? 'Para Yatırma' : 'Para Çekme'} ${tx.note ? `<small style="font-weight: normal; color: var(--text-dim);">(${tx.note})</small>` : ''}</span>
            <span class="tx-meta">${formatDateTR(tx.date)}</span>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${isDeposit ? 'deposit' : 'withdraw'}">
              ${isDeposit ? '+' : '-'}${formatTL(tx.amount)}
            </span>
            <button class="btn-del" onclick="deleteTx('${tx.id}')" title="İşlemi Sil">&times;</button>
          </div>
        `;
        txContainer.appendChild(item);
      });
    }
  }

  const txCountEl = document.getElementById('memberTxCount');
  if (txCountEl) txCountEl.innerText = memberTxs.length;

  // 5. Average Daily Gain Badge
  const positiveGains = memberDailyLogs.filter(d => d.netGain > 0);
  const avgGain = positiveGains.length > 0 
    ? (positiveGains.reduce((acc, curr) => acc + curr.netGain, 0) / positiveGains.length)
    : 0;
  
  const avgBadge = document.getElementById('chartAvgGainBadge');
  if (avgBadge) {
    avgBadge.innerText = `Ort: +${formatTL(avgGain)}/gün`;
  }

  // 6. Render Chart (chronological: oldest to newest)
  const chronological = [...memberDailyLogs].reverse();
  requestAnimationFrame(() => {
    setTimeout(() => {
      renderDailyIncomeChart(chronological, avatarColor);
    }, 60);
  });
}

function openDepositForCurrentMember() {
  if (!currentActiveMemberId) return;
  openModal('modalDeposit');
  const targetRadio = document.querySelector(`input[name="personSelect"][value="${currentActiveMemberId}"]`);
  if (targetRadio) {
    targetRadio.checked = true;
  }
}

function switchMemberTab(tab) {
  const tabIncome = document.getElementById('tabContentIncome');
  const tabTxs = document.getElementById('tabContentTxs');
  const btnIncome = document.getElementById('tabBtnIncome');
  const btnTxs = document.getElementById('tabBtnTxs');

  if (tab === 'income') {
    if (tabIncome) tabIncome.style.display = 'block';
    if (tabTxs) tabTxs.style.display = 'none';
    if (btnIncome) btnIncome.classList.add('active');
    if (btnTxs) btnTxs.classList.remove('active');
  } else {
    if (tabIncome) tabIncome.style.display = 'none';
    if (tabTxs) tabTxs.style.display = 'block';
    if (btnIncome) btnIncome.classList.remove('active');
    if (btnTxs) btnTxs.classList.add('active');
  }
}

function renderDailyIncomeChart(chronologicalLogs, themeColor = '#10b981') {
  const canvas = document.getElementById('memberGainCanvas');
  const tooltip = document.getElementById('chartTooltip');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  const width = container.clientWidth || 340;
  const height = 180;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  if (!chronologicalLogs || chronologicalLogs.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Henüz gelir verisi bulunmuyor.', width / 2, height / 2);
    return;
  }

  const values = chronologicalLogs.map(l => l.netGain || 0);
  const maxVal = Math.max(...values, 5);
  const minVal = 0;

  const padding = { top: 25, right: 18, bottom: 30, left: 18 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Gridlines & Y-labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';

  const gridSteps = 3;
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = minVal + ((maxVal - minVal) / gridSteps) * (gridSteps - i);
    const yPos = padding.top + (chartH / gridSteps) * i;
    
    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();
    ctx.setLineDash([]);

    if (i < gridSteps) {
      ctx.fillText(`${yVal.toFixed(0)} ₺`, padding.left, yPos - 4);
    }
  }

  // Calculate coordinates
  const points = chronologicalLogs.map((log, idx) => {
    const x = chronologicalLogs.length === 1 
      ? width / 2 
      : padding.left + (idx / (chronologicalLogs.length - 1)) * chartW;
    const y = padding.top + chartH - ((log.netGain - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, log };
  });

  // Area Fill with smooth gradient
  const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  areaGrad.addColorStop(0, hexToRgba(themeColor, 0.35));
  areaGrad.addColorStop(1, hexToRgba(themeColor, 0.0));

  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Glow line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = hexToRgba(themeColor, 0.5);
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dots
  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X Axis Date labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';

  const labelInterval = Math.max(1, Math.floor(points.length / 4));
  points.forEach((pt, idx) => {
    if (idx === 0 || idx === points.length - 1 || idx % labelInterval === 0) {
      const parts = pt.log.date.split('-');
      const dStr = `${parseInt(parts[2])}/${parseInt(parts[1])}`;
      ctx.fillText(dStr, pt.x, height - 8);
    }
  });

  // Attach hover & touch interaction
  if (chartHoverListener) {
    canvas.removeEventListener('mousemove', chartHoverListener);
    canvas.removeEventListener('touchmove', chartHoverListener);
  }

  function handlePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    
    let closestPt = null;
    let minDist = Infinity;
    for (const pt of points) {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestPt = pt;
      }
    }

    if (closestPt && minDist < 35 && tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${closestPt.x}px`;
      tooltip.style.top = `${closestPt.y}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:#f8fafc; margin-bottom:2px;">${formatDateTR(closestPt.log.date)}</div>
        <div style="color:var(--emerald); font-weight:800;">+${formatTL(closestPt.log.netGain)} <small style="font-weight:normal;color:#94a3b8;">(Net)</small></div>
        <div style="font-size:0.68rem; color:#94a3b8;">Bakiye: ${formatTL(closestPt.log.balance)}</div>
      `;
    } else if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  chartHoverListener = (e) => {
    handlePointer(e.clientX, e.clientY);
  };

  canvas.addEventListener('mousemove', chartHoverListener);
  canvas.addEventListener('mouseleave', () => {
    if (tooltip) tooltip.style.display = 'none';
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    setTimeout(() => { if (tooltip) tooltip.style.display = 'none'; }, 2000);
  });
}

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return `rgba(16, 185, 129, ${alpha})`;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

window.addEventListener('resize', () => {
  if (currentActiveMemberId) {
    showMemberPage(currentActiveMemberId);
  }
});

// Browser Geri / İleri Butonu Yönetimi (Android Geri Tuşu Desteği)
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page === 'member' && e.state.memberId) {
    showMemberPage(e.state.memberId);
  } else {
    showHomePage();
  }
});

// --- Başlatma (Init) ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderUI();

  // URL Hash kontrolü (#kisi-me gibi)
  const hash = window.location.hash;
  if (hash && hash.startsWith('#kisi-')) {
    const memId = hash.replace('#kisi-', '');
    if (appState.members.some(m => m.id === memId)) {
      showMemberPage(memId);
    }
  }

  // Event Listeners
  document.getElementById('btnOpenDeposit').addEventListener('click', () => openModal('modalDeposit'));
  document.getElementById('btnOpenRates').addEventListener('click', () => openModal('modalRates'));
  document.getElementById('btnOpenDailyReport').addEventListener('click', () => {
    renderDailyReport();
    openModal('modalDailyReport');
  });
  document.getElementById('btnOpenTxHistory').addEventListener('click', () => {
    renderTxHistory();
    openModal('modalTxHistory');
  });
  document.getElementById('btnSettings').addEventListener('click', () => {
    renderSettings();
    openModal('modalSettings');
  });

  // Modal dışına tıklayınca kapatma
  document.querySelectorAll('.app-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  });

  // Service Worker Registration for PWA / Offline
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const verLbl = document.getElementById('appVersionLabel');
  if (verLbl && window.APP_VERSION) verLbl.textContent = 'Mevcut sürüm: v' + window.APP_VERSION;
  if (isNative) setTimeout(() => checkForAppUpdate(true), 3000);
  if ('serviceWorker' in navigator && !isNative) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('ServiceWorker not registered in local file preview:', err);
    });
  }
});

// --- Uygulama İçi Güncelleme (GitHub Releases) ---
async function checkForAppUpdate(silent) {
  const repo = window.APP_REPO;
  const current = Number(window.APP_VERSION || 0);
  if (!repo) { if (!silent) alert('Güncelleme kontrolü sadece GitHub\'dan derlenen APK içinde çalışır.'); return; }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Sunucu yanıtı: ' + res.status);
    const rel = await res.json();
    const latest = Number(String(rel.tag_name || '').replace(/\D/g, '')) || 0;
    const asset = (rel.assets || []).find(a => a.name.endsWith('.apk'));
    if (latest > current && asset) {
      if (confirm(`🚀 Yeni sürüm var! (v${current} → v${latest})\n\nŞimdi indirilsin mi?\n\nİndirme bitince bildirime dokunup "Yükle" deyin. Verileriniz korunur.`)) {
        window.location.href = asset.browser_download_url;
      }
    } else if (!silent) {
      alert(`✅ Uygulamanız güncel (v${current}).`);
    }
  } catch (err) {
    if (!silent) alert('Güncelleme kontrol edilemedi. İnternet bağlantınızı kontrol edin.\n' + err.message);
  }
}
