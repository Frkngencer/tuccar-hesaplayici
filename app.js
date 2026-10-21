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
    name: 'Ferasan İnci Dizisi', icon: '◉', out: 66, mins: 5, tax: 0.061,
    materials: [{key: 'pearlPrice', label: 'Ferasan İncisi', qty: 198}, {key: 'threadPrice', label: 'İpek İpliği', qty: 66}]
  },
  kaftan: {
    name: 'İpekli Kaftan', icon: '♜', out: 94, mins: 9.5, tax: 0.061,
    materials: [{key: 'silkPrice', label: 'İpek', qty: 94}, {key: 'fabricPrice', label: 'Kumaş', qty: 188}]
  }
};
const TYPES = Object.keys(REC);
const DEFAULT = {
  product: 'sword', section: 'calc', mode: 'time',
  settings: {
    sword: {bands: 3, hours: 1, minutes: 0, quantity: 111, steelPrice: 650, coalPrice: 52, salePrice: 2900},
    steel: {bands: 3, hours: 1, minutes: 0, quantity: 216, ironPrice: 159, coalPrice: 52, salePrice: 600},
    necklace: {bands: 1, hours: 1, minutes: 0, quantity: 66, pearlPrice: 222, threadPrice: 241, salePrice: 1311, cycleMinutes: 5},
    kaftan: {bands: 1, hours: 1, minutes: 0, quantity: 94, silkPrice: 464, fabricPrice: 125, salePrice: 1348, cycleMinutes: 9.5}
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
      for (const id of TYPES) Object.assign(base.settings[id], data.settings[id] || {});
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
function money(value) { return fmt(value, 2) + ' akçe'; }
function safe(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function field(label, key, value, step='any') {
  return `<div class="field"><label for="${key}">${safe(label)}</label><input id="${key}" data-key="${key}" inputmode="decimal" type="number" min="0" step="${step}" value="${safe(value)}" autocomplete="off"></div>`;
}
function cycleLength(id) {
  return id === 'kaftan' || id === 'necklace' ? num(state.settings[id].cycleMinutes) : REC[id].mins;
}
function materialCost(id, prices, qty) {
  const r = REC[id];
  return r.materials.reduce((sum, m) => sum + qty * m.qty / r.out * num(prices[m.key]), 0);
}
function calcFor(id) {
  const r = REC[id], s = state.settings[id], bands = Math.max(1, Math.floor(num(s.bands)));
  const duration = cycleLength(id);
  const minutesRequested = Math.max(0, num(s.hours)*60 + num(s.minutes));
  const cycles = duration > 0 ? (state.mode === 'time'
    ? Math.floor(minutesRequested / duration + 1e-8)
    : Math.ceil(Math.max(0,num(s.quantity)) / (r.out * bands))) : 0;
  const output = cycles * r.out * bands;
  const minutes = cycles * duration;
  const materials = r.materials.map(m => ({...m, qtyTotal: cycles * bands * m.qty}));
  const cost = materialCost(id, s, output), gross = output * num(s.salePrice), tax = gross * r.tax;
  const profit = gross - tax - cost;
  const profitPerCycle = (r.out * num(s.salePrice) * (1-r.tax) - materialCost(id, s, r.out)) * bands;
  return {
    bands, cycles, output, minutes, materials, cost, gross, tax, profit,
    unitCost: output ? cost/output : 0,
    unitProfit: output ? profit/output : 0,
    theoreticalHour: duration ? profitPerCycle * (60/duration) : 0,
    completeHour: duration ? profitPerCycle * Math.floor(60/duration + 1e-8) : 0,
    excess: state.mode === 'quantity' ? Math.max(0, output - num(s.quantity)) : 0
  };
}
function calcResultHtml() {
  const id = state.product, r = REC[id], c = calcFor(id);
  const matSummary = c.materials.map(m => `${fmt(m.qtyTotal)} ${safe(m.label.toLocaleLowerCase('tr-TR'))}`).join(' · ');
  return `<section class="card" id="calcResult"><h2>Hesaplama sonucu</h2>
    <div class="stats">
      <div class="stat primary"><small>Net kâr (seçilen üretim)</small><strong>${money(c.profit)}</strong></div>
      <div class="stat"><small>60 dakikada tamamlanan döngülerle kâr</small><strong>${money(c.completeHour)}</strong></div>
      <div class="stat"><small>Teorik saatlik kâr (kesintisiz hız)</small><strong>${money(c.theoreticalHour)}</strong></div>
      <div class="stat"><small>Üretim</small><strong>${fmt(c.output)} adet</strong></div>
      <div class="stat"><small>Üretim süresi</small><strong>${fmt(c.minutes, 2)} dk</strong></div>
      <div class="stat"><small>Tam döngü (bant başına)</small><strong>${fmt(c.cycles)}</strong></div>
    </div>
    <div class="row"><span>Hammadde</span><span>${matSummary}</span></div>
    <div class="row"><span>Hammadde maliyeti</span><span>${money(c.cost)}</span></div>
    <div class="row"><span>Brüt satış</span><span>${money(c.gross)}</span></div>
    <div class="row"><span>Satış vergisi (%${fmt(r.tax*100,1)})</span><span>−${money(c.tax)}</span></div>
    <div class="row"><span>Birim maliyet</span><span>${money(c.unitCost)}</span></div>
    <div class="row"><span>Birim net kâr</span><span>${money(c.unitProfit)}</span></div>
    ${state.mode==='quantity' ? `<div class="row"><span>Hedef üzeri üretim</span><span>${fmt(c.excess)} adet</span></div>` : ''}
    <p class="hint">60 dakika hesabı yalnız biten döngüleri içerir. Teorik saatlik hız, döngü kârının 60 dakikaya oranıdır. Ürünlerin tamamının seçilen fiyattan satıldığı varsayılır.</p>
  </section>`;
}
function calcHtml() {
  const id = state.product, r = REC[id], s = state.settings[id], duration = cycleLength(id);
  return `<section class="card"><h2>${safe(r.name)} üretim ayarları</h2>
    <div class="grid">${field('Üretim bandı', 'bands', s.bands, '1')}
      ${field('Satış fiyatı (akçe)', 'salePrice', s.salePrice)}
      ${r.materials.map(m => field(m.label+' alış fiyatı (akçe)', m.key, s[m.key])).join('')}
      ${(id==='kaftan'||id==='necklace') ? field('Bir döngü süresi (dakika)', 'cycleMinutes', s.cycleMinutes, '0.01') : ''}
    </div>
    <p class="hint">Bant başına 1 döngü: ${fmt(r.out)} adet · ${fmt(duration,2)} dakika · ${r.materials.map(m=>fmt(m.qty)+' '+safe(m.label.toLocaleLowerCase('tr-TR'))).join(' + ')} · satış vergisi %${fmt(r.tax*100,1)}. İşçilik kesintisi yok.${id==='kaftan'?' Süre geçici olarak 9,5 dakika alındı; kesinleşince buradan değiştirebilirsin.':''}</p>
  </section>
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
      <div class="stat"><small>Güncel stok (tüm günler)</small><strong>${fmt(summary.stock.qty,2)} adet</strong></div>
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
  document.querySelectorAll('[data-key]').forEach(el=>el.addEventListener('input',()=>{
    const key = el.dataset.key;
    if (state.section === 'calc') {
      state.settings[state.product][key] = el.value;
      save();
      refreshCalcResult();
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
  const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),settings:state.settings,ledger:state.ledger},null,2)],{type:'application/json'});
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
    for (const id of TYPES) state.settings[id]={...DEFAULT.settings[id],...(data.settings[id]||{})};
    state.ledger=data.ledger;save();render();
  } catch (err) {alert('Yedek yüklenemedi: '+err.message)}
}
function init() {
  // Inject the small v1.1 layout patch so an existing installation only needs
  // app.js and sw.js to be replaced. Previous style.css can stay unchanged.
  const responsiveStyle=document.createElement('style');
  responsiveStyle.textContent='#products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}#products button{min-width:0;white-space:normal;font-size:13px}.field input[type=number]{direction:ltr;text-align:left}@media(min-width:680px){#products{grid-template-columns:repeat(4,minmax(0,1fr))}}';
  document.head.appendChild(responsiveStyle);
  const products=document.getElementById('products');
  products.innerHTML=TYPES.map(id=>`<button data-product="${id}" title="${safe(REC[id].name)}">${REC[id].icon} ${safe(REC[id].name)}</button>`).join('');
  const pill=document.querySelector('header .pill');if(pill)pill.textContent='v1.1';
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
