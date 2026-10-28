'use strict';
const REC={
 sword:{name:'Kılıç',icon:'⚔',out:37,tax:.061,materials:[['steelPrice','Çelik',59],['coalPrice','Kömür',59]]},
 steel:{name:'Çelik',icon:'▰',out:72,tax:.072,materials:[['ironPrice','Demir',108],['coalPrice','Kömür',36]]},
 necklace:{name:'Ferasan İnci Dizisi',icon:'◉',out:66,tax:.059,materials:[['pearlPrice','Ferasan İncisi',198],['threadPrice','İpek İpliği',66]]},
 kaftan:{name:'İpekli Kaftan',icon:'♜',out:94,tax:.067,materials:[['silkPrice','İpek',94],['fabricPrice','Kumaş',188]]},
 basra:{name:'Basra İnci Küpesi',icon:'◇',out:197,tax:.059,materials:[['basraPearlPrice','Basra Ham İncisi',131],['silverPrice','Gümüş',66]]},
 rifle:{name:'Tüfek',icon:'🎯',out:170,tax:.059,materials:[['steelPrice','Çelik',376],['woodPrice','Kereste',752],['gunpowderPrice','Barut',376]]},
 silverJewelry:{name:'Gümüş Takı',icon:'💍',out:627,tax:.06,materials:[['silverPrice','Gümüş',70],['oysterPearlPrice','İnci',70]]}
};
const TYPES=Object.keys(REC),KEY='tuccar-pwa-v1';
const DEFAULT={product:'sword',section:'calc',mode:'time',weekly:{sword:2517,steel:479,necklace:1199,kaftan:1532,basra:893,rifle:7294,silverJewelry:796,coalPrice:53,ironPrice:182,pearlPrice:189,threadPrice:227,silkPrice:554,fabricPrice:113,basraPearlPrice:407,silverPrice:962,steelPrice:479,woodPrice:16,gunpowderPrice:545,oysterPearlPrice:0},settings:{
 sword:{bands:3,hours:1,minutes:0,quantity:111,steelPrice:600,coalPrice:58,salePrice:2565,cycleMins:11,cycleSecs:0},
 steel:{bands:3,hours:1,minutes:0,quantity:216,ironPrice:191,coalPrice:58,salePrice:487,cycleMins:4,cycleSecs:0},
 necklace:{bands:1,hours:1,minutes:0,quantity:66,pearlPrice:167,threadPrice:156,salePrice:951,cycleMins:5,cycleSecs:0},
 kaftan:{bands:1,hours:1,minutes:0,quantity:94,silkPrice:435,fabricPrice:84,salePrice:1141,cycleMins:9,cycleSecs:30},
 basra:{bands:1,hours:1,minutes:0,quantity:197,basraPearlPrice:538,silverPrice:1088,salePrice:1046,cycleMins:8,cycleSecs:6},
 rifle:{bands:1,hours:1,minutes:0,quantity:680,steelPrice:490,woodPrice:18,gunpowderPrice:677,salePrice:7570,cycleMins:15,cycleSecs:24},
 silverJewelry:{bands:2,hours:1,minutes:0,quantity:1254,silverPrice:1088,oysterPearlPrice:0,salePrice:465,cycleMins:6,cycleSecs:39,recipe:'pearl',recipeTimes:{silver:{mins:3,secs:19},pearl:{mins:6,secs:39}}}
},ledger:[]};
const clone=x=>JSON.parse(JSON.stringify(x)),n=x=>Number.isFinite(Number(x))?Number(x):0,fmt=(x,d=0)=>n(x).toLocaleString('tr-TR',{maximumFractionDigits:d,minimumFractionDigits:d}),money=x=>fmt(Math.round(x))+' akçe',esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function load(){let s=clone(DEFAULT);try{let old=JSON.parse(localStorage.getItem(KEY));if(old&&old.settings&&Array.isArray(old.ledger)){for(let id of TYPES){let saved=old.settings[id]||{};Object.assign(s.settings[id],saved);if(saved.cycleMins===undefined&&Number.isFinite(Number(saved.cycleMinutes))){let sec=Math.round(n(saved.cycleMinutes)*60);s.settings[id].cycleMins=Math.floor(sec/60);s.settings[id].cycleSecs=sec%60;}}Object.assign(s.weekly,old.weekly||{});s.ledger=old.ledger;if(TYPES.includes(old.product))s.product=old.product;if(['calc','track'].includes(old.section))s.section=old.section;if(['time','quantity'].includes(old.mode))s.mode=old.mode;}}catch(e){}return s}
let state=load(),trackType='production',trackDate=today();function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function recipe(id,choice){let r=REC[id];if(id==='silverJewelry'&&(choice||state.settings[id].recipe)==='silver')return {...r,out:209,materials:[['silverPrice','Gümüş',70]]};return r}
function cycle(id){let s=state.settings[id];return Math.max(1,Math.floor(n(s.cycleMins))*60+Math.min(59,Math.max(0,Math.floor(n(s.cycleSecs)))))}
function duration(sec){let h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=Math.round(sec%60);return (h?h+' sa ':'')+m+' dk '+String(s).padStart(2,'0')+' sn'}
function cost(id,prices,qty,choice,archive=false){let r=recipe(id,choice);return r.materials.reduce((a,[k,,q])=>a+qty*q/r.out*n(prices[k])*(archive&&id==='rifle'&&k==='gunpowderPrice'&&prices.stockTax?1.15:1),0)}
function calculate(id){let r=recipe(id),s=state.settings[id],bands=Math.max(1,Math.floor(n(s.bands))),sec=cycle(id),count=state.mode==='time'?Math.floor(Math.max(0,n(s.hours)*3600+n(s.minutes)*60)/sec):Math.ceil(Math.max(0,n(s.quantity))/(r.out*bands)),qty=count*bands*r.out,gross=qty*n(s.salePrice),tax=gross*r.tax,material=cost(id,s,qty),perCycle=(r.out*n(s.salePrice)*(1-r.tax)-cost(id,s,r.out))*bands;return {r,s,bands,sec,count,qty,gross,tax,material,profit:gross-tax-material,unitCost:cost(id,s,r.out)/r.out,unitProfit:n(s.salePrice)*(1-r.tax)-cost(id,s,r.out)/r.out,hour:perCycle*3600/sec,complete:perCycle*Math.floor(3600/sec)}}
function field(label,key,value,step='any'){return `<div class="field"><label for="${esc(key)}">${esc(label)}</label><input type="number" inputmode="decimal" min="0" step="${step}" id="${esc(key)}" data-key="${esc(key)}" value="${esc(value)}"></div>`}
function card(title,body){return `<section class="card"><h2>${title}</h2>${body}</section>`}
function result(){let c=calculate(state.product),r=c.r,s=c.s;return `<section class="card" id="calcResult"><h2>Hesaplama sonucu</h2><div class="unit-section"><div class="unit-title">📦 TEK ÜRÜN HESABI</div><div class="unit-grid"><div class="unit-tile cost"><div class="unit-label">Birim maliyet</div><strong>${money(c.unitCost)}</strong></div><div class="unit-tile ${c.unitProfit>=0?'profit':'loss'}"><div class="unit-label">Birim net kâr</div><strong>${money(c.unitProfit)}</strong></div></div><p class="hint">Başabaş satış fiyatı: ${money(Math.ceil(c.unitCost/(1-r.tax)))}</p></div><div class="stats"><div class="stat primary"><small>Toplam net kâr</small><strong>${money(c.profit)}</strong></div><div class="stat"><small>60 dakikada biten üretimlerin kârı</small><strong>${money(c.complete)}</strong></div><div class="stat"><small>Teorik saatlik net kâr</small><strong>${money(c.hour)}</strong></div><div class="stat"><small>Üretilen</small><strong>${fmt(c.qty)} adet</strong></div><div class="stat"><small>Üretim süresi</small><strong>${duration(c.count*c.sec)}</strong></div><div class="stat"><small>Tamamlanan döngü</small><strong>${fmt(c.count)}</strong></div></div><div class="row"><span>Hammadde</span><span>${r.materials.map(([,,q],i)=>fmt(q*c.count*c.bands)+' '+esc(r.materials[i][1])).join(' · ')}</span></div><div class="row"><span>Hammadde maliyeti</span><span>${money(c.material)}</span></div><div class="row"><span>Brüt satış</span><span>${money(c.gross)}</span></div><div class="row"><span>Satış vergisi (%${fmt(r.tax*100,1)})</span><span>−${money(c.tax)}</span></div><p class="hint">Saatlik hesaplar seçilen bantların eşzamanlı çalıştığını varsayar. Tüfekte varsayılan 15:24, dört partinin toplam ölçülen süresidir; dört paralel bant olarak değerlendirilmez.</p></section>`}
function status(current,avg,sale){let target=n(avg)*(sale?.918:.955);if(!target)return '<span class="market-pill neutral">Ortalama girilmeli</span>';let pct=(n(current)/target-1)*100,good=sale?pct>=5:pct<=-5,bad=sale?pct<=-5:pct>=5;return `<span class="market-pill ${good?'good':bad?'bad':'neutral'}">${pct>=0?'+':''}%${fmt(pct,1)} · ${good?'Avantajlı':bad?'Dezavantajlı':'Ortalama civarı'}</span>`}
function marketResult(){let id=state.product,r=recipe(id),s=state.settings[id];return `<div class="market-focus"><span>Güncel toptan satış: <b>${money(s.salePrice)}</b></span><span>Haftalık toptan karşılığı: <b>${money(n(state.weekly[id])*.918)}</b></span></div><div class="market-main">${status(s.salePrice,state.weekly[id],true)}</div>${r.materials.map(([k,label])=>`<div class="market-line"><span>${esc(label)} · ${money(s[k])} alış</span>${id==='sword'&&k==='steelPrice'?'<span class="market-pill neutral">Oyuncu pazarı</span>':status(s[k],state.weekly[k],false)}</div>`).join('')}`}
function market(){let id=state.product,r=recipe(id),keys=[[id,r.name],...r.materials.filter(([k])=>!(id==='sword'&&k==='steelPrice')).map(([k,label])=>[k,label])];return `<section class="card"><h2>📊 Haftalık fiyat değerlendirmesi</h2><div id="marketResult">${marketResult()}</div><details><summary>Haftalık ortalamaları düzenle</summary><div class="grid">${keys.map(([k,label])=>field(label+' haftalık ortalama','weekly_'+k,state.weekly[k]).replace('data-key="weekly_'+k+'"','data-weekly="'+k+'"')).join('')}</div></details><p class="hint">Haftalık fiyatlar otomatik güncellenmez. Satış ×0,918; alış ×0,955 karşılaştırması kullanılır.</p></section>`}
function calcHtml(){let id=state.product,r=recipe(id),s=state.settings[id];return card(esc(r.name)+' üretim ayarları',`${id==='silverJewelry'?`<div class="field"><label for="recipeSelect">Üretim tarifi</label><select id="recipeSelect"><option value="silver" ${s.recipe==='silver'?'selected':''}>Tarif 1 · 70 Gümüş → 209 Takı</option><option value="pearl" ${s.recipe!=='silver'?'selected':''}>Tarif 2 · 70 Gümüş + 70 İnci → 627 Takı</option></select></div>`:''}<div class="grid">${field('Eşzamanlı üretim bandı','bands',s.bands,1)}${field('Satış fiyatı (akçe)','salePrice',s.salePrice)}${r.materials.map(([k,l])=>field(l+' alış fiyatı (akçe)',k,s[k])).join('')}</div><div class="cycle-time"><div class="cycle-heading">⏱ Bir üretim döngüsü</div><div class="grid">${field('Dakika','cycleMins',s.cycleMins,1)}${field('Saniye','cycleSecs',s.cycleSecs,1)}</div><p class="hint">Süre: <strong id="cyclePreview">${duration(cycle(id))}</strong></p></div><p class="hint">Tek döngü: ${r.out} adet · ${r.materials.map(([k,l,q])=>q+' '+esc(l)).join(' + ')} · satış vergisi %${fmt(r.tax*100,1)}.</p>`)+market()+card('Hesaplama yöntemi',`<div class="toggle"><button data-mode="time" class="${state.mode==='time'?'active':''}">Süreye göre</button><button data-mode="quantity" class="${state.mode==='quantity'?'active':''}">Adede göre</button></div><div class="grid">${state.mode==='time'?field('Saat','hours',s.hours,1)+field('Dakika','minutes',s.minutes,1):field('Hedef adet','quantity',s.quantity,1)}</div>`)+result()+ranking()}
function ranking(){let rows=TYPES.map(id=>{let s=state.settings[id],r=recipe(id),sec=cycle(id),p=(r.out*n(s.salePrice)*(1-r.tax)-cost(id,s,r.out))*Math.max(1,Math.floor(n(s.bands)))*3600/sec,missing=r.materials.some(([k])=>!n(s[k]));return {id,p,missing}}).sort((a,b)=>b.p-a.p);return card('🏆 Saatlik kârlılık sıralaması',`<div class="history">${rows.map((x,i)=>`<div class="row"><span>${i+1}. ${esc(REC[x.id].name)}</span><span>${x.missing?'<small>⚠ Eksik hammadde fiyatı</small> ':''}${money(x.p)}</span></div>`).join('')}</div><p class="hint">Kayıtlı fiyatlara ve eşzamanlı bant sayısına göre teorik kâr. Eksik fiyatlı sonuçlar kesin değildir.</p>`)}
function replay(entries=state.ledger){let inv=Object.fromEntries(TYPES.map(id=>[id,{qty:0,value:0}])),records=[];for(let e of [...entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))+(n(a.created)-n(b.created))||String(a.id).localeCompare(String(b.id)))){if(!REC[e.product]||!['production','sale'].includes(e.type)||!(n(e.qty)>0))return {error:'Geçersiz işlem.'};let item=inv[e.product],q=n(e.qty);if(e.type==='production'){let expense;if(e.product==='sword'){let steel=inv.steel,need=q*59/37;if(steel.qty+1e-7<need)return {error:e.date+': Kılıç için yeterli çelik stoğu yok.'};let used=need*(steel.qty?steel.value/steel.qty:0);steel.qty=Math.max(0,steel.qty-need);steel.value=Math.max(0,steel.value-used);expense=used+q*59/37*n(e.coalPrice)}else expense=cost(e.product,e,q,e.recipe||'pearl',true);item.qty+=q;item.value+=expense;records.push({...e,cost:expense,profit:0,tax:0,revenue:0})}else{if(item.qty+1e-7<q)return {error:e.date+': '+REC[e.product].name+' için yeterli stok yok.'};let expense=q*(item.qty?item.value/item.qty:0),gross=q*n(e.price),tax=gross*REC[e.product].tax;item.qty=Math.max(0,item.qty-q);item.value=Math.max(0,item.value-expense);records.push({...e,cost:expense,tax,revenue:gross-tax,profit:gross-tax-expense})}}return {inv,records}}
function trackHtml(){let id=state.product,r=recipe(id),s=state.settings[id],all=replay();if(all.error)return card('Kayıt hatası',esc(all.error));let rows=all.records.filter(x=>x.product===id&&x.date===trackDate),sum=(type,k)=>rows.filter(x=>x.type===type).reduce((a,e)=>a+n(e[k]),0);return card('Günlük '+esc(r.name)+' takibi',`<div class="field"><label for="trackDate">Tarih</label><input type="date" id="trackDate" value="${trackDate}"></div><div class="stats"><div class="stat"><small>Üretilen</small><strong>${fmt(sum('production','qty'))}</strong></div><div class="stat"><small>Satılan</small><strong>${fmt(sum('sale','qty'))}</strong></div><div class="stat"><small>Güncel stok</small><strong>${fmt(all.inv[id].qty)}</strong></div><div class="stat"><small>Net satış geliri</small><strong>${money(sum('sale','revenue'))}</strong></div><div class="stat primary"><small>Gerçekleşen net kâr</small><strong>${money(sum('sale','profit'))}</strong></div></div>`)+card('Yeni işlem kaydet',`<div class="toggle"><button data-type="production" class="${trackType==='production'?'active':''}">Üretim</button><button data-type="sale" class="${trackType==='sale'?'active':''}">Satış</button></div><form id="entryForm"><div class="grid">${trackType==='production'?field('Tam döngü','entryCycles',1,1)+field('Üretim bandı','entryBands',s.bands,1)+r.materials.filter(([k])=>!(id==='sword'&&k==='steelPrice')).map(([k,l])=>field(l+' alış fiyatı','entry_'+k,s[k])).join(''):field('Satılan adet','entryQty',1,1)+field('Birim satış fiyatı','entryPrice',s.salePrice)}</div>${trackType==='production'?`<p class="hint">Üretilecek: <strong id="entryOutput">${fmt(r.out*Math.max(1,n(s.bands)))}</strong> adet${id==='silverJewelry'?' · '+(s.recipe==='silver'?'Tarif 1':'Tarif 2'):''}</p>`:''}<button class="btn" type="submit">${trackType==='production'?'Üretimi kaydet':'Satışı kaydet'}</button></form>`)+card(trackDate+' işlem geçmişi',`<div class="history">${rows.length?rows.slice().reverse().map(e=>`<div class="entry"><div class="top"><strong>${e.type==='production'?'Üretim +':'Satış −'}${fmt(e.qty)} adet</strong><button data-delete="${esc(e.id)}">Sil</button></div><small>${e.type==='production'?'Maliyet: '+money(e.cost):'Net kâr: '+money(e.profit)+' · Vergi: '+money(e.tax)}</small></div>`).join(''):'<p class="muted">Bu tarihte kayıt yok.</p>'}</div>`)+card('Veri yedekleme',`<p class="hint">Kayıtlar bu tarayıcıda saklanır. Tarayıcı verilerini silmeden önce yedek indir.</p><div class="actions"><button class="btn secondary" id="exportBtn">Yedek indir</button><button class="btn secondary" id="importBtn">Yedek yükle</button><input type="file" id="importFile" accept=".json,application/json" hidden></div>`)}
function render(){let select=document.getElementById('productSelect');if(select)select.value=state.product;document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===state.section));document.getElementById('app').innerHTML=state.section==='calc'?calcHtml():trackHtml();bind()}
function refresh(){let e=document.getElementById('calcResult');if(e)e.outerHTML=result();let m=document.getElementById('marketResult');if(m)m.innerHTML=marketResult();let p=document.getElementById('cyclePreview');if(p)p.textContent=duration(cycle(state.product))}
function bind(){document.querySelectorAll('[data-key]').forEach(el=>el.addEventListener('input',()=>{let k=el.dataset.key;if(state.section==='calc'){let s=state.settings[state.product];s[k]=el.value;if(state.product==='silverJewelry'&&(k==='cycleMins'||k==='cycleSecs')){s.recipeTimes=s.recipeTimes||clone(DEFAULT.settings.silverJewelry.recipeTimes);s.recipeTimes[s.recipe||'pearl']={mins:n(s.cycleMins),secs:n(s.cycleSecs)}}save();refresh()}else if(k==='entryCycles'||k==='entryBands'){let o=document.getElementById('entryOutput');if(o)o.textContent=fmt(recipe(state.product).out*n(document.getElementById('entryCycles').value)*n(document.getElementById('entryBands').value))+' adet'}}));document.querySelectorAll('[data-weekly]').forEach(el=>el.addEventListener('input',()=>{state.weekly[el.dataset.weekly]=el.value;save();let e=document.getElementById('marketResult');if(e)e.innerHTML=marketResult()}));let rs=document.getElementById('recipeSelect');if(rs)rs.onchange=()=>{let s=state.settings.silverJewelry;s.recipeTimes=s.recipeTimes||clone(DEFAULT.settings.silverJewelry.recipeTimes);s.recipeTimes[s.recipe||'pearl']={mins:n(s.cycleMins),secs:n(s.cycleSecs)};s.recipe=rs.value;let t=s.recipeTimes[s.recipe];s.cycleMins=t.mins;s.cycleSecs=t.secs;save();render()};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;save();render()});document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{trackType=b.dataset.type;render()});let dt=document.getElementById('trackDate');if(dt)dt.onchange=()=>{trackDate=dt.value||today();render()};let f=document.getElementById('entryForm');if(f)f.onsubmit=addEntry;document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeEntry(b.dataset.delete));let ex=document.getElementById('exportBtn');if(ex)ex.onclick=exportData;let im=document.getElementById('importBtn');if(im)im.onclick=()=>document.getElementById('importFile').click();let file=document.getElementById('importFile');if(file)file.onchange=importData}
function addEntry(event){event.preventDefault();let id=state.product,r=recipe(id),get=k=>n(document.getElementById(k)?.value),e={id:crypto.randomUUID(),date:trackDate,created:Date.now(),product:id,type:trackType};if(trackType==='production'){let cycles=get('entryCycles'),bands=get('entryBands');if(!Number.isInteger(cycles)||cycles<=0||!Number.isInteger(bands)||bands<=0)return alert('Döngü ve bant pozitif tam sayı olmalı.');e.qty=cycles*bands*r.out;if(id==='silverJewelry')e.recipe=state.settings[id].recipe||'pearl';r.materials.filter(([k])=>!(id==='sword'&&k==='steelPrice')).forEach(([k])=>e[k]=get('entry_'+k));}else{e.qty=get('entryQty');e.price=get('entryPrice');if(!Number.isInteger(e.qty)||e.qty<=0||e.price<0)return alert('Adet ve fiyatı kontrol et.')}if(Object.values(e).some(v=>typeof v==='number'&&(!Number.isFinite(v)||v<0)))return alert('Geçersiz sayı.');let check=replay([...state.ledger,e]);if(check.error)return alert(check.error);state.ledger.push(e);save();render()}
function removeEntry(id){if(!confirm('Bu işlem silinsin mi?'))return;let next=state.ledger.filter(e=>e.id!==id),check=replay(next);if(check.error)return alert(check.error);state.ledger=next;save();render()}
function exportData(){let blob=new Blob([JSON.stringify({...state,version:6,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tuccar-yedek-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importData(event){let f=event.target.files?.[0];if(!f)return;try{let data=JSON.parse(await f.text());if(!data.settings?.sword||!data.settings?.steel||!Array.isArray(data.ledger)||data.ledger.length>100000||data.ledger.some(e=>!REC[e.product]||!['production','sale'].includes(e.type)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!(n(e.qty)>0)))throw Error('Geçersiz yedek.');let check=replay(data.ledger);if(check.error)throw Error(check.error);if(!confirm('Mevcut veriler yedekle değiştirilecek. Devam edilsin mi?'))return;let next=clone(DEFAULT);for(let id of TYPES)Object.assign(next.settings[id],data.settings[id]||{});Object.assign(next.weekly,data.weekly||{});next.ledger=data.ledger;next.product=TYPES.includes(data.product)?data.product:state.product;next.section=['calc','track'].includes(data.section)?data.section:state.section;next.mode=['time','quantity'].includes(data.mode)?data.mode:state.mode;state=next;save();render()}catch(e){alert('Yedek yüklenemedi: '+e.message)}}
function init(){let style=document.createElement('style');style.textContent=`#products{display:flex;align-items:center;gap:10px}#products label{font-size:13px;white-space:nowrap;color:#cbd5e1}#productSelect,#recipeSelect{min-width:0;width:100%;padding:12px;background:#182238;border:1px solid #5579a7;border-radius:10px;color:#fff;font-size:16px}.field input[type=number]{direction:ltr;text-align:left}.cycle-time{margin-top:12px;border-radius:12px;background:#111b30;border:1px solid #3b5068;padding:13px}.cycle-heading{font-size:13px;font-weight:750;margin-bottom:10px}.market-focus{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.market-focus span{display:block;background:#0f192b;border-radius:10px;padding:10px;font-size:12px;color:#9ca3af}.market-focus b{display:block;color:#e5e7eb;margin-top:5px;font-size:16px}.market-main{margin:12px 0}.market-pill{display:inline-block;font-size:12px;font-weight:750;border:1px solid;padding:5px 9px;border-radius:9px}.market-pill.good{color:#86efac;background:#123628;border-color:#27845e}.market-pill.bad{color:#fda4af;background:#431b27;border-color:#9f4352}.market-pill.neutral{color:#fdba74;background:#3b2b1d;border-color:#94662d}.market-line{display:flex;align-items:center;justify-content:space-between;gap:9px;border-bottom:1px solid #2a354a;padding:9px 0;font-size:12px}.market-card details,details{padding-top:12px;margin-top:12px}.market-focus{margin-bottom:10px}.unit-section{background:#0d1729;border:1px solid #34465c;border-radius:14px;padding:13px;margin:4px 0 15px}.unit-title{font-size:12px;font-weight:750;margin-bottom:12px}.unit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.unit-tile{border-radius:13px;padding:14px 10px;border:1px solid}.unit-tile.cost{background:#382a19;border-color:#92612b;color:#fcd59c}.unit-tile.profit{background:#123628;border-color:#27845e;color:#a7f3d0}.unit-tile.loss{background:#471e26;border-color:#b45364;color:#fecdd3}.unit-label{font-size:12px;font-weight:750}.unit-tile strong{display:block;font-size:clamp(16px,4vw,22px);margin-top:8px;overflow-wrap:anywhere}.check{display:block;margin:14px 0;color:#cbd5e1}.check input{width:18px;height:18px;vertical-align:middle}@media(max-width:420px){.market-focus{grid-template-columns:1fr}.market-line{flex-direction:column;align-items:start}.unit-grid{grid-template-columns:1fr}}`;document.head.appendChild(style);let p=document.getElementById('products');p.innerHTML='<label for="productSelect">Ürün seç</label><select id="productSelect">'+TYPES.map(id=>`<option value="${id}">${REC[id].icon} ${esc(REC[id].name)}</option>`).join('')+'</select>';p.addEventListener('change',e=>{if(e.target.id==='productSelect'){state.product=e.target.value;save();render()}});let pill=document.querySelector('header .pill');if(pill)pill.textContent='v1.4';document.getElementById('sections').addEventListener('click',e=>{let b=e.target.closest('[data-section]');if(b){state.section=b.dataset.section;save();render()}});if('serviceWorker'in navigator){let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}render()}
init();


'use strict';
/* Tüccar v1.6: bantlar ve partiler aynı anda çalışır.
 * Mevcut localStorage anahtarı ve eski üretim/satış kayıtları korunur.
 */
(function () {
  if (typeof REC === 'undefined' || typeof state === 'undefined' || typeof calcHtml !== 'function') {
    throw new Error('Tüccar v1.4 temel kodu yüklenmedi.');
  }

  // Her üründe ayrı bant ve bant başına parti sayısı tutulur.
  // Üretim süresi alanı bant/parti sayısından bağımsız, bir tam turun süresidir.
  function migrateBatchSettings() {
    let changed = false;
    for (const id of TYPES) {
      const s = state.settings[id];
      if (id === 'rifle' && Object.prototype.hasOwnProperty.call(s, 'stockTax')) { delete s.stockTax; changed = true; }
      if (s.batchSchemaV15 !== 1) {
        if (!Number.isInteger(Number(s.batches)) || Number(s.batches) < 1) {
          s.batches = id === 'rifle' ? 3 : 1;
        }
        if (id === 'rifle') {
          // Kayıtlı süre, bant ve partilerin eşzamanlı tamamlandığı bir turun süresidir; değiştirme.
          if (Number(s.bands) === 1) s.bands = 3;
        }
        s.batchSchemaV15 = 1;
        changed = true;
      }
    }
    if (changed) save();
  }
  migrateBatchSettings();

  const originalCalcHtml = calcHtml;
  const originalTrackHtml = trackHtml;
  const originalBind = bind;
  const originalRanking = ranking;
  const originalRender = render;

  function positiveInt(x) { return Math.max(1, Math.floor(n(x))); }
  function batchCount(id) { return positiveInt(state.settings[id].batches); }

  // Bantlar ve bant başına partilerin tamamı aynı turda eşzamanlı çalışır.
  // 3 bant x 3 parti = 9 partilik çıktı; bir turun süresi değişmez.
  window.calculate = function (id) {
    const r = recipe(id), s = state.settings[id];
    const bands = positiveInt(s.bands);
    const batches = batchCount(id);
    const singleSec = cycle(id);
    const sec = singleSec;
    const totalRequested = Math.max(0, n(s.hours) * 3600 + n(s.minutes) * 60);
    const count = state.mode === 'time'
      ? Math.floor(totalRequested / sec)
      : Math.ceil(Math.max(0, n(s.quantity)) / (r.out * bands * batches));
    const qty = count * bands * batches * r.out;
    const gross = qty * n(s.salePrice);
    const tax = gross * r.tax;
    const material = cost(id, s, qty);
    const perSetProfit = (r.out * n(s.salePrice) * (1 - r.tax) - cost(id, s, r.out)) * bands * batches;
    return {
      r, s, bands, batches, singleSec, sec, count, qty, gross, tax, material,
      profit: gross - tax - material,
      unitCost: cost(id, s, r.out) / r.out,
      unitProfit: n(s.salePrice) * (1 - r.tax) - cost(id, s, r.out) / r.out,
      hour: perSetProfit * 3600 / sec,
      complete: perSetProfit * Math.floor(3600 / sec)
    };
  };

  window.result = function () {
    const c = calculate(state.product), r = c.r, s = c.s;
    const materials = r.materials.map(([k, label, q]) =>
      `${fmt(q * c.count * c.bands * c.batches)} ${esc(label)}`
    ).join(' · ');
    return `<section class="card" id="calcResult"><h2>Hesaplama sonucu</h2>
      <div class="unit-section"><div class="unit-title">📦 TEK ÜRÜN HESABI</div>
        <div class="unit-grid">
          <div class="unit-tile cost"><div class="unit-label">Birim maliyet</div><strong>${money(c.unitCost)}</strong></div>
          <div class="unit-tile ${c.unitProfit >= 0 ? 'profit' : 'loss'}"><div class="unit-label">Birim net kâr</div><strong>${money(c.unitProfit)}</strong></div>
        </div>
        <p class="hint">Başabaş satış fiyatı: ${money(Math.ceil(c.unitCost / (1 - r.tax)))}</p>
      </div>
      <div class="stats">
        <div class="stat primary"><small>Toplam net kâr</small><strong>${money(c.profit)}</strong></div>
        <div class="stat"><small>60 dakikada biten turların kârı</small><strong>${money(c.complete)}</strong></div>
        <div class="stat"><small>Teorik saatlik net kâr</small><strong>${money(c.hour)}</strong></div>
        <div class="stat"><small>Üretilen</small><strong>${fmt(c.qty)} adet</strong></div>
        <div class="stat"><small>Üretim süresi</small><strong>${duration(c.count * c.sec)}</strong></div>
        <div class="stat"><small>Tamamlanan üretim turu</small><strong>${fmt(c.count)}</strong></div>
      </div>
      <div class="row"><span>Hammadde</span><span>${materials}</span></div>
      <div class="row"><span>Hammadde maliyeti</span><span>${money(c.material)}</span></div>
      <div class="row"><span>Brüt satış</span><span>${money(c.gross)}</span></div>
      <div class="row"><span>Satış vergisi (%${fmt(r.tax * 100, 1)})</span><span>−${money(c.tax)}</span></div>
      <p class="hint">${fmt(c.bands)} bant × ${fmt(c.batches)} parti = tur başına ${fmt(c.bands*c.batches*r.out)} ürün.
        Tüm bantlar ve partiler aynı anda çalışır. Bir turun süresi ${duration(c.sec)}.
        Süre, bant veya parti sayısıyla çarpılmaz. Oyundaki fiilî tur süresini gir.</p>
    </section>`;
  };

  window.calcHtml = function () {
    const id = state.product, s = state.settings[id], r = recipe(id);
    let html = originalCalcHtml();
    const band = field('Eşzamanlı üretim bandı', 'bands', s.bands, 1);
    const sale = field('Satış fiyatı (akçe)', 'salePrice', s.salePrice);
    // Bant, parti ve satış aynı satırda; fiyat alanlarını aşağıya itmez.
    const before = `<div class="grid">${band}${sale}`;
    const after = `<div class="production-head">
      ${field('Bant', 'bands', s.bands, 1)}
      ${field('Parti / bant', 'batches', s.batches, 1)}
      ${field('Satış (akçe)', 'salePrice', s.salePrice)}
      </div><div class="batch-summary" id="batchSummary">${fmt(positiveInt(s.bands))} bant × ${fmt(batchCount(id))} parti × ${fmt(r.out)} adet = <strong>${fmt(positiveInt(s.bands)*batchCount(id)*r.out)} adet/tur</strong></div><div class="grid">`;
    if (!html.includes(before)) throw new Error('Bant alanının yeri bulunamadı.');
    html = html.replace(before, after);
    const cycleFields = `<div class="grid">${field('Dakika', 'cycleMins', s.cycleMins, 1)}${field('Saniye', 'cycleSecs', s.cycleSecs, 1)}</div>`;
    html = html.replace(cycleFields, cycleFields.replace('class="grid"', 'class="grid compact-pair"'));
    html = html.replace('⏱ Bir üretim döngüsü', '⏱ Tüm bant ve partiler için bir turun süresi');
    const budgetFields = `<div class="grid">${field('Saat', 'hours', s.hours, 1)}${field('Dakika', 'minutes', s.minutes, 1)}</div>`;
    html = html.replace(budgetFields, budgetFields.replace('class="grid"', 'class="grid compact-pair"'));
    html = html.replace(/<p class="hint">Tek döngü:[\s\S]*?<\/p>/, `<p class="hint">Bir parti ${fmt(r.out)} adet · ${r.materials.map(([k,l,q])=>fmt(q)+' '+esc(l)).join(' + ')}. Tüm bant ve partiler eşzamanlı çalışır; bir tur ${duration(cycle(id))} sürer.</p>`);
    if(id === 'rifle' && cycle(id) === 231 && s.batchSchemaV15 === 1){html += `<p class="hint warning">⚠ Önceki sürüm tüfek süresini 3:51 olarak otomatik değiştirmiş olabilir. Oyundaki gerçek tur süresini kontrol edip yukarıya gir.</p>`;}
    return html;
  };

  window.ranking = function () {
    const rows = TYPES.map(id => {
      const s = state.settings[id], r = recipe(id), secs = cycle(id);
      const missing = r.materials.some(([k]) => s[k] === '' || s[k] === null || s[k] === undefined || !(n(s[k]) > 0));
      const cyclesPerHour = 3600 / secs;
      const outputPerRound = r.out * positiveInt(s.bands) * batchCount(id);
      const netPerUnit = n(s.salePrice) * (1 - r.tax) - cost(id, s, r.out) / r.out;
      return {id, missing, p: outputPerRound * netPerUnit * cyclesPerHour};
    }).sort((a,b) => (a.missing - b.missing) || (b.p - a.p));
    return card('🏆 Saatlik kârlılık sıralaması',
      `<div class="history">${rows.map((x,i) => `<div class="row"><span>${i+1}. ${esc(REC[x.id].name)}</span><span>${x.missing?'⚠ Hammadde fiyatı eksik':money(x.p)}</span></div>`).join('')}</div>` +
      `<p class="hint">Tüm bantlar ve partiler eşzamanlı çalışır; saatlik kâr tur süresine, bant × parti × adet sayısına ve kaydedilmiş fiyatlara göre hesaplanır. Eksik fiyatlı ürünlerin kârı gösterilmez.</p>`
    );
  };

  window.trackHtml = function () {
    const id = state.product, s = state.settings[id], r = recipe(id);
    let html = originalTrackHtml();
    if (trackType === 'production') {
      const cycles = field('Tam döngü', 'entryCycles', 1, 1);
      const bands = field('Üretim bandı', 'entryBands', s.bands, 1);
      const before = `<div class="grid">${cycles}${bands}`;
      const after = `<div class="production-head">
        ${field('Tur sayısı', 'entryCycles', 1, 1)}
        ${field('Bant', 'entryBands', s.bands, 1)}
        ${field('Parti / bant', 'entryBatches', s.batches, 1)}
      </div><div class="grid">`;
      if (!html.includes(before)) throw new Error('Günlük üretim alanının yeri bulunamadı.');
      html = html.replace(before, after);
      html = html.replace(/(<strong id="entryOutput">)[\s\S]*?(<\/strong>)/,
        `$1${fmt(r.out * positiveInt(s.bands) * batchCount(id))}$2`);
    }
    return html;
  };

  window.bind = function () {
    originalBind();
    if (state.section === 'calc') {
      for (const key of ['bands','batches']) {
        document.getElementById(key)?.addEventListener('input', () => {
          const r = recipe(state.product), st = state.settings[state.product];
          const el = document.getElementById('batchSummary');
          if (el) el.innerHTML = `${fmt(positiveInt(st.bands))} bant × ${fmt(batchCount(state.product))} parti × ${fmt(r.out)} adet = <strong>${fmt(positiveInt(st.bands)*batchCount(state.product)*r.out)} adet/tur</strong>`;
        });
      }
    }
    if (state.section !== 'track' || trackType !== 'production') return;
    function updateEntryOutput() {
      const value = key => n(document.getElementById(key)?.value);
      const output = document.getElementById('entryOutput');
      if (output) output.textContent = fmt(recipe(state.product).out * value('entryCycles') * value('entryBands') * value('entryBatches')) + ' adet';
    }
    for (const key of ['entryCycles','entryBands','entryBatches']) {
      document.getElementById(key)?.addEventListener('input', updateEntryOutput);
    }
    updateEntryOutput();
  };

  window.addEntry = function (event) {
    event.preventDefault();
    const id=state.product, r=recipe(id), get=key=>n(document.getElementById(key)?.value);
    const e={id:crypto.randomUUID(),date:trackDate,created:Date.now(),product:id,type:trackType};
    if (trackType === 'production') {
      const cycles=get('entryCycles'),bands=get('entryBands'),batches=get('entryBatches');
      if (![cycles,bands,batches].every(x=>Number.isInteger(x)&&x>0)) {
        return alert('Tur, bant ve parti sayıları pozitif tam sayı olmalı.');
      }
      e.qty = cycles * bands * batches * r.out;
      e.bands = bands; e.batches = batches;
      if (id === 'silverJewelry') e.recipe = state.settings[id].recipe || 'pearl';
      r.materials.filter(([k])=>!(id==='sword'&&k==='steelPrice')).forEach(([k])=>e[k]=get('entry_'+k));
      
    } else {
      e.qty=get('entryQty');e.price=get('entryPrice');
      if (!Number.isInteger(e.qty)||e.qty<=0||e.price<0) return alert('Adet ve fiyatı kontrol et.');
    }
    if (Object.values(e).some(v=>typeof v==='number'&&(!Number.isFinite(v)||v<0))) {
      return alert('Geçersiz sayı.');
    }
    const check=replay([...state.ledger,e]);
    if(check.error) return alert(check.error);
    state.ledger.push(e);save();render();
  };

  // Eski bir yedek sonradan içe aktarılırsa da yeni alanları tamamla.
  window.render = function () {
    migrateBatchSettings();
    originalRender();
    const pill = document.querySelector('header .pill');
    if (pill) pill.textContent = 'v1.6';
  };

  const style = document.createElement('style');
  style.textContent = `
    .production-head{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,.9fr) minmax(0,1.3fr);gap:8px;align-items:start}
    .production-head .field{min-width:0;margin-bottom:10px}
    .production-head .field label{font-size:11px;white-space:normal;line-height:1.25;min-height:2.5em}
    .production-head input{width:100%;min-width:0;padding:10px 7px;font-size:16px}
    .batch-summary{margin:0 0 13px;padding:8px 10px;background:#101f30;border:1px solid #2c4f68;border-radius:9px;color:#cbd5e1;font-size:12px;line-height:1.45}
    .batch-summary strong{color:#93c5fd;font-size:14px}
    .grid.compact-pair{grid-template-columns:repeat(2,minmax(0,1fr))}
    @media(max-width:390px){.grid.compact-pair{grid-template-columns:repeat(2,minmax(0,1fr))}.production-head{gap:6px}}
  `;
  document.head.appendChild(style);
  const pill=document.querySelector('header .pill');
  if(pill) pill.textContent='v1.6';
  render();
})();
