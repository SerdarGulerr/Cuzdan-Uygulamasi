/**
 * Gelir & Gider Cüzdanım (Money Manager)
 * Realbyte Money Manager Mantığında Çevrimdışı Bütçe ve Harcama Motoru
 */

const DEFAULT_WALLET_STATE = {
  accounts: [
    { id: 'acc_cash', name: 'Nakit (Cüzdan)', type: 'cash', icon: '💵', balance: 1750 },
    { id: 'acc_bank', name: 'Banka Hesabı (Vadesiz)', type: 'bank', icon: '🏦', balance: 24500 },
    { id: 'acc_credit', name: 'Kredi Kartı', type: 'credit', icon: '💳', balance: -3200 },
    { id: 'acc_savings', name: 'Birikim / Altın', type: 'savings', icon: '💰', balance: 35000 }
  ],
  categories: {
    expense: [
      { id: 'cat_market', name: 'Market & Gıda', icon: '🛒', color: '#f59e0b', subcategories: ['BİM', 'A101', 'ŞOK', 'Migros', 'Kasap', 'Manav', 'Fırın'] },
      { id: 'cat_food', name: 'Yemek & Kafe', icon: '🍔', color: '#f97316', subcategories: ['Restoran', 'Kafe / Kahve', 'Fast Food', 'Yemeksepeti / Getir'] },
      { id: 'cat_bills', name: 'Fatura & Aidat', icon: '💡', color: '#ef4444', subcategories: ['Elektrik', 'Doğalgaz', 'Su', 'İnternet & TV', 'Aidat', 'Telefon'] },
      { id: 'cat_transport', name: 'Ulaşım & Akaryakıt', icon: '🚗', color: '#3b82f6', subcategories: ['Benzin / Motorin', 'Toplu Taşıma / Kart', 'Taksi', 'Otopark / OGS / HGS', 'Bakım'] },
      { id: 'cat_shopping', name: 'Alışveriş & Giyim', icon: '🛍️', color: '#ec4899', subcategories: ['Giyim & Ayakkabı', 'Elektronik', 'Kozmetik & Bakım', 'Ev Eşyası'] },
      { id: 'cat_home', name: 'Ev & Kira', icon: '🏠', color: '#8b5cf6', subcategories: ['Kira', 'Tadilat & Tamirat', 'Mobilya'] },
      { id: 'cat_health', name: 'Sağlık & Eczane', icon: '💊', color: '#10b981', subcategories: ['Eczane / İlaç', 'Hastane / Muayene', 'Diş'] },
      { id: 'cat_fun', name: 'Eğlence & Hobi', icon: '🎬', color: '#06b6d4', subcategories: ['Sinema / Tiyatro', 'Abonelikler (Netflix, Spotify)', 'Tatil / Gezi'] },
      { id: 'cat_other_exp', name: 'Diğer Giderler', icon: '📦', color: '#64748b', subcategories: ['Borç Ödeme', 'Bağış', 'Çeşitli'] }
    ],
    income: [
      { id: 'cat_salary', name: 'Aylık Maaş', icon: '💼', color: '#10b981', subcategories: ['Ana Maaş', 'Mesai'] },
      { id: 'cat_bonus', name: 'Ek Gelir & Prim', icon: '📈', color: '#34d399', subcategories: ['Prim', 'İkramiye', 'Freelance / Proje'] },
      { id: 'cat_interest_inc', name: 'Faiz / Getiri', icon: '🏦', color: '#3b82f6', subcategories: ['Mevduat Faizi', 'Temettü', 'Kira Geliri'] },
      { id: 'cat_gift', name: 'Hediye / Destek', icon: '🎁', color: '#ec4899', subcategories: ['Harçlık', 'Hediye', 'Aile Desteği'] },
      { id: 'cat_other_inc', name: 'Diğer Gelir', icon: '💵', color: '#a855f7', subcategories: ['Satış Geliri', 'İade', 'Çeşitli'] }
    ]
  },
  transactions: []
};

let walletState = null;
let currentWalletDate = new Date();
let activeWalletSubView = 'daily'; // 'daily' | 'calendar' | 'stats' | 'accounts'
let currentTxType = 'expense'; // 'expense' | 'income' | 'transfer'
let selectedCategoryId = 'cat_market';
let selectedSubCategoryId = '';
let currentCategoryMgrType = 'expense'; // 'expense' | 'income'

// --- Yardımcı Tarih ve Para Formatlama ---
function formatWalletTL(amount) {
  if (isNaN(amount)) return '0,00\u00A0₺';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + '\u00A0₺';
}

function getMonthNameTR(monthIdx) {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return months[monthIdx] || '';
}

// Demo başlangıç verileri (İlk açılışta güzel gözükmesi için)
function generateDemoWalletTxs(year, month) {
  const mStr = String(month + 1).padStart(2, '0');
  return [
    {
      id: 'wtx_1',
      type: 'income',
      amount: 42500,
      fromAccountId: 'acc_bank',
      toAccountId: '',
      categoryId: 'cat_salary',
      date: `${year}-${mStr}-01`,
      note: 'Aylık net maaş yattı'
    },
    {
      id: 'wtx_2',
      type: 'expense',
      amount: 1450.50,
      fromAccountId: 'acc_credit',
      toAccountId: '',
      categoryId: 'cat_market',
      date: `${year}-${mStr}-05`,
      note: 'Haftalık süpermarket alışverişi'
    },
    {
      id: 'wtx_3',
      type: 'expense',
      amount: 950,
      fromAccountId: 'acc_bank',
      toAccountId: '',
      categoryId: 'cat_bills',
      date: `${year}-${mStr}-08`,
      note: 'Elektrik & Doğalgaz faturası'
    },
    {
      id: 'wtx_4',
      type: 'expense',
      amount: 480,
      fromAccountId: 'acc_cash',
      toAccountId: '',
      categoryId: 'cat_food',
      date: `${year}-${mStr}-12`,
      note: 'Ailece akşam yemeği'
    },
    {
      id: 'wtx_5',
      type: 'expense',
      amount: 850,
      fromAccountId: 'acc_credit',
      toAccountId: '',
      categoryId: 'cat_transport',
      date: `${year}-${mStr}-15`,
      note: 'Araç benzin dolumu'
    },
    {
      id: 'wtx_6',
      type: 'transfer',
      amount: 2000,
      fromAccountId: 'acc_bank',
      toAccountId: 'acc_cash',
      categoryId: '',
      date: `${year}-${mStr}-18`,
      note: 'ATM\'den nakit para çekildi'
    }
  ];
}

// --- LocalStorage Yönetimi ---
function loadWalletState() {
  try {
    const raw = localStorage.getItem('cuzdan_manager_data_v1');
    if (raw) {
      walletState = JSON.parse(raw);
    } else {
      walletState = JSON.parse(JSON.stringify(DEFAULT_WALLET_STATE));
      const now = new Date();
      walletState.transactions = generateDemoWalletTxs(now.getFullYear(), now.getMonth());
      saveWalletState();
    }

    // Geriye dönük uyumluluk: Tüm kategorilerde subcategories dizisinin varlığını garanti et
    ['expense', 'income'].forEach(type => {
      if (!walletState.categories || !Array.isArray(walletState.categories[type])) {
        walletState.categories = walletState.categories || {};
        walletState.categories[type] = DEFAULT_WALLET_STATE.categories[type];
      }
      walletState.categories[type].forEach(cat => {
        if (!Array.isArray(cat.subcategories) || cat.subcategories.length === 0) {
          const defCat = DEFAULT_WALLET_STATE.categories[type].find(c => c.id === cat.id);
          cat.subcategories = defCat ? [...defCat.subcategories] : [];
        }
      });
    });
  } catch (e) {
    console.error('Cüzdan verisi yüklenemedi:', e);
    walletState = JSON.parse(JSON.stringify(DEFAULT_WALLET_STATE));
  }
}

function saveWalletState() {
  localStorage.setItem('cuzdan_manager_data_v1', JSON.stringify(walletState));
}

// --- Modül Değiştirme (Sol Menüden Faiz <-> Cüzdan) ---
function switchMainModule(modName) {
  const modFaiz = document.getElementById('moduleFaiz');
  const modWallet = document.getElementById('moduleWallet');
  const itemFaiz = document.getElementById('drawerItemFaiz');
  const itemWallet = document.getElementById('drawerItemWallet');

  if (modName === 'wallet') {
    if (modFaiz) modFaiz.style.display = 'none';
    if (modWallet) modWallet.style.display = 'flex';
    if (itemFaiz) itemFaiz.classList.remove('active');
    if (itemWallet) itemWallet.classList.add('active');
    localStorage.setItem('active_suite_module', 'wallet');
    renderWalletUI();
  } else {
    if (modFaiz) modFaiz.style.display = 'flex';
    if (modWallet) modWallet.style.display = 'none';
    if (itemFaiz) itemFaiz.classList.add('active');
    if (itemWallet) itemWallet.classList.remove('active');
    localStorage.setItem('active_suite_module', 'faiz');
    if (typeof renderUI === 'function') renderUI();
  }
  closeDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) drawer.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function closeDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) drawer.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

// --- Ay Değiştirme ---
function changeWalletMonth(offset) {
  currentWalletDate.setMonth(currentWalletDate.getMonth() + offset);
  renderWalletUI();
}

// --- Cüzdan Alt Sekme Değiştirme (Günlük / Takvim / Analiz / Hesaplar) ---
function switchWalletSubView(subView) {
  activeWalletSubView = subView;
  document.querySelectorAll('.wallet-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.wallet-view-content').forEach(c => c.classList.remove('active'));

  const activeBtn = document.getElementById(`subTabBtn_${subView}`);
  const activeView = document.getElementById(`subView_${subView}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');

  renderWalletUI();
}

// --- Hesaplama & Filtreleme Motoru ---
function getFilteredWalletData() {
  const year = currentWalletDate.getFullYear();
  const month = currentWalletDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthTxs = walletState.transactions.filter(t => t.date.startsWith(monthPrefix));

  let totalIncome = 0;
  let totalExpense = 0;

  monthTxs.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    if (t.type === 'expense') totalExpense += t.amount;
  });

  const netBalance = totalIncome - totalExpense;

  return {
    year,
    month,
    monthPrefix,
    monthTxs,
    totalIncome,
    totalExpense,
    netBalance
  };
}

// --- Cüzdan Ana Render Fonksiyonu ---
function renderWalletUI() {
  if (!walletState) loadWalletState();
  const data = getFilteredWalletData();

  // 1. Ay Başlığı
  const monthTitle = document.getElementById('currentWalletMonthTitle');
  if (monthTitle) {
    monthTitle.innerText = `${getMonthNameTR(data.month)} ${data.year}`;
  }

  // 2. Özet Kartı (Gelir / Gider / Net Kalan)
  const incEl = document.getElementById('walletSummaryIncome');
  const expEl = document.getElementById('walletSummaryExpense');
  const netEl = document.getElementById('walletSummaryNet');

  if (incEl) incEl.innerText = '+' + formatWalletTL(data.totalIncome);
  if (expEl) expEl.innerText = '-' + formatWalletTL(data.totalExpense);
  if (netEl) {
    const sign = data.netBalance >= 0 ? '+' : '';
    netEl.innerText = sign + formatWalletTL(data.netBalance);
    netEl.style.color = data.netBalance >= 0 ? 'var(--emerald)' : 'var(--rose)';
  }

  // 3. Aktif Alt Görünümü Render Et
  if (activeWalletSubView === 'daily') {
    renderDailyView(data.monthTxs);
  } else if (activeWalletSubView === 'calendar') {
    renderCalendarView(data.year, data.month, data.monthTxs);
  } else if (activeWalletSubView === 'stats') {
    renderStatsView(data.monthTxs, data.totalExpense);
  } else if (activeWalletSubView === 'accounts') {
    renderAccountsView();
  }
}

// 1. GÜNLÜK GÖRÜNÜM (TIMELINE)
function renderDailyView(txs) {
  const container = document.getElementById('subView_daily');
  if (!container) return;

  if (txs.length === 0) {
    container.innerHTML = `
      <div class="info-card" style="text-align: center; justify-content: center;">
        <div class="info-text">
          <strong>Bu ay henüz bir işlem yok.</strong>
          <p>Sağ alttaki (+) butonuna dokunarak hemen harcama veya gelir ekleyebilirsiniz.</p>
        </div>
      </div>
    `;
    return;
  }

  // Tarihe göre grupla (En yeni gün en üstte)
  const grouped = {};
  txs.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  let html = '';

  sortedDates.forEach(dStr => {
    const dayTxs = grouped[dStr];
    const parts = dStr.split('-');
    const dayNum = parseInt(parts[2]);
    const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', month: 'short' }).format(dObj);

    let dayInc = 0;
    let dayExp = 0;
    dayTxs.forEach(t => {
      if (t.type === 'income') dayInc += t.amount;
      if (t.type === 'expense') dayExp += t.amount;
    });

    html += `
      <div class="daily-group">
        <div class="daily-group-header">
          <div class="daily-date-info">
            <span class="daily-day-num">${dayNum}</span>
            <span class="daily-date-str">${dayName}</span>
          </div>
          <div class="daily-group-totals">
            ${dayInc > 0 ? `<span class="sum-income">+${formatWalletTL(dayInc)}</span>` : ''}
            ${dayExp > 0 ? `<span class="sum-expense">-${formatWalletTL(dayExp)}</span>` : ''}
          </div>
        </div>
        <div class="daily-tx-list">
    `;

    dayTxs.forEach(t => {
      let icon = '💵';
      let catName = 'İşlem';
      let accName = 'Hesap';

      if (t.type === 'transfer') {
        icon = '🔄';
        catName = 'Hesaplar Arası Transfer';
        const fromAcc = walletState.accounts.find(a => a.id === t.fromAccountId);
        const toAcc = walletState.accounts.find(a => a.id === t.toAccountId);
        accName = `${fromAcc ? fromAcc.name : 'Hesap'} ➔ ${toAcc ? toAcc.name : 'Hesap'}`;
      } else {
        const catList = t.type === 'expense' ? walletState.categories.expense : walletState.categories.income;
        const cat = catList.find(c => c.id === t.categoryId);
        if (cat) {
          icon = cat.icon;
          catName = cat.name;
        }
        const acc = walletState.accounts.find(a => a.id === t.fromAccountId);
        accName = acc ? acc.name : '';
      }

      const sign = t.type === 'income' ? '+' : (t.type === 'expense' ? '-' : '');
      const cls = t.type === 'income' ? 'income' : (t.type === 'expense' ? 'expense' : 'transfer');

      html += `
        <div class="wallet-tx-row">
          <div class="wallet-tx-left">
            <div class="tx-cat-icon">${icon}</div>
            <div class="tx-desc-box">
              <span class="tx-cat-name">${catName} ${t.subCategory ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''} ${t.note ? `<small style="font-weight: normal; color: var(--text-dim);">(${t.note})</small>` : ''}</span>
              <span class="tx-account-name">${accName}</span>
            </div>
          </div>
          <div class="wallet-tx-right">
            <span class="wallet-tx-amount ${cls}">${sign}${formatWalletTL(t.amount)}</span>
            <button class="btn-del" onclick="deleteWalletTx('${t.id}')" title="Sil">&times;</button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 2. TAKVİM GÖRÜNÜMÜ (CALENDAR)
function renderCalendarView(year, month, txs) {
  const container = document.getElementById('subView_calendar');
  if (!container) return;

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjustedFirstDay = (firstDayOfWeek + 6) % 7; // Monday as 0

  // Günlük toplamlar haritası
  const daySummary = {};
  txs.forEach(t => {
    const d = parseInt(t.date.split('-')[2]);
    if (!daySummary[d]) daySummary[d] = { inc: 0, exp: 0 };
    if (t.type === 'income') daySummary[d].inc += t.amount;
    if (t.type === 'expense') daySummary[d].exp += t.amount;
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let html = `
    <div class="calendar-card">
      <div class="calendar-weekdays">
        <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div>
      </div>
      <div class="calendar-grid">
  `;

  // Boş hücreler
  for (let i = 0; i < adjustedFirstDay; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  // Gün hücreleri
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const sum = daySummary[day];

    html += `
      <div class="calendar-cell ${isToday ? 'today' : ''}" onclick="filterCalendarDay(${day})">
        <span class="cal-day-label">${day}</span>
        <div class="cal-pills">
          ${sum && sum.inc > 0 ? `<span class="cal-pill inc">+${Math.round(sum.inc)}</span>` : ''}
          ${sum && sum.exp > 0 ? `<span class="cal-pill exp">-${Math.round(sum.exp)}</span>` : ''}
        </div>
      </div>
    `;
  }

  html += `
      </div>
    </div>
    <div id="calendarDayDetails" style="margin-top: 10px;"></div>
  `;

  container.innerHTML = html;
}

function filterCalendarDay(day) {
  const data = getFilteredWalletData();
  const dStr = `${data.year}-${String(data.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayTxs = data.monthTxs.filter(t => t.date === dStr);
  const detailBox = document.getElementById('calendarDayDetails');
  if (!detailBox) return;

  if (dayTxs.length === 0) {
    detailBox.innerHTML = `<p style="text-align:center; padding:10px; font-size:0.8rem; color:var(--text-muted);">${day} ${getMonthNameTR(data.month)} gününde işlem bulunmuyor.</p>`;
    return;
  }

  let html = `<h4 style="font-size:0.85rem; margin-bottom:8px; color:#fff;">📌 ${day} ${getMonthNameTR(data.month)} Gününün Hareketleri:</h4>`;
  dayTxs.forEach(t => {
    const sign = t.type === 'income' ? '+' : (t.type === 'expense' ? '-' : '');
    const cls = t.type === 'income' ? 'income' : (t.type === 'expense' ? 'expense' : 'transfer');
    html += `
      <div class="wallet-tx-row" style="background:var(--bg-card); border-radius:8px; margin-bottom:6px;">
        <span style="font-size:0.85rem; font-weight:700;">${t.note || 'İşlem'} ${t.subCategory ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''}</span>
        <span class="wallet-tx-amount ${cls}">${sign}${formatWalletTL(t.amount)}</span>
      </div>
    `;
  });
  detailBox.innerHTML = html;
}

// 3. ANALİZ & İSTATİSTİK GÖRÜNÜMÜ
function renderStatsView(txs, totalExpense) {
  const container = document.getElementById('subView_stats');
  if (!container) return;

  const expenses = txs.filter(t => t.type === 'expense');
  if (expenses.length === 0 || totalExpense === 0) {
    container.innerHTML = `
      <div class="stats-card" style="text-align: center; padding: 24px;">
        <p style="color: var(--text-muted); font-size: 0.85rem;">Bu ayda kayıtlı gider bulunmuyor.</p>
      </div>
    `;
    return;
  }

  // Kategori bazlı topla
  const catTotals = {};
  expenses.forEach(t => {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
  });

  const sortedCatIds = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  let html = `
    <div class="stats-card">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:10px;">
        <h4 style="font-size:0.95rem; font-weight:800; color:#fff;">Aylık Gider Dağılımı</h4>
        <span style="font-size:0.85rem; font-weight:800; color:var(--rose);">Toplam: -${formatWalletTL(totalExpense)}</span>
      </div>
      <div class="category-bar-list">
  `;

  sortedCatIds.forEach(catId => {
    const cat = walletState.categories.expense.find(c => c.id === catId) || { name: 'Diğer', icon: '📦', color: '#64748b' };
    const amount = catTotals[catId];
    const pct = ((amount / totalExpense) * 100).toFixed(1);

    // Alt başlık dağılımı
    const subTotals = {};
    let hasSub = false;
    expenses.filter(t => t.categoryId === catId && t.subCategory).forEach(t => {
      subTotals[t.subCategory] = (subTotals[t.subCategory] || 0) + t.amount;
      hasSub = true;
    });

    let subBreakdownHtml = '';
    if (hasSub) {
      const sortedSubs = Object.keys(subTotals).sort((a, b) => subTotals[b] - subTotals[a]);
      subBreakdownHtml = `<div class="subcat-breakdown-row">`;
      sortedSubs.forEach(sName => {
        subBreakdownHtml += `<span class="subcat-breakdown-pill">${sName}: -${formatWalletTL(subTotals[sName])}</span>`;
      });
      subBreakdownHtml += `</div>`;
    }

    html += `
      <div class="category-bar-item">
        <div class="cat-bar-header">
          <span class="cat-bar-name">
            <span>${cat.icon}</span>
            <span>${cat.name}</span>
            <small style="color:var(--text-dim);">(%${pct})</small>
          </span>
          <span class="cat-bar-val" style="color:#ffffff;">-${formatWalletTL(amount)}</span>
        </div>
        <div class="cat-track">
          <div class="cat-fill" style="width: ${pct}%; background: ${cat.color};"></div>
        </div>
        ${subBreakdownHtml}
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// 4. HESAPLAR / CÜZDANLAR GÖRÜNÜMÜ
function renderAccountsView() {
  const container = document.getElementById('subView_accounts');
  if (!container) return;

  let totalWealth = 0;
  walletState.accounts.forEach(a => totalWealth += a.balance);

  let html = `
    <div class="hero-card" style="padding: 16px 18px;">
      <span class="hero-subtitle">Net Cüzdan Varlığı (Tüm Hesaplar)</span>
      <div class="hero-amount" style="font-size: 1.5rem;">${formatWalletTL(totalWealth)}</div>
    </div>

    <div class="section-header" style="margin-top: 6px;">
      <h3 style="font-size: 0.95rem; font-weight: 800;">Kayıtlı Cüzdan & Kartlar</h3>
      <button class="btn-small" onclick="openAddAccountModal()">+ Yeni Hesap</button>
    </div>

    <div class="accounts-grid">
  `;

  walletState.accounts.forEach(acc => {
    html += `
      <div class="account-card" onclick="openEditAccountModal('${acc.id}')" title="Hesabı düzenlemek için tıklayın">
        <div class="account-info">
          <div class="account-icon">${acc.icon || '💳'}</div>
          <div class="account-title-box">
            <h4>${acc.name}</h4>
            <span class="account-type-tag">${getAccountTypeLabel(acc.type)}</span>
          </div>
        </div>
        <div class="account-right-box">
          <div class="account-balance-box">
            <div class="account-balance" style="color: ${acc.balance < 0 ? 'var(--rose)' : '#fff'};">
              ${formatWalletTL(acc.balance)}
            </div>
          </div>
          <button type="button" class="btn-account-edit" onclick="event.stopPropagation(); openEditAccountModal('${acc.id}')" title="Hesabı Düzenle">
            ✏️ Düzenle
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function getAccountTypeLabel(type) {
  if (type === 'cash') return 'Nakit Cüzdan';
  if (type === 'bank') return 'Vadesiz Banka';
  if (type === 'credit') return 'Kredi Kartı';
  if (type === 'savings') return 'Birikim / Altın';
  return 'Hesap';
}

// --- Hesap Ekleme & Düzenleme Fonksiyonları ---
function openAddAccountModal() {
  const modal = document.getElementById('modalWalletAccount');
  if (!modal) return;

  const titleEl = document.getElementById('modalAccountTitle');
  if (titleEl) titleEl.textContent = 'Yeni Hesap Ekle';

  document.getElementById('inputAccountId').value = '';
  document.getElementById('inputAccountName').value = '';
  document.getElementById('selectAccountType').value = 'bank';
  selectAccountIcon('🏦');
  document.getElementById('inputAccountBalance').value = '0';

  const delBtn = document.getElementById('btnDeleteAccount');
  if (delBtn) delBtn.style.display = 'none';

  modal.showModal();
}

function openEditAccountModal(accId) {
  const modal = document.getElementById('modalWalletAccount');
  if (!modal) return;

  const acc = walletState.accounts.find(a => a.id === accId);
  if (!acc) return;

  const titleEl = document.getElementById('modalAccountTitle');
  if (titleEl) titleEl.textContent = 'Hesabı Düzenle';

  document.getElementById('inputAccountId').value = acc.id;
  document.getElementById('inputAccountName').value = acc.name;
  document.getElementById('selectAccountType').value = acc.type || 'bank';
  selectAccountIcon(acc.icon || '💳');
  document.getElementById('inputAccountBalance').value = acc.balance;

  const delBtn = document.getElementById('btnDeleteAccount');
  if (delBtn) delBtn.style.display = 'inline-flex';

  modal.showModal();
}

function selectAccountIcon(icon) {
  const input = document.getElementById('inputAccountIcon');
  if (input) input.value = icon;

  const btns = document.querySelectorAll('#accountIconPicker .emoji-opt-btn');
  btns.forEach(btn => {
    if (btn.textContent.trim() === icon) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function handleAccountTypeChange(type) {
  let defaultIcon = '🏦';
  if (type === 'cash') defaultIcon = '💵';
  else if (type === 'credit') defaultIcon = '💳';
  else if (type === 'savings') defaultIcon = '💰';
  selectAccountIcon(defaultIcon);
}

function handleAccountFormSubmit(e) {
  e.preventDefault();
  const accId = document.getElementById('inputAccountId').value;
  const name = document.getElementById('inputAccountName').value.trim();
  const type = document.getElementById('selectAccountType').value;
  const icon = document.getElementById('inputAccountIcon').value || '💳';
  const balance = parseFloat(document.getElementById('inputAccountBalance').value) || 0;

  if (!name) return;

  if (accId) {
    // Mevcut hesabı güncelle
    const acc = walletState.accounts.find(a => a.id === accId);
    if (acc) {
      acc.name = name;
      acc.type = type;
      acc.icon = icon;
      acc.balance = balance;
    }
  } else {
    // Yeni hesap oluştur
    const newAcc = {
      id: 'acc_' + Date.now(),
      name: name,
      type: type,
      icon: icon,
      balance: balance
    };
    walletState.accounts.push(newAcc);
  }

  saveWalletState();
  renderWalletUI();
  closeModal('modalWalletAccount');
}

function handleDeleteCurrentAccount() {
  const accId = document.getElementById('inputAccountId').value;
  if (!accId) return;

  if (walletState.accounts.length <= 1) {
    alert('En az 1 adet hesap veya cüzdan bulunmalıdır.');
    return;
  }

  const hasTxs = walletState.transactions.some(t => t.fromAccountId === accId || t.toAccountId === accId);
  const confirmMsg = hasTxs
    ? 'Bu hesaba ait harcama/gelir hareketleri bulunmaktadır.\nHesabı sildiğinizde mevcut hareketler korunur ancak hesap listeden kalkar.\n\nSilmek istediğinize emin misiniz?'
    : 'Bu hesabı silmek istediğinize emin misiniz?';

  if (!confirm(confirmMsg)) return;

  walletState.accounts = walletState.accounts.filter(a => a.id !== accId);
  saveWalletState();
  renderWalletUI();
  closeModal('modalWalletAccount');
}

// Eski çağrılar için geriye dönük uyumluluk
function openAddAccountPrompt() {
  openAddAccountModal();
}

// --- İşlem Ekleme / Silme Formu (Modal) ---
function openAddWalletTxModal() {
  const modal = document.getElementById('modalWalletTx');
  if (!modal) return;

  setTxType('expense'); // Default expense
  selectedSubCategoryId = '';
  const dateInput = document.getElementById('inputWalletTxDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
  const amountInput = document.getElementById('inputWalletAmount');
  if (amountInput) amountInput.value = '';
  const noteInput = document.getElementById('inputWalletNote');
  if (noteInput) noteInput.value = '';

  populateWalletAccountSelectors();
  modal.showModal();
}

function setTxType(type) {
  currentTxType = type;
  document.querySelectorAll('.tx-type-opt').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`txTypeBtn_${type}`);
  if (btn) btn.classList.add('active');

  const catSection = document.getElementById('walletCatSection');
  const transferSection = document.getElementById('walletTransferSection');

  if (type === 'transfer') {
    if (catSection) catSection.style.display = 'none';
    if (transferSection) transferSection.style.display = 'block';
  } else {
    if (catSection) catSection.style.display = 'block';
    if (transferSection) transferSection.style.display = 'none';
    renderCategoryGrid(type);
  }
}

function renderCategoryGrid(type) {
  const grid = document.getElementById('walletCategoryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;
  if (!selectedCategoryId || !catList.some(c => c.id === selectedCategoryId)) {
    selectedCategoryId = catList[0] ? catList[0].id : '';
  }

  catList.forEach(c => {
    const div = document.createElement('div');
    div.className = `cat-choice ${c.id === selectedCategoryId ? 'selected' : ''}`;
    div.onclick = () => {
      selectedCategoryId = c.id;
      selectedSubCategoryId = '';
      renderCategoryGrid(type);
    };
    div.innerHTML = `
      <div class="cat-choice-icon">${c.icon}</div>
      <span class="cat-choice-name">${c.name}</span>
    `;
    grid.appendChild(div);
  });

  renderSubCategoryPicker(type);
}

// Alt Başlık (Subcategory) Seçici
function renderSubCategoryPicker(type) {
  const container = document.getElementById('walletSubCatSection');
  if (!container) return;

  if (type === 'transfer') {
    container.style.display = 'none';
    return;
  }

  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;
  const currentCat = catList.find(c => c.id === selectedCategoryId);

  if (!currentCat) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const subcats = currentCat.subcategories || [];

  let html = `
    <div class="subcat-picker-wrap">
      <div class="subcat-picker-header">
        <span class="subcat-picker-title">
          <span>🏷️ Alt Başlık Seçin</span>
          <small style="color: var(--text-dim); font-weight: normal;">(${currentCat.name})</small>
        </span>
        <button type="button" class="btn-text-action" onclick="openAddSubCategoryModal('${currentCat.id}', '${type}')" title="Bu başlığa yeni alt başlık ekle">
          + Yeni Alt Başlık
        </button>
      </div>
      <div class="subcat-chips-list">
        <button type="button" class="subcat-chip ${!selectedSubCategoryId ? 'selected' : ''}" onclick="selectSubCategory('')">
          Genel (Alt Başlıksız)
        </button>
  `;

  subcats.forEach(sub => {
    const isSel = selectedSubCategoryId === sub;
    html += `
      <button type="button" class="subcat-chip ${isSel ? 'selected' : ''}" onclick="selectSubCategory('${sub.replace(/'/g, "\\'")}')">
        ${sub}
      </button>
    `;
  });

  html += `
        <button type="button" class="subcat-chip subcat-chip-add" onclick="openAddSubCategoryModal('${currentCat.id}', '${type}')">
          ➕ Ekle
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function selectSubCategory(sub) {
  selectedSubCategoryId = sub;
  renderSubCategoryPicker(currentTxType);
}

function promptQuickAddSubcategory(catId, type) {
  openAddSubCategoryModal(catId, type);
}

function populateWalletAccountSelectors() {
  const fromSelect = document.getElementById('selectWalletFromAccount');
  const toSelect = document.getElementById('selectWalletToAccount');

  if (fromSelect) {
    fromSelect.innerHTML = '';
    walletState.accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.innerText = `${a.icon} ${a.name} (${formatWalletTL(a.balance)})`;
      fromSelect.appendChild(opt);
    });
  }

  if (toSelect) {
    toSelect.innerHTML = '';
    walletState.accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.innerText = `${a.icon} ${a.name} (${formatWalletTL(a.balance)})`;
      toSelect.appendChild(opt);
    });
    if (walletState.accounts.length > 1) toSelect.selectedIndex = 1;
  }
}

function handleWalletTxSubmit(e) {
  e.preventDefault();
  const amountInput = document.getElementById('inputWalletAmount');
  const dateInput = document.getElementById('inputWalletTxDate');
  const noteInput = document.getElementById('inputWalletNote');
  const fromSelect = document.getElementById('selectWalletFromAccount');
  const toSelect = document.getElementById('selectWalletToAccount');

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0 || !dateInput.value) return;

  const fromAccountId = fromSelect.value;
  const toAccountId = currentTxType === 'transfer' ? toSelect.value : '';

  if (currentTxType === 'transfer' && fromAccountId === toAccountId) {
    alert('Kaynak ve hedef hesap aynı olamaz!');
    return;
  }

  const newTx = {
    id: 'wtx_' + Date.now(),
    type: currentTxType,
    amount: amount,
    fromAccountId: fromAccountId,
    toAccountId: toAccountId,
    categoryId: currentTxType !== 'transfer' ? selectedCategoryId : '',
    subCategory: currentTxType !== 'transfer' ? selectedSubCategoryId : '',
    date: dateInput.value,
    note: noteInput.value.trim()
  };

  // Hesap bakiyelerini güncelle
  const fromAcc = walletState.accounts.find(a => a.id === fromAccountId);
  if (fromAcc) {
    if (currentTxType === 'expense' || currentTxType === 'transfer') {
      fromAcc.balance -= amount;
    } else if (currentTxType === 'income') {
      fromAcc.balance += amount;
    }
  }

  if (currentTxType === 'transfer') {
    const toAcc = walletState.accounts.find(a => a.id === toAccountId);
    if (toAcc) toAcc.balance += amount;
  }

  walletState.transactions.unshift(newTx);
  saveWalletState();
  renderWalletUI();

  const modal = document.getElementById('modalWalletTx');
  if (modal) modal.close();
}

function deleteWalletTx(txId) {
  if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

  const idx = walletState.transactions.findIndex(t => t.id === txId);
  if (idx < 0) return;

  const tx = walletState.transactions[idx];

  // Hesap bakiyesini tersine çevir
  const fromAcc = walletState.accounts.find(a => a.id === tx.fromAccountId);
  if (fromAcc) {
    if (tx.type === 'expense' || tx.type === 'transfer') {
      fromAcc.balance += tx.amount;
    } else if (tx.type === 'income') {
      fromAcc.balance -= tx.amount;
    }
  }

  if (tx.type === 'transfer') {
    const toAcc = walletState.accounts.find(a => a.id === tx.toAccountId);
    if (toAcc) toAcc.balance -= tx.amount;
  }

  walletState.transactions.splice(idx, 1);
  saveWalletState();
  renderWalletUI();
}

// --- Kategori & Alt Başlık Yönetim Sistemi ---
function openWalletCategoryManagerModal(type = 'expense') {
  currentCategoryMgrType = type;
  renderCategoryManagerModal();
  const modal = document.getElementById('modalWalletCategories');
  if (modal) modal.showModal();
}

function setCategoryMgrType(type) {
  currentCategoryMgrType = type;
  renderCategoryManagerModal();
}

function renderCategoryManagerModal() {
  const type = currentCategoryMgrType;
  const btnExp = document.getElementById('catMgrBtnExpense');
  const btnInc = document.getElementById('catMgrBtnIncome');
  if (btnExp) {
    btnExp.className = `segment-opt-btn ${type === 'expense' ? 'active' : ''}`;
  }
  if (btnInc) {
    btnInc.className = `segment-opt-btn ${type === 'income' ? 'active' : ''}`;
  }

  const container = document.getElementById('walletCategoryManagerList');
  if (!container) return;

  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;

  let html = '';
  catList.forEach(cat => {
    const subs = cat.subcategories || [];
    html += `
      <div class="cat-mgr-card">
        <div class="cat-mgr-top">
          <div class="cat-mgr-info">
            <div class="cat-mgr-icon">${cat.icon}</div>
            <div>
              <div class="cat-mgr-name">${cat.name}</div>
              <div class="cat-mgr-subcount">${subs.length} alt başlık tanımlı</div>
            </div>
          </div>
          <div class="cat-mgr-actions">
            <button type="button" class="btn-icon-subtle" onclick="openEditCategoryModal('${cat.id}', '${type}')" title="Başlığı Düzenle">✎</button>
            <button type="button" class="btn-icon-subtle danger" onclick="deleteCategory('${cat.id}', '${type}')" title="Grup Başlığını Sil">🗑️</button>
          </div>
        </div>

        <div class="subcat-mgr-chips">
    `;

    subs.forEach(sub => {
      html += `
        <span class="subcat-mgr-pill">
          <span>${sub}</span>
          <button type="button" class="btn-del-subcat" onclick="deleteSubcategory('${cat.id}', '${sub.replace(/'/g, "\\'")}', '${type}')" title="Alt Başlığı Sil">&times;</button>
        </span>
      `;
    });

    html += `
          <button type="button" class="subcat-chip subcat-chip-add" onclick="openAddSubCategoryModal('${cat.id}', '${type}')">
            + Alt Başlık Ekle
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Popüler Grup / Kategori Emojileri ve Simgeleri
const POPULAR_CATEGORY_ICONS = [
  // Gıda & İçecek
  '🛒', '🍔', '🍕', '☕', '🥖', '🍎', '🥩', '🍰',
  // Faturalar, Ev & Yaşam
  '💡', '🏠', '🔌', '💧', '📶', '📱', '🛋️', '🔑',
  // Ulaşım & Araç
  '🚗', '⛽', '🚌', '🚇', '✈️', '🚕', '🚲', '🔧',
  // Alışveriş, Giyim & Teknoloji
  '🛍️', '👕', '👟', '💄', '🎁', '📦', '💻', '🎮',
  // Sağlık, Spor & Bakım
  '💊', '🩺', '🏋️', '⚽', '🧘', '🦷', '🌿', '💈',
  // Gelir, Finans, İş & Eğitim
  '💼', '💰', '💵', '📈', '🏦', '🪙', '🎓', '🧾',
  // Eğlence, Hobi & Genel
  '🎬', '🐾', '🏖️', '🎨', '📚', '👶', '🍿', '⭐'
];

function populateCategoryIconGrid() {
  const grid = document.getElementById('categoryIconGrid');
  if (!grid || grid.children.length > 0) return;

  grid.innerHTML = '';
  POPULAR_CATEGORY_ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-opt-btn';
    btn.textContent = icon;
    btn.onclick = () => selectCategoryIcon(icon);
    grid.appendChild(btn);
  });
}

function openAddCategoryModal(type) {
  populateCategoryIconGrid();
  const targetType = type || currentCategoryMgrType || 'expense';

  const modal = document.getElementById('modalWalletCategoryEdit');
  if (!modal) return;

  const titleEl = document.getElementById('modalCategoryEditTitle');
  if (titleEl) titleEl.textContent = 'Yeni Grup Başlığı Ekle';

  document.getElementById('inputCategoryEditId').value = '';
  document.getElementById('inputCategoryName').value = '';

  const typeGroup = document.getElementById('categoryTypeGroup');
  if (typeGroup) typeGroup.style.display = 'block';

  setCategoryFormType(targetType);

  const delBtn = document.getElementById('btnDeleteCategoryModal');
  if (delBtn) delBtn.style.display = 'none';

  updateCategoryPreview();
  modal.showModal();
}

function openEditCategoryModal(catId, type) {
  populateCategoryIconGrid();
  const targetType = type || currentCategoryMgrType || 'expense';
  const catList = targetType === 'expense' ? walletState.categories.expense : walletState.categories.income;
  const cat = catList.find(c => c.id === catId);
  if (!cat) return;

  const modal = document.getElementById('modalWalletCategoryEdit');
  if (!modal) return;

  const titleEl = document.getElementById('modalCategoryEditTitle');
  if (titleEl) titleEl.textContent = 'Grup Başlığını Düzenle';

  document.getElementById('inputCategoryEditId').value = cat.id;
  document.getElementById('inputCategoryEditType').value = targetType;
  document.getElementById('inputCategoryName').value = cat.name;

  const typeGroup = document.getElementById('categoryTypeGroup');
  if (typeGroup) typeGroup.style.display = 'none';

  selectCategoryIcon(cat.icon || '📁');
  selectCategoryColor(cat.color || '#3b82f6');

  const delBtn = document.getElementById('btnDeleteCategoryModal');
  if (delBtn) delBtn.style.display = 'inline-flex';

  updateCategoryPreview();
  modal.showModal();
}

function setCategoryFormType(type) {
  const typeInput = document.getElementById('inputCategoryEditType');
  if (typeInput) typeInput.value = type;

  const btnExp = document.getElementById('btnCatEditExpense');
  const btnInc = document.getElementById('btnCatEditIncome');
  if (btnExp) btnExp.className = `segment-opt-btn ${type === 'expense' ? 'active' : ''}`;
  if (btnInc) btnInc.className = `segment-opt-btn ${type === 'income' ? 'active' : ''}`;

  const isEditing = !!document.getElementById('inputCategoryEditId').value;
  if (!isEditing) {
    if (type === 'expense') {
      selectCategoryIcon('🛒');
      selectCategoryColor('#f59e0b');
    } else {
      selectCategoryIcon('💼');
      selectCategoryColor('#10b981');
    }
  }

  updateCategoryPreview();
}

function selectCategoryIcon(icon) {
  const input = document.getElementById('inputCategoryIcon');
  if (input) input.value = icon;

  const btns = document.querySelectorAll('#categoryIconGrid .emoji-opt-btn');
  btns.forEach(btn => {
    if (btn.textContent.trim() === icon) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateCategoryPreview();
}

function onCustomIconInput(val) {
  const trimmed = val ? val.trim() : '';
  const btns = document.querySelectorAll('#categoryIconGrid .emoji-opt-btn');
  btns.forEach(btn => {
    if (trimmed && btn.textContent.trim() === trimmed) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateCategoryPreview();
}

function selectCategoryColor(color) {
  const input = document.getElementById('inputCategoryColor');
  if (input) input.value = color;

  const btns = document.querySelectorAll('#categoryColorPicker .color-opt-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('data-color') === color) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateCategoryPreview();
}

function updateCategoryPreview() {
  const nameInput = document.getElementById('inputCategoryName');
  const iconInput = document.getElementById('inputCategoryIcon');
  const colorInput = document.getElementById('inputCategoryColor');
  const typeInput = document.getElementById('inputCategoryEditType');

  const name = (nameInput && nameInput.value.trim()) || 'Yeni Grup Başlığı';
  const icon = (iconInput && iconInput.value.trim()) || '📁';
  const color = (colorInput && colorInput.value) || '#3b82f6';
  const type = (typeInput && typeInput.value) || 'expense';

  const previewName = document.getElementById('previewCategoryName');
  const previewIcon = document.getElementById('previewCategoryIcon');
  const previewBadge = document.getElementById('previewCategoryBadge');
  const previewCard = document.getElementById('categoryPreviewCard');

  if (previewName) previewName.textContent = name;
  if (previewIcon) {
    previewIcon.textContent = icon;
    previewIcon.style.borderColor = color;
    previewIcon.style.background = `${color}25`;
  }
  if (previewBadge) {
    previewBadge.textContent = type === 'expense' ? '🔴 Gider Başlığı' : '🟢 Gelir Başlığı';
  }
  if (previewCard) {
    previewCard.style.borderColor = `${color}40`;
  }
}

function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const catId = document.getElementById('inputCategoryEditId').value;
  const type = document.getElementById('inputCategoryEditType').value || 'expense';
  const name = document.getElementById('inputCategoryName').value.trim();
  const icon = document.getElementById('inputCategoryIcon').value.trim() || '📁';
  const color = document.getElementById('inputCategoryColor').value || '#3b82f6';

  if (!name) return;

  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;

  if (catId) {
    const cat = catList.find(c => c.id === catId);
    if (cat) {
      cat.name = name;
      cat.icon = icon;
      cat.color = color;
    }
  } else {
    const newCat = {
      id: 'cat_' + Date.now(),
      name: name,
      icon: icon,
      color: color,
      subcategories: []
    };
    catList.push(newCat);
  }

  saveWalletState();
  renderCategoryManagerModal();
  renderCategoryGrid(currentTxType);
  renderWalletUI();
  closeModal('modalWalletCategoryEdit');
}

function handleDeleteCurrentCategoryFromModal() {
  const catId = document.getElementById('inputCategoryEditId').value;
  const type = document.getElementById('inputCategoryEditType').value;
  if (!catId) return;

  const deleted = deleteCategory(catId, type);
  if (deleted) {
    closeModal('modalWalletCategoryEdit');
  }
}

function deleteCategory(catId, type) {
  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;
  if (catList.length <= 1) {
    alert('En az 1 adet grup başlığı bulunmalıdır.');
    return false;
  }

  if (!confirm('Bu grup başlığını ve altındaki tüm alt başlıkları silmek istediğinize emin misiniz?')) {
    return false;
  }

  if (type === 'expense') {
    walletState.categories.expense = walletState.categories.expense.filter(c => c.id !== catId);
  } else {
    walletState.categories.income = walletState.categories.income.filter(c => c.id !== catId);
  }

  saveWalletState();
  renderCategoryManagerModal();
  renderCategoryGrid(currentTxType);
  renderWalletUI();
  return true;
}

// Akıllı Alt Başlık Öneri Listesi
function getSuggestedSubcategories(catName) {
  const n = (catName || '').toLowerCase();
  if (n.includes('market') || n.includes('gıda') || n.includes('bakkal')) {
    return ['BİM', 'A101', 'ŞOK', 'Migros', 'Carrefour', 'Tarım Kredi', 'Kasap', 'Manav', 'Fırın'];
  }
  if (n.includes('yemek') || n.includes('kafe') || n.includes('restoran')) {
    return ['Restoran', 'Kafe / Kahve', 'Fast Food', 'Yemeksepeti', 'Getir', 'Starbucks', 'Burger King'];
  }
  if (n.includes('fatura') || n.includes('aidat') || n.includes('ev')) {
    return ['Elektrik', 'Doğalgaz', 'Su', 'İnternet', 'Aidat', 'Telefon / GSM', 'Netflix', 'Spotify'];
  }
  if (n.includes('ulaşım') || n.includes('araç') || n.includes('akaryakıt') || n.includes('benzin')) {
    return ['Benzin / Motorin', 'Shell', 'Opet', 'BP', 'Toplu Taşıma / Kart', 'Taksi', 'HGS / OGS', 'Otopark'];
  }
  if (n.includes('giyim') || n.includes('alışveriş') || n.includes('moda')) {
    return ['Giyim & Ayakkabı', 'Kozmetik', 'Trendyol', 'Hepsiburada', 'Amazon', 'Zara', 'LCW'];
  }
  if (n.includes('sağlık') || n.includes('eczane')) {
    return ['Eczane / İlaç', 'Hastane / Muayene', 'Diş', 'Tahlil'];
  }
  if (n.includes('eğlence') || n.includes('hobi') || n.includes('tatil')) {
    return ['Sinema & Konser', 'Abonelikler', 'Oyun & Steam', 'Tatil & Gezi', 'Kitap'];
  }
  if (n.includes('maaş') || n.includes('gelir')) {
    return ['Ana Maaş', 'Mesai', 'Prim', 'İkramiye', 'Freelance / Ek İş', 'Kira Geliri'];
  }
  return ['Genel', 'Ekstra', 'Nakit', 'Online', 'Çeşitli'];
}

function openAddSubCategoryModal(catId, type) {
  const targetType = type || currentCategoryMgrType || 'expense';
  const catList = targetType === 'expense' ? walletState.categories.expense : walletState.categories.income;
  const cat = catList.find(c => c.id === catId);
  if (!cat) return;

  const modal = document.getElementById('modalWalletSubCategory');
  if (!modal) return;

  document.getElementById('inputSubCategoryCatId').value = cat.id;
  document.getElementById('inputSubCategoryType').value = targetType;

  const badgeIcon = document.getElementById('subcatParentBadgeIcon');
  const badgeName = document.getElementById('subcatParentBadgeName');
  if (badgeIcon) badgeIcon.textContent = cat.icon || '📁';
  if (badgeName) badgeName.textContent = cat.name;

  const inputName = document.getElementById('inputSubCategoryName');
  if (inputName) {
    inputName.value = '';
    setTimeout(() => inputName.focus(), 50);
  }

  const chipsContainer = document.getElementById('subcatSuggestionsChips');
  if (chipsContainer) {
    const existingSubs = cat.subcategories || [];
    const suggestions = getSuggestedSubcategories(cat.name).filter(s => !existingSubs.includes(s));
    if (suggestions.length === 0) {
      chipsContainer.innerHTML = '<span style="font-size: 0.72rem; color: var(--text-dim);">Özel bir alt başlık adı girebilirsiniz.</span>';
    } else {
      chipsContainer.innerHTML = suggestions.map(s => `
        <button type="button" class="subcat-quick-chip" onclick="selectSubCategorySuggestion('${s.replace(/'/g, "\\'")}')">
          + ${s}
        </button>
      `).join('');
    }
  }

  modal.showModal();
}

function selectSubCategorySuggestion(name) {
  const input = document.getElementById('inputSubCategoryName');
  if (input) {
    input.value = name;
    input.focus();
  }
}

function handleSubCategoryFormSubmit(e) {
  e.preventDefault();
  const catId = document.getElementById('inputSubCategoryCatId').value;
  const type = document.getElementById('inputSubCategoryType').value;
  const name = document.getElementById('inputSubCategoryName').value.trim();

  if (!name) return;

  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;
  const cat = catList.find(c => c.id === catId);
  if (!cat) return;

  if (!Array.isArray(cat.subcategories)) cat.subcategories = [];
  if (!cat.subcategories.includes(name)) {
    cat.subcategories.push(name);
    saveWalletState();
  }

  renderCategoryManagerModal();
  selectedSubCategoryId = name;
  renderSubCategoryPicker(currentTxType);
  closeModal('modalWalletSubCategory');
}

// Eski prompt çağrıları için geriye dönük uyumluluk
function promptAddMainCategory() {
  openAddCategoryModal();
}

function promptEditCategory(catId, type) {
  openEditCategoryModal(catId, type);
}

function promptAddSubcategory(catId, type) {
  openAddSubCategoryModal(catId, type);
}

function deleteSubcategory(catId, subName, type) {
  const catList = type === 'expense' ? walletState.categories.expense : walletState.categories.income;
  const cat = catList.find(c => c.id === catId);
  if (!cat || !Array.isArray(cat.subcategories)) return;

  cat.subcategories = cat.subcategories.filter(s => s !== subName);
  saveWalletState();
  renderCategoryManagerModal();
  renderSubCategoryPicker(currentTxType);
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  loadWalletState();
  populateCategoryIconGrid();

  // Son aktif modülü hatırla
  const savedMod = localStorage.getItem('active_suite_module');
  if (savedMod === 'wallet') {
    switchMainModule('wallet');
  }
});
