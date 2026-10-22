'use strict';

// All recipes describe the output of ONE production band in ONE cycle.
const REC = {
  sword: {
    name: 'Kılıç', icon: '⚔', out: 37, mins: 11, tax: 0.061,
    materials: [{key: 'steelPrice', label: 'Çelik', qty: 59}, {key: 'coalPrice', label: 'Kömür', qty: 59}]
  },
  steel: {
    name: 'Çelik', icon: '▰', out: 72, mins: 4, tax: 0.072,
    materials: [{key: 'ironPrice', label: 'Demir', qty: 108}, {key: 'coalPrice', label: 'Kömür', qty: 36}]
  },
  necklace: {
    name: 'Ferasan İnci Dizisi', icon: '◉', out: 66, mins: 5, tax: 0.059,
    materials: [{key: 'pearlPrice', label: 'Ferasan İncisi', qty: 198}, {key: 'threadPrice', label: 'İpek İpliği', qty: 66}]
  },
  kaftan: {
    name: 'İpekli Kaftan', icon: '♜', out: 94, mins: 9.5, tax: 0.067,
    materials: [{key: 'silkPrice', label: 'İpek', qty: 94}, {key: 'fabricPrice', label: 'Kumaş', qty: 188}]
  },
  basra: {
    name: 'Basra İnci Küpesi', icon: '◇', out: 197, mins: 8.1, tax: 0.059,
    materials: [{key: 'basraPearlPrice', label: 'Basra Ham İncisi', qty: 131}, {key: 'silverPrice', label: 'Gümüş', qty: 66}]
  }
};
const TYPES = Object.keys(REC);
const DEFAULT = {
  product: 'sword', section: 'calc', mode: 'time',
  weekly: {
    sword: 2517, steel: 479, necklace: 1199, kaftan: 1532, basra: 893,
    coalPrice: 53, ironPrice: 182, pearlPrice: 189, threadPrice: 227,
    silkPrice: 554, fabricPrice: 113, basraPearlPrice: 407, silverPrice: 962
  },
  settings: {
    sword: {bands: 3, hours: 1, minutes: 0, quantity: 111, steelPrice: 600, coalPrice: 58, salePrice: 2565, cycleMins: 11, cycleSecs: 0},
    steel: {bands: 3, hours: 1, minutes: 0, quantity: 216, ironPrice: 191, coalPrice: 58, salePrice: 487, cycleMins: 4, cycleSecs: 0},
    necklace: {bands: 1, hours: 1, minutes: 0, quantity: 66, pearlPrice: 167, threadPrice: 156, salePrice: 951, cycleMins: 5, cycleSecs: 0},
    kaftan: {bands: 1, hours: 1, minutes: 0, quantity: 94, silkPrice: 435, fabricPrice: 84, salePrice: 1141, cycleMins: 9, cycleSecs: 30},
    basra: {bands: 1, hours: 1, minutes: 0, quantity: 197, basraPearlPrice: 538, silverPrice: 1088, salePrice: 1046, cycleMins: 8, cycleSecs: 6}
  },
  ledger: []
};
const KEY = 'tuccar-pwa-v1'; // Keep old key to retain existing local data.
const copy = x => JSON.parse(JSON.stringify(x));
let state = load();
let trackType = 'production';
let trackDate = localDate();

function load() {
  const base = copy(DEFAULT);
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && data.settings && Array.isArray(data.ledger)) {
      for (const id of TYPES) {
        const saved = data.settings[id] || {};
        Object.assign(base.settings[id], saved);
        // Upgrade v1.2 fractional-minute cycle input without losing saved changes.
        if (!Object.prototype.hasOwnProperty.call(saved,'cycleMins') && Number.isFinite(Number(saved.cycleMinutes))) {
          const totalSeconds=Math.max(0,Math.round(num(saved.cycleMinutes)*60));
          base.settings[id].cycleMins=Math.floor(totalSeconds/60);
          base.settings[id].cycleSecs=totalSeconds%60;
        }
      }
      if (data.weekly && typeof data.weekly==='object') {
        for (const k of Object.keys(base.weekly)) {
          const v=Number(data.weekly[k]);
          if (Number.isFinite(v) && v>=0) base.weekly[k]=v;
        }
      }
      base.ledger = data.ledger;
      if (TYPES.includes(data.product)) base.product = data.product;
      if (['calc', 'track'].includes(data.section)) base.section = data.section;
      if (['time', 'quantity'].includes(data.mode)) base.mode = data.mode;
    }
  } catch (_) { /* A bad local record should not blank the app. */ }
  return base;
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function localDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
function num(value) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function fmt(value, digits = 0) { return num(value).toLocaleString('tr-TR', {minimumFractionDigits:digits, maximumFractionDigits:digits}); }
function money(value) { return fmt(Math.round(num(value))) + ' akçe'; }
function safe(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function field(label, key, value, step='any') {
  return `<div class="field"><label for="${key}">${safe(label)}</label><input id="${key}" data-key="${key}" inputmode="decimal" type="number" min="0" step="${step}" value="${safe(value)}" autocomplete="off"></div>`;
}
function cycleSeconds(id) {
  const item=state.settings[id];
  const mins=Math.max(0,Math.floor(num(item.cycleMins)));
  const secs=Math.max(0,Math.min(59,Math.floor(num(item.cycleSecs))));
  return mins*60+secs;
}
function cycleLength(id) { return cycleSeconds(id)/60; }
function durationText(minutes) {
  const seconds = Math.round(num(minutes) * 60);
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
  return (h ? h + ' sa ' : '') + m + ' dk ' + String(s).padStart(2,'0') + ' sn';
}
function materialCost(id, prices, qty) {
  const r = REC[id];
  return r.materials.reduce((sum, m) => sum + qty * m.qty / r.out * num(prices[m.key]), 0);
}
function calcFor(id) {
  const r = REC[id], s = state.settings[id], bands = Math.max(1, Math.floor(num(s.bands)));
  const seconds = cycleSeconds(id), duration = seconds/60;
  const secondsRequested = Math.max(0, num(s.hours)*3600 + num(s.minutes)*60);
  const cycles = seconds > 0 ? (state.mode === 'time'
    ? Math.floor(secondsRequested / seconds + 1e-8)
    : Math.ceil(Math.max(0,num(s.quantity)) / (r.out * bands))) : 0;
  const output = cycles * r.out * bands;
  const minutes = cycles * duration;
  const materials = r.materials.map(m => ({...m, qtyTotal: cycles * bands * m.qty}));
  const cost = materialCost(id, s, output), gross = output * num(s.salePrice), tax = gross * r.tax;
  const profit = gross - tax - cost;
  const profitPerCycle = (r.out * num(s.salePrice) * (1-r.tax) - materialCost(id, s, r.out)) * bands;
  return {
    bands, cycles, output, minutes, materials, cost, gross, tax, profit,
    unitCost: materialCost(id, s, r.out)/r.out,
    unitProfit: num(s.salePrice) * (1-r.tax) - materialCost(id, s, r.out)/r.out,
    theoreticalHour: duration ? profitPerCycle * (60/duration) : 0,
    completeHour: seconds ? profitPerCycle * Math.floor(3600/seconds + 1e-8) : 0,
    excess: state.mode === 'quantity' ? Math.max(0, output - num(s.quantity)) : 0
  };
}
function calcResultHtml() {
  const id = state.product, r = REC[id], c = calcFor(id);
  const s = state.settings[id];
  const netPerItem = num(s.salePrice) * (1-r.tax);
  const breakEven = (1-r.tax) > 0 ? Math.ceil(c.unitCost / (1-r.tax)) : 0;
  const matSummary = c.materials.map(m => `${fmt(m.qtyTotal)} ${safe(m.label.toLocaleLowerCase('tr-TR'))}`).join(' · ');
  const profitClass = c.unitProfit >= 0 ? 'profit' : 'loss';
  return `<section class="card" id="calcResult"><h2>Hesaplama sonucu</h2>
    <div class="unit-section"><div class="unit-title"><span>📦 TEK ÜRÜN HESABI</span><span class="unit-count">1 adet</span></div>
      <div class="unit-grid">
        <div class="unit-tile cost"><div class="unit-label">◉ Birim maliyet</div><strong>${money(c.unitCost)}</strong><small>1 adet üretmenin maliyeti</small></div>
        <div class="unit-tile ${profitClass}"><div class="unit-label">↗ Birim net kâr</div><strong>${money(c.unitProfit)}</strong><small>Vergi sonrası, 1 adet satışta</small></div>
      </div>
      <div class="unit-details"><span>Satış: <b>${money(s.salePrice)}</b></span><span>Vergi sonrası: <b>${money(netPerItem)}</b></span><span>Başabaş: <b>${money(breakEven)}</b></span></div>
    </div>
    <div class="stats">
      <div class="stat primary"><small>Seçilen üretimde toplam net kâr</small><strong>${money(c.profit)}</strong></div>
      <div class="stat"><small>60 dakikada biten üretimlerin kârı</small><strong>${money(c.completeHour)}</strong></div>
      <div class="stat"><small>Teorik saatlik kâr (kesintisiz hız)</small><strong>${money(c.theoreticalHour)}</strong></div>
      <div class="stat"><small>Üretim miktarı</small><strong>${fmt(c.output)} adet</strong></div>
      <div class="stat"><small>Üretim süresi</small><strong>${durationText(c.minutes)}</strong></div>
      <div class="stat"><small>Tam döngü (bant başına)</small><strong>${fmt(c.cycles)}</strong></div>
    </div>
    <div class="row"><span>Hammadde</span><span>${matSummary}</span></div>
    <div class="row"><span>Toplam hammadde maliyeti</span><span>${money(c.cost)}</span></div>
    <div class="row"><span>Brüt satış</span><span>${money(c.gross)}</span></div>
    <div class="row"><span>Satış vergisi (%${fmt(r.tax*100,1)})</span><span>−${money(c.tax)}</span></div>
    ${state.mode==='quantity' ? `<div class="row"><span>Hedef üzeri üretim</span><span>${fmt(c.excess)} adet</span></div>` : ''}
    <p class="hint">Tutarlar yalnız ekranda en yakın tam akçeye yuvarlanır; hesaplamalar tam hassasiyetle yapılır. 60 dakikalık kâr tamamlanan döngüleri içerir. Tüm ürünlerin belirtilen fiyattan satıldığı varsayılır.</p>
  </section>`;
}
const WHOLESALE_RATE=0.90*1.02; // Finished goods: 10% wholesale discount, 2% sale bonus.
const BUY_RATE=1-0.045; // Bazaar purchase discount from the supplied ability screenshot.
function comparison(current, weekly, ratio, sale=false) {
  const target=weekly*ratio;
  if (!(target>0)) return {cls:'neutral',label:'Ortalama fiyat girilmeli',pct:0,target:0};
  const pct=100*(current/target-1);
  const high=pct>=5, low=pct<=-5;
  const cls=sale?(high?'good':low?'bad':'neutral'):(low?'good':high?'bad':'neutral');
  const level=sale?(high?'Satış için yüksek fiyat':low?'Satış için düşük fiyat':'Ortalama civarında'):(low?'Alış için düşük fiyat':high?'Alış için yüksek fiyat':'Ortalama civarında');
  return {cls,label:level,pct,target};
}
function marketStatusHtml(value,weekly,ratio,sale) {
  const c=comparison(value,weekly,ratio,sale);
  if (!c.target) return '<span class="market-pill neutral">Ortalama bekleniyor</span>';
  const sign=c.pct>=0?'+':'−';
  return `<span class="market-pill ${c.cls}">${sign}%${fmt(Math.abs(c.pct),1)} · ${c.label}</span>`;
}
function marketResultHtml() {
  const id=state.product,r=REC[id],s=state.settings[id],weekly=num(state.weekly[id]);
  const materials=r.materials.map(m=>{
    if (id==='sword' && m.key==='steelPrice') {
      return `<div class="market-line"><span>${safe(m.label)} · oyuncu pazarı</span><span class="market-pill neutral">${money(s[m.key])} · bağımsız fiyat</span></div>`;
    }
    const reference=num(state.weekly[m.key]);
    return `<div class="market-line"><span>${safe(m.label)} · ${money(s[m.key])} alış</span>${marketStatusHtml(num(s[m.key]),reference,BUY_RATE,false)}</div>`;
  }).join('');
  return `<div class="market-focus"><span>Bugünkü toptan satış: <b>${money(s.salePrice)}</b></span><span>Haftalık toptan karşılığı: <b>${money(weekly*WHOLESALE_RATE)}</b></span></div>
    <div class="market-main">${marketStatusHtml(num(s.salePrice),weekly,WHOLESALE_RATE,true)}</div>
    <div class="market-lines">${materials}</div>
    <p class="hint">Kıyaslama, haftalık <b>çarşı ortalamasını</b> aynı tür alış/satış fiyatına yaklaşık dönüştürür. Ürün satışında ×0,918; hammadde alışında ×0,955 kullanılır. Kâr hesabına ayrıca müdahale etmez.</p>`;
}
function marketHtml() {
  const id=state.product,r=REC[id];
  const inputs=[{key:id,label:r.name+' haftalık çarşı ortalaması'}, ...r.materials
    .filter(m=>!(id==='sword'&&m.key==='steelPrice'))
    .map(m=>({key:m.key,label:m.label+' haftalık çarşı ortalaması'}))];
  return `<section class="card market-card"><h2>📊 Haftalık fiyat değerlendirmesi</h2>
    <div id="marketResult">${marketResultHtml()}</div>
    <details id="marketSettings"><summary>Haftalık ortalamaları düzenle</summary>
      <div class="grid market-edit-grid">${inputs.map(x=>field(x.label,'weekly_'+x.key,state.weekly[x.key],'1').replace(`data-key="weekly_${x.key}"`,`data-weekly="${x.key}"`)).join('')}</div>
      <p class="hint">Yalnız ortalama fiyatları düzenlemen yeterli. Değerler cihazında saklanır. Bunlar önceki ekran görüntülerinden alınan haftalık ortalamalardır; piyasa kendiliğinden güncellenmez.</p>
    </details>
  </section>`;
}
function refreshMarketResult() {
  const el=document.getElementById('marketResult');
  if (el) el.innerHTML=marketResultHtml();
}
function calcHtml() {
  const id = state.product, r = REC[id], s = state.settings[id], duration = cycleLength(id);
  return `<section class="card"><h2>${safe(r.name)} üretim ayarları</h2>
    <div class="grid">${field('Üretim bandı', 'bands', s.bands, '1')}
      ${field('Satış fiyatı (akçe)', 'salePrice', s.salePrice)}
      ${r.materials.map(m => field(m.label+' alış fiyatı (akçe)', m.key, s[m.key])).join('')}
    </div>
    <div class="cycle-time"><div class="cycle-heading">⏱ Bir üretim döngüsünün süresi</div>
      <div class="grid cycle-grid">${field('Dakika','cycleMins',s.cycleMins,'1')}${field('Saniye (0–59)','cycleSecs',s.cycleSecs,'1')}</div>
      <div class="cycle-preview">Hesaplanan süre: <strong id="cyclePreview">${durationText(duration)}</strong></div>
    </div>
    <p class="hint">Bant başına 1 döngü: ${fmt(r.out)} adet · ${durationText(duration)} · ${r.materials.map(m=>fmt(m.qty)+' '+safe(m.label.toLocaleLowerCase('tr-TR'))).join(' + ')} · satış vergisi %${fmt(r.tax*100,1)}. İşçilik kesintisi yok. Süreyi doğruladığın fiilî döngüye göre gir; ekstra bonus uygulanmaz.</p>
  </section>
  ${marketHtml()}
  <section class="card"><h2>Hesaplama yöntemi</h2>
    <div class="toggle"><button data-mode="time" class="${state.mode==='time'?'active':''}">Süreye göre</button><button data-mode="quantity" class="${state.mode==='quantity'?'active':''}">Adede göre</button></div>
    ${state.mode==='time'?`<div class="grid">${field('Saat','hours',s.hours,'1')}${field('Dakika','minutes',s.minutes,'1')}</div>`:field('Hedef üretim adedi','quantity',s.quantity,'1')}
    <p class="hint">Süre hesabında yalnız tamamlanan döngüler sayılır. Hedef adette ise gerekli döngü sayısı yukarı yuvarlanır.</p>
  </section>
  ${calcResultHtml()}`;
}
function replay(entries=state.ledger) {
  const inv = Object.fromEntries(TYPES.map(id=>[id,{qty:0,value:0}]));
  const records = [];
  const sorted = [...entries].sort((a,b) => a.date.localeCompare(b.date) || a.created-b.created || String(a.id).localeCompare(String(b.id)));
  for (const e of sorted) {
    if (!REC[e.product] || !['production','sale'].includes(e.type)) return {error:'Geçersiz ürün veya işlem kaydı.'};
    const q = num(e.qty), item = inv[e.product], unit = item.qty>0 ? item.value/item.qty : 0;
    if (!(q>0)) return {error:'Ürün miktarı pozitif olmalıdır.'};
    if (e.type === 'production') {
      let cost = 0;
      if (e.product === 'sword') {
        const steelNeeded = q*59/37, steel = inv.steel;
        if (steel.qty + 1e-7 < steelNeeded) return {error:`${e.date}: Kılıç üretimi için yeterli çelik stoğu yok (${fmt(steelNeeded,2)} gerekli).`};
        const used = steelNeeded * (steel.qty ? steel.value/steel.qty : 0);
        steel.qty = Math.max(0, steel.qty-steelNeeded);
        steel.value = Math.max(0, steel.value-used);
        cost = used + q*59/37*num(e.coalPrice);
      } else {
        cost = materialCost(e.product, e, q);
      }
      item.qty += q;
      item.value += cost;
      records.push({...e,cost,tax:0,profit:0,revenue:0});
    } else {
      if (item.qty + 1e-7 < q) return {error:`${e.date}: ${REC[e.product].name} satışı için yeterli stok yok.`};
      const cost = q*unit, gross = q*num(e.price), tax = gross*REC[e.product].tax;
      item.qty = Math.max(0, item.qty-q);
      item.value = Math.max(0, item.value-cost);
      records.push({...e,cost,tax,revenue:gross-tax,profit:gross-tax-cost});
    }
  }
  return {inv,records};
}
function dailySummary(id,date) {
  const result = replay();
  if (result.error) return result;
  const rows = result.records.filter(e=>e.product===id && e.date===date);
  const sum = (kind,key) => rows.filter(x=>x.type===kind).reduce((total,e)=>total+num(e[key]),0);
  return {
    made:sum('production','qty'), sold:sum('sale','qty'),
    revenue:sum('sale','revenue'), profit:sum('sale','profit'),
    tax:sum('sale','tax'), rows, stock:result.inv[id]
  };
}
function trackHtml() {
  const id = state.product, s = state.settings[id], r = REC[id], summary = dailySummary(id,trackDate);
  if (summary.error) return `<section class="card"><h2>Kayıt hatası</h2><p>${safe(summary.error)}</p></section>`;
  const matFields = r.materials.filter(m=>!(id==='sword' && m.key==='steelPrice'))
    .map(m=>field(m.label+' alış fiyatı (akçe)','entry_'+m.key,s[m.key])).join('');
  return `<section class="card"><h2>Günlük ${safe(r.name)} takibi</h2>
    <div class="field"><label for="trackDate">Tarih</label><input type="date" id="trackDate" value="${trackDate}"></div>
    <div class="stats"><div class="stat"><small>Üretilen</small><strong>${fmt(summary.made)} adet</strong></div>
      <div class="stat"><small>Satılan</small><strong>${fmt(summary.sold)} adet</strong></div>
      <div class="stat"><small>Güncel stok (tüm günler)</small><strong>${fmt(summary.stock.qty)} adet</strong></div>
      <div class="stat"><small>Net satış geliri</small><strong>${money(summary.revenue)}</strong></div>
      <div class="stat primary"><small>Günlük gerçekleşen net kâr</small><strong>${money(summary.profit)}</strong></div></div>
    <p class="hint">Stok tüm kayıtların güncel toplamıdır. Günlük kâr yalnız gerçekleşen satışlara göre hesaplanır.</p>
  </section>
  <section class="card"><h2>Yeni işlem kaydet</h2>
    <div class="toggle"><button data-type="production" class="${trackType==='production'?'active':''}">Üretim</button><button data-type="sale" class="${trackType==='sale'?'active':''}">Satış</button></div>
    <form id="entryForm"><div class="grid">${trackType==='production' ?
      field('Tam üretim döngüsü (bant başına)','entryCycles',1,'1')+
      field('Üretim bandı','entryBands',s.bands,'1')+matFields :
      field('Satılan adet','entryQty',1,'1')+field('Birim satış fiyatı (akçe)','entryPrice',s.salePrice)}
    </div>${trackType==='production'?`<p class="hint">Üretilecek miktar: <strong id="entryOutput">${fmt(r.out*Math.max(1,num(s.bands)))} adet</strong>. ${id==='sword'?'Çelik, kayıtlı çelik stoğundan düşülür.':'Hammaddeler girilen fiyat üzerinden maliyetlendirilir.'}</p>`:''}
    <button class="btn" type="submit">${trackType==='production'?'Üretimi kaydet':'Satışı kaydet'}</button></form>
  </section>
  <section class="card"><h2>${safe(trackDate)} işlem geçmişi</h2><div class="history">
    ${summary.rows.length ? summary.rows.slice().reverse().map(e=>`<div class="entry"><div class="top"><strong>${e.type==='production'?'Üretim +':'Satış −'}${fmt(e.qty)} adet</strong><button data-delete="${safe(e.id)}">Sil</button></div><small>${e.type==='sale'?`Net kâr: ${money(e.profit)} · vergi: ${money(e.tax)}`:`Üretim maliyeti: ${money(e.cost)}`}</small></div>`).join(''):'<p class="muted">Bu tarihte kayıt yok.</p>'}</div>
  </section>
  <section class="card"><h2>Veri yedekleme</h2><p class="hint">Kayıtların bu tarayıcıda saklanır. Telefon değiştirirken veya tarayıcı verilerini silmeden önce yedek al.</p>
    <div class="actions"><button class="btn secondary" id="exportBtn">Yedek indir</button><button class="btn secondary" id="importBtn">Yedek yükle</button><input type="file" accept="application/json,.json" id="importFile" hidden></div>
  </section>`;
}
function nav() {
  document.querySelectorAll('[data-product]').forEach(b=>b.classList.toggle('active',b.dataset.product===state.product));
  document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===state.section));
}
function render() {
  nav();
  document.getElementById('app').innerHTML = state.section==='calc' ? calcHtml() : trackHtml();
  bind();
}
function refreshCalcResult() {
  // Crucial mobile fix: only redraw OUTPUT. Never replace or refocus the input
  // while a user types. Number inputs do not reliably support setSelectionRange.
  const output = document.getElementById('calcResult');
  if (output) output.outerHTML = calcResultHtml();
}
function bind() {
  document.querySelectorAll('[data-weekly]').forEach(el=>el.addEventListener('input',()=>{
    const k=el.dataset.weekly;
    state.weekly[k]=el.value;
    save();
    refreshMarketResult();
  }));
  document.querySelectorAll('[data-key]').forEach(el=>el.addEventListener('input',()=>{
    const key = el.dataset.key;
    if (state.section === 'calc') {
      state.settings[state.product][key] = el.value;
      save();
      refreshCalcResult();
      if (key==='cycleMins'||key==='cycleSecs') {
        const label=document.getElementById('cyclePreview');
        if(label)label.textContent=durationText(cycleLength(state.product));
      }
      refreshMarketResult();
    } else if (key === 'entryCycles' || key === 'entryBands') {
      const out = document.getElementById('entryOutput');
      if (out) out.textContent = fmt(REC[state.product].out*num(document.getElementById('entryCycles').value)*num(document.getElementById('entryBands').value)) + ' adet';
    }
  }));
  document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{state.mode=el.dataset.mode;save();render()});
  document.querySelectorAll('[data-type]').forEach(el=>el.onclick=()=>{trackType=el.dataset.type;render()});
  const date=document.getElementById('trackDate');if(date)date.onchange=()=>{trackDate=date.value||localDate();render()};
  const form=document.getElementById('entryForm');if(form)form.onsubmit=addEntry;
  document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>removeEntry(el.dataset.delete));
  const ex=document.getElementById('exportBtn');if(ex)ex.onclick=exportData;
  const imp=document.getElementById('importBtn');if(imp)imp.onclick=()=>document.getElementById('importFile').click();
  const file=document.getElementById('importFile');if(file)file.onchange=importData;
}
function addEntry(event) {
  event.preventDefault();
  const id=state.product, r=REC[id], get=key=>num(document.getElementById(key)?.value);
  let entry={id:crypto.randomUUID(),date:trackDate,created:Date.now(),product:id,type:trackType};
  if (trackType==='production') {
    const cycles=get('entryCycles'),bands=get('entryBands');
    if (!Number.isInteger(cycles)||cycles<=0||!Number.isInteger(bands)||bands<=0) return alert('Döngü ve bant sayısı pozitif tam sayı olmalı.');
    entry.qty = cycles*bands*r.out;
    r.materials.filter(m=>!(id==='sword'&&m.key==='steelPrice')).forEach(m=>{entry[m.key]=get('entry_'+m.key)});
  } else {
    const qty=get('entryQty'),price=get('entryPrice');
    if (!Number.isInteger(qty)||qty<=0||price<0) return alert('Adet pozitif tam sayı, satış fiyatı sıfır veya üzeri olmalı.');
    Object.assign(entry,{qty,price});
  }
  if (Object.values(entry).some(v=>typeof v==='number' && (!Number.isFinite(v)||v<0))) return alert('Geçersiz veya negatif bir değer girdin.');
  const check=replay([...state.ledger,entry]);
  if (check.error) return alert(check.error+' Önce gerekli üretim veya stok kaydını gir.');
  state.ledger.push(entry);save();render();
}
function removeEntry(id) {
  if(!confirm('Bu işlemi silmek istediğine emin misin?'))return;
  const next=state.ledger.filter(e=>e.id!==id),check=replay(next);
  if(check.error)return alert('Bu silme sonraki stokları bozuyor: '+check.error);
  state.ledger=next;save();render();
}
function exportData() {
  const blob=new Blob([JSON.stringify({version:4,exportedAt:new Date().toISOString(),settings:state.settings,weekly:state.weekly,ledger:state.ledger},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tuccar-yedek-'+localDate()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importData(event) {
  const f=event.target.files?.[0];if(!f)return;
  try {
    const data=JSON.parse(await f.text());
    if (!data.settings?.sword||!data.settings?.steel||!Array.isArray(data.ledger)||data.ledger.length>100000||
      data.ledger.some(e=>!TYPES.includes(e.product)||!['production','sale'].includes(e.type)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(e.qty)||e.qty<=0)) throw Error('Geçersiz yedek biçimi.');
    const check=replay(data.ledger);if(check.error)throw Error(check.error);
    if(!confirm('Mevcut kayıtlar ve ayarlar yedekle değiştirilecek. Devam edilsin mi?'))return;
    for (const id of TYPES) {
      const saved=data.settings[id]||{};
      state.settings[id]={...DEFAULT.settings[id],...saved};
      if(!Object.prototype.hasOwnProperty.call(saved,'cycleMins') && Number.isFinite(Number(saved.cycleMinutes))) {
        const seconds=Math.max(0,Math.round(num(saved.cycleMinutes)*60));
        state.settings[id].cycleMins=Math.floor(seconds/60);
        state.settings[id].cycleSecs=seconds%60;
      }
    }
    state.weekly={...DEFAULT.weekly,...(data.weekly||{})};
    state.ledger=data.ledger;save();render();
  } catch (err) {alert('Yedek yüklenemedi: '+err.message)}
}
function init() {
  // Inject layout and v1.3 highlights so an existing installation only needs
  // app.js and sw.js to be replaced. Previous style.css can stay unchanged.
  const responsiveStyle=document.createElement('style');
  responsiveStyle.textContent=`
    #products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
    #products button{min-width:0;white-space:normal;font-size:12px;line-height:1.2;min-height:50px}
    .field input[type=number]{direction:ltr;text-align:left}
    .cycle-time{margin-top:12px;border-radius:12px;background:#111b30;border:1px solid #3b5068;padding:13px}
    .cycle-heading{font-size:13px;font-weight:750;margin-bottom:10px}
    .cycle-grid{max-width:420px}
    .cycle-preview{font-size:12px;color:#cbd5e1}.cycle-preview strong{color:#93c5fd}
    .market-card h2{margin-bottom:14px}
    .market-focus{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .market-focus span{display:block;background:#0f192b;border-radius:10px;padding:10px;font-size:12px;color:#9ca3af}
    .market-focus b{display:block;color:#e5e7eb;margin-top:5px;font-size:16px}
    .market-main{margin:12px 0}
    .market-pill{display:inline-block;font-size:12px;font-weight:750;border:1px solid;padding:5px 9px;border-radius:9px}
    .market-pill.good{color:#86efac;background:#123628;border-color:#27845e}
    .market-pill.bad{color:#fda4af;background:#431b27;border-color:#9f4352}
    .market-pill.neutral{color:#fdba74;background:#3b2b1d;border-color:#94662d}
    .market-line{display:flex;align-items:center;justify-content:space-between;gap:9px;border-bottom:1px solid #2a354a;padding:9px 0;font-size:12px}
    .market-line span:first-child{flex:1}.market-line .market-pill{text-align:right;max-width:65%}
    .market-card details{border-top:1px solid #2e3c52;padding-top:12px;margin-top:14px}
    .market-card summary{cursor:pointer;color:#93c5fd;font-size:13px;font-weight:700}
    .market-edit-grid{margin-top:12px}
    @media(max-width:420px){.market-focus{grid-template-columns:1fr}.market-line{align-items:start;flex-direction:column}.market-line .market-pill{max-width:none}}
    .unit-section{background:#0d1729;border:1px solid #34465c;border-radius:14px;padding:13px;margin:4px 0 15px}
    .unit-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:12px;font-weight:750;letter-spacing:.5px;margin-bottom:12px}
    .unit-count{background:#29354b;padding:4px 9px;border-radius:99px;color:#e2e8f0;letter-spacing:0}
    .unit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .unit-tile{border-radius:13px;padding:14px 10px;border:1px solid}
    .unit-tile.cost{background:#382a19;border-color:#92612b;color:#fcd59c}
    .unit-tile.profit{background:#123628;border-color:#27845e;color:#a7f3d0}
    .unit-tile.loss{background:#471e26;border-color:#b45364;color:#fecdd3}
    .unit-label{font-size:12px;font-weight:750;min-height:31px}
    .unit-tile strong{display:block;font-size:clamp(16px,4vw,22px);line-height:1.2;margin:5px 0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .unit-tile small{display:block;color:#cbd5e1;font-size:11px;line-height:1.35}
    .unit-details{display:flex;gap:8px 15px;flex-wrap:wrap;margin-top:13px;color:#cbd5e1;font-size:12px}
    .unit-details b{color:#f1f5f9}
    @media(min-width:680px){#products{grid-template-columns:repeat(5,minmax(0,1fr))}}
    @media(max-width:375px){.unit-grid{grid-template-columns:1fr}.unit-label{min-height:0}}
  `;
  document.head.appendChild(responsiveStyle);
  const products=document.getElementById('products');
  products.innerHTML=TYPES.map(id=>`<button data-product="${id}" title="${safe(REC[id].name)}">${REC[id].icon} ${safe(REC[id].name)}</button>`).join('');
  const pill=document.querySelector('header .pill');if(pill)pill.textContent='v1.3';
  products.addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b){state.product=b.dataset.product;save();render()}});
  document.getElementById('sections').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b){state.section=b.dataset.section;save();render()}});
  if ('serviceWorker' in navigator) {
    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  render();
}
init();
