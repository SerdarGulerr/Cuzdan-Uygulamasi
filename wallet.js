/**
 * Gelir & Gider Cüzdanım (Money Manager)
 * Realbyte Money Manager Mantığında Çevrimdışı Bütçe ve Harcama Motoru
 */

const DEFAULT_WALLET_STATE = {
  accounts: [
    { id: 'acc_cash', name: 'Nakit (Cüzdan)', type: 'cash', icon: '💵', balance: 1750 },
    { id: 'acc_bank', name: 'Banka Hesabı (Vadesiz)', type: 'bank', icon: '🏦', balance: 24500 },
    { id: 'acc_credit', name: 'Kredi Kartı', type: 'credit', icon: '💳', balance: -3200, billingDay: 15 },
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
let editingWalletTxId = null; // Aktif düzenlenen işlemin ID'si

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
  if (typeof syncCreditCardCutoffNotifications === 'function') {
    syncCreditCardCutoffNotifications();
  }
}

// --- Modül Değiştirme (Sol Menüden Faiz <-> Cüzdan <-> Bordro) ---
function switchMainModule(modName) {
  const modFaiz = document.getElementById('moduleFaiz');
  const modWallet = document.getElementById('moduleWallet');
  const modBordro = document.getElementById('moduleBordro');
  const itemFaiz = document.getElementById('drawerItemFaiz');
  const itemWallet = document.getElementById('drawerItemWallet');
  const itemBordro = document.getElementById('drawerItemBordro');
  const appContainer = document.querySelector('.app-container');

  if (modFaiz) modFaiz.style.display = 'none';
  if (modWallet) modWallet.style.display = 'none';
  if (modBordro) modBordro.style.display = 'none';

  if (itemFaiz) itemFaiz.classList.remove('active');
  if (itemWallet) itemWallet.classList.remove('active');
  if (itemBordro) itemBordro.classList.remove('active');

  if (modName === 'wallet') {
    if (modWallet) modWallet.style.display = 'flex';
    if (itemWallet) itemWallet.classList.add('active');
    if (appContainer) appContainer.classList.remove('bordro-wide-active');
    localStorage.setItem('active_suite_module', 'wallet');
    renderWalletUI();
  } else if (modName === 'bordro') {
    if (modBordro) modBordro.style.display = 'flex';
    if (itemBordro) itemBordro.classList.add('active');
    if (appContainer && bordroWideMode) appContainer.classList.add('bordro-wide-active');
    localStorage.setItem('active_suite_module', 'bordro');
    if (typeof renderBordroModule === 'function') renderBordroModule();
  } else {
    if (modFaiz) modFaiz.style.display = 'flex';
    if (itemFaiz) itemFaiz.classList.add('active');
    if (appContainer) appContainer.classList.remove('bordro-wide-active');
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
              <span class="tx-cat-name">${catName} ${t.subCategory ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''} ${t.installment ? `<span class="tx-installment-badge">💳 ${t.installment.current}/${t.installment.total} Taksit</span>` : ''} ${t.note ? `<small style="font-weight: normal; color: var(--text-dim);">(${t.note})</small>` : ''}</span>
              <span class="tx-account-name">${accName}</span>
            </div>
          </div>
          <div class="wallet-tx-right">
            <span class="wallet-tx-amount ${cls}">${sign}${formatWalletTL(t.amount)}</span>
            <div class="wallet-tx-actions">
              ${t.type !== 'transfer' ? `
              <button type="button" class="btn-tx-action btn-tx-stats" onclick="inspectCategoryTrend('${t.categoryId}', '${(t.subCategory || '').replace(/'/g, "\\'")}', '${t.type}')" title="Bu Kalemin Trendini & Geçmişini İncele" aria-label="Analiz">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </button>
              ` : ''}
              <button type="button" class="btn-tx-action btn-tx-edit" onclick="openEditWalletTxModal('${t.id}')" title="İşlemi Düzenle" aria-label="Düzenle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button type="button" class="btn-tx-action btn-tx-delete" onclick="deleteWalletTx('${t.id}')" title="İşlemi Sil" aria-label="Sil">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
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
        <div class="wallet-tx-left">
          <div class="tx-desc-box">
            <span style="font-size:0.85rem; font-weight:700;">${t.note || 'İşlem'} ${t.subCategory ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''} ${t.installment ? `<span class="tx-installment-badge">💳 ${t.installment.current}/${t.installment.total}</span>` : ''}</span>
          </div>
        </div>
        <div class="wallet-tx-right">
          <span class="wallet-tx-amount ${cls}">${sign}${formatWalletTL(t.amount)}</span>
          <div class="wallet-tx-actions">
            <button type="button" class="btn-tx-action btn-tx-edit" onclick="openEditWalletTxModal('${t.id}')" title="İşlemi Düzenle" aria-label="Düzenle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-tx-action btn-tx-delete" onclick="deleteWalletTx('${t.id}')" title="İşlemi Sil" aria-label="Sil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });
  detailBox.innerHTML = html;
}

// ===================================================
// 3. GELİŞMİŞ ANALİZ, KIYASLAMA & GEÇMİŞ TREND MOTORU
// ===================================================

let expandedStatsCategories = new Set();
let expandedStatsSubCategories = new Set();

let walletAnalyticsState = {
  mode: 'compare', // 'compare' (Kıyaslama & Dağılım) | 'trend' (Zaman & Geçmiş Trendi)
  compareType: 'expense', // 'expense' | 'income'
  comparePeriod: 'month', // 'month' (seçili ay) | '3months' | '6months' | 'year' | 'all'
  compareScope: 'categories', // 'categories' (kategorileri kıyasla) | 'subcategories' (alt başlık kırılımı)
  selectedCategoryIds: [], // boş ise tümü, dolu ise seçili kategoriler örn: ['cat_market', 'cat_food']
  selectedScopeCatId: 'cat_market', // alt başlık analizi için seçili ana kategori

  // Trend Modu
  trendType: 'expense', // 'expense' | 'income'
  trendCategoryId: 'cat_food',
  trendSubCategory: '', // '' ise tüm kategori, dolu ise örn: 'Fast Food' veya '__unassigned__'
  trendRange: '6months', // '6months' | '12months' | 'year' | 'all'
  trendSelectedMonth: null // grafikten bir aya tıklandığında o aya filtreler
};

// --- Mod ve Filtre Kontrol Fonksiyonları ---
function setAnalyticsMode(mode) {
  walletAnalyticsState.mode = mode;
  walletAnalyticsState.trendSelectedMonth = null;
  renderStatsView();
}

function setAnalyticsCompareType(type) {
  walletAnalyticsState.compareType = type;
  walletAnalyticsState.selectedCategoryIds = [];
  const catList = (walletState && walletState.categories && walletState.categories[type]) ? walletState.categories[type] : [];
  if (catList.length > 0) {
    walletAnalyticsState.selectedScopeCatId = catList[0].id;
  }
  renderStatsView();
}

function setAnalyticsComparePeriod(period) {
  walletAnalyticsState.comparePeriod = period;
  renderStatsView();
}

function setAnalyticsCompareScope(scope) {
  walletAnalyticsState.compareScope = scope;
  renderStatsView();
}

function toggleAnalyticsCategoryFilter(catId) {
  if (catId === 'all') {
    walletAnalyticsState.selectedCategoryIds = [];
  } else {
    const idx = walletAnalyticsState.selectedCategoryIds.indexOf(catId);
    if (idx >= 0) {
      walletAnalyticsState.selectedCategoryIds.splice(idx, 1);
    } else {
      walletAnalyticsState.selectedCategoryIds.push(catId);
    }
  }
  renderStatsView();
}

function selectAnalyticsScopeCategory(catId) {
  walletAnalyticsState.selectedScopeCatId = catId;
  renderStatsView();
}

function setAnalyticsTrendType(type) {
  walletAnalyticsState.trendType = type;
  const catList = (walletState && walletState.categories && walletState.categories[type]) ? walletState.categories[type] : [];
  if (catList.length > 0) {
    walletAnalyticsState.trendCategoryId = catList[0].id;
  }
  walletAnalyticsState.trendSubCategory = '';
  walletAnalyticsState.trendSelectedMonth = null;
  renderStatsView();
}

function setAnalyticsTrendCategory(catId) {
  walletAnalyticsState.trendCategoryId = catId;
  walletAnalyticsState.trendSubCategory = '';
  walletAnalyticsState.trendSelectedMonth = null;
  renderStatsView();
}

function setAnalyticsTrendSubCategory(subCat) {
  walletAnalyticsState.trendSubCategory = subCat || '';
  walletAnalyticsState.trendSelectedMonth = null;
  renderStatsView();
}

function setAnalyticsTrendRange(range) {
  walletAnalyticsState.trendRange = range;
  walletAnalyticsState.trendSelectedMonth = null;
  renderStatsView();
}

function selectTrendMonth(monthKey) {
  if (walletAnalyticsState.trendSelectedMonth === monthKey) {
    walletAnalyticsState.trendSelectedMonth = null;
  } else {
    walletAnalyticsState.trendSelectedMonth = monthKey;
  }
  renderStatsView();
}

// Hızlı Trend & İnceleme Yönlendirmesi
function inspectCategoryTrend(catId, subCatName = '', type = 'expense') {
  walletAnalyticsState.mode = 'trend';
  walletAnalyticsState.trendType = type === 'income' ? 'income' : 'expense';
  walletAnalyticsState.trendCategoryId = catId;
  walletAnalyticsState.trendSubCategory = subCatName || '';
  walletAnalyticsState.trendSelectedMonth = null;
  
  if (activeWalletSubView !== 'stats') {
    switchWalletSubView('stats');
  } else {
    renderStatsView();
  }
  
  const container = document.getElementById('subView_stats');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function inspectCategorySubBreakdown(catId, type = 'expense') {
  walletAnalyticsState.mode = 'compare';
  walletAnalyticsState.compareType = type === 'income' ? 'income' : 'expense';
  walletAnalyticsState.compareScope = 'subcategories';
  walletAnalyticsState.selectedScopeCatId = catId;
  
  if (activeWalletSubView !== 'stats') {
    switchWalletSubView('stats');
  } else {
    renderStatsView();
  }

  const container = document.getElementById('subView_stats');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function abbreviateTL(amount) {
  if (isNaN(amount) || amount === 0) return '0\u00A0₺';
  const abs = Math.abs(amount);
  if (abs >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.', ',') + 'M\u00A0₺';
  }
  if (abs >= 10000) {
    return (amount / 1000).toFixed(0) + 'K\u00A0₺';
  }
  if (abs >= 1000) {
    return (amount / 1000).toFixed(1).replace('.', ',') + 'K\u00A0₺';
  }
  return Math.round(amount) + '\u00A0₺';
}

// Akordeon Genişletme Yardımcıları
function toggleStatsCategoryExpand(catId) {
  if (expandedStatsCategories.has(catId)) {
    expandedStatsCategories.delete(catId);
  } else {
    expandedStatsCategories.add(catId);
  }
  renderStatsView();
}

function toggleAllStatsCategories(catIds) {
  const allOpen = catIds.every(id => expandedStatsCategories.has(id));
  if (allOpen) {
    expandedStatsCategories.clear();
  } else {
    catIds.forEach(id => expandedStatsCategories.add(id));
  }
  renderStatsView();
}

function toggleStatsSubCategoryTxList(event, subKey) {
  if (event) event.stopPropagation();
  if (expandedStatsSubCategories.has(subKey)) {
    expandedStatsSubCategories.delete(subKey);
  } else {
    expandedStatsSubCategories.add(subKey);
  }
  renderStatsView();
}

// SVG Donut (Halka) Grafiği Üreteci
function generateSvgDonut(items, total, centerSub = 'Toplam', centerVal = '') {
  if (!items || items.length === 0 || total <= 0) {
    return `
      <div class="donut-chart-container empty">
        <svg viewBox="0 0 240 240" class="donut-chart-svg">
          <circle cx="120" cy="120" r="82" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="24" />
          <text x="120" y="115" text-anchor="middle" class="donut-empty-text">Kayıt Bulunmuyor</text>
          <text x="120" y="135" text-anchor="middle" class="donut-empty-sub">0,00 ₺</text>
        </svg>
      </div>
    `;
  }

  const R = 82;
  const C = 2 * Math.PI * R; // ~515.22
  let accPct = 0;
  let circlesHtml = '';

  items.forEach((item) => {
    const slicePct = item.amount / total;
    const dashLength = Math.max(1.5, slicePct * C);
    const strokeOffset = -(accPct * C);
    accPct += slicePct;

    circlesHtml += `
      <circle cx="120" cy="120" r="${R}" fill="none" 
              stroke="${item.color}" 
              stroke-width="24" 
              stroke-dasharray="${dashLength.toFixed(2)} ${(C - dashLength).toFixed(2)}" 
              stroke-dashoffset="${strokeOffset.toFixed(2)}"
              transform="rotate(-90 120 120)"
              class="donut-slice">
        <title>${item.name || item.label}: ${formatWalletTL(item.amount)} (%${item.pct}%)</title>
      </circle>
    `;
  });

  const displayVal = centerVal || formatWalletTL(total);

  return `
    <div class="donut-chart-container">
      <svg viewBox="0 0 240 240" class="donut-chart-svg">
        <circle cx="120" cy="120" r="${R}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="24" />
        ${circlesHtml}
        <g class="donut-center-group">
          <text x="120" y="112" text-anchor="middle" class="donut-center-sub">${centerSub}</text>
          <text x="120" y="135" text-anchor="middle" class="donut-center-val">${displayVal}</text>
        </g>
      </svg>
    </div>
  `;
}

// SVG Aylık Trend Sütun & Ortalama Grafiği Üreteci
function generateSvgTrendChart(monthsList, maxVal, avgAmount, peakMonth, selectedMonthKey, themeColor = '#f59e0b') {
  if (!monthsList || monthsList.length === 0) {
    return `<div style="text-align:center; padding:30px; color:var(--text-dim); font-size:0.8rem;">Grafik verisi bulunamadı.</div>`;
  }

  const svgW = 460;
  const svgH = 210;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 32;
  const padBottom = 32;
  const plotW = svgW - padLeft - padRight;
  const plotH = svgH - padTop - padBottom;

  const safeMax = Math.max(maxVal, 100);

  // Y-Ekseni Grid Çizgileri (0, 50%, 100%)
  const y0 = padTop + plotH;
  const yMid = padTop + plotH / 2;
  const yTop = padTop;

  let gridHtml = `
    <!-- Grid Çizgileri -->
    <line x1="${padLeft}" y1="${yTop}" x2="${svgW - padRight}" y2="${yTop}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
    <text x="${padLeft - 6}" y="${yTop + 4}" text-anchor="end" class="chart-y-axis-label">${abbreviateTL(safeMax)}</text>

    <line x1="${padLeft}" y1="${yMid}" x2="${svgW - padRight}" y2="${yMid}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
    <text x="${padLeft - 6}" y="${yMid + 4}" text-anchor="end" class="chart-y-axis-label">${abbreviateTL(safeMax / 2)}</text>

    <line x1="${padLeft}" y1="${y0}" x2="${svgW - padRight}" y2="${y0}" stroke="rgba(255,255,255,0.12)" />
    <text x="${padLeft - 6}" y="${y0 + 4}" text-anchor="end" class="chart-y-axis-label">0</text>
  `;

  // Ortalama Harcama Çizgisi
  if (avgAmount > 0 && avgAmount <= safeMax) {
    const avgY = padTop + plotH - (avgAmount / safeMax) * plotH;
    gridHtml += `
      <line x1="${padLeft}" y1="${avgY}" x2="${svgW - padRight}" y2="${avgY}" stroke="#fbbf24" stroke-dasharray="4 4" stroke-width="1.4" opacity="0.85" />
      <text x="${svgW - padRight}" y="${avgY - 4}" text-anchor="end" class="chart-avg-badge">Ort: ${abbreviateTL(avgAmount)}</text>
    `;
  }

  // Barlar & Etiketler
  const n = monthsList.length;
  const slotW = plotW / n;
  const barW = Math.max(12, Math.min(28, slotW * 0.55));

  let barsHtml = '';
  monthsList.forEach((m, idx) => {
    const x = padLeft + idx * slotW + (slotW - barW) / 2;
    const barH = safeMax > 0 ? (m.amount / safeMax) * plotH : 0;
    const y = padTop + plotH - barH;
    const isSelected = selectedMonthKey === m.key;
    const isPeak = peakMonth && peakMonth.amount > 0 && m.key === peakMonth.key;
    const isLatest = idx === monthsList.length - 1;

    let barColor = themeColor;
    if (isSelected) barColor = '#60a5fa';

    // Tepe Rozeti / Tutar
    let topLabelHtml = '';
    if (isPeak) {
      topLabelHtml += `<text x="${x + barW / 2}" y="${Math.max(14, y - 16)}" text-anchor="middle" class="chart-peak-crown">👑</text>`;
    }
    if (m.amount > 0) {
      topLabelHtml += `<text x="${x + barW / 2}" y="${Math.max(14, y - 4)}" text-anchor="middle" class="chart-bar-value ${isPeak ? 'peak-val' : ''}">${abbreviateTL(m.amount)}</text>`;
    }

    barsHtml += `
      <g class="chart-bar-group ${isSelected ? 'selected' : ''}" onclick="selectTrendMonth('${m.key}')" style="cursor: pointer;">
        <title>${m.fullName}: ${formatWalletTL(m.amount)} (${m.count} işlem)</title>
        
        <!-- Dokunma / Tıklama Alanı -->
        <rect x="${padLeft + idx * slotW}" y="${padTop}" width="${slotW}" height="${plotH + padBottom}" fill="transparent" />
        
        <!-- Bar Arka Planı (Hover/Seçim için) -->
        <rect x="${x - 3}" y="${padTop}" width="${barW + 6}" height="${plotH}" rx="6" class="chart-bar-slot-bg ${isSelected ? 'active' : ''}" />

        <!-- Sütun (Bar) -->
        ${m.amount > 0 ? `
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" ry="5" fill="${barColor}" class="chart-bar-rect ${isSelected ? 'selected-bar' : ''}" />
        ` : `
          <!-- 0 Tutar Çizgisi -->
          <line x1="${x}" y1="${y0 - 2}" x2="${x + barW}" y2="${y0 - 2}" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round" />
        `}

        ${topLabelHtml}

        <!-- Ay Adı -->
        <text x="${x + barW / 2}" y="${y0 + 18}" text-anchor="middle" class="chart-month-label ${isLatest ? 'latest' : ''} ${isSelected ? 'selected-month' : ''}">
          ${m.shortName}
        </text>
      </g>
    `;
  });

  return `
    <div class="trend-chart-wrapper">
      <svg viewBox="0 0 ${svgW} ${svgH}" class="trend-chart-svg" preserveAspectRatio="xMidYMid meet">
        ${gridHtml}
        ${barsHtml}
      </svg>
    </div>
  `;
}

// Ana Analiz Görünümü Render Motoru
function renderStatsView(legacyTxs, legacyTotalExpense) {
  const container = document.getElementById('subView_stats');
  if (!container) return;
  if (!walletState) loadWalletState();

  const isCompare = walletAnalyticsState.mode === 'compare';
  const currentYear = currentWalletDate.getFullYear();
  const currentMonthIdx = currentWalletDate.getMonth();
  const currentMonthName = getMonthNameTR(currentMonthIdx);

  // Ortak Header (Mod Seçici: Kıyaslama vs Zaman & Geçmiş Trendi)
  let html = `
    <div class="analytics-container">
      <div class="analytics-header-card">
        <div class="analytics-mode-switcher">
          <button type="button" class="analytics-mode-btn ${isCompare ? 'active' : ''}" onclick="setAnalyticsMode('compare')">
            <span>📊</span> Kıyaslama & Dağılım
          </button>
          <button type="button" class="analytics-mode-btn ${!isCompare ? 'active' : ''}" onclick="setAnalyticsMode('trend')">
            <span>📈</span> Zaman & Geçmiş Trendi
          </button>
        </div>
      </div>
  `;

  if (isCompare) {
    // ==========================================================
    // MOD 1: KIYASLAMA & DAĞILIM (Kategoriler veya Alt Başlıklar)
    // ==========================================================
    const compareType = walletAnalyticsState.compareType;
    const comparePeriod = walletAnalyticsState.comparePeriod;
    const compareScope = walletAnalyticsState.compareScope;
    const isCategoryScope = compareScope === 'categories';

    // 1. Dönem Filtreleme
    let filteredTxs = [];
    let periodLabel = '';
    const mStr = String(currentMonthIdx + 1).padStart(2, '0');
    const monthKey = `${currentYear}-${mStr}`;

    if (comparePeriod === 'month') {
      filteredTxs = walletState.transactions.filter(t => t.type === compareType && t.date.startsWith(monthKey));
      periodLabel = `${currentMonthName} ${currentYear}`;
    } else if (comparePeriod === '3months') {
      const cut = new Date(currentYear, currentMonthIdx - 2, 1);
      const cutStr = `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, '0')}-01`;
      const endD = new Date(currentYear, currentMonthIdx + 1, 0);
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      filteredTxs = walletState.transactions.filter(t => t.type === compareType && t.date >= cutStr && t.date <= endStr);
      periodLabel = 'Son 3 Ay';
    } else if (comparePeriod === '6months') {
      const cut = new Date(currentYear, currentMonthIdx - 5, 1);
      const cutStr = `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, '0')}-01`;
      const endD = new Date(currentYear, currentMonthIdx + 1, 0);
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      filteredTxs = walletState.transactions.filter(t => t.type === compareType && t.date >= cutStr && t.date <= endStr);
      periodLabel = 'Son 6 Ay';
    } else if (comparePeriod === 'year') {
      filteredTxs = walletState.transactions.filter(t => t.type === compareType && t.date.startsWith(String(currentYear)));
      periodLabel = `${currentYear} Yılı`;
    } else if (comparePeriod === 'all') {
      filteredTxs = walletState.transactions.filter(t => t.type === compareType);
      periodLabel = 'Tüm Zamanlar';
    }

    const availableCats = (walletState.categories && walletState.categories[compareType]) ? walletState.categories[compareType] : [];

    html += `
      <!-- Toolbar & Kapsam Kontrolleri -->
      <div class="analytics-card">
        <div class="analytics-toolbar-row">
          <!-- Tür Seçici (Gider / Gelir) -->
          <div class="analytics-pill-group">
            <button type="button" class="analytics-pill-btn ${compareType === 'expense' ? 'active-expense' : ''}" onclick="setAnalyticsCompareType('expense')">
              🔴 Giderler
            </button>
            <button type="button" class="analytics-pill-btn ${compareType === 'income' ? 'active-income' : ''}" onclick="setAnalyticsCompareType('income')">
              🟢 Gelirler
            </button>
          </div>

          <!-- Kapsam Seçici (Kategorileri Kıyasla vs Alt Başlık Kırılımı) -->
          <div class="analytics-pill-group">
            <button type="button" class="analytics-pill-btn ${isCategoryScope ? 'active' : ''}" onclick="setAnalyticsCompareScope('categories')" title="Başlıkları birbiriyle kıyasla">
              🏷️ Başlık Kıyaslama
            </button>
            <button type="button" class="analytics-pill-btn ${!isCategoryScope ? 'active' : ''}" onclick="setAnalyticsCompareScope('subcategories')" title="Bir başlığın alt kırılımlarını incele">
              🔍 Alt Başlık Kırılımı
            </button>
          </div>
        </div>

        <!-- Dönem Seçici Çubuk -->
        <div class="analytics-period-bar">
          <button type="button" class="period-chip ${comparePeriod === 'month' ? 'active' : ''}" onclick="setAnalyticsComparePeriod('month')">
            📅 Bu Ay (${currentMonthName})
          </button>
          <button type="button" class="period-chip ${comparePeriod === '3months' ? 'active' : ''}" onclick="setAnalyticsComparePeriod('3months')">
            Son 3 Ay
          </button>
          <button type="button" class="period-chip ${comparePeriod === '6months' ? 'active' : ''}" onclick="setAnalyticsComparePeriod('6months')">
            Son 6 Ay
          </button>
          <button type="button" class="period-chip ${comparePeriod === 'year' ? 'active' : ''}" onclick="setAnalyticsComparePeriod('year')">
            ${currentYear}
          </button>
          <button type="button" class="period-chip ${comparePeriod === 'all' ? 'active' : ''}" onclick="setAnalyticsComparePeriod('all')">
            Tümü
          </button>
        </div>
    `;

    if (isCategoryScope) {
      // ----------------------------------------------------
      // SENARYO A: BAŞLIKLARI BİRBİRİYLE KIYASLA (Market, Yemek, Fatura...)
      // ----------------------------------------------------
      const selectedIds = walletAnalyticsState.selectedCategoryIds;
      const isFilteredSelection = selectedIds.length > 0;

      // Kategori Çoklu Seçim Çipleri
      html += `
        <div class="analytics-sub-section">
          <div class="analytics-section-title-row">
            <span class="analytics-section-title">Kıyaslanacak Başlıkları Seçin:</span>
            ${isFilteredSelection ? `
              <button type="button" class="btn-clear-chip-filter" onclick="toggleAnalyticsCategoryFilter('all')">
                ✕ Seçimi Sıfırla (Tümü)
              </button>
            ` : ''}
          </div>
          <div class="analytics-chips-wrap">
            <button type="button" class="cat-filter-chip ${!isFilteredSelection ? 'active' : ''}" onclick="toggleAnalyticsCategoryFilter('all')">
              ✓ Tümü (${availableCats.length})
            </button>
      `;

      availableCats.forEach(c => {
        const isCatSelected = selectedIds.includes(c.id);
        html += `
          <button type="button" class="cat-filter-chip ${isCatSelected ? 'active' : ''}" onclick="toggleAnalyticsCategoryFilter('${c.id}')" style="${isCatSelected ? `background: ${c.color}25; border-color: ${c.color}; color: #fff;` : ''}">
            <span>${c.icon}</span> <span>${c.name}</span>
          </button>
        `;
      });

      html += `
          </div>
        </div>
      `;

      // Kategori bazında hesaplama
      let effectiveTxs = filteredTxs;
      if (isFilteredSelection) {
        effectiveTxs = filteredTxs.filter(t => selectedIds.includes(t.categoryId));
      }

      const catTotals = {};
      const catCount = {};
      let totalSum = 0;

      effectiveTxs.forEach(t => {
        catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
        catCount[t.categoryId] = (catCount[t.categoryId] || 0) + 1;
        totalSum += t.amount;
      });

      // Dilimleri ve sıralı listeyi hazırla
      const sortedCatIds = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
      const donutItems = sortedCatIds.map(cId => {
        const cat = availableCats.find(c => c.id === cId) || { name: 'Diğer', icon: '📦', color: '#64748b' };
        const amount = catTotals[cId];
        const pct = totalSum > 0 ? ((amount / totalSum) * 100).toFixed(1) : '0.0';
        return {
          id: cId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          amount,
          pct,
          count: catCount[cId] || 0
        };
      });

      html += `
        <!-- Donut Halka Grafiği -->
        ${generateSvgDonut(donutItems, totalSum, isFilteredSelection ? 'Seçilenler Toplamı' : `${periodLabel} Toplam`, (compareType === 'expense' ? '-' : '+') + formatWalletTL(totalSum))}
      `;

      if (isFilteredSelection) {
        const selectedNames = availableCats.filter(c => selectedIds.includes(c.id)).map(c => c.name).join(', ');
        html += `
          <div class="analytics-filter-badge-banner">
            <span>🎯 <strong>${selectedIds.length} Başlık Kıyaslanıyor:</strong> ${selectedNames}</span>
          </div>
        `;
      }

      // Kategori Kıyaslama Listesi
      if (sortedCatIds.length === 0) {
        html += `
          <div class="empty-state-notice">
            <p>Seçilen dönem ve başlıklarda kayıtlı ${compareType === 'expense' ? 'gider' : 'gelir'} bulunamadı.</p>
          </div>
        `;
      } else {
        html += `<div class="comparison-bar-list">`;
        donutItems.forEach((item, idx) => {
          html += `
            <div class="comparison-card-row">
              <div class="comp-row-header">
                <div class="comp-row-left">
                  <span class="comp-rank-badge" style="background:${item.color}22; color:${item.color}; border:1px solid ${item.color}44;">#${idx + 1}</span>
                  <span class="comp-cat-icon" style="background:${item.color}20; border-color:${item.color}40;">${item.icon}</span>
                  <div class="comp-title-box">
                    <span class="comp-cat-name">${item.name}</span>
                    <span class="comp-cat-subhint">${item.count} işlem • Payı: %${item.pct}</span>
                  </div>
                </div>
                <div class="comp-row-right">
                  <span class="comp-amount" style="color: ${compareType === 'expense' ? '#fff' : 'var(--emerald)'};">
                    ${compareType === 'expense' ? '-' : '+'}${formatWalletTL(item.amount)}
                  </span>
                </div>
              </div>
              <div class="cat-track">
                <div class="cat-fill" style="width: ${item.pct}%; background: ${item.color};"></div>
              </div>
              <div class="comp-action-buttons">
                <button type="button" class="btn-comp-action" onclick="inspectCategorySubBreakdown('${item.id}', '${compareType}')">
                  🔍 Alt Kırılımlarını Gör
                </button>
                <button type="button" class="btn-comp-action highlight" onclick="inspectCategoryTrend('${item.id}', '', '${compareType}')">
                  📈 Geçmiş Trendini Gör
                </button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

    } else {
      // ----------------------------------------------------
      // SENARYO B: BİR BAŞLIĞIN ALT KIRILIMLARINI KIYASLA (Market: BİM, Migros, ŞOK...)
      // ----------------------------------------------------
      let targetCatId = walletAnalyticsState.selectedScopeCatId;
      let targetCat = availableCats.find(c => c.id === targetCatId);
      if (!targetCat && availableCats.length > 0) {
        targetCat = availableCats[0];
        targetCatId = targetCat.id;
        walletAnalyticsState.selectedScopeCatId = targetCatId;
      }

      html += `
        <!-- İncelenen Ana Kategori Seçimi -->
        <div class="analytics-sub-section">
          <span class="analytics-section-title">Alt Kırılımı İncelenecek Başlığı Seçin:</span>
          <div class="analytics-chips-wrap">
      `;

      availableCats.forEach(c => {
        const isSelected = c.id === targetCatId;
        html += `
          <button type="button" class="cat-filter-chip ${isSelected ? 'active' : ''}" onclick="selectAnalyticsScopeCategory('${c.id}')" style="${isSelected ? `background: ${c.color}25; border-color: ${c.color}; color: #fff;` : ''}">
            <span>${c.icon}</span> <span>${c.name}</span>
          </button>
        `;
      });

      html += `
          </div>
        </div>
      `;

      // Hedef kategorinin alt başlıklarını topla
      const catTxs = filteredTxs.filter(t => t.categoryId === targetCatId);
      const subMap = {};
      let catTotal = 0;

      catTxs.forEach(t => {
        const label = (t.subCategory && t.subCategory.trim()) ? t.subCategory.trim() : 'Genel (Alt Başlıksız)';
        if (!subMap[label]) {
          subMap[label] = { label, amount: 0, count: 0, txs: [], isUnassigned: !(t.subCategory && t.subCategory.trim()) };
        }
        subMap[label].amount += t.amount;
        subMap[label].count += 1;
        subMap[label].txs.push(t);
        catTotal += t.amount;
      });

      const sortedSubLabels = Object.keys(subMap).sort((a, b) => subMap[b].amount - subMap[a].amount);
      const subColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b', '#a855f7'];

      const subDonutItems = sortedSubLabels.map((lbl, idx) => {
        const s = subMap[lbl];
        const pct = catTotal > 0 ? ((s.amount / catTotal) * 100).toFixed(1) : '0.0';
        return {
          label: lbl,
          name: lbl,
          amount: s.amount,
          pct,
          count: s.count,
          color: subColors[idx % subColors.length]
        };
      });

      // Başlık Bilgi Bandı
      html += `
        <div class="subcat-hero-card" style="border-left: 4px solid ${targetCat ? targetCat.color : '#3b82f6'};">
          <div class="subcat-hero-left">
            <span class="subcat-hero-icon">${targetCat ? targetCat.icon : '📦'}</span>
            <div>
              <div class="subcat-hero-title">${targetCat ? targetCat.name : ''} Alt Kırılım Analizi</div>
              <div class="subcat-hero-meta">${periodLabel} • ${catTxs.length} İşlem • ${sortedSubLabels.length} Farklı Alt Kalem</div>
            </div>
          </div>
          <button type="button" class="btn-hero-trend" onclick="inspectCategoryTrend('${targetCatId}', '', '${compareType}')">
            📈 Başlık Trendi
          </button>
        </div>

        <!-- Donut Halka Grafiği -->
        ${generateSvgDonut(subDonutItems, catTotal, `${targetCat ? targetCat.name : ''} Toplam`, (compareType === 'expense' ? '-' : '+') + formatWalletTL(catTotal))}
      `;

      if (sortedSubLabels.length === 0) {
        html += `
          <div class="empty-state-notice">
            <p>${targetCat ? targetCat.name : 'Bu başlıkta'} ${periodLabel} döneminde kayıtlı işlem bulunmuyor.</p>
          </div>
        `;
      } else {
        html += `<div class="subcat-breakdown-list">`;
        subDonutItems.forEach((item, idx) => {
          const sData = subMap[item.label];
          const subKey = `${targetCatId}__${item.label}`;
          const isTxOpen = expandedStatsSubCategories.has(subKey);

          let txListHtml = '';
          if (isTxOpen) {
            const sortedTxs = [...sData.txs].sort((a, b) => b.date.localeCompare(a.date));
            txListHtml = `<div class="subcat-tx-mini-list">`;
            sortedTxs.forEach(t => {
              const acc = (walletState.accounts || []).find(a => a.id === t.fromAccountId);
              txListHtml += `
                <div class="subcat-tx-mini-row" onclick="openEditWalletTxModal('${t.id}')" style="cursor: pointer;" title="İşlemi düzenlemek için tıklayın">
                  <div class="subcat-tx-mini-left">
                    <span class="subcat-tx-mini-date">📅 ${formatTurkishDate(t.date)}</span>
                    ${acc ? `<span class="subcat-tx-mini-acc">• ${acc.name}</span>` : ''}
                    ${t.note ? `<span class="subcat-tx-mini-note">(${t.note})</span>` : ''}
                  </div>
                  <span class="subcat-tx-mini-amount">-${formatWalletTL(t.amount)}</span>
                </div>
              `;
            });
            txListHtml += `</div>`;
          }

          html += `
            <div class="subcat-item-card ${isTxOpen ? 'open' : ''}">
              <div class="subcat-item-header">
                <div class="subcat-item-left">
                  <span class="subcat-rank-pill" style="background:${item.color}22; color:${item.color}; border:1px solid ${item.color}44;">#${idx + 1}</span>
                  <div class="subcat-name-box">
                    <span class="subcat-item-title">${item.label}</span>
                    <span class="subcat-item-meta">${item.count} işlem • Kategori içi: %${item.pct}</span>
                  </div>
                </div>
                <div class="subcat-item-right">
                  <span class="subcat-item-val">-${formatWalletTL(item.amount)}</span>
                </div>
              </div>
              <div class="cat-track">
                <div class="cat-fill" style="width: ${item.pct}%; background: ${item.color};"></div>
              </div>
              <div class="subcat-actions-row">
                <button type="button" class="btn-subcat-toggle-txs" onclick="toggleStatsSubCategoryTxList(event, '${subKey.replace(/'/g, "\\'")}')">
                  ${isTxOpen ? '▲ İşlemleri Gizle' : `▼ İşlemleri Gör (${item.count})`}
                </button>
                <button type="button" class="btn-subcat-trend" onclick="inspectCategoryTrend('${targetCatId}', '${sData.isUnassigned ? '__unassigned__' : item.label.replace(/'/g, "\\'")}', '${compareType}')">
                  📈 Bu Kalemin Geçmiş Trendi
                </button>
              </div>
              ${txListHtml}
            </div>
          `;
        });
        html += `</div>`;
      }
    }

    html += `
      </div><!-- End .analytics-card -->
    `;

  } else {
    // ==========================================================
    // MOD 2: ZAMAN & GEÇMİŞ TREND ANALİZİ (Aylar Arası Değişim)
    // ==========================================================
    const trendType = walletAnalyticsState.trendType;
    const trendCatId = walletAnalyticsState.trendCategoryId;
    const trendSubCat = walletAnalyticsState.trendSubCategory;
    const trendRange = walletAnalyticsState.trendRange;
    const selectedMonth = walletAnalyticsState.trendSelectedMonth;

    const availableCats = (walletState.categories && walletState.categories[trendType]) ? walletState.categories[trendType] : [];
    let currentCat = availableCats.find(c => c.id === trendCatId);
    if (!currentCat && availableCats.length > 0) {
      currentCat = availableCats[0];
      walletAnalyticsState.trendCategoryId = currentCat.id;
    }

    // Seçili Kategoriye Ait Alt Başlık Listesi
    const catSubCategories = (currentCat && Array.isArray(currentCat.subcategories)) ? currentCat.subcategories : [];

    // Trend Aylarını Hesapla
    const monthsList = [];
    const now = new Date(currentWalletDate);
    const curY = now.getFullYear();
    const curM = now.getMonth();

    if (trendRange === '6months') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(curY, curM - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        monthsList.push({
          key: `${y}-${String(m + 1).padStart(2, '0')}`,
          year: y,
          monthIdx: m,
          shortName: getMonthNameTR(m).slice(0, 3),
          fullName: `${getMonthNameTR(m)} ${y}`,
          amount: 0,
          count: 0,
          txs: []
        });
      }
    } else if (trendRange === '12months') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(curY, curM - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        monthsList.push({
          key: `${y}-${String(m + 1).padStart(2, '0')}`,
          year: y,
          monthIdx: m,
          shortName: getMonthNameTR(m).slice(0, 3),
          fullName: `${getMonthNameTR(m)} ${y}`,
          amount: 0,
          count: 0,
          txs: []
        });
      }
    } else if (trendRange === 'year') {
      for (let m = 0; m < 12; m++) {
        monthsList.push({
          key: `${curY}-${String(m + 1).padStart(2, '0')}`,
          year: curY,
          monthIdx: m,
          shortName: getMonthNameTR(m).slice(0, 3),
          fullName: `${getMonthNameTR(m)} ${curY}`,
          amount: 0,
          count: 0,
          txs: []
        });
      }
    } else if (trendRange === 'all') {
      const monthKeysSet = new Set();
      walletState.transactions.forEach(t => {
        if (t.date && t.date.length >= 7) monthKeysSet.add(t.date.slice(0, 7));
      });
      const curKey = `${curY}-${String(curM + 1).padStart(2, '0')}`;
      monthKeysSet.add(curKey);
      const sortedKeys = Array.from(monthKeysSet).sort();
      sortedKeys.forEach(k => {
        const [yStr, mStr] = k.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        monthsList.push({
          key: k,
          year: y,
          monthIdx: m,
          shortName: getMonthNameTR(m).slice(0, 3),
          fullName: `${getMonthNameTR(m)} ${y}`,
          amount: 0,
          count: 0,
          txs: []
        });
      });
    }

    // İşlemleri Filtrele
    const allMatchingTxs = walletState.transactions.filter(t => {
      if (t.type !== trendType) return false;
      if (t.categoryId !== trendCatId) return false;
      if (!trendSubCat) return true;
      if (trendSubCat === '__unassigned__') {
        return !t.subCategory || !t.subCategory.trim();
      }
      return t.subCategory && t.subCategory.trim().toLowerCase() === trendSubCat.trim().toLowerCase();
    });

    // Aylara Dağıt
    monthsList.forEach(m => {
      const mTxs = allMatchingTxs.filter(t => t.date.startsWith(m.key));
      m.amount = mTxs.reduce((sum, t) => sum + t.amount, 0);
      m.count = mTxs.length;
      m.txs = mTxs;
    });

    // Metrik Hesaplamaları
    const totalTrendAmount = monthsList.reduce((sum, m) => sum + m.amount, 0);
    const totalTrendCount = monthsList.reduce((sum, m) => sum + m.count, 0);
    const activeMonths = monthsList.filter(m => m.amount > 0);
    const avgAmount = monthsList.length > 0 ? (totalTrendAmount / monthsList.length) : 0;
    const maxVal = Math.max(...monthsList.map(m => m.amount), 0);
    const peakMonth = monthsList.reduce((prev, curr) => (curr.amount > (prev ? prev.amount : 0) ? curr : prev), null);
    const lowestMonth = activeMonths.reduce((prev, curr) => (!prev || curr.amount < prev.amount ? curr : prev), null);

    // Bu Ay vs Geçen Ay Karşılaştırması
    const curMonthKey = `${curY}-${String(curM + 1).padStart(2, '0')}`;
    const curMonthObj = monthsList.find(m => m.key === curMonthKey) || monthsList[monthsList.length - 1];
    
    // Bir önceki ayı bul
    let prevMonthObj = null;
    if (curMonthObj) {
      const prevDate = new Date(curMonthObj.year, curMonthObj.monthIdx - 1, 1);
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      prevMonthObj = monthsList.find(m => m.key === prevKey);
      if (!prevMonthObj) {
        const prevTxs = allMatchingTxs.filter(t => t.date.startsWith(prevKey));
        prevMonthObj = {
          amount: prevTxs.reduce((s, t) => s + t.amount, 0),
          fullName: `${getMonthNameTR(prevDate.getMonth())} ${prevDate.getFullYear()}`
        };
      }
    }

    const curAmount = curMonthObj ? curMonthObj.amount : 0;
    const prevAmount = prevMonthObj ? prevMonthObj.amount : 0;
    const diff = curAmount - prevAmount;
    let pctChange = 0;
    if (prevAmount > 0) {
      pctChange = ((diff / prevAmount) * 100);
    } else if (curAmount > 0) {
      pctChange = 100;
    }

    // Değişim Rozeti
    let diffBadgeHtml = '';
    if (prevAmount === 0 && curAmount === 0) {
      diffBadgeHtml = `<span class="trend-badge-pill neutral">= Harcama yok</span>`;
    } else if (diff === 0) {
      diffBadgeHtml = `<span class="trend-badge-pill neutral">= Geçen ayla aynı</span>`;
    } else if (diff > 0) {
      const isBad = trendType === 'expense';
      diffBadgeHtml = `
        <span class="trend-badge-pill ${isBad ? 'up-bad' : 'up-good'}">
          ▲ +%${pctChange.toFixed(1)} (+${formatWalletTL(diff)})
        </span>
      `;
    } else {
      const isGood = trendType === 'expense';
      diffBadgeHtml = `
        <span class="trend-badge-pill ${isGood ? 'down-good' : 'down-bad'}">
          ▼ -%${Math.abs(pctChange).toFixed(1)} (-${formatWalletTL(Math.abs(diff))})
        </span>
      `;
    }

    html += `
      <!-- Trend Seçici Kontrolleri -->
      <div class="analytics-card">
        <div class="analytics-toolbar-row">
          <div class="analytics-pill-group">
            <button type="button" class="analytics-pill-btn ${trendType === 'expense' ? 'active-expense' : ''}" onclick="setAnalyticsTrendType('expense')">
              🔴 Giderler
            </button>
            <button type="button" class="analytics-pill-btn ${trendType === 'income' ? 'active-income' : ''}" onclick="setAnalyticsTrendType('income')">
              🟢 Gelirler
            </button>
          </div>

          <!-- Trend Zaman Aralığı -->
          <div class="analytics-pill-group">
            <button type="button" class="analytics-pill-btn ${trendRange === '6months' ? 'active' : ''}" onclick="setAnalyticsTrendRange('6months')">
              Son 6 Ay
            </button>
            <button type="button" class="analytics-pill-btn ${trendRange === '12months' ? 'active' : ''}" onclick="setAnalyticsTrendRange('12months')">
              Son 12 Ay
            </button>
            <button type="button" class="analytics-pill-btn ${trendRange === 'year' ? 'active' : ''}" onclick="setAnalyticsTrendRange('year')">
              ${curY} Yılı
            </button>
            <button type="button" class="analytics-pill-btn ${trendRange === 'all' ? 'active' : ''}" onclick="setAnalyticsTrendRange('all')">
              Tümü
            </button>
          </div>
        </div>

        <!-- 1. Kategori Seçimi -->
        <div class="analytics-sub-section">
          <span class="analytics-section-title">1. İncelenecek Ana Başlık:</span>
          <div class="analytics-chips-wrap">
    `;

    availableCats.forEach(c => {
      const isSelected = c.id === trendCatId;
      html += `
        <button type="button" class="cat-filter-chip ${isSelected ? 'active' : ''}" onclick="setAnalyticsTrendCategory('${c.id}')" style="${isSelected ? `background: ${c.color}25; border-color: ${c.color}; color: #fff;` : ''}">
          <span>${c.icon}</span> <span>${c.name}</span>
        </button>
      `;
    });

    html += `
          </div>
        </div>

        <!-- 2. Kapsam / Alt Başlık Seçimi -->
        <div class="analytics-sub-section">
          <span class="analytics-section-title">2. Kapsam (Tüm Başlık veya Spesifik Alt Kalem):</span>
          <div class="analytics-chips-wrap">
            <button type="button" class="cat-filter-chip ${!trendSubCat ? 'active' : ''}" onclick="setAnalyticsTrendSubCategory('')">
              🌟 Tümü (${currentCat ? currentCat.name : ''})
            </button>
    `;

    catSubCategories.forEach(subName => {
      const isSelected = trendSubCat && trendSubCat.toLowerCase() === subName.toLowerCase();
      html += `
        <button type="button" class="cat-filter-chip ${isSelected ? 'active' : ''}" onclick="setAnalyticsTrendSubCategory('${subName.replace(/'/g, "\\'")}')">
          <span>›</span> <span>${subName}</span>
        </button>
      `;
    });

    const isUnassignedSelected = trendSubCat === '__unassigned__';
    html += `
            <button type="button" class="cat-filter-chip ${isUnassignedSelected ? 'active' : ''}" onclick="setAnalyticsTrendSubCategory('__unassigned__')">
              <span>›</span> <span>Genel (Alt Başlıksız)</span>
            </button>
          </div>
        </div>

        <!-- Trend Başlık Özeti -->
        <div class="trend-hero-summary" style="border-left: 4px solid ${currentCat ? currentCat.color : '#3b82f6'};">
          <div class="trend-hero-left">
            <span class="trend-hero-icon">${currentCat ? currentCat.icon : '📈'}</span>
            <div>
              <h3 class="trend-hero-title">
                ${currentCat ? currentCat.name : ''}
                ${trendSubCat ? `<span class="trend-subcat-badge">› ${trendSubCat === '__unassigned__' ? 'Genel (Alt Başlıksız)' : trendSubCat}</span>` : ''}
              </h3>
              <p class="trend-hero-sub">${monthsList.length} Aylık Hareket & Değişim Trendi</p>
            </div>
          </div>
          <div class="trend-hero-right">
            ${diffBadgeHtml}
          </div>
        </div>

        <!-- KPI Metrik Kartları -->
        <div class="trend-kpi-grid">
          <div class="trend-kpi-card">
            <div class="trend-kpi-header">
              <span class="trend-kpi-icon">💰</span>
              <span class="trend-kpi-title">Dönem Toplamı</span>
            </div>
            <div class="trend-kpi-val">${formatWalletTL(totalTrendAmount)}</div>
            <div class="trend-kpi-sub">${totalTrendCount} İşlem Kaydı</div>
          </div>

          <div class="trend-kpi-card">
            <div class="trend-kpi-header">
              <span class="trend-kpi-icon">📊</span>
              <span class="trend-kpi-title">Aylık Ortalama</span>
            </div>
            <div class="trend-kpi-val">${formatWalletTL(avgAmount)}</div>
            <div class="trend-kpi-sub">${monthsList.length} Ay Ortalaması</div>
          </div>

          <div class="trend-kpi-card">
            <div class="trend-kpi-header">
              <span class="trend-kpi-icon">👑</span>
              <span class="trend-kpi-title">Zirve Ay</span>
            </div>
            <div class="trend-kpi-val" style="color: #fbbf24;">${peakMonth && peakMonth.amount > 0 ? formatWalletTL(peakMonth.amount) : '0,00 ₺'}</div>
            <div class="trend-kpi-sub">${peakMonth && peakMonth.amount > 0 ? peakMonth.fullName : 'Kayıt Yok'}</div>
          </div>

          <div class="trend-kpi-card">
            <div class="trend-kpi-header">
              <span class="trend-kpi-icon">📉</span>
              <span class="trend-kpi-title">En Düşük Ay</span>
            </div>
            <div class="trend-kpi-val" style="color: var(--emerald);">${lowestMonth ? formatWalletTL(lowestMonth.amount) : '0,00 ₺'}</div>
            <div class="trend-kpi-sub">${lowestMonth ? lowestMonth.fullName : 'Kayıt Yok'}</div>
          </div>
        </div>

        <!-- Aylık Trend Grafiği -->
        <div class="trend-chart-card">
          <div class="trend-chart-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>📊</span>
              <strong style="font-size:0.85rem; color:#fff;">Aylık Harcama Grafiği</strong>
            </div>
            <span style="font-size:0.7rem; color:var(--text-dim);">Aya dokunarak detayları filtreleyin</span>
          </div>

          ${generateSvgTrendChart(monthsList, maxVal, avgAmount, peakMonth, selectedMonth, currentCat ? currentCat.color : '#f59e0b')}

          ${selectedMonth ? `
            <div class="trend-selected-month-banner">
              <div>
                <span>🔎 Seçili Ay: <strong>${(monthsList.find(m => m.key === selectedMonth) || {}).fullName || selectedMonth}</strong></span>
                <span style="color:#60a5fa; font-weight:800; margin-left:6px;">${formatWalletTL((monthsList.find(m => m.key === selectedMonth) || {}).amount || 0)}</span>
              </div>
              <button type="button" class="btn-clear-month-filter" onclick="selectTrendMonth('${selectedMonth}')">
                ✕ Filtreyi Kaldır (Tüm Dönem)
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Geçmiş Hareketler (İşlem Listesi) -->
        <div class="trend-history-section">
      `;

      // Hangi işlemler gösterilecek?
      let displayTxs = [];
      if (selectedMonth) {
        displayTxs = allMatchingTxs.filter(t => t.date.startsWith(selectedMonth));
      } else {
        const allowedKeys = new Set(monthsList.map(m => m.key));
        displayTxs = allMatchingTxs.filter(t => allowedKeys.has(t.date.slice(0, 7)));
      }
      displayTxs.sort((a, b) => b.date.localeCompare(a.date));

      html += `
        <div class="trend-history-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>📋</span>
            <strong style="font-size:0.88rem; color:#fff;">
              ${selectedMonth ? `${(monthsList.find(m => m.key === selectedMonth) || {}).fullName} İşlemleri` : 'Geçmiş Hareketler'}
            </strong>
          </div>
          <span style="font-size:0.72rem; color:var(--text-dim);">${displayTxs.length} İşlem</span>
        </div>
      `;

      if (displayTxs.length === 0) {
        html += `
          <div class="empty-state-notice" style="padding: 20px;">
            <p>Seçilen dönem ve filtreye ait geçmiş işlem bulunamadı.</p>
          </div>
        `;
      } else {
        html += `<div class="trend-tx-list">`;
        displayTxs.forEach(t => {
          const acc = (walletState.accounts || []).find(a => a.id === t.fromAccountId);
          html += `
            <div class="trend-tx-card" onclick="openEditWalletTxModal('${t.id}')" title="İşlemi düzenlemek için dokunun">
              <div class="trend-tx-left">
                <span class="trend-tx-date">📅 ${formatTurkishDate(t.date)}</span>
                ${(!trendSubCat && t.subCategory) ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''}
                ${acc ? `<span class="trend-tx-acc">• ${acc.name}</span>` : ''}
                ${t.installment ? `<span class="tx-installment-badge">💳 ${t.installment.current}/${t.installment.total} Taksit</span>` : ''}
                ${t.note ? `<span class="trend-tx-note">(${t.note})</span>` : ''}
              </div>
              <div class="trend-tx-right">
                <span class="trend-tx-amount ${trendType === 'expense' ? 'expense' : 'income'}">
                  ${trendType === 'expense' ? '-' : '+'}${formatWalletTL(t.amount)}
                </span>
                <span class="trend-tx-edit-icon" title="Düzenle">✏️</span>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
        </div><!-- End .trend-history-section -->
      </div><!-- End .analytics-card -->
    `;
  }

  html += `
    </div><!-- End .analytics-container -->
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
    if (acc.type === 'credit') {
      const periodData = calculateCreditCardPeriodDebt(acc.id, acc.billingDay || 15);
      const periodDebt = periodData ? periodData.netDebt : 0;
      const rangeText = periodData ? formatCreditCardPeriodRange(periodData.startDate, periodData.endDate) : '';
      const notifDetails = typeof getCreditCardNotificationDetails === 'function'
        ? getCreditCardNotificationDetails(acc)
        : null;
      const isNotifActive = notifDetails && notifDetails.shouldNotify;

      html += `
        <div class="account-card credit-account-card" onclick="openAccountDetailModal('${acc.id}')" title="Bu hesaba ait tüm hareketleri ve detayları görmek için tıklayın">
          <div class="account-info">
            <div class="account-icon">${acc.icon || '💳'}</div>
            <div class="account-title-box">
              <h4>${acc.name}</h4>
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span class="account-type-tag">${getAccountTypeLabel(acc.type)}</span>
                <span class="account-cutoff-pill">📅 Kesim: Ayın ${acc.billingDay || 15}'i</span>
                ${isNotifActive ? `<span class="account-cutoff-pill notif-active" title="Hesap kesim tarihi geldi! Borç ödenene kadar her gün 11:30'da bildirim gönderilir.">🔔 11:30 Bildirim</span>` : ''}
              </div>
            </div>
          </div>

          <div class="account-credit-debt-block">
            <div class="credit-debt-header-row">
              <span class="credit-debt-tag">📋 Dönem Borcu</span>
              ${rangeText ? `<span class="credit-debt-range">${rangeText}</span>` : ''}
            </div>
            <div class="credit-debt-main-row">
              <div class="credit-debt-amount ${periodDebt > 0 ? 'debt-active' : 'debt-zero'}">
                ${formatWalletTL(periodDebt)}
              </div>
              <button type="button" class="btn-account-pay-shortcut" onclick="event.stopPropagation(); openPayCreditCardModal('${acc.id}')" title="Dönem Borcunu Öde">
                💳 Borç Öde
              </button>
            </div>
            <div class="credit-debt-footer-row">
              <span class="credit-total-balance-text">Toplam Bakiye: <strong style="color: ${acc.balance < 0 ? 'var(--rose)' : 'var(--emerald)'};">${formatWalletTL(acc.balance)}</strong></span>
              <div class="credit-mini-actions">
                <button type="button" class="btn-account-mini" onclick="event.stopPropagation(); openAccountDetailModal('${acc.id}')" title="Hareketleri Gör">📋</button>
                <button type="button" class="btn-account-mini" onclick="event.stopPropagation(); openEditAccountModal('${acc.id}')" title="Hesabı Düzenle">✏️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="account-card" onclick="openAccountDetailModal('${acc.id}')" title="Bu hesaba ait tüm hareketleri ve detayları görmek için tıklayın">
          <div class="account-info">
            <div class="account-icon">${acc.icon || '🏦'}</div>
            <div class="account-title-box">
              <h4>${acc.name}</h4>
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span class="account-type-tag">${getAccountTypeLabel(acc.type)}</span>
              </div>
            </div>
          </div>
          <div class="account-right-box">
            <div class="account-balance-box">
              <span style="font-size: 0.66rem; color: var(--text-dim); text-align: right; display: block; margin-bottom: 1px;">Son Tutar</span>
              <div class="account-balance" style="color: ${acc.balance < 0 ? 'var(--rose)' : '#fff'};">
                ${formatWalletTL(acc.balance)}
              </div>
            </div>
            <div class="account-actions-stack">
              <button type="button" class="btn-account-edit" onclick="event.stopPropagation(); openAccountDetailModal('${acc.id}')" title="Hareketleri Gör">
                📋 Hareketler
              </button>
              <button type="button" class="btn-account-edit" onclick="event.stopPropagation(); openEditAccountModal('${acc.id}')" title="Hesabı Düzenle">
                ✏️ Düzenle
              </button>
            </div>
          </div>
        </div>
      `;
    }
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

// --- Kredi Kartı Hesap Kesim Tarihi & Otomatik Borç Hesaplama Yardımcıları ---
function formatTurkishShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10) - 1;
  const shortMonth = getMonthNameTR(m).slice(0, 3);
  return `${d} ${shortMonth}`;
}

function formatCreditCardPeriodRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const p1 = startStr.split('-');
  const p2 = endStr.split('-');
  if (p1[0] !== p2[0]) {
    return `${formatTurkishShortDate(startStr)} ${p1[0]} - ${formatTurkishShortDate(endStr)} ${p2[0]}`;
  }
  return `${formatTurkishShortDate(startStr)} - ${formatTurkishShortDate(endStr)}`;
}

function getCreditCardCutoffInfo(billingDay) {
  const day = parseInt(billingDay) || 15;
  if (day < 1 || day > 31) return null;

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth(); // 0-11
  const currentD = now.getDate();

  const pad = n => String(n).padStart(2, '0');

  function getCutoffDateObj(y, m) {
    const maxDays = new Date(y, m + 1, 0).getDate();
    const actualD = Math.min(day, maxDays);
    const dateStr = `${y}-${pad(m + 1)}-${pad(actualD)}`;
    return { year: y, month: m, day: actualD, dateStr };
  }

  function getNextDayStr(dateStr) {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  let prevCutoff, currCutoff, olderCutoff;

  if (currentD <= day) {
    // Bugün kesim gününden küçük veya eşit: Örn. 6 Kasım, Kesim 15'i
    // Aktif dönem: 16 Ekim - 15 Kasım
    // Önceki dönem: 16 Eylül - 15 Ekim
    let yOld = currentY, mOld = currentM - 2;
    if (mOld < 0) { mOld += 12; yOld--; }
    olderCutoff = getCutoffDateObj(yOld, mOld);

    let yPrev = currentY, mPrev = currentM - 1;
    if (mPrev < 0) { mPrev += 12; yPrev--; }
    prevCutoff = getCutoffDateObj(yPrev, mPrev);

    currCutoff = getCutoffDateObj(currentY, currentM);
  } else {
    // Bugün kesim gününü geçmiş: Örn. 20 Kasım, Kesim 15'i
    // Yeni kesilen dönem: 16 Ekim - 15 Kasım (Son ödeme tarihi yaklaşan ekstre)
    // Yeni başlayan aktif dönem: 16 Kasım - 15 Aralık
    let yOld = currentY, mOld = currentM - 1;
    if (mOld < 0) { mOld += 12; yOld--; }
    olderCutoff = getCutoffDateObj(yOld, mOld);

    prevCutoff = getCutoffDateObj(currentY, currentM);

    let yCurr = currentY, mCurr = currentM + 1;
    if (mCurr > 11) { mCurr -= 12; yCurr++; }
    currCutoff = getCutoffDateObj(yCurr, mCurr);
  }

  const periodA = {
    startDate: getNextDayStr(olderCutoff.dateStr),
    endDate: prevCutoff.dateStr,
    cutoffDate: prevCutoff.dateStr,
    isClosed: true
  };

  const periodB = {
    startDate: getNextDayStr(prevCutoff.dateStr),
    endDate: currCutoff.dateStr,
    cutoffDate: currCutoff.dateStr,
    isClosed: false
  };

  return {
    billingDay: day,
    todayStr: `${currentY}-${pad(currentM + 1)}-${pad(currentD)}`,
    currentD,
    olderCutoff,
    prevCutoff,
    currCutoff,
    periodA,
    periodB
  };
}

function formatTurkishDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parts[0];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d} ${getMonthNameTR(m)} ${y}`;
}

function calculateCreditCardPeriodDebt(accId, billingDay) {
  const info = getCreditCardCutoffInfo(billingDay);
  if (!info) return null;

  const cardAcc = (walletState && walletState.accounts) ? walletState.accounts.find(a => a.id === accId) : null;
  const txs = (walletState && walletState.transactions) || [];

  function getStatsForRange(startDate, endDate) {
    let spent = 0;
    let payments = 0;
    const items = [];

    txs.forEach(tx => {
      if (tx.date >= startDate && tx.date <= endDate) {
        if (tx.fromAccountId === accId && tx.type === 'expense') {
          spent += tx.amount;
          items.push(tx);
        } else if (tx.fromAccountId === accId && tx.type === 'transfer') {
          spent += tx.amount;
          items.push(tx);
        } else if (tx.toAccountId === accId && tx.type === 'transfer') {
          payments += tx.amount;
          items.push(tx);
        } else if (tx.fromAccountId === accId && tx.type === 'income') {
          payments += tx.amount;
          items.push(tx);
        }
      }
    });

    // Ayrıca dönem sonrasından bugüne kadar karta yapılan ödemeler varsa onları da düş
    txs.forEach(tx => {
      if (tx.date > endDate && tx.date <= info.todayStr) {
        if (tx.toAccountId === accId && tx.type === 'transfer') {
          payments += tx.amount;
        } else if (tx.fromAccountId === accId && tx.type === 'income') {
          payments += tx.amount;
        }
      }
    });

    spent = Math.round(spent * 100) / 100;
    payments = Math.round(payments * 100) / 100;
    const net = Math.max(0, Math.round((spent - payments) * 100) / 100);

    return { spent, payments, net, items, startDate, endDate };
  }

  const statsA = getStatsForRange(info.periodA.startDate, info.periodA.endDate);
  const statsB = getStatsForRange(info.periodB.startDate, info.periodB.endDate);

  // Aktif dönem seçimi:
  // Kesim günü geçmişse ve son kesilen ekstrenin (statsA) ödenmemiş borcu varsa onu göster,
  // aksi halde güncel aktif dönemi (statsB) göster
  let activeStats, activePeriod;
  if (info.currentD > info.billingDay && statsA.net > 0) {
    activeStats = statsA;
    activePeriod = info.periodA;
    activePeriod.label = 'Son Kesilen Ekstre';
  } else {
    activeStats = statsB;
    activePeriod = info.periodB;
    activePeriod.label = 'Güncel Dönem';
  }

  let netDebt = activeStats.net;
  if (cardAcc) {
    if (cardAcc.balance >= 0) {
      netDebt = 0;
    } else {
      const totalCardDebt = Math.abs(cardAcc.balance);
      netDebt = Math.min(netDebt, totalCardDebt);
    }
  }
  netDebt = Math.round(netDebt * 100) / 100;

  return {
    info,
    activePeriod,
    startDate: activePeriod.startDate,
    endDate: activePeriod.endDate,
    totalSpent: activeStats.spent,
    totalPayments: activeStats.payments,
    netDebt: netDebt,
    periodTxs: activeStats.items,
    statsA,
    statsB
  };
}

function updateCreditCardCutoffPreview(accId, billingDay, autoApplyBalance = true) {
  const container = document.getElementById('creditCardCutoffSummary');
  if (!container) return;

  const day = parseInt(billingDay);
  if (!day || day < 1 || day > 31) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const result = calculateCreditCardPeriodDebt(accId, day);
  if (!result) {
    container.style.display = 'none';
    return;
  }

  const { info, totalSpent, totalPayments, netDebt, periodTxs, startDate, endDate } = result;
  const rangeStr = formatCreditCardPeriodRange(startDate, endDate);

  // Otomatik bakiye alanına borç olarak yazma (kredi kartı borcu eksi bakiye temsil edilir)
  if (autoApplyBalance) {
    const balanceInput = document.getElementById('inputAccountBalance');
    if (balanceInput) {
      balanceInput.value = netDebt === 0 ? '0' : (-netDebt).toFixed(2);
    }
  }

  let html = `
    <div class="cutoff-header">
      <span class="cutoff-badge">💳 Dönem Borç Hesabı</span>
      <span class="cutoff-date-info">Dönem: <strong>${rangeStr}</strong></span>
    </div>
    <div class="cutoff-body">
      <div class="cutoff-stat-row">
        <span>İki Kesim Arası Toplam Harcama:</span>
        <strong class="cutoff-spent-amount">${formatWalletTL(totalSpent)}</strong>
      </div>
      ${totalPayments > 0 ? `
      <div class="cutoff-stat-row" style="color: var(--emerald);">
        <span>Dönem İçi Ödeme / İade:</span>
        <span>-${formatWalletTL(totalPayments)}</span>
      </div>
      ` : ''}
      <div class="cutoff-divider"></div>
      <div class="cutoff-stat-row cutoff-total-row">
        <span>Net Dönem Borcu:</span>
        <strong class="cutoff-debt-amount">${formatWalletTL(netDebt)}</strong>
      </div>
      <div class="cutoff-auto-applied-note">
        <span>✓ Borç tutarı (-${formatWalletTL(netDebt)}) bakiye alanına yazıldı.</span>
      </div>
      <button type="button" class="cutoff-recalc-btn" onclick="applyCutoffDebtToBalance(${netDebt})">
        🔄 Borcu Bakiyeye Tekrar Yaz
      </button>
    </div>
  `;

  if (periodTxs.length > 0) {
    html += `
      <details class="cutoff-tx-details">
        <summary>📋 ${periodTxs.length} Adet Dönem İçi Hareketi İncele</summary>
        <div class="cutoff-tx-list">
          ${periodTxs.map(t => {
            const isOutflow = t.type === 'expense' || (t.type === 'transfer' && t.fromAccountId === accId);
            return `
              <div class="cutoff-tx-item">
                <span class="cutoff-tx-date">${t.date}</span>
                <span class="cutoff-tx-note">${t.note || (t.type === 'transfer' ? 'Transfer' : 'Harcama')}</span>
                <span class="cutoff-tx-val ${isOutflow ? 'negative' : 'positive'}">
                  ${isOutflow ? '-' : '+'}${formatWalletTL(t.amount)}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </details>
    `;
  } else {
    html += `
      <div class="cutoff-no-tx">Bu hesap kesim döneminde (${rangeStr}) kayıtlı harcama bulunmuyor.</div>
    `;
  }

  container.innerHTML = html;
  container.style.display = 'flex';
}

function applyCutoffDebtToBalance(netDebt) {
  const balanceInput = document.getElementById('inputAccountBalance');
  if (balanceInput) {
    balanceInput.value = netDebt === 0 ? '0' : (-netDebt).toFixed(2);
    balanceInput.focus();
  }
}

function handleAccountBillingDayChange() {
  const accId = document.getElementById('inputAccountId').value;
  const billingDay = parseInt(document.getElementById('inputAccountBillingDay').value);
  updateCreditCardCutoffPreview(accId, billingDay, true);
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

  const billingDayGroup = document.getElementById('groupAccountBillingDay');
  if (billingDayGroup) billingDayGroup.style.display = 'none';
  const billingDayInput = document.getElementById('inputAccountBillingDay');
  if (billingDayInput) billingDayInput.value = '15';
  const summaryEl = document.getElementById('creditCardCutoffSummary');
  if (summaryEl) summaryEl.style.display = 'none';

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

  const billingDayGroup = document.getElementById('groupAccountBillingDay');
  const billingDayInput = document.getElementById('inputAccountBillingDay');
  const summaryEl = document.getElementById('creditCardCutoffSummary');

  if (acc.type === 'credit') {
    const billingDay = acc.billingDay || 15;
    if (billingDayGroup) billingDayGroup.style.display = 'block';
    if (billingDayInput) billingDayInput.value = billingDay;
    updateCreditCardCutoffPreview(acc.id, billingDay, true);
  } else {
    if (billingDayGroup) billingDayGroup.style.display = 'none';
    if (billingDayInput) billingDayInput.value = '15';
    if (summaryEl) summaryEl.style.display = 'none';
  }

  const delBtn = document.getElementById('btnDeleteAccount');
  if (delBtn) delBtn.style.display = 'inline-flex';

  modal.showModal();
}

// --- Hesap Hareketleri & Detay Modalı Durum ve Fonksiyonları ---
let activeAccountDetailId = null;
let activeAccountDetailFilter = 'all';

function getAccountMovementStats(accId) {
  const txs = (walletState && walletState.transactions) || [];
  const accountTxs = txs.filter(t => t.fromAccountId === accId || t.toAccountId === accId);

  let totalIn = 0;
  let totalOut = 0;

  const now = new Date();
  const curY = now.getFullYear();
  const curM = String(now.getMonth() + 1).padStart(2, '0');
  const curMonthPrefix = `${curY}-${curM}`;

  let monthIn = 0;
  let monthOut = 0;
  let monthCount = 0;

  accountTxs.forEach(t => {
    const isThisMonth = t.date && t.date.startsWith(curMonthPrefix);
    if (isThisMonth) monthCount++;

    if (t.type === 'expense' && t.fromAccountId === accId) {
      totalOut += t.amount;
      if (isThisMonth) monthOut += t.amount;
    } else if (t.type === 'transfer' && t.fromAccountId === accId) {
      totalOut += t.amount;
      if (isThisMonth) monthOut += t.amount;
    } else if (t.type === 'income' && t.fromAccountId === accId) {
      totalIn += t.amount;
      if (isThisMonth) monthIn += t.amount;
    } else if (t.type === 'transfer' && t.toAccountId === accId) {
      totalIn += t.amount;
      if (isThisMonth) monthIn += t.amount;
    }
  });

  totalIn = Math.round(totalIn * 100) / 100;
  totalOut = Math.round(totalOut * 100) / 100;
  const netDiff = Math.round((totalIn - totalOut) * 100) / 100;

  return {
    accountTxs,
    txCount: accountTxs.length,
    totalIn,
    totalOut,
    netDiff,
    monthIn: Math.round(monthIn * 100) / 100,
    monthOut: Math.round(monthOut * 100) / 100,
    monthNet: Math.round((monthIn - monthOut) * 100) / 100,
    monthCount
  };
}

function openAccountDetailModal(accId, filterType = 'all') {
  const modal = document.getElementById('modalAccountDetail');
  if (!modal) return;

  const acc = walletState.accounts.find(a => a.id === accId);
  if (!acc) return;

  activeAccountDetailId = accId;
  activeAccountDetailFilter = filterType;

  // Başlık ve İkon
  const iconEl = document.getElementById('accountDetailIcon');
  if (iconEl) iconEl.textContent = acc.icon || '💳';
  const titleEl = document.getElementById('accountDetailTitle');
  if (titleEl) titleEl.textContent = acc.name;
  const typeBadgeEl = document.getElementById('accountDetailTypeBadge');
  if (typeBadgeEl) typeBadgeEl.textContent = getAccountTypeLabel(acc.type);

  const cutoffBadgeEl = document.getElementById('accountDetailCutoffBadge');
  if (cutoffBadgeEl) {
    if (acc.type === 'credit' && acc.billingDay) {
      cutoffBadgeEl.textContent = `📅 Kesim: Ayın ${acc.billingDay}'i`;
      cutoffBadgeEl.style.display = 'inline-flex';
    } else {
      cutoffBadgeEl.style.display = 'none';
    }
  }

  // İstatistikleri hesapla
  const stats = getAccountMovementStats(accId);

  // Kredi kartı için hesap kesim borç analizi
  let creditInfoHtml = '';
  if (acc.type === 'credit') {
    const billingDay = acc.billingDay || 15;
    const creditDebtData = calculateCreditCardPeriodDebt(accId, billingDay);
    if (creditDebtData) {
      const rangeText = formatCreditCardPeriodRange(creditDebtData.startDate, creditDebtData.endDate);
      const notifDetails = typeof getCreditCardNotificationDetails === 'function'
        ? getCreditCardNotificationDetails(acc)
        : null;

      let notifCalloutHtml = '';
      if (notifDetails && notifDetails.shouldNotify) {
        notifCalloutHtml = `
          <div class="cutoff-notif-callout active">
            🔔 <strong>Hesap Kesim Bildirimi Aktif:</strong> Bu kartın hesap kesim tarihi gelmiştir. Borç (<strong>${formatWalletTL(notifDetails.debt)}</strong>) ödenene kadar her gün saat <strong>11:30</strong>'da telefonunuza bildirim gönderilecektir.
          </div>
        `;
      } else if (notifDetails && notifDetails.debt > 0) {
        notifCalloutHtml = `
          <div class="cutoff-notif-callout waiting">
            ⏳ <strong>Dönem İçi Harcama:</strong> Hesap kesim tarihi (Ayın ${acc.billingDay || 15}'i) geldiğinde borç ödenene kadar her gün saat 11:30'da bildirim başlayacaktır.
          </div>
        `;
      }

      creditInfoHtml = `
        <div class="account-credit-info-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="min-width: 0; flex: 1;">
              <div>
                <strong>📅 Hesap Kesim Dönemi:</strong> <span>${rangeText}</span>
              </div>
              <div style="margin-top: 4px;">
                <strong>Dönem İçi Harcanan:</strong> <span style="color:var(--rose); font-weight:700;">${formatWalletTL(creditDebtData.totalSpent)}</span>
                ${creditDebtData.totalPayments > 0 ? ` | <strong>Ödenen:</strong> <span style="color:var(--emerald); font-weight:700;">${formatWalletTL(creditDebtData.totalPayments)}</span>` : ''}
              </div>
              <div style="margin-top: 4px;">
                <strong>Dönem Borcu:</strong> <span style="color:${creditDebtData.netDebt > 0 ? 'var(--rose)' : 'var(--emerald)'}; font-weight:800;">${formatWalletTL(creditDebtData.netDebt)}</span>
              </div>
            </div>
            <button type="button" class="btn-acc-pay-inline" onclick="openPayCreditCardModal('${acc.id}')" title="Bu kartın borcunu öde">
              💳 Borç Öde
            </button>
          </div>
          ${notifCalloutHtml}
        </div>
      `;
    }
  }

  // Özet / Son Tutar Hero Kartı
  const statsContainer = document.getElementById('accountDetailStatsContainer');
  if (statsContainer) {
    const isDebt = acc.balance < 0;
    statsContainer.innerHTML = `
      <div class="account-stat-hero">
        <div class="account-stat-hero-top">
          <div>
            <div class="account-stat-hero-label">Hesaplanan Son Tutar / Bakiye</div>
            <div class="account-stat-hero-amount" style="color: ${isDebt ? 'var(--rose)' : 'var(--emerald)'};">
              ${formatWalletTL(acc.balance)}
            </div>
          </div>
          <span class="account-type-tag" style="font-size:0.75rem;">${isDebt ? 'Borçlu Durum' : 'Pozitif Varlık'}</span>
        </div>

        <div class="account-stat-grid">
          <div class="account-mini-stat">
            <span class="account-mini-stat-label">Toplam Giriş</span>
            <span class="account-mini-stat-val income">+${formatWalletTL(stats.totalIn)}</span>
          </div>
          <div class="account-mini-stat">
            <span class="account-mini-stat-label">Toplam Çıkış</span>
            <span class="account-mini-stat-val expense">-${formatWalletTL(stats.totalOut)}</span>
          </div>
        </div>
        ${creditInfoHtml}
      </div>
    `;
  }

  // Hızlı Eylemler Çubuğu
  const actionsBar = document.getElementById('accountDetailActionButtons');
  if (actionsBar) {
    if (acc.type === 'credit') {
      actionsBar.innerHTML = `
        <button type="button" class="btn-acc-action pay-card-debt full-span" onclick="openPayCreditCardModal('${acc.id}')">
          💳 Kart Borcu Öde
        </button>
        <button type="button" class="btn-acc-action primary" onclick="openAddTxForAccount('${acc.id}')">
          ➕ Harcama Ekle
        </button>
        <button type="button" class="btn-acc-action" onclick="openEditAccountModal('${acc.id}')">
          ✏️ Kartı Düzenle
        </button>
        <button type="button" class="btn-acc-action recalc full-span" onclick="syncAccountBalanceWithMovements('${acc.id}')" title="İşlem hareketlerini toplayıp bakiyeyi eşitler">
          🔄 Bakiyeyi Hareketlere Göre Eşitle
        </button>
      `;
    } else {
      actionsBar.innerHTML = `
        <button type="button" class="btn-acc-action primary" onclick="openAddTxForAccount('${acc.id}')">
          ➕ İşlem Ekle
        </button>
        <button type="button" class="btn-acc-action" onclick="openEditAccountModal('${acc.id}')">
          ✏️ Hesabı Düzenle
        </button>
        <button type="button" class="btn-acc-action recalc full-span" onclick="syncAccountBalanceWithMovements('${acc.id}')" title="İşlem hareketlerini toplayıp bakiyeyi eşitler">
          🔄 Bakiyeyi Hareketlere Göre Eşitle
        </button>
      `;
    }
  }

  // Filtreler
  renderAccountTxFilters(acc, stats, filterType);

  // Hareketler Listesi
  renderAccountTxList(acc, stats, filterType);

  modal.showModal();
}

function renderAccountTxFilters(acc, stats, activeFilter) {
  const filterBar = document.getElementById('accountTxFilterBar');
  if (!filterBar) return;

  const expCount = stats.accountTxs.filter(t => t.type === 'expense' && t.fromAccountId === acc.id).length;
  const incCount = stats.accountTxs.filter(t => (t.type === 'income' && t.fromAccountId === acc.id) || (t.type === 'transfer' && t.toAccountId === acc.id)).length;
  const transCount = stats.accountTxs.filter(t => t.type === 'transfer').length;

  filterBar.innerHTML = `
    <button type="button" class="acc-filter-chip ${activeFilter === 'all' ? 'active' : ''}" onclick="filterAccountDetail('${acc.id}', 'all')">
      Tümü
    </button>
    <button type="button" class="acc-filter-chip ${activeFilter === 'month' ? 'active' : ''}" onclick="filterAccountDetail('${acc.id}', 'month')">
      Bu Ay
    </button>
    <button type="button" class="acc-filter-chip ${activeFilter === 'expense' ? 'active' : ''}" onclick="filterAccountDetail('${acc.id}', 'expense')">
      Giderler
    </button>
    <button type="button" class="acc-filter-chip ${activeFilter === 'income' ? 'active' : ''}" onclick="filterAccountDetail('${acc.id}', 'income')">
      Gelirler / Giriş
    </button>
    <button type="button" class="acc-filter-chip ${activeFilter === 'transfer' ? 'active' : ''}" onclick="filterAccountDetail('${acc.id}', 'transfer')">
      Transferler
    </button>
  `;
}

function filterAccountDetail(accId, filterType) {
  activeAccountDetailFilter = filterType;
  const acc = walletState.accounts.find(a => a.id === accId);
  if (!acc) return;
  const stats = getAccountMovementStats(accId);
  renderAccountTxFilters(acc, stats, filterType);
  renderAccountTxList(acc, stats, filterType);
}

function renderAccountTxList(acc, stats, filterType) {
  const listEl = document.getElementById('accountDetailTxList');
  if (!listEl) return;

  const now = new Date();
  const curMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let filtered = [...stats.accountTxs];
  if (filterType === 'month') {
    filtered = filtered.filter(t => t.date && t.date.startsWith(curMonthPrefix));
  } else if (filterType === 'expense') {
    filtered = filtered.filter(t => t.type === 'expense' && t.fromAccountId === acc.id);
  } else if (filterType === 'income') {
    filtered = filtered.filter(t => (t.type === 'income' && t.fromAccountId === acc.id) || (t.type === 'transfer' && t.toAccountId === acc.id));
  } else if (filterType === 'transfer') {
    filtered = filtered.filter(t => t.type === 'transfer');
  }

  // Tarihe göre sırala
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="account-empty-state">
        <div style="font-size: 1.8rem; margin-bottom: 6px;">📂</div>
        <div>Bu filtreye uygun kayıtlı işlem hareketi bulunamadı.</div>
      </div>
    `;
    return;
  }

  const expCats = (walletState.categories && walletState.categories.expense) || [];
  const incCats = (walletState.categories && walletState.categories.income) || [];
  const allCats = [...expCats, ...incCats];

  let html = '';
  filtered.forEach(t => {
    let icon = '💵';
    let catTitle = 'İşlem';
    let isOutflow = false;

    if (t.type === 'transfer') {
      icon = '🔄';
      const fromAcc = walletState.accounts.find(a => a.id === t.fromAccountId);
      const toAcc = walletState.accounts.find(a => a.id === t.toAccountId);
      if (t.fromAccountId === acc.id) {
        isOutflow = true;
        catTitle = `Transfer ➔ ${toAcc ? toAcc.name : 'Hesap'}`;
      } else {
        isOutflow = false;
        catTitle = `Transfer 🠔 ${fromAcc ? fromAcc.name : 'Hesap'}`;
      }
    } else {
      const catObj = allCats.find(c => c.id === t.categoryId);
      if (catObj) {
        icon = catObj.icon || '🏷️';
        catTitle = catObj.name;
      }
      isOutflow = (t.type === 'expense');
    }

    const sign = isOutflow ? '-' : '+';
    const amountCls = isOutflow ? 'expense' : 'income';

    html += `
      <div class="account-tx-card">
        <div class="account-tx-left">
          <div class="account-tx-icon">${icon}</div>
          <div class="account-tx-info">
            <span class="account-tx-title">${catTitle}</span>
            <div class="account-tx-sub">
              <span>📅 ${formatTurkishDate(t.date)}</span>
              ${t.subCategory ? `<span class="tx-subcat-badge">› ${t.subCategory}</span>` : ''}
              ${t.installment ? `<span class="tx-installment-badge">💳 ${t.installment.current}/${t.installment.total}</span>` : ''}
              ${t.note ? `<span style="color:var(--text-muted);">(${t.note})</span>` : ''}
            </div>
          </div>
        </div>
        <div class="account-tx-right">
          <span class="account-tx-amount ${amountCls}">
            ${sign}${formatWalletTL(t.amount)}
          </span>
          <div class="wallet-tx-actions">
            <button type="button" class="btn-tx-action btn-tx-edit" onclick="openEditWalletTxModal('${t.id}')" title="Düzenle">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-tx-action btn-tx-delete" onclick="deleteWalletTx('${t.id}')" title="Sil">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function openAddTxForAccount(accId) {
  openAddWalletTxModal();
  setTimeout(() => {
    const fromSelect = document.getElementById('selectWalletFromAccount');
    if (fromSelect && accId) fromSelect.value = accId;
  }, 50);
}

// --- Kredi Kartı Borcu Ödeme Modal Sistemi ---
function openPayCreditCardModal(cardId) {
  const cardAcc = walletState.accounts.find(a => a.id === cardId);
  if (!cardAcc) return;

  const modal = document.getElementById('modalPayCreditCard');
  if (!modal) return;

  // Hata kutusunu temizle
  const errorEl = document.getElementById('payCardErrorMsg');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  // Hedef kart bilgilerini yerleştir
  document.getElementById('inputPayCardTargetAccountId').value = cardId;
  const iconEl = document.getElementById('payCardBannerIcon');
  if (iconEl) iconEl.textContent = cardAcc.icon || '💳';
  const nameEl = document.getElementById('payCardBannerName');
  if (nameEl) nameEl.textContent = cardAcc.name;

  // Borç hesaplamaları (Dönem Borcu ve Toplam Borç)
  const totalDebt = Math.max(0, -cardAcc.balance);
  let periodDebt = 0;
  let periodRangeStr = '';
  if (cardAcc.billingDay) {
    const periodData = calculateCreditCardPeriodDebt(cardId, cardAcc.billingDay);
    if (periodData) {
      periodDebt = periodData.netDebt;
      periodRangeStr = formatCreditCardPeriodRange(periodData.startDate, periodData.endDate);
    }
  }

  const subEl = document.getElementById('payCardBannerSub');
  if (subEl) {
    if (cardAcc.billingDay) {
      subEl.textContent = `Dönem Borcu: ${formatWalletTL(periodDebt)}${periodRangeStr ? ' (' + periodRangeStr + ')' : ''}`;
    } else {
      subEl.textContent = `Toplam Borç: ${formatWalletTL(totalDebt)}`;
    }
  }

  const badgeEl = document.getElementById('payCardBannerDebtBadge');
  if (badgeEl) {
    badgeEl.textContent = `Toplam Bakiye: ${formatWalletTL(cardAcc.balance)}`;
    badgeEl.style.color = cardAcc.balance < 0 ? 'var(--rose)' : 'var(--emerald)';
  }

  // Kaynak hesapları doldur (ödemenin yapılacağı hesap)
  const selectSource = document.getElementById('selectPayCardSourceAccount');
  if (selectSource) {
    selectSource.innerHTML = '';
    const otherAccounts = walletState.accounts.filter(a => a.id !== cardId);

    // Vadesiz banka ve nakit hesaplarını öne al, bakiyeye göre sırala
    otherAccounts.sort((a, b) => {
      if (a.type === 'bank' && b.type !== 'bank') return -1;
      if (b.type === 'bank' && a.type !== 'bank') return 1;
      return b.balance - a.balance;
    });

    otherAccounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = `${acc.icon || '🏦'} ${acc.name} (${formatWalletTL(acc.balance)})`;
      selectSource.appendChild(opt);
    });

    // Pozitif bakiyeli ilk hesabı seç, yoksa ilk hesabı seç
    const positiveAcc = otherAccounts.find(a => a.balance > 0 && a.type !== 'credit');
    if (positiveAcc) {
      selectSource.value = positiveAcc.id;
    } else if (otherAccounts.length > 0) {
      selectSource.value = otherAccounts[0].id;
    }

    updatePayCardSourceHint();
  }

  // Ödeme tarihi bugüne ayarlansın
  const dateInput = document.getElementById('inputPayCardDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Açıklama varsayılanı
  const noteInput = document.getElementById('inputPayCardNote');
  if (noteInput) {
    noteInput.value = `${cardAcc.name} Dönem Borcu Ödemesi`;
  }

  // Tutar alanı: Doğrudan dönem borcu (yoksa toplam borç) prefill edilsin
  const amountInput = document.getElementById('inputPayCardAmount');
  let defaultAmount = periodDebt > 0 ? periodDebt : (totalDebt > 0 ? totalDebt : '');
  if (amountInput) {
    amountInput.value = defaultAmount > 0 ? defaultAmount.toFixed(2) : '';
  }

  renderPayCardQuickChips(periodDebt, totalDebt);

  modal.showModal();

  // Modal açıldığında tutar alanına odaklanıp seç
  setTimeout(() => {
    if (amountInput) {
      amountInput.focus();
      amountInput.select();
    }
  }, 60);
}

function updatePayCardSourceHint() {
  const selectSource = document.getElementById('selectPayCardSourceAccount');
  const hintEl = document.getElementById('payCardSourceBalanceHint');
  if (!selectSource || !hintEl) return;

  const acc = walletState.accounts.find(a => a.id === selectSource.value);
  if (acc) {
    hintEl.innerHTML = `Seçili hesap bakiyesi: <strong style="color: ${acc.balance >= 0 ? 'var(--emerald)' : 'var(--rose)'};">${formatWalletTL(acc.balance)}</strong> (${getAccountTypeLabel(acc.type)})`;
  } else {
    hintEl.innerHTML = '';
  }
}

function renderPayCardQuickChips(periodDebt, totalDebt) {
  const container = document.getElementById('payCardQuickChips');
  if (!container) return;
  container.innerHTML = '';

  const chips = [];

  if (periodDebt > 0) {
    chips.push({
      label: `📋 Dönem Borcu (${formatWalletTL(periodDebt)})`,
      amount: periodDebt
    });
  }

  if (totalDebt > 0 && Math.abs(totalDebt - periodDebt) > 0.01) {
    chips.push({
      label: `💳 Toplam Borç (${formatWalletTL(totalDebt)})`,
      amount: totalDebt
    });
  }

  // Asgari ödeme (%20 ve %40)
  const baseDebt = periodDebt > 0 ? periodDebt : totalDebt;
  if (baseDebt > 0) {
    const min20 = Math.round(baseDebt * 0.20 * 100) / 100;
    const min40 = Math.round(baseDebt * 0.40 * 100) / 100;
    if (min20 >= 1) {
      chips.push({
        label: `⚡ %20 Asgari (${formatWalletTL(min20)})`,
        amount: min20
      });
    }
    if (min40 >= 1 && min40 !== min20) {
      chips.push({
        label: `⚡ %40 Asgari (${formatWalletTL(min40)})`,
        amount: min40
      });
    }
  }

  if (chips.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  chips.forEach((c, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quick-pay-chip-btn ${index === 0 ? 'active' : ''}`;
    btn.textContent = c.label;
    btn.onclick = () => {
      const amountInput = document.getElementById('inputPayCardAmount');
      if (amountInput) {
        amountInput.value = c.amount.toFixed(2);
        amountInput.focus();
      }
      container.querySelectorAll('.quick-pay-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    container.appendChild(btn);
  });
}

function handlePayCreditCardSubmit(e) {
  e.preventDefault();

  const errorEl = document.getElementById('payCardErrorMsg');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  const showPayError = (msg) => {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  };

  const targetCardId = document.getElementById('inputPayCardTargetAccountId').value;
  const sourceAccountId = document.getElementById('selectPayCardSourceAccount').value;
  const amountInput = document.getElementById('inputPayCardAmount');
  const dateInput = document.getElementById('inputPayCardDate');
  const noteInput = document.getElementById('inputPayCardNote');

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) {
    showPayError('Lütfen geçerli bir ödeme tutarı giriniz.');
    amountInput.focus();
    return;
  }

  if (!sourceAccountId) {
    showPayError('Lütfen ödemenin yapılacağı kaynak hesabı seçiniz.');
    return;
  }

  if (sourceAccountId === targetCardId) {
    showPayError('Kaynak ve hedef kart aynı olamaz!');
    return;
  }

  const sourceAcc = walletState.accounts.find(a => a.id === sourceAccountId);
  const cardAcc = walletState.accounts.find(a => a.id === targetCardId);

  if (!sourceAcc || !cardAcc) {
    showPayError('Hesap bulunamadı!');
    return;
  }

  const dateVal = dateInput.value || new Date().toISOString().split('T')[0];
  const noteVal = noteInput.value.trim() || `${cardAcc.name} Dönem Borcu Ödemesi`;

  // 1. Yeni Transfer İşlemi Oluştur (Kaynak -> Kredi Kartı)
  const newTx = {
    id: 'wtx_' + Date.now(),
    type: 'transfer',
    amount: amount,
    fromAccountId: sourceAccountId,
    toAccountId: targetCardId,
    categoryId: '',
    subCategory: '',
    date: dateVal,
    note: noteVal
  };

  // 2. Bakiyeleri Güncelle
  sourceAcc.balance = Math.round((sourceAcc.balance - amount) * 100) / 100;
  cardAcc.balance = Math.round((cardAcc.balance + amount) * 100) / 100;

  // 3. İşlemi ekle ve tarihe göre sırala
  walletState.transactions.push(newTx);
  walletState.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. Durumu kaydet ve arayüzü güncelle
  saveWalletState();
  renderWalletUI();

  // 5. Modalı kapat
  closeModal('modalPayCreditCard');

  // 6. Eğer kart detay modalı açıksa hemen yenile
  const modalDetail = document.getElementById('modalAccountDetail');
  if (modalDetail && modalDetail.open) {
    openAccountDetailModal(targetCardId, activeAccountDetailFilter || 'all');
  }
}

function syncAccountBalanceWithMovements(accId) {
  const acc = walletState.accounts.find(a => a.id === accId);
  if (!acc) return;

  const stats = getAccountMovementStats(accId);
  let newBalance = 0;

  if (acc.type === 'credit') {
    const netDebt = Math.max(0, Math.round((stats.totalOut - stats.totalIn) * 100) / 100);
    newBalance = netDebt === 0 ? 0 : -netDebt;
  } else {
    newBalance = stats.netDiff;
  }

  acc.balance = newBalance;
  saveWalletState();
  renderWalletUI();
  refreshAccountDetailModal();
  alert(`✓ "${acc.name}" hesabının bakiyesi kayıtlı tüm hareketler hesaplanarak ${formatWalletTL(newBalance)} olarak eşitlendi.`);
}

function refreshAccountDetailModal() {
  const modal = document.getElementById('modalAccountDetail');
  if (modal && modal.open && activeAccountDetailId) {
    openAccountDetailModal(activeAccountDetailId, activeAccountDetailFilter || 'all');
  }
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

  const billingDayGroup = document.getElementById('groupAccountBillingDay');
  const billingDayInput = document.getElementById('inputAccountBillingDay');
  const summaryEl = document.getElementById('creditCardCutoffSummary');

  if (type === 'credit') {
    if (billingDayGroup) billingDayGroup.style.display = 'block';
    const dayVal = (billingDayInput && billingDayInput.value) ? parseInt(billingDayInput.value) : 15;
    if (billingDayInput && !billingDayInput.value) billingDayInput.value = '15';
    const currentAccId = document.getElementById('inputAccountId').value;
    updateCreditCardCutoffPreview(currentAccId, dayVal, true);
  } else {
    if (billingDayGroup) billingDayGroup.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'none';
  }
}

function handleAccountFormSubmit(e) {
  e.preventDefault();
  const accId = document.getElementById('inputAccountId').value;
  const name = document.getElementById('inputAccountName').value.trim();
  const type = document.getElementById('selectAccountType').value;
  const icon = document.getElementById('inputAccountIcon').value || '💳';
  const balance = parseFloat(document.getElementById('inputAccountBalance').value) || 0;
  const billingDayInput = document.getElementById('inputAccountBillingDay');
  const billingDay = (type === 'credit' && billingDayInput) ? (parseInt(billingDayInput.value) || 15) : null;

  if (!name) return;

  if (accId) {
    // Mevcut hesabı güncelle
    const acc = walletState.accounts.find(a => a.id === accId);
    if (acc) {
      acc.name = name;
      acc.type = type;
      acc.icon = icon;
      acc.balance = balance;
      acc.billingDay = billingDay;
    }
  } else {
    // Yeni hesap oluştur
    const newAcc = {
      id: 'acc_' + Date.now(),
      name: name,
      type: type,
      icon: icon,
      balance: balance,
      billingDay: billingDay
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
  closeModal('modalAccountDetail');
}

// Eski çağrılar için geriye dönük uyumluluk
function openAddAccountPrompt() {
  openAddAccountModal();
}

// --- Taksit Hesaplama & Tarih Yardımcıları ---
function getInstallmentDates(baseDateStr, count) {
  const dates = [];
  const parts = (baseDateStr || new Date().toISOString().split('T')[0]).split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2] || 1;

  for (let i = 0; i < count; i++) {
    const totalMonths = (m - 1) + i;
    const targetYear = y + Math.floor(totalMonths / 12);
    const targetMonth = (totalMonths % 12) + 1;
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(d, maxDays);
    dates.push(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`);
  }
  return dates;
}

function toggleWalletInstallmentFromHeader(e) {
  if (e && (e.target.tagName === 'INPUT' || e.target.closest('.installment-switch'))) return;
  const chk = document.getElementById('checkWalletIsInstallment');
  if (chk) {
    chk.checked = !chk.checked;
    toggleWalletInstallmentSection();
  }
}

function toggleWalletInstallmentSection() {
  const chk = document.getElementById('checkWalletIsInstallment');
  const isInst = !!(chk && chk.checked);
  const dateLabel = document.getElementById('lblWalletTxDate');
  if (dateLabel) {
    dateLabel.textContent = isInst ? 'İlk Taksit Tarihi' : 'Tarih';
  }
  updateInstallmentCalculation();
}

function updateInstallmentCalculation() {
  const isInst = document.getElementById('checkWalletIsInstallment')?.checked;
  const card = document.getElementById('installmentToggleCard');
  const details = document.getElementById('walletInstallmentDetails');
  const subDesc = document.getElementById('installmentSubDesc');
  const dateInput = document.getElementById('inputWalletTxDate');
  const amountInput = document.getElementById('inputWalletAmount');
  const countSelect = document.getElementById('selectWalletInstallmentCount');
  const typeSelect = document.getElementById('selectWalletInstallmentAmountType');

  if (!card || !details) return;

  if (!isInst) {
    card.classList.remove('active');
    details.style.display = 'none';
    if (subDesc) subDesc.textContent = 'Taksitlendirme kapalı (Tek çekim)';
    return;
  }

  card.classList.add('active');
  details.style.display = 'block';

  const count = parseInt(countSelect?.value || '3');
  const amountType = typeSelect?.value || 'total';
  const val = parseFloat(amountInput?.value || 0) || 0;

  let totalAmount = 0;
  let monthlyAmount = 0;

  if (amountType === 'total') {
    totalAmount = val;
    monthlyAmount = count > 0 ? (val / count) : 0;
  } else {
    monthlyAmount = val;
    totalAmount = val * count;
  }

  const lblMonthly = document.getElementById('lblInstallmentMonthlyAmount');
  const lblTotal = document.getElementById('lblInstallmentTotalAmount');
  const lblEnd = document.getElementById('lblInstallmentEndDate');

  if (lblMonthly) lblMonthly.textContent = formatWalletTL(monthlyAmount);
  if (lblTotal) lblTotal.textContent = formatWalletTL(totalAmount);

  const baseDateStr = dateInput?.value || new Date().toISOString().split('T')[0];
  const dates = getInstallmentDates(baseDateStr, count);
  const lastDateStr = dates[dates.length - 1];
  if (lblEnd && lastDateStr) {
    const p = lastDateStr.split('-');
    const mIdx = parseInt(p[1]) - 1;
    lblEnd.textContent = `${getMonthNameTR(mIdx)} ${p[0]}`;
  }

  if (subDesc) {
    subDesc.textContent = `${count} ay x ${formatWalletTL(monthlyAmount)} (Toplam: ${formatWalletTL(totalAmount)})`;
  }
}

// --- İşlem Ekleme / Düzenleme / Silme Formu (Modal) ---
function openAddWalletTxModal() {
  editingWalletTxId = null;
  const modal = document.getElementById('modalWalletTx');
  if (!modal) return;

  const titleEl = document.getElementById('modalWalletTxTitle');
  if (titleEl) titleEl.textContent = 'İşlem Ekle';
  const submitBtn = document.getElementById('btnWalletTxSubmit');
  if (submitBtn) submitBtn.textContent = 'Kaydet';

  const oldBanner = document.getElementById('walletTxEditInstallmentBanner');
  if (oldBanner) oldBanner.remove();

  const instSection = document.getElementById('walletInstallmentToggleSection');
  if (instSection) instSection.style.display = 'block';

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

  // Taksit alanlarını sıfırla
  const chkInst = document.getElementById('checkWalletIsInstallment');
  if (chkInst) chkInst.checked = false;
  const countSelect = document.getElementById('selectWalletInstallmentCount');
  if (countSelect) countSelect.value = '3';
  const typeSelect = document.getElementById('selectWalletInstallmentAmountType');
  if (typeSelect) typeSelect.value = 'total';
  const dateLabel = document.getElementById('lblWalletTxDate');
  if (dateLabel) dateLabel.textContent = 'Tarih';
  updateInstallmentCalculation();

  populateWalletAccountSelectors();
  modal.showModal();
}

function openEditWalletTxModal(txId) {
  const tx = walletState.transactions.find(t => t.id === txId);
  if (!tx) return;

  editingWalletTxId = txId;
  const modal = document.getElementById('modalWalletTx');
  if (!modal) return;

  const titleEl = document.getElementById('modalWalletTxTitle');
  if (titleEl) titleEl.textContent = 'İşlemi Düzenle';
  const submitBtn = document.getElementById('btnWalletTxSubmit');
  if (submitBtn) submitBtn.textContent = 'Değişiklikleri Kaydet';

  // Taksit bilgilendirme ve bölüm yönetimi
  const oldBanner = document.getElementById('walletTxEditInstallmentBanner');
  if (oldBanner) oldBanner.remove();

  const instSection = document.getElementById('walletInstallmentToggleSection');
  if (instSection) instSection.style.display = 'none';

  if (tx.installment) {
    const form = document.getElementById('formWalletTx');
    if (form) {
      const banner = document.createElement('div');
      banner.id = 'walletTxEditInstallmentBanner';
      banner.className = 'installment-edit-notice';
      banner.innerHTML = `
        <span class="inst-notice-icon">💳</span>
        <div>Bu işlem <strong>${tx.installment.current}/${tx.installment.total} Taksit</strong> planına aittir. Yapılan değişiklikler bu taksit satırını güncelleyecektir.</div>
      `;
      form.insertBefore(banner, form.firstChild);
    }
  }

  // İşlem türünü ayarla
  setTxType(tx.type);

  // Tutar
  const amountInput = document.getElementById('inputWalletAmount');
  if (amountInput) amountInput.value = tx.amount;

  // Hesapları doldur ve seç
  populateWalletAccountSelectors();
  const fromSelect = document.getElementById('selectWalletFromAccount');
  if (fromSelect && tx.fromAccountId) {
    fromSelect.value = tx.fromAccountId;
  }
  const toSelect = document.getElementById('selectWalletToAccount');
  if (toSelect && tx.toAccountId) {
    toSelect.value = tx.toAccountId;
  }

  // Kategori & Alt başlık (transfer değilse)
  if (tx.type !== 'transfer') {
    selectedCategoryId = tx.categoryId || (tx.type === 'expense' ? 'cat_market' : 'cat_salary');
    selectedSubCategoryId = tx.subCategory || '';
    renderCategoryGrid(tx.type);
  }

  // Tarih
  const dateInput = document.getElementById('inputWalletTxDate');
  if (dateInput) dateInput.value = tx.date;

  // Not
  const noteInput = document.getElementById('inputWalletNote');
  if (noteInput) noteInput.value = tx.note || '';

  modal.showModal();
}

function setTxType(type) {
  currentTxType = type;
  ['txTypeBtn_expense', 'txTypeBtn_income', 'txTypeBtn_transfer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  document.querySelectorAll('.tx-type-opt').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`txTypeBtn_${type}`);
  if (btn) btn.classList.add('active');

  const catSection = document.getElementById('walletCatSection');
  const transferSection = document.getElementById('walletTransferSection');
  const instSection = document.getElementById('walletInstallmentToggleSection');

  if (type === 'transfer') {
    if (catSection) catSection.style.display = 'none';
    if (transferSection) transferSection.style.display = 'block';
    if (instSection) instSection.style.display = 'none';
  } else {
    if (catSection) catSection.style.display = 'block';
    if (transferSection) transferSection.style.display = 'none';
    if (instSection) {
      instSection.style.display = editingWalletTxId ? 'none' : 'block';
    }
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
  const isInstallment = document.getElementById('checkWalletIsInstallment')?.checked && currentTxType !== 'transfer';

  const inputAmount = parseFloat(amountInput.value);
  if (!inputAmount || inputAmount <= 0 || !dateInput.value) return;

  const fromAccountId = fromSelect.value;
  const toAccountId = currentTxType === 'transfer' ? toSelect.value : '';

  if (currentTxType === 'transfer' && fromAccountId === toAccountId) {
    alert('Kaynak ve hedef hesap aynı olamaz!');
    return;
  }

  // Düzenleme Modu (Mevcut İşlemi Güncelle)
  if (editingWalletTxId) {
    const tx = walletState.transactions.find(t => t.id === editingWalletTxId);
    if (!tx) {
      editingWalletTxId = null;
      return;
    }

    // 1. Önceki işlemin hesap bakiyeleri üzerindeki etkisini geri al
    const oldFromAcc = walletState.accounts.find(a => a.id === tx.fromAccountId);
    if (oldFromAcc) {
      if (tx.type === 'expense' || tx.type === 'transfer') {
        oldFromAcc.balance += tx.amount;
      } else if (tx.type === 'income') {
        oldFromAcc.balance -= tx.amount;
      }
    }
    if (tx.type === 'transfer' && tx.toAccountId) {
      const oldToAcc = walletState.accounts.find(a => a.id === tx.toAccountId);
      if (oldToAcc) {
        oldToAcc.balance -= tx.amount;
      }
    }

    // 2. Yeni değerleri güncelle
    tx.type = currentTxType;
    tx.amount = inputAmount;
    tx.fromAccountId = fromAccountId;
    tx.toAccountId = (currentTxType === 'transfer' ? toAccountId : '');
    tx.categoryId = (currentTxType !== 'transfer' ? selectedCategoryId : '');
    tx.subCategory = (currentTxType !== 'transfer' ? selectedSubCategoryId : '');
    tx.date = dateInput.value;
    tx.note = noteInput.value.trim();

    // 3. Yeni değerleri hesap bakiyelerine uygula
    const newFromAcc = walletState.accounts.find(a => a.id === fromAccountId);
    if (newFromAcc) {
      if (currentTxType === 'expense' || currentTxType === 'transfer') {
        newFromAcc.balance -= inputAmount;
      } else if (currentTxType === 'income') {
        newFromAcc.balance += inputAmount;
      }
    }
    if (currentTxType === 'transfer') {
      const newToAcc = walletState.accounts.find(a => a.id === toAccountId);
      if (newToAcc) {
        newToAcc.balance += inputAmount;
      }
    }

    // Tarihe göre sırala
    walletState.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    editingWalletTxId = null;
    const oldBanner = document.getElementById('walletTxEditInstallmentBanner');
    if (oldBanner) oldBanner.remove();

    saveWalletState();
    renderWalletUI();
    refreshAccountDetailModal();

    const modal = document.getElementById('modalWalletTx');
    if (modal) modal.close();
    return;
  }

  const fromAcc = walletState.accounts.find(a => a.id === fromAccountId);

  if (isInstallment) {
    const countSelect = document.getElementById('selectWalletInstallmentCount');
    const typeSelect = document.getElementById('selectWalletInstallmentAmountType');
    const count = parseInt(countSelect?.value || '3');
    const amountType = typeSelect?.value || 'total';

    let totalAmount = 0;
    if (amountType === 'total') {
      totalAmount = inputAmount;
    } else {
      totalAmount = Math.round(inputAmount * count * 100) / 100;
    }

    const baseMonthly = Math.floor((totalAmount / count) * 100) / 100;
    const remainder = Math.round((totalAmount - (baseMonthly * count)) * 100) / 100;

    const installmentGroupId = 'inst_' + Date.now();
    const installmentDates = getInstallmentDates(dateInput.value, count);

    // Hesap bakiyesini güncelle
    if (fromAcc) {
      if (currentTxType === 'expense') {
        fromAcc.balance -= totalAmount;
      } else if (currentTxType === 'income') {
        fromAcc.balance += totalAmount;
      }
    }

    // Her taksit için işlem üret (Tarihe göre sıralı kalması için geriye doğru unshift veya push ve sort)
    const newTxs = [];
    for (let i = 1; i <= count; i++) {
      const instAmount = (i === 1 ? Math.round((baseMonthly + remainder) * 100) / 100 : baseMonthly);
      newTxs.push({
        id: 'wtx_' + Date.now() + '_' + i,
        type: currentTxType,
        amount: instAmount,
        fromAccountId: fromAccountId,
        toAccountId: '',
        categoryId: selectedCategoryId,
        subCategory: selectedSubCategoryId,
        date: installmentDates[i - 1],
        note: noteInput.value.trim(),
        installment: {
          groupId: installmentGroupId,
          current: i,
          total: count,
          totalAmount: totalAmount
        }
      });
    }

    // Yeni taksitleri mevcut işlemlere ekle ve tarihe göre sırala
    walletState.transactions.push(...newTxs);
    walletState.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    // Standart Tek Çekim İşlem
    const newTx = {
      id: 'wtx_' + Date.now(),
      type: currentTxType,
      amount: inputAmount,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      categoryId: currentTxType !== 'transfer' ? selectedCategoryId : '',
      subCategory: currentTxType !== 'transfer' ? selectedSubCategoryId : '',
      date: dateInput.value,
      note: noteInput.value.trim()
    };

    if (fromAcc) {
      if (currentTxType === 'expense' || currentTxType === 'transfer') {
        fromAcc.balance -= inputAmount;
      } else if (currentTxType === 'income') {
        fromAcc.balance += inputAmount;
      }
    }

    if (currentTxType === 'transfer') {
      const toAcc = walletState.accounts.find(a => a.id === toAccountId);
      if (toAcc) toAcc.balance += inputAmount;
    }

    walletState.transactions.unshift(newTx);
  }

  saveWalletState();
  renderWalletUI();
  refreshAccountDetailModal();

  const modal = document.getElementById('modalWalletTx');
  if (modal) modal.close();
}

function deleteWalletTx(txId) {
  const tx = walletState.transactions.find(t => t.id === txId);
  if (!tx) return;

  const modal = document.getElementById('modalWalletTxDelete');
  const titleEl = document.getElementById('modalWalletTxDeleteTitle');
  const bodyEl = document.getElementById('modalWalletTxDeleteBody');
  const footerEl = document.getElementById('modalWalletTxDeleteFooter');

  if (!modal || !bodyEl || !footerEl) {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      executeDeleteTx(txId, 'single');
    }
    return;
  }

  if (tx.installment) {
    if (titleEl) titleEl.innerHTML = '💳 Taksitli İşlem Silme';
    bodyEl.innerHTML = `
      <p style="margin-bottom: 8px;">Bu kayıt <strong>${tx.installment.current}/${tx.installment.total} Taksit</strong> planına aittir.</p>
      <div style="background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;">
        <div style="margin-bottom: 4px;"><strong>Tutar:</strong> ${formatWalletTL(tx.amount)}</div>
        <div style="margin-bottom: 4px;"><strong>Tarih:</strong> ${tx.date}</div>
        ${tx.note ? `<div><strong>Açıklama:</strong> ${tx.note}</div>` : ''}
      </div>
      <p style="font-size: 0.82rem; color: var(--text-dim); margin: 0;">Nasıl silmek istersiniz?</p>
    `;
    footerEl.innerHTML = `
      <button type="button" class="btn-cancel" onclick="closeModal('modalWalletTxDelete')">Vazgeç</button>
      <button type="button" class="btn-submit" style="background: #3b82f6;" onclick="executeDeleteTx('${txId}', 'single')">Sadece Bu Taksiti Sil</button>
      <button type="button" class="btn-submit" style="background: linear-gradient(135deg, #ef4444, #dc2626);" onclick="executeDeleteTx('${txId}', 'all')">Tüm Taksitleri Sil (${tx.installment.total} Ay)</button>
    `;
  } else {
    if (titleEl) titleEl.innerHTML = '🗑️ İşlemi Sil';
    bodyEl.innerHTML = `
      <p style="margin-bottom: 8px;">Bu işlemi silmek istediğinize emin misiniz?</p>
      <div style="background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="margin-bottom: 4px;"><strong>Tutar:</strong> ${formatWalletTL(tx.amount)}</div>
        <div style="margin-bottom: 4px;"><strong>Tarih:</strong> ${tx.date}</div>
        ${tx.note ? `<div><strong>Açıklama:</strong> ${tx.note}</div>` : ''}
      </div>
    `;
    footerEl.innerHTML = `
      <button type="button" class="btn-cancel" onclick="closeModal('modalWalletTxDelete')">Vazgeç</button>
      <button type="button" class="btn-submit" style="background: linear-gradient(135deg, #ef4444, #dc2626);" onclick="executeDeleteTx('${txId}', 'single')">Evet, Sil</button>
    `;
  }

  modal.showModal();
}

function executeDeleteTx(txId, mode) {
  const tx = walletState.transactions.find(t => t.id === txId);
  if (!tx) return;

  if (mode === 'all' && tx.installment?.groupId) {
    const groupId = tx.installment.groupId;
    const groupTxs = walletState.transactions.filter(t => t.installment?.groupId === groupId);

    // Her taksit için bakiyeyi tersine çevir
    groupTxs.forEach(t => {
      const fromAcc = walletState.accounts.find(a => a.id === t.fromAccountId);
      if (fromAcc) {
        if (t.type === 'expense' || t.type === 'transfer') fromAcc.balance += t.amount;
        else if (t.type === 'income') fromAcc.balance -= t.amount;
      }
    });

    // Grubun tüm işlemlerini sil
    walletState.transactions = walletState.transactions.filter(t => t.installment?.groupId !== groupId);
  } else {
    // Sadece tek işlemi sil
    const idx = walletState.transactions.findIndex(t => t.id === txId);
    if (idx >= 0) {
      const fromAcc = walletState.accounts.find(a => a.id === tx.fromAccountId);
      if (fromAcc) {
        if (tx.type === 'expense' || tx.type === 'transfer') fromAcc.balance += tx.amount;
        else if (tx.type === 'income') fromAcc.balance -= tx.amount;
      }
      if (tx.type === 'transfer') {
        const toAcc = walletState.accounts.find(a => a.id === tx.toAccountId);
        if (toAcc) toAcc.balance -= tx.amount;
      }
      walletState.transactions.splice(idx, 1);
    }
  }

  saveWalletState();
  renderWalletUI();
  refreshAccountDetailModal();

  const modal = document.getElementById('modalWalletTxDelete');
  if (modal) modal.close();
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
  loadBordroState();
  populateCategoryIconGrid();

  // İşlem modalı kapandığında düzenleme durumunu temizle
  const modalWalletTx = document.getElementById('modalWalletTx');
  if (modalWalletTx) {
    modalWalletTx.addEventListener('close', () => {
      editingWalletTxId = null;
      const oldBanner = document.getElementById('walletTxEditInstallmentBanner');
      if (oldBanner) oldBanner.remove();
      const instSection = document.getElementById('walletInstallmentToggleSection');
      if (instSection) instSection.style.display = 'block';
    });
  }

  // Son aktif modülü hatırla
  const savedMod = localStorage.getItem('active_suite_module');
  if (savedMod === 'wallet') {
    switchMainModule('wallet');
  } else if (savedMod === 'bordro') {
    switchMainModule('bordro');
  }
});

// =========================================================================
// MODÜL 3: MAAŞ & BORDRO EXCEL TABLOSU MOTORU (YATAY AY MATRİSİ)
// Satırlar: 22 Kalem (Muafiyet, Asgari Ücret ve Yemek Yardımı dahil)
// Sütunlar: Yeniden Eskiye (En başta içinde olduğumuz ay/yıl)
// =========================================================================

const BORDRO_ROWS_DEF = [
  { key: 'brutUcret', label: 'Brüt Ücret' },
  { key: 'sosyalYardim', label: 'Sosyal Yardım' },
  { key: 'ikramiyeYardimi', label: 'İkramiye Yardımı' },
  { key: 'yolYardimi', label: 'Yol Yardımı' },
  { key: 'yemekYardimi', label: 'Yemek Yardımı' },
  { key: 'ekstra', label: 'Ekstra' },
  { key: 'muafiyet', label: 'Muafiyet' },
  { key: 'sgkPrimEsasKazanc', label: 'SGK Prim Esas Kazanç' },
  { key: 'sigortaPrimi', label: 'Sigorta Primi' },
  { key: 'topGelVerMat', label: 'Top. Gel. Ver. Mat.' },
  { key: 'avans', label: 'Avans' },
  { key: 'bes', label: 'BES' },
  { key: 'asgariUcret', label: 'Asgari Ücret' },
  { key: 'asgariUcrTopMat', label: 'Asgari Ücr. Top. Mat.' },
  { key: 'asgariUcrVergi', label: 'Asgari Ücr. Vergi' },
  { key: 'asgariSonTop', label: 'Asgari Son. Top.' },
  { key: 'kesGelVer', label: 'Kes. Gel. Ver.' },
  { key: 'damgaVer', label: 'Damga Ver.' },
  { key: 'netOdenen', label: 'Net Ödenen', highlight: 'net' },
  { key: 'agi', label: 'Agi' },
  { key: 'toplam', label: 'Toplam', highlight: 'total' },
  { key: 'calismaGunuBasi', label: 'Günlük Ortalama' }
];

const BORDRO_COLUMNS = [
  { key: 'tarih', label: 'Tarih', isDate: true },
  ...BORDRO_ROWS_DEF
];

// Resmi Gelir Vergisi Dilimleri (Gelir Vergisi Kanunu 103. Madde Ücret Tarifesi) ve Brüt Asgari Ücretler
// 2022 ve 2023 yıllarında 2 sefer zam yapıldığı için 1. Dönem (Ocak-Haziran) ve 2. Dönem (Temmuz-Aralık) olarak tanımlanır.
const DEFAULT_TAX_CONFIG = {
  2021: {
    minWageGross: 3577.50,
    brackets: [
      { rate: 15, min: 0, max: 24000 },
      { rate: 20, min: 24000, max: 53000 },
      { rate: 27, min: 53000, max: 190000 },
      { rate: 35, min: 190000, max: 650000 },
      { rate: 40, min: 650000, max: null }
    ]
  },
  2022: {
    hasTwoPeriods: true,
    minWageGross1: 5004.00,  // 1. Dönem (Ocak - Haziran 2022)
    minWageGross2: 6471.00,  // 2. Dönem (Temmuz - Aralık 2022)
    minWageGross: 5004.00,
    brackets: [
      { rate: 15, min: 0, max: 32000 },
      { rate: 20, min: 32000, max: 70000 },
      { rate: 27, min: 70000, max: 250000 },
      { rate: 35, min: 250000, max: 880000 },
      { rate: 40, min: 880000, max: null }
    ]
  },
  2023: {
    hasTwoPeriods: true,
    minWageGross1: 10008.00, // 1. Dönem (Ocak - Haziran 2023)
    minWageGross2: 13414.50, // 2. Dönem (Temmuz - Aralık 2023)
    minWageGross: 10008.00,
    brackets: [
      { rate: 15, min: 0, max: 70000 },
      { rate: 20, min: 70000, max: 150000 },
      { rate: 27, min: 150000, max: 550000 },
      { rate: 35, min: 550000, max: 1900000 },
      { rate: 40, min: 1900000, max: null }
    ]
  },
  2024: {
    minWageGross: 20002.50,
    brackets: [
      { rate: 15, min: 0, max: 110000 },
      { rate: 20, min: 110000, max: 230000 },
      { rate: 27, min: 230000, max: 870000 },
      { rate: 35, min: 870000, max: 3000000 },
      { rate: 40, min: 3000000, max: null }
    ]
  },
  2025: {
    minWageGross: 26005.50,
    brackets: [
      { rate: 15, min: 0, max: 158000 },
      { rate: 20, min: 158000, max: 330000 },
      { rate: 27, min: 330000, max: 1200000 },
      { rate: 35, min: 1200000, max: 4300000 },
      { rate: 40, min: 4300000, max: null }
    ]
  },
  2026: {
    minWageGross: 33000.00,
    brackets: [
      { rate: 15, min: 0, max: 210000 },
      { rate: 20, min: 210000, max: 450000 },
      { rate: 27, min: 450000, max: 1600000 },
      { rate: 35, min: 1600000, max: 5800000 },
      { rate: 40, min: 5800000, max: null }
    ]
  }
};

let bordroState = { periods: {}, taxConfig: null, manualOverrides: {}, lockedMonths: {} };
let bordroWideMode = true;
let selectedSummaryYear = new Date().getFullYear();
let activeTaxModalYear = new Date().getFullYear();

// Ocak 2021'den mevcut yılın Aralık ayına kadar olan ayları YENİDEN ESKİYE (Azalan) sırala
function generateBordroMonthList() {
  const currentYear = new Date().getFullYear();
  const startYear = 2021;
  const list = [];

  for (let y = currentYear; y >= startYear; y--) {
    for (let m = 11; m >= 0; m--) {
      const mStr = String(m + 1).padStart(2, '0');
      const key = `${y}-${mStr}`;
      const label = `${getMonthNameTR(m)} ${y}`;
      list.push({ key, label, year: y, monthIndex: m });
    }
  }
  return list;
}

// Kronolojik (Ocak 2021 -> Aralık 2026) sıralı liste (Hesaplama motoru için ileriye doğru akış)
function generateBordroChronologicalMonthList() {
  const currentYear = new Date().getFullYear();
  const startYear = 2021;
  const list = [];

  for (let y = startYear; y <= currentYear; y++) {
    for (let m = 0; m < 12; m++) {
      const mStr = String(m + 1).padStart(2, '0');
      const key = `${y}-${mStr}`;
      const label = `${getMonthNameTR(m)} ${y}`;
      list.push({ key, label, year: y, monthIndex: m });
    }
  }
  return list;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// İçinde olduğumuz ay ve sonrası mı kontrolü
function isProjectedPeriod(periodKey) {
  const currentKey = getCurrentMonthKey();
  return periodKey >= currentKey;
}

function loadBordroState() {
  try {
    const raw = localStorage.getItem('bordro_tablo_data_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        bordroState = parsed;
        if (!bordroState.periods) bordroState.periods = {};
        if (!bordroState.manualOverrides) bordroState.manualOverrides = {};
        if (!bordroState.lockedMonths) bordroState.lockedMonths = {};
        if (!bordroState.hiddenRows || !Array.isArray(bordroState.hiddenRows)) bordroState.hiddenRows = [];
        // Toplam ve Günlük Ortalama formülsel özet alanlarıdır; açılışta eski kilitli override'ları temizle
        if (bordroState.manualOverrides) {
          Object.keys(bordroState.manualOverrides).forEach(k => {
            if (bordroState.manualOverrides[k]) {
              delete bordroState.manualOverrides[k].toplam;
              delete bordroState.manualOverrides[k].calismaGunuBasi;
              delete bordroState.manualOverrides[k].asgariUcrTopMat;
              delete bordroState.manualOverrides[k].asgariUcrVergi;
              delete bordroState.manualOverrides[k].sgkPrimEsasKazanc;
              delete bordroState.manualOverrides[k].sigortaPrimi;
              delete bordroState.manualOverrides[k].topGelVerMat;
              delete bordroState.manualOverrides[k].kesGelVer;
            }
          });
        }
        // Eski veride asgariUcret alanı tanımlı değilse, Ocak ayındaki asgariUcrTopMat değerini asgariUcret olarak aktar
        if (bordroState.periods) {
          Object.keys(bordroState.periods).forEach(k => {
            const p = bordroState.periods[k];
            if (p && p.asgariUcret === undefined && p.asgariUcrTopMat !== undefined) {
              const parts = k.split('-');
              const mIdx = parseInt(parts[1], 10) - 1;
              if (mIdx === 0 && Number(p.asgariUcrTopMat) > 0) {
                p.asgariUcret = Number(p.asgariUcrTopMat);
              }
            }
          });
        }
        // Önceki -damgaVerVal formülünden kalan toplam değerlerini güncelle (Avans + Net Ödenen + AGİ)
        if (bordroState.periods) {
          Object.keys(bordroState.periods).forEach(k => {
            const p = bordroState.periods[k];
            if (p) {
              const y = parseInt(k.split('-')[0], 10);
              const av = Number(p.avans) || 0;
              const net = Number(p.netOdenen) || 0;
              const agi = Number(p.agi) || 0;
              const dv = Number(p.damgaVer) || 0;
              const oldDoubleDeducted = Math.round((av + net + (y === 2021 ? agi : 0) - dv) * 100) / 100;
              if (p.toplam === oldDoubleDeducted && dv > 0) {
                p.toplam = Math.round((av + net + (y === 2021 ? agi : 0)) * 100) / 100;
                let days = new Date(y, parseInt(k.split('-')[1], 10), 0).getDate();
                if (k === '2021-01') days = 7;
                p.calismaGunuBasi = Math.round((p.toplam / (days || 30)) * 100) / 100;
              }
            }
          });
        }
        if (!bordroState.taxConfig) {
          bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
        } else {
          // Eksik veya eski 2022/2023 çift dönem tanımları varsa tamamla
          [2021, 2022, 2023, 2024, 2025, 2026].forEach(y => {
            if (!bordroState.taxConfig[y]) {
              bordroState.taxConfig[y] = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG[y]));
            } else if ((y === 2022 || y === 2023) && (!bordroState.taxConfig[y].minWageGross1 || !bordroState.taxConfig[y].minWageGross2)) {
              bordroState.taxConfig[y].hasTwoPeriods = true;
              bordroState.taxConfig[y].minWageGross1 = DEFAULT_TAX_CONFIG[y].minWageGross1;
              bordroState.taxConfig[y].minWageGross2 = DEFAULT_TAX_CONFIG[y].minWageGross2;
            }
          });
        }
      } else {
        initDefaultBordroState();
      }
    } else {
      initDefaultBordroState();
    }
  } catch (e) {
    console.error('Bordro verisi yüklenemedi:', e);
    initDefaultBordroState();
  }
}

function initDefaultBordroState() {
  bordroState = {
    periods: {},
    manualOverrides: {},
    lockedMonths: {},
    hiddenRows: [],
    taxConfig: JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG))
  };
  saveBordroState();
}

function saveBordroState() {
  localStorage.setItem('bordro_tablo_data_v1', JSON.stringify(bordroState));
}

function formatBordroNum(val) {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

function parseBordroInputNum(str) {
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  if (!str) return 0;
  let s = String(str).replace(/[^\d.,-]/g, '').trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

// -------------------------------------------------------------------------
// VERGİ DİLİMİ ORANI BULUCU (Madde 11)
// Matrah hangi aralığa denk geliyorsa o aralığın oranını döner
// -------------------------------------------------------------------------
function getTaxRateForAmount(year, amount) {
  if (!bordroState.taxConfig) bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
  const yearCfg = bordroState.taxConfig[year] || bordroState.taxConfig[2026] || DEFAULT_TAX_CONFIG[2026];
  const brackets = yearCfg.brackets || [];

  for (const b of brackets) {
    const min = Number(b.min) || 0;
    const max = b.max !== null && b.max !== undefined && b.max !== '' ? Number(b.max) : Infinity;
    if (amount >= min && amount < max) {
      return Number(b.rate) || 15;
    }
  }
  return 15;
}

// -------------------------------------------------------------------------
// KADEMELİ GELİR VERGİSİ DİLİM HESAPLAYICI (Madde 13 - Progresif Vergi Motoru)
// Önceki kümülatif vergi matrahından (m1) bu ayki kümülatif vergi matrahına (m2) kadar olan kısmı
// resmi vergi dilimlerinin sınırlarına göre (%15, %20, %27, %35, %40) parçalara ayırır,
// her parçayı ilgili dilim oranıyla hesaplar ve toplamını döner.
// Örnek: Mart kümülatif 26.701,79 TL, Nisan kümülatif 36.615,81 TL ise:
// 32.000 TL'ye kadar olan 5.298,21 TL %15'ten, kalan 4.615,81 TL %20'den hesaplanıp toplanır.
// -------------------------------------------------------------------------
function calculateProgressiveTaxForPeriod(year, prevCumul, currentCumul) {
  if (!bordroState.taxConfig) bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
  const yearCfg = bordroState.taxConfig[year] || bordroState.taxConfig[2026] || DEFAULT_TAX_CONFIG[2026];
  const brackets = yearCfg.brackets || [];

  const m1 = Math.max(0, Number(prevCumul) || 0);
  const m2 = Math.max(0, Number(currentCumul) || 0);
  if (m2 <= m1) return 0;

  let totalTax = 0;
  for (const b of brackets) {
    const min = Number(b.min) || 0;
    const max = (b.max !== null && b.max !== undefined && b.max !== '') ? Number(b.max) : Infinity;
    const rate = Number(b.rate) || 15;

    // Bu dilim aralığına [min, max) düşen matrah payı
    const inBracket = Math.max(0, Math.min(m2, max) - Math.max(m1, min));
    if (inBracket > 0) {
      totalTax += inBracket * (rate / 100);
    }
  }

  return Math.round(totalTax * 100) / 100;
}

function getMinWageGrossForYear(year, monthIndex = 0) {
  if (!bordroState.taxConfig) bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
  const yearCfg = bordroState.taxConfig[year] || bordroState.taxConfig[2026] || DEFAULT_TAX_CONFIG[2026];

  if (yearCfg.hasTwoPeriods || year === 2022 || year === 2023) {
    // 0..5 (Ocak-Haziran) -> 1. Dönem
    // 6..11 (Temmuz-Aralık) -> 2. Dönem
    if (monthIndex >= 6) {
      return Number(yearCfg.minWageGross2 || yearCfg.minWageGross || 0);
    } else {
      return Number(yearCfg.minWageGross1 || yearCfg.minWageGross || 0);
    }
  }

  return Number(yearCfg.minWageGross || 0);
}

// -------------------------------------------------------------------------
// FORMÜL HESAPLAMA MOTORU (MADDELER 1 - 18)
// Kronolojik sırayla (Ocak 2021 -> Ara 2026) kümülatif ve zincirleme hesaplar
// Manuel revize edilmiş (override) değerler korunur.
// -------------------------------------------------------------------------
function recalculateBordroEngine(forceRecomputeAll = false) {
  if (!bordroState.periods) bordroState.periods = {};
  if (!bordroState.manualOverrides) bordroState.manualOverrides = {};
  if (!bordroState.lockedMonths) bordroState.lockedMonths = {};

  const chronoMonths = generateBordroChronologicalMonthList();

  let prevMonthData = null;
  let yearCumulatives = {}; // { 2021: { topGelVerMat: 0, asgariUcrStep: 0 }, ... }

  chronoMonths.forEach(m => {
    const key = m.key;
    const year = m.year;
    const monthIdx = m.monthIndex; // 0: Ocak, ..., 11: Aralık

    if (!bordroState.periods[key]) bordroState.periods[key] = {};
    const p = bordroState.periods[key];
    const overrides = bordroState.manualOverrides[key] || {};
    const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[key]);

    // Yıl başı kümülatif sıfırlama (Her Ocak)
    if (monthIdx === 0) {
      yearCumulatives[year] = {
        topGelVerMat: 0,
        asgariUcrTopMat: 0
      };
    }
    if (!yearCumulatives[year]) {
      yearCumulatives[year] = { topGelVerMat: 0, asgariUcrTopMat: 0 };
    }

    // EĞER BU AY KULLANICI TARAFINDAN ONAYLANIP KİLİTLENDİYSE:
    // "Otomatik Hesapla" veya başka hiçbir motor hesaplaması bu ayın rakamlarına ASLA müdahale etmez!
    if (isLocked) {
      yearCumulatives[year].topGelVerMat = Number(p.topGelVerMat) || 0;
      yearCumulatives[year].asgariUcrTopMat = Number(p.asgariUcrTopMat) || 0;
      prevMonthData = p;
      return;
    }

    if (forceRecomputeAll) {
      delete overrides.sgkPrimEsasKazanc;
      delete overrides.sigortaPrimi;
      delete overrides.topGelVerMat;
      delete overrides.avans;
      delete overrides.bes;
      delete overrides.asgariUcrTopMat;
      delete overrides.asgariUcrVergi;
      delete overrides.asgariSonTop;
      delete overrides.kesGelVer;
      delete overrides.damgaVer;
      delete overrides.netOdenen;
      delete overrides.toplam;
      delete overrides.calismaGunuBasi;
    }

    // 1. Madde: Brüt ücret ve Sosyal yardım bir önceki aydan devredilir
    // Eğer kullanıcı o ay için elle bir değer girmediyse (override yoksa), doğrudan bir önceki ayın değerini alır.
    if (!overrides.brutUcret) {
      if (prevMonthData && (Number(prevMonthData.brutUcret) || 0) > 0) {
        p.brutUcret = Number(prevMonthData.brutUcret) || 0;
      }
    }
    if (!overrides.sosyalYardim) {
      if (prevMonthData && (Number(prevMonthData.sosyalYardim) || 0) > 0) {
        p.sosyalYardim = Number(prevMonthData.sosyalYardim) || 0;
      }
    }

    // 2. Madde: İkramiye 3 ayda bir (Mart: 2, Haziran: 5, Eylül: 8, Aralık: 11)
    // Bir önceki 3 ayın brüt ücreti ortalaması kadar olur (Elle revize edilmediyse)
    const isBonusMonth = (monthIdx === 2 || monthIdx === 5 || monthIdx === 8 || monthIdx === 11);
    if (!overrides.ikramiyeYardimi) {
      if (isBonusMonth) {
        // Mart: Ocak, Şubat, Mart brüt ortalaması
        const m1Key = `${year}-${String(monthIdx - 1).padStart(2, '0')}`;
        const m2Key = `${year}-${String(monthIdx).padStart(2, '0')}`;
        const b1 = bordroState.periods[m1Key] ? Number(bordroState.periods[m1Key].brutUcret) || 0 : Number(p.brutUcret) || 0;
        const b2 = bordroState.periods[m2Key] ? Number(bordroState.periods[m2Key].brutUcret) || 0 : Number(p.brutUcret) || 0;
        const b3 = Number(p.brutUcret) || 0;
        p.ikramiyeYardimi = Math.round(((b1 + b2 + b3) / 3) * 100) / 100;
      } else {
        p.ikramiyeYardimi = 0;
      }
    }

    // 3. Madde: Yol yardımı ve Ekstra tamamen manueldir
    p.yolYardimi = Number(p.yolYardimi) || 0;
    p.ekstra = Number(p.ekstra) || 0;

    // Muafiyet: Değer elle girilir, her ay bir önceki aya girilen veri varsayılan (default) olarak kullanılır
    if (!overrides.muafiyet) {
      if (prevMonthData && prevMonthData.muafiyet !== undefined) {
        p.muafiyet = Number(prevMonthData.muafiyet) || 0;
      } else {
        p.muafiyet = Number(p.muafiyet) || 0;
      }
    }
    p.muafiyet = Number(p.muafiyet) || 0;

    // 4. Madde: Yemek yardımı
    p.yemekYardimi = Number(p.yemekYardimi) || 0;

    const brutVal = Number(p.brutUcret) || 0;
    const sosyalVal = Number(p.sosyalYardim) || 0;
    const ikramiyeVal = Number(p.ikramiyeYardimi) || 0;
    const yolVal = Number(p.yolYardimi) || 0;
    const yemekVal = Number(p.yemekYardimi) || 0;
    const ekstraVal = Number(p.ekstra) || 0;
    const muafiyetVal = Number(p.muafiyet) || 0;

    // 5. Madde: SGK Prim Esas Kazanç = Brüt + Sosyal + İkramiye + Yol + Ekstra - (varsa Yemek Yardımı)
    // Muafiyet düşülmez; varsa yemek parası düşülür.
    if (!overrides.sgkPrimEsasKazanc) {
      p.sgkPrimEsasKazanc = Math.max(0, Math.round((brutVal + sosyalVal + ikramiyeVal + yolVal + ekstraVal - yemekVal) * 100) / 100);
    }
    const sgkVal = Number(p.sgkPrimEsasKazanc) || 0;

    // 6. Madde: Sigorta Primi = SGK Prim Esas Kazanç * %15
    if (!overrides.sigortaPrimi) {
      p.sigortaPrimi = Math.round((sgkVal * 0.15) * 100) / 100;
    }
    const sigortaVal = Number(p.sigortaPrimi) || 0;

    // 7. Madde: Top. Gel. Ver. Mat. = Bir önceki ayın Top. Gel. Ver. Mat. + SGK Prim Esas Kazanç - Sigorta Primi
    const oncekiTopGelVerMat = yearCumulatives[year].topGelVerMat || 0;
    if (!overrides.topGelVerMat) {
      const buAykiKazancMatrahi = Math.max(0, sgkVal - sigortaVal);
      p.topGelVerMat = Math.round((oncekiTopGelVerMat + buAykiKazancMatrahi) * 100) / 100;
    }
    yearCumulatives[year].topGelVerMat = Number(p.topGelVerMat) || 0;
    const topGelVerMatVal = Number(p.topGelVerMat) || 0;

    // 8. Madde: Avans = İkramiyeli aylarda %60, İkramiyesiz aylarda %40 (Brüt ücret üzerinden)
    if (!overrides.avans) {
      const avansOrani = isBonusMonth ? 0.60 : 0.40;
      p.avans = Math.round((brutVal * avansOrani) * 100) / 100;
    }
    const avansVal = Number(p.avans) || 0;

    // 9. Madde: BES = SGK Prim Esas Kazanç * %3 (Sadece Ocak 2021 - Eylül 2024 arası, sonrasında 0)
    if (!overrides.bes) {
      if (key >= '2021-01' && key <= '2024-09') {
        p.bes = Math.round((sgkVal * 0.03) * 100) / 100;
      } else {
        p.bes = 0;
      }
    }
    const besVal = Number(p.bes) || 0;

    // 10. Madde: Asgari Ücret ve Asgari Ücret Toplam Matrah
    // Asgari ücret bir önceki aydan otomatik devredilir (kullanıcı o ay elle bir değer girmediyse)
    if (!overrides.asgariUcret) {
      if (prevMonthData && (Number(prevMonthData.asgariUcret) || 0) > 0) {
        p.asgariUcret = Number(prevMonthData.asgariUcret) || 0;
      }
    }
    const asgariUcretVal = Number(p.asgariUcret) || 0;

    // Asgari Ücret Toplam Matrah: Bir önceki ayın toplam matrahı + bu aydaki asgari ücret
    const oncekiAsgariMatrah = yearCumulatives[year].asgariUcrTopMat || 0;
    p.asgariUcrTopMat = Math.round((oncekiAsgariMatrah + asgariUcretVal) * 100) / 100;
    yearCumulatives[year].asgariUcrTopMat = Number(p.asgariUcrTopMat) || 0;
    const asgariUcrTopMatVal = Number(p.asgariUcrTopMat) || 0;

    // 11. Madde: Asgari Ücret Vergi
    // Vergi dilimi asgari ücret toplam matrahına göre kademeli (progresif) dilim motoru ile hesaplanır:
    // Üst limitine kadar olan kısım o limitten (%15), kalan kısım bir üst limitten (%20 vb.) hesaplanıp toplanır.
    if (!overrides.asgariUcrVergi) {
      p.asgariUcrVergi = calculateProgressiveTaxForPeriod(year, oncekiAsgariMatrah, asgariUcrTopMatVal);
    }

    // 12. Madde: Asgari Son. Top. = Toplam Gelir Vergisi Matrahı - Asgari Ücret Toplam Matrah
    if (!overrides.asgariSonTop) {
      p.asgariSonTop = Math.round((topGelVerMatVal - asgariUcrTopMatVal) * 100) / 100;
    }

    // 13. Madde: Kes. Gel. Ver. (Kesilecek Gelir Vergisi)
    // Formül: Kademeli Gelir Vergisi Dilim Hesabı - Asgari Ücret Vergi
    // Önceki aydan devreden kümülatif matrahtan bu ayki kümülatif matraha kadar olan kısım
    // resmi vergi dilimlerinin sınırlarına göre kademeli hesaplanır (%15, %20, %27, %35, %40).
    // Bulunan toplam vergiden varsa o ayki Asgari Ücret Vergi istisnası düşülür.
    const asgariUcrVergiVal = Number(p.asgariUcrVergi) || 0;
    if (!overrides.kesGelVer) {
      const hesaplananGelirVergisi = calculateProgressiveTaxForPeriod(year, oncekiTopGelVerMat, topGelVerMatVal);
      p.kesGelVer = Math.max(0, Math.round((hesaplananGelirVergisi - asgariUcrVergiVal) * 100) / 100);
    }
    const kesGelVerVal = Number(p.kesGelVer) || 0;

    // 14. Madde: Damga Vergisi = (SGK Prim Esas Kazanç - Brüt Asgari Ücret) * 0.00759
    // Eğer SGK Prim Esas Kazanç brüt asgari ücretten küçük veya eşitse damga vergisi 0 olur.
    if (!overrides.damgaVer || forceRecomputeAll) {
      const brutAsgari = getMinWageGrossForYear(year, monthIdx);
      if (sgkVal > 0) {
        const damgaMatrahi = Math.max(0, sgkVal - brutAsgari);
        p.damgaVer = Math.round((damgaMatrahi * 0.00759) * 100) / 100;
      } else {
        p.damgaVer = 0;
      }
    }
    const damgaVerVal = Number(p.damgaVer) || 0;

    // 15. Madde: Net Ödenen = SGK Prim Esas Kazanç - Sigorta - Avans - BES - Kes. Gel. Ver. - Damga Ver.
    if (!overrides.netOdenen || forceRecomputeAll) {
      p.netOdenen = Math.round((sgkVal - sigortaVal - avansVal - besVal - kesGelVerVal - damgaVerVal) * 100) / 100;
    }
    const netOdenenVal = Number(p.netOdenen) || 0;

    // 16. Madde: Agi sadece 2021 yılında olur ve elle girilir, sonrasında 0
    if (year !== 2021) {
      p.agi = 0;
    } else {
      p.agi = Number(p.agi) || 0;
    }
    const agiVal = Number(p.agi) || 0;

    // 17. Madde: Toplam hesabı
    // Formül: Toplam = Avans + Net Ödenen (+ Agi sadece 2021'de)
    if (!overrides.toplam || forceRecomputeAll) {
      if (year === 2021) {
        p.toplam = Math.round((avansVal + netOdenenVal + agiVal) * 100) / 100;
      } else {
        p.toplam = Math.round((avansVal + netOdenenVal) * 100) / 100;
      }
    }
    const toplamVal = Number(p.toplam) || 0;

    // 18. Madde: Günlük Ortalama (Eski adıyla Çalışma Günü Başı)
    // Toplam / o aydaki gün sayısı (Sadece Ocak 2021'de 7'ye bölünür)
    if (!overrides.calismaGunuBasi || forceRecomputeAll) {
      let gunSayisi = new Date(year, monthIdx + 1, 0).getDate();
      if (key === '2021-01') {
        gunSayisi = 7;
      }
      p.calismaGunuBasi = Math.round((toplamVal / (gunSayisi || 30)) * 100) / 100;
    }

    prevMonthData = p;
  });

  saveBordroState();

  if (typeof renderBordroTableBody === 'function' && document.getElementById('bordroTableBody')) {
    const months = generateBordroMonthList();
    renderBordroTableBody(months);
    updateAllRowSums();
    renderBordroSummaryCards();
  }

  if (forceRecomputeAll) {
    const calcBtn = document.getElementById('btnBordroAutoCalc');
    if (calcBtn && !calcBtn.classList.contains('calc-success')) {
      const iconBox = calcBtn.querySelector('.btn-bordro-calc-icon');
      const labelBox = calcBtn.querySelector('.btn-bordro-calc-label');
      const origIcon = iconBox ? iconBox.innerHTML : '';
      const origLabel = labelBox ? labelBox.textContent : 'Otomatik Hesapla';

      calcBtn.classList.add('calc-success');
      if (iconBox) {
        iconBox.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }
      if (labelBox) {
        labelBox.textContent = 'Hesaplandı';
      }

      setTimeout(() => {
        calcBtn.classList.remove('calc-success');
        if (iconBox) iconBox.innerHTML = origIcon;
        if (labelBox) labelBox.textContent = origLabel;
      }, 1500);
    }
  }
}

function toggleBordroWideMode() {
  bordroWideMode = !bordroWideMode;
  const appContainer = document.querySelector('.app-container');
  const btn = document.getElementById('btnBordroWideMode');
  if (appContainer) {
    if (bordroWideMode) appContainer.classList.add('bordro-wide-active');
    else appContainer.classList.remove('bordro-wide-active');
  }
  if (btn) {
    btn.innerHTML = bordroWideMode
      ? '<span>⛶</span> <span class="hide-on-mobile">Daralt</span>'
      : '<span>⛶</span> <span class="hide-on-mobile">Geniş Görünüm</span>';
  }
}

function renderBordroModule() {
  loadBordroState();
  recalculateBordroEngine(false);

  const months = generateBordroMonthList();

  populateBordroYearSelects(months);
  renderBordroTableHeader(months);
  renderBordroTableBody(months);
  renderBordroSummaryCards();
  updateBordroRowVisibilityBadge();
}

function populateBordroYearSelects(months) {
  const jumpSelect = document.getElementById('selectBordroYearJump');
  const filterSelect = document.getElementById('selectBordroFilterYear');

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set(months.map(m => m.year))).sort((a, b) => b - a);

  if (jumpSelect) {
    jumpSelect.innerHTML = years.map(y => `
      <option value="${y}" ${y === currentYear ? 'selected' : ''}>${y} Yılı</option>
    `).join('');
  }

  if (filterSelect) {
    filterSelect.innerHTML = years.map(y => `
      <option value="${y}" ${y === selectedSummaryYear ? 'selected' : ''}>${y}</option>
    `).join('');
  }
}

function changeBordroSummaryYear(year) {
  selectedSummaryYear = parseInt(year, 10);
  renderBordroSummaryCards();
}

function scrollToBordroYear(year) {
  // Yeniden eskiye sıralı olduğu için o yılın en son ayı (Aralık) en soldadır
  const targetKey = `${year}-12`;
  const th = document.getElementById(`bordroHeaderMonth_${targetKey}`) || document.getElementById(`bordroHeaderMonth_${year}-01`);
  if (th) {
    th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function scrollToCurrentMonthBordro() {
  const currentKey = getCurrentMonthKey();
  const th = document.getElementById(`bordroHeaderMonth_${currentKey}`);
  if (th) {
    th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    th.classList.add('pulse-highlight');
    setTimeout(() => th.classList.remove('pulse-highlight'), 1800);
  }
}

function renderBordroTableHeader(months) {
  const tr = document.getElementById('bordroTableHeaderRow');
  if (!tr) return;

  const currentKey = getCurrentMonthKey();

  // Sol sabit başlıklar: Satır No ve Bordro Kalemi (TOPLAM sütunu yatay kaydırmaya dahildir)
  let html = `
    <th class="col-row-num">#</th>
    <th class="col-sticky-param">Bordro Kalemi</th>
    <th class="col-sticky-param-total">TOPLAM</th>
  `;

  // Aylar Sağa Doğru (Yeniden Eskiye: En solda içinde olduğumuz ay/yıl)
  months.forEach(m => {
    const isProjected = isProjectedPeriod(m.key);
    const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[m.key]);

    let thClass = 'bordro-month-col-th';
    if (isProjected) thClass += ' projected-month-col';
    if (isLocked) thClass += ' month-locked-col';

    html += `
      <th id="bordroHeaderMonth_${m.key}" class="${thClass}" title="${m.label} ${isLocked ? '(Onaylandı & Kilitli)' : isProjected ? '(Tahmini Dönem)' : '(Gerçekleşen Dönem)'}">
        <span class="bordro-month-th-year">${m.year}</span>
        <span class="bordro-month-th-month">${getMonthNameTR(m.monthIndex)}</span>
        ${isLocked ? '<span class="projected-tag-pill locked-tag-pill">🔒 ONAYLI</span>' : isProjected ? '<span class="projected-tag-pill">TAHMİNİ</span>' : ''}
      </th>
    `;
  });

  tr.innerHTML = html;
}

function renderBordroTableBody(months) {
  const tbody = document.getElementById('bordroTableBody');
  if (!tbody) return;

  const periods = bordroState.periods || {};
  const currentKey = getCurrentMonthKey();
  const hiddenRows = (bordroState && bordroState.hiddenRows) || [];

  const rowsHtml = BORDRO_ROWS_DEF.map((def, rIdx) => {
    // Bu kalemin tüm aylar toplamı
    let rowSum = 0;
    months.forEach(m => {
      const val = periods[m.key] ? Number(periods[m.key][def.key]) || 0 : 0;
      rowSum += val;
    });

    const isHidden = hiddenRows.includes(def.key);
    let trClass = '';
    if (def.highlight === 'net') trClass += ' bordro-highlight-net-row';
    if (def.highlight === 'total') trClass += ' bordro-highlight-total-row';
    if (isHidden) trClass += ' bordro-row-hidden';

    let cellsHtml = `
      <td class="cell-row-num">${rIdx + 1}</td>
      <td class="cell-sticky-param" title="${def.label}">
        <div class="bordro-param-title">${def.label}</div>
      </td>
      <td class="cell-sticky-param-total">
        <strong class="bordro-row-sum-val" id="rowSum_${def.key}">${formatBordroNum(rowSum)} ₺</strong>
      </td>
    `;

    // Aylar Sağa Doğru
    months.forEach((m, cIdx) => {
      const monthData = periods[m.key] || {};
      const rawVal = monthData[def.key];
      const hasVal = rawVal !== undefined && rawVal !== null && Number(rawVal) !== 0;
      const displayVal = hasVal ? formatBordroNum(rawVal) : '';

      const isProjected = isProjectedPeriod(m.key);
      const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[m.key]);

      let tdClass = '';
      if (isProjected) tdClass += ' cell-projected-month';
      if (isLocked) tdClass += ' cell-month-locked';

      let inputClass = 'bordro-cell-input';
      if (def.highlight === 'net') inputClass += ' highlight-net';
      if (def.highlight === 'total') inputClass += ' highlight-total';
      if (isLocked) inputClass += ' locked-month-input';

      cellsHtml += `
        <td class="${tdClass}" onclick="const inp=this.querySelector('input'); if(inp && !inp.readOnly) inp.focus();">
          <input
            type="text"
            inputmode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            class="${inputClass}"
            data-period-key="${m.key}"
            data-param-key="${def.key}"
            data-row-idx="${rIdx}"
            data-col-idx="${cIdx}"
            value="${String(displayVal).replace(/"/g, '&quot;')}"
            placeholder="-"
            ${isLocked ? 'readonly tabindex="-1"' : ''}
            onfocus="handleBordroCellFocus(this)"
            onblur="handleBordroCellBlur(this)"
            onkeydown="handleBordroCellKeyDown(event, this)"
          >
        </td>
      `;
    });

    return `<tr class="${trClass}">${cellsHtml}</tr>`;
  }).join('');

  // Ay Onayı ve Kilit Satırı (Her Ayın Altında)
  const lockedCount = months.filter(m => bordroState.lockedMonths && bordroState.lockedMonths[m.key]).length;

  let lockRowHtml = `
    <tr class="bordro-lock-action-row">
      <td class="cell-row-num" style="color: #34d399; font-weight: 800; font-size: 0.78rem;">🔒</td>
      <td class="cell-sticky-param">
        <div class="bordro-param-title" style="color: #60a5fa;">Ay Onayı</div>
      </td>
      <td class="cell-sticky-param-total" style="text-align: right; padding: 4px 8px;">
        <span class="bordro-locked-summary-pill" id="bordroLockedMonthsCount">${lockedCount} / ${months.length} Onaylı</span>
      </td>
  `;

  months.forEach(m => {
    const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[m.key]);
    const isProjected = isProjectedPeriod(m.key);

    let tdClass = 'cell-lock-btn-col';
    if (isProjected) tdClass += ' cell-projected-month';
    if (isLocked) tdClass += ' cell-month-locked';

    lockRowHtml += `
      <td class="${tdClass}">
        <button
          type="button"
          class="btn-bordro-lock ${isLocked ? 'is-locked' : 'is-unlocked'}"
          onclick="toggleBordroMonthLock('${m.key}')"
          title="${isLocked ? `${m.label} onaylandı ve kilitlendi. Kilidi açmak için tıklayın.` : `${m.label} verilerini onayla ve otomatik hesaplamalara karşı kilitle`}"
        >
          ${isLocked ? '<span>🔒</span> Onaylandı' : '<span>🔓</span> Onayla'}
        </button>
      </td>
    `;
  });

  lockRowHtml += `</tr>`;

  tbody.innerHTML = rowsHtml + lockRowHtml;
}

function toggleBordroMonthLock(periodKey) {
  if (!bordroState.lockedMonths) bordroState.lockedMonths = {};
  const currentlyLocked = !!bordroState.lockedMonths[periodKey];
  bordroState.lockedMonths[periodKey] = !currentlyLocked;
  saveBordroState();

  const months = generateBordroMonthList();
  renderBordroTableHeader(months);
  renderBordroTableBody(months);
  updateAllRowSums();
  renderBordroSummaryCards();
}

function handleBordroCellFocus(inputEl) {
  const periodKey = inputEl.getAttribute('data-period-key');
  const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[periodKey]);
  if (isLocked) {
    inputEl.blur();
    return;
  }

  const paramKey = inputEl.getAttribute('data-param-key');
  const periods = bordroState.periods || {};
  const num = (periods[periodKey] && periods[periodKey][paramKey] !== undefined)
    ? Number(periods[periodKey][paramKey]) || 0
    : 0;

  inputEl.value = num === 0 ? '' : String(num).replace('.', ',');
  inputEl.setAttribute('data-initial-val', inputEl.value.trim());
  setTimeout(() => inputEl.select(), 10);
}

function handleBordroCellBlur(inputEl) {
  const periodKey = inputEl.getAttribute('data-period-key');
  const isLocked = !!(bordroState.lockedMonths && bordroState.lockedMonths[periodKey]);
  if (isLocked) return;

  const paramKey = inputEl.getAttribute('data-param-key');
  const rawText = inputEl.value.trim();
  const initialVal = (inputEl.getAttribute('data-initial-val') || '').trim();
  const parsed = parseBordroInputNum(inputEl.value);

  if (!bordroState.periods) bordroState.periods = {};
  if (!bordroState.periods[periodKey]) bordroState.periods[periodKey] = {};
  if (!bordroState.manualOverrides) bordroState.manualOverrides = {};
  if (!bordroState.manualOverrides[periodKey]) bordroState.manualOverrides[periodKey] = {};

  // Eğer kullanıcı hücreyi boş bıraktıysa override kilidini kaldır
  if (rawText === '' || rawText === '-') {
    delete bordroState.manualOverrides[periodKey][paramKey];
    delete bordroState.periods[periodKey][paramKey];
  } else {
    // Kullanıcı hücreye bir değer girdiyse override olarak kaydet
    bordroState.manualOverrides[periodKey][paramKey] = true;
    bordroState.periods[periodKey][paramKey] = parsed;
  }

  // Eğer kullanıcı doğrudan Toplam veya Günlük Ortalama hücresini elle düzenlemiyorsa,
  // bu hücrelerdeki eski override kilitlerini kaldır ki formül motoru her zaman güncel kalsın
  if (paramKey !== 'toplam') {
    delete bordroState.manualOverrides[periodKey].toplam;
    delete bordroState.manualOverrides[periodKey].calismaGunuBasi;
  }
  if (['yemekYardimi', 'brutUcret', 'sosyalYardim', 'ikramiyeYardimi', 'yolYardimi', 'ekstra', 'muafiyet'].includes(paramKey)) {
    delete bordroState.manualOverrides[periodKey].sgkPrimEsasKazanc;
    delete bordroState.manualOverrides[periodKey].sigortaPrimi;
    delete bordroState.manualOverrides[periodKey].topGelVerMat;
    delete bordroState.manualOverrides[periodKey].kesGelVer;
    delete bordroState.manualOverrides[periodKey].netOdenen;
  }
  if (paramKey === 'asgariUcret') {
    delete bordroState.manualOverrides[periodKey].asgariUcrTopMat;
    delete bordroState.manualOverrides[periodKey].asgariUcrVergi;
    delete bordroState.manualOverrides[periodKey].asgariSonTop;
    delete bordroState.manualOverrides[periodKey].kesGelVer;
    delete bordroState.manualOverrides[periodKey].netOdenen;
  }

  saveBordroState();

  // Formülleri tekrar çalıştırıp zincirleme etkileri güncelle
  recalculateBordroEngine(false);

  // Tabloyu ve özet kartlarını tazele
  const months = generateBordroMonthList();
  renderBordroTableBody(months);
  updateAllRowSums();
  renderBordroSummaryCards();
}

function updateAllRowSums() {
  const periods = bordroState.periods || {};
  BORDRO_ROWS_DEF.forEach(def => {
    let total = 0;
    Object.values(periods).forEach(p => {
      if (p && p[def.key] !== undefined) {
        total += Number(p[def.key]) || 0;
      }
    });
    const sumEl = document.getElementById(`rowSum_${def.key}`);
    if (sumEl) sumEl.textContent = `${formatBordroNum(total)} ₺`;
  });
}

function findNextVisibleBordroRowIdx(startIdx, dir) {
  const hiddenRows = (bordroState && bordroState.hiddenRows) || [];
  let curr = startIdx + dir;
  while (curr >= 0 && curr < BORDRO_ROWS_DEF.length) {
    if (!hiddenRows.includes(BORDRO_ROWS_DEF[curr].key)) {
      return curr;
    }
    curr += dir;
  }
  return -1;
}

function handleBordroCellKeyDown(e, inputEl) {
  const rIdx = parseInt(inputEl.getAttribute('data-row-idx'), 10);
  const cIdx = parseInt(inputEl.getAttribute('data-col-idx'), 10);
  const months = generateBordroMonthList();
  const totalCols = months.length;

  if (e.key === 'Enter') {
    e.preventDefault();
    inputEl.blur();
    const nextDown = findNextVisibleBordroRowIdx(rIdx, 1);
    if (nextDown !== -1) focusBordroCell(nextDown, cIdx);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextDown = findNextVisibleBordroRowIdx(rIdx, 1);
    if (nextDown !== -1) focusBordroCell(nextDown, cIdx);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const nextUp = findNextVisibleBordroRowIdx(rIdx, -1);
    if (nextUp !== -1) focusBordroCell(nextUp, cIdx);
  } else if (e.key === 'ArrowRight' && (inputEl.selectionStart === inputEl.value.length || inputEl.value === '')) {
    if (cIdx + 1 < totalCols) {
      e.preventDefault();
      focusBordroCell(rIdx, cIdx + 1);
    }
  } else if (e.key === 'ArrowLeft' && inputEl.selectionStart === 0) {
    if (cIdx - 1 >= 0) {
      e.preventDefault();
      focusBordroCell(rIdx, cIdx - 1);
    }
  } else if (e.key === 'Escape') {
    inputEl.blur();
  }
}

function focusBordroCell(rIdx, cIdx) {
  const target = document.querySelector(`.bordro-cell-input[data-row-idx="${rIdx}"][data-col-idx="${cIdx}"]`);
  if (target) target.focus();
}

// -------------------------------------------------------------------------
// ÜST ÖZET KARTLARI (YILLIK SEÇİM VE GERÇEKLEŞEN HESAPLAMA)
// "içinde olduğumuz yıl için kartlarda sadece gerçekleşen değerler yani
// içinde olduğumuz aydan bir önceki aya kadar olan kısım baz alınmalı"
// -------------------------------------------------------------------------
function renderBordroSummaryCards() {
  const periods = bordroState.periods || {};
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-based

  const targetYear = selectedSummaryYear;
  const isSelectedCurrentYear = (targetYear === currentYear);

  // Baz alınacak ayları belirle
  // Geçmiş yıllar için 12 ayın tamamı gerçekleşmiştir.
  // İçinde olduğumuz yıl için: 0'dan currentMonthIdx - 1'e kadar (örneğin Ekim ise Eylül sonuna kadar)
  const maxMonthIdx = isSelectedCurrentYear ? (currentMonthIdx - 1) : 11;

  let totalBrut = 0;
  let totalNet = 0;
  let validMonthsCount = 0;

  for (let m = 0; m <= maxMonthIdx; m++) {
    const mStr = String(m + 1).padStart(2, '0');
    const key = `${targetYear}-${mStr}`;
    const p = periods[key];
    if (p) {
      totalBrut += Number(p.brutUcret) || 0;
      totalNet += Number(p.netOdenen) || 0;
    }
    validMonthsCount++;
  }

  const avgBrut = validMonthsCount > 0 ? (totalBrut / validMonthsCount) : 0;
  const avgNet = validMonthsCount > 0 ? (totalNet / validMonthsCount) : 0;

  const elCount = document.getElementById('bordroSumCount');
  const elBrut = document.getElementById('bordroSumBrut');
  const elNet = document.getElementById('bordroSumNet');
  const elAvgBrut = document.getElementById('bordroSumAvgBrut');
  const elAvgNet = document.getElementById('bordroSumAvgNet');

  if (elCount) {
    if (validMonthsCount === 0) {
      elCount.textContent = `${targetYear} (Henüz Veri Yok)`;
    } else {
      const lastMonthName = getMonthNameTR(Math.max(0, validMonthsCount - 1));
      elCount.textContent = isSelectedCurrentYear
        ? `Oca - ${lastMonthName} (${validMonthsCount} Ay Gerçekleşen)`
        : `${targetYear} Tam Yıl (12 Ay)`;
    }
  }

  if (elBrut) elBrut.textContent = formatWalletTL(totalBrut);
  if (elNet) elNet.textContent = formatWalletTL(totalNet);
  if (elAvgBrut) elAvgBrut.textContent = formatWalletTL(avgBrut);
  if (elAvgNet) elAvgNet.textContent = formatWalletTL(avgNet);
}

// -------------------------------------------------------------------------
// VERGİ DİLİMLERİ & BRÜT ASGARİ ÜCRET MODALI YÖNETİMİ
// -------------------------------------------------------------------------
function openTaxBracketsModal() {
  loadBordroState();
  if (!bordroState.taxConfig) {
    bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
  }

  renderTaxYearTabs();
  renderTaxBracketsForYear(activeTaxModalYear);

  const modal = document.getElementById('modalTaxBrackets');
  if (modal) modal.showModal();
}

function renderTaxYearTabs() {
  const container = document.getElementById('taxBracketYearTabs');
  if (!container) return;

  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  container.innerHTML = years.map(y => `
    <button type="button" class="tax-year-tab-btn ${y === activeTaxModalYear ? 'active' : ''}" onclick="selectTaxModalYear(${y})">
      ${y} Yılı
    </button>
  `).join('');
}

function selectTaxModalYear(year) {
  activeTaxModalYear = year;
  renderTaxYearTabs();
  renderTaxBracketsForYear(year);
}

function renderTaxBracketsForYear(year) {
  const cfg = bordroState.taxConfig[year] || DEFAULT_TAX_CONFIG[year] || DEFAULT_TAX_CONFIG[2026];
  const isTwoPeriodYear = (cfg.hasTwoPeriods || year === 2022 || year === 2023);

  const minWageContainer = document.getElementById('taxMinWageContainer');
  if (minWageContainer) {
    if (isTwoPeriodYear) {
      // Çift Asgari Ücret Alanı (1. Dönem ve 2. Dönem)
      minWageContainer.innerHTML = `
        <div style="background: rgba(59, 130, 246, 0.08); padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.25);">
          <div style="font-weight: 800; color: #93c5fd; font-size: 0.82rem; margin-bottom: 8px;">
            <span>${year} Yılı Brüt Asgari Ücretleri (Çift Dönem Zamlı)</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="inputMinWageGross1" style="font-size: 0.73rem; color: #cbd5e1;">
                1. Dönem (Ocak - Haziran)
              </label>
              <div class="input-with-affix">
                <input type="number" step="0.01" inputmode="decimal" id="inputMinWageGross1" value="${Number(cfg.minWageGross1 || cfg.minWageGross || 0) || ''}" placeholder="0.00" onchange="handleTaxMinWageTwoPeriodsChange(${year}, 'minWageGross1', this.value)">
                <span class="affix">₺</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="inputMinWageGross2" style="font-size: 0.73rem; color: #cbd5e1;">
                2. Dönem (Temmuz - Aralık)
              </label>
              <div class="input-with-affix">
                <input type="number" step="0.01" inputmode="decimal" id="inputMinWageGross2" value="${Number(cfg.minWageGross2 || cfg.minWageGross || 0) || ''}" placeholder="0.00" onchange="handleTaxMinWageTwoPeriodsChange(${year}, 'minWageGross2', this.value)">
                <span class="affix">₺</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Tek Asgari Ücret Alanı
      minWageContainer.innerHTML = `
        <div class="form-group" style="background: rgba(59, 130, 246, 0.08); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.25); margin-bottom: 0;">
          <label for="inputMinWageGross" style="font-weight: 700; color: #93c5fd; font-size: 0.8rem; display: flex; justify-content: space-between;">
            <span>${year} Yılı Brüt Asgari Ücret Tutarı:</span>
            <small style="color: var(--text-dim); font-weight: normal;">Damga Vergisi Muafiyeti İçin</small>
          </label>
          <div class="input-with-affix" style="margin-top: 4px;">
            <input type="number" step="0.01" inputmode="decimal" id="inputMinWageGross" value="${Number(cfg.minWageGross || 0) || ''}" placeholder="0.00" onchange="handleTaxMinWageChange(this.value)">
            <span class="affix">₺</span>
          </div>
        </div>
      `;
    }
  }

  const tbody = document.getElementById('taxBracketsTableBody');
  if (!tbody) return;

  const brackets = cfg.brackets || [];
  tbody.innerHTML = brackets.map((b, idx) => `
    <tr>
      <td style="text-align: left; font-weight: 800; color: #fbbf24; padding: 6px 10px;">
        %${b.rate}
      </td>
      <td style="padding: 4px 6px;">
        <input
          type="number"
          step="1"
          inputmode="numeric"
          class="tax-bracket-input"
          value="${b.min !== null && b.min !== undefined ? b.min : ''}"
          placeholder="0"
          onchange="handleBracketLimitChange(${year}, ${idx}, 'min', this.value)"
        >
      </td>
      <td style="padding: 4px 6px;">
        <input
          type="number"
          step="1"
          inputmode="numeric"
          class="tax-bracket-input"
          value="${b.max !== null && b.max !== undefined ? b.max : ''}"
          placeholder="Sınırsız (Üst dilim)"
          onchange="handleBracketLimitChange(${year}, ${idx}, 'max', this.value)"
        >
      </td>
    </tr>
  `).join('');
}

function handleTaxMinWageTwoPeriodsChange(year, field, val) {
  const num = parseFloat(val);
  if (!bordroState.taxConfig[year]) {
    bordroState.taxConfig[year] = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG[year] || DEFAULT_TAX_CONFIG[2026]));
  }
  bordroState.taxConfig[year][field] = isNaN(num) ? 0 : Math.round(num * 100) / 100;
  bordroState.taxConfig[year].hasTwoPeriods = true;
  saveBordroState();
  recalculateBordroEngine(false);
  renderBordroModule();
}

function handleTaxMinWageChange(val) {
  const num = parseFloat(val);
  if (!bordroState.taxConfig[activeTaxModalYear]) {
    bordroState.taxConfig[activeTaxModalYear] = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG[activeTaxModalYear] || DEFAULT_TAX_CONFIG[2026]));
  }
  bordroState.taxConfig[activeTaxModalYear].minWageGross = isNaN(num) ? 0 : Math.round(num * 100) / 100;
  saveBordroState();
  recalculateBordroEngine(false);
  renderBordroModule();
}

function handleBracketLimitChange(year, index, field, val) {
  if (!bordroState.taxConfig[year]) {
    bordroState.taxConfig[year] = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG[year] || DEFAULT_TAX_CONFIG[2026]));
  }
  const brackets = bordroState.taxConfig[year].brackets;
  if (!brackets || !brackets[index]) return;

  if (val === '' || val === null || val === undefined) {
    brackets[index][field] = (field === 'max') ? null : 0;
  } else {
    brackets[index][field] = parseFloat(val) || 0;
  }

  saveBordroState();
  recalculateBordroEngine(false);
  renderBordroModule();
}

function resetTaxBracketsToOfficialDefaults() {
  if (confirm(`${activeTaxModalYear} yılı için resmi varsayılan vergi dilimleri ve brüt asgari ücret yüklensin mi?\n(Diğer yılların tanımları korunur)`)) {
    if (!bordroState.taxConfig) {
      bordroState.taxConfig = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
    }
    // SADECE o an seçili aktif yılın vergi dilimleri ve asgari ücreti güncellenir; diğer yıllara asla dokunulmaz
    if (DEFAULT_TAX_CONFIG[activeTaxModalYear]) {
      bordroState.taxConfig[activeTaxModalYear] = JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG[activeTaxModalYear]));
    }
    saveBordroState();
    renderTaxBracketsForYear(activeTaxModalYear);
    recalculateBordroEngine(false);
  }
}

// -------------------------------------------------------------------------
// BORDRO SATIR GİZLEME / GÖSTERME (ROW VISIBILITY)
// -------------------------------------------------------------------------
function updateBordroRowVisibilityBadge() {
  const hiddenRows = (bordroState && bordroState.hiddenRows) || [];
  const badge = document.getElementById('bordroHiddenRowsBadge');
  if (!badge) return;
  if (hiddenRows.length > 0) {
    badge.textContent = `${hiddenRows.length} Gizli`;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function openBordroRowVisibilityModal() {
  loadBordroState();
  if (!bordroState.hiddenRows || !Array.isArray(bordroState.hiddenRows)) {
    bordroState.hiddenRows = [];
  }
  renderBordroRowVisibilityList();
  const modal = document.getElementById('modalBordroRowVisibility');
  if (modal) modal.showModal();
}

function renderBordroRowVisibilityList() {
  const container = document.getElementById('bordroRowVisibilityList');
  const summaryEl = document.getElementById('bordroRowVisibilitySummary');
  if (!container) return;

  const hiddenRows = (bordroState && bordroState.hiddenRows) || [];
  const totalRows = BORDRO_ROWS_DEF.length;
  const visibleCount = totalRows - hiddenRows.length;

  if (summaryEl) {
    summaryEl.textContent = `${totalRows} satırdan ${visibleCount} tanesi görünür (${hiddenRows.length} gizli)`;
  }

  container.innerHTML = BORDRO_ROWS_DEF.map((def, idx) => {
    const isHidden = hiddenRows.includes(def.key);
    let badgeHtml = '';
    if (def.highlight === 'net') {
      badgeHtml = '<span class="bordro-row-vis-badge-net">Net Gelir</span>';
    } else if (def.highlight === 'total') {
      badgeHtml = '<span class="bordro-row-vis-badge-total">Toplam</span>';
    }

    return `
      <div class="bordro-row-visibility-item ${isHidden ? 'is-hidden' : ''}" onclick="toggleBordroRowVisibility('${def.key}')">
        <div class="bordro-row-vis-left">
          <span class="bordro-row-vis-idx">#${idx + 1}</span>
          <span class="bordro-row-vis-label">${def.label}</span>
          ${badgeHtml}
        </div>
        <div class="bordro-row-vis-toggle">
          <input type="checkbox" ${!isHidden ? 'checked' : ''} style="pointer-events: none;">
        </div>
      </div>
    `;
  }).join('');
}

function toggleBordroRowVisibility(key) {
  if (!bordroState.hiddenRows || !Array.isArray(bordroState.hiddenRows)) {
    bordroState.hiddenRows = [];
  }
  const idx = bordroState.hiddenRows.indexOf(key);
  if (idx >= 0) {
    // Gizliydi -> Görünür yap
    bordroState.hiddenRows.splice(idx, 1);
  } else {
    // Görünürdü -> Gizle
    bordroState.hiddenRows.push(key);
  }
  saveBordroState();
  renderBordroRowVisibilityList();
  const months = generateBordroMonthList();
  renderBordroTableBody(months);
  updateBordroRowVisibilityBadge();
}

function setAllBordroRowsVisibility(showAll) {
  if (!bordroState.hiddenRows || !Array.isArray(bordroState.hiddenRows)) {
    bordroState.hiddenRows = [];
  }
  if (showAll) {
    bordroState.hiddenRows = [];
  }
  saveBordroState();
  renderBordroRowVisibilityList();
  const months = generateBordroMonthList();
  renderBordroTableBody(months);
  updateBordroRowVisibilityBadge();
}

function resetBordroRowsVisibility() {
  bordroState.hiddenRows = [];
  saveBordroState();
  renderBordroRowVisibilityList();
  const months = generateBordroMonthList();
  renderBordroTableBody(months);
  updateBordroRowVisibilityBadge();
}




