# Tüccar PWA v1.0

Kılıç ve çelik üretim hesaplama, günlük üretim/satış/stok takibi. Koyu tema, çevrimdışı PWA, localStorage kayıtları.

## Çalıştırma

Proje dizininde `python -m http.server 8000` çalıştırıp `http://localhost:8000` açın. PWA kurulumu ve çevrimdışı önbellek için HTTPS üzerinden GitHub Pages gibi bir statik siteye yayınlayın. `file://` üzerinden servis çalışanı çalışmaz.

## Ekonomi

- Kılıç: 11 dakikada bant başına 37; 59 çelik + 59 kömür; satış vergisi %6,1.
- Çelik: 4 dakikada bant başına 72; 108 demir + 36 kömür; satış vergisi %7,2.
- İşçilik kesintisi uygulanmaz.
- Hedef adet modunda gereken tam üretim döngüleri yukarı yuvarlanır.
- Stok işlemlerinde ortalama maliyet uygulanır. Çelikten kılıç üretimi sırasında çelik stoğu kullanılır; yetersiz çelik stokuna izin verilmez. Kılıç üretim maliyetine stoktaki çelik birim maliyeti ve girilen kömür maliyeti eklenir. Demir ve kömür stokları tutulmaz, maliyetleri alım fiyatıyla hesaplanır.
- Günlük net kâr yalnız satılan ürünler üzerinden hesaplanır. Satış için yeterli stok gerekir.

## Sınırlar

Veriler yalnızca aynı tarayıcı profilinde saklanır. Uygulama cihazlar arası eşitlenmez. Yedek almak için JSON dışa aktar ve geri yükle araçları kullanılır. İşlem silinmesi sonraki kayıtların stok maliyetlerini etkileyebilir; tüm defter kronolojik yeniden hesaplanır ve stok negatife düşecek silme engellenir.
