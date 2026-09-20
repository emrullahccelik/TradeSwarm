# Kripto Veri Sağlayıcıları API Analiz Raporu

Araştırma ajanı veya diğer alt sistemlerimiz için kullanabileceğimiz 3 popüler platformun (TradingView, CoinMarketCap, CoinGecko) API yeteneklerini, sundukları özellikleri ve avantaj/dezavantajlarını detaylıca analiz ettim.

---

## 1. CoinGecko API (⭐️ Kripto İçin En Çok Tavsiye Edilen)
Kripto para piyasasında bireysel geliştiriciler ve Web3 projeleri tarafından en çok sevilen ve kullanılan veri kaynağıdır.

**Neler Sunuyor?**
- **Canlı ve Geçmiş Fiyat Verisi:** 14.000'den fazla coinin anlık fiyatı, piyasa değeri ve işlem hacmi.
- **Tarihsel OHLC Verisi:** Mum grafikleri oluşturmak için (Geçmiş açılış, kapanış fiyatları).
- **Kategori Bazlı Veriler:** Örneğin; "Sadece Yapay Zeka (AI) coinlerinin verilerini getir", "Meme coinleri listele" gibi çok kullanışlı filtreler.
- **Temel Analiz Verileri:** Coinlerin geliştirici aktiviteleri (Github commitleri), topluluk verileri (X takipçi sayısı) ve arz bilgileri.
- **Borsa Verileri (Exchanges):** Borsaların güven skorları, hacimleri ve listeledikleri coinler.

**Avantajları ve Dezavantajları:**
- ✅ **Ücretsiz Paket (Free Tier):** Kredi kartı bile girmeden hemen kullanılabilir. Aylık 10.000 istek (dakikada ~30 istek) limiti vardır, bireysel projeler için harikadır.
- ✅ Çok kapsamlı altcoin verisine sahiptir.
- ❌ Ücretsiz sürümde veri gecikmesi (1-5 dakika) olabilir.

---

## 2. CoinMarketCap API (Kurumsal ve Klasik Seçim)
Dünyanın en çok ziyaret edilen kripto portalı olan CoinMarketCap'in resmi API'sidir. Daha çok borsalar ve büyük cüzdan uygulamaları tarafından tercih edilir.

**Neler Sunuyor?**
- **Kripto Varlık Verileri:** Güncel fiyat, hacim, dolaşımdaki arz (circulating supply) ve piyasa değeri.
- **Global Metrikler:** Toplam kripto piyasa değeri, Bitcoin dominansı (hakimiyeti), Ethereum dominansı.
- **Borsa ve Parite Bilgileri:** Hangi coinin hangi borsada ne kadar hacmi var.
- **Yeni Listelenenler:** Piyasaya yeni sürülen coinlerin listesi.

**Avantajları ve Dezavantajları:**
- ✅ Sektör standartı veriler sunar (CMC sıralamaları vs.).
- ❌ **Ücretsiz Sürüm Kısıtlamaları:** Ücretsiz paketi (Basic Tier) çok kısıtlıdır. Sadece günlük 333 istek yapabilirsiniz (aylık 10.000).
- ❌ OHLC (Mum Grafiği) geçmiş fiyat verileri gibi en önemli özellikler ücretsiz pakette **kapalıdır**; sadece ücretli paketlerde (aylık 79$+ ) sunulur.

---

## 3. TradingView API (Büyük Bir Yanılgı)
TradingView dünyadaki en iyi grafik platformu olsa da, API konusunda geliştiriciler için çok farklı bir yapıya sahiptir. 

**Neler Sunuyor?**
- **Webhooks (Uyarılar):** Siz TradingView üzerinde bir indikatör alarmı kurarsınız, şart gerçekleşince TradingView sizin sunucunuza (botunuza) HTTP Post isteği gönderir. (Al-Sat botları genelde böyle çalışır).
- **Advanced Charts kütüphanesi:** Kendi web sitenize TradingView benzeri bir grafik arayüzü gömmenizi sağlar (Veriyi kendiniz sağlamalısınız).

**Avantajları ve Dezavantajları:**
- ❌ **Veri Çekme (REST API) Yoktur!** Yani kodunuzun içinden `get_price("BTCUSDT")` diyerek TradingView'dan anlık veya geçmiş veri çekebileceğiniz **resmi bir açık API'si yoktur.**
- ❌ TradingView verilerini çekmek için (tvDatafeed gibi) gayriresmi kütüphaneler kullanılır, ancak bunlar tıpkı Investing'de olduğu gibi **Cloudflare ve bot korumasına** takılır.

---

## 💡 Sonuç ve Mimari Tavsiyesi

Eğer ajanlarımıza genel piyasa, altcoin araştırması, kategori bazlı trendler ve arz/talep temel analizleri gibi yetenekler kazandırmak istiyorsak:

👉 **CoinGecko API** açık ara en iyi seçimdir. 
Tamamen ücretsizdir, Python için harika kütüphaneleri (`pycoingecko`) vardır ve Araştırma (Researcher) ajanımıza "Şu an en popüler Yapay Zeka coinleri hangileri?" gibi soruları sorma yeteneği kazandırabilir.

Sadece borsadaki alım-satım ve anlık fiyat takibi için zaten **Binance API**'mizi sorunsuz kurduk. CoinGecko'yu piyasa araştırması (research) aracı olarak projeye dahil etmemi ister misiniz?
