# TradeSwarm 🚀

TradeSwarm, LangGraph altyapısıyla geliştirilmiş, çoklu-ajan (multi-agent) mimarisine sahip zeki bir kripto para ticaret ve analiz asistanıdır. Kullanıcıların doğal dille verdiği karmaşık emirleri anlar, alt ajanlara (Sub-Agents) böler, paralel olarak çalıştırır ve sonuçları şık bir arayüzde sunar.

## 🌟 Özellikler

- **Çoklu-Ajan Mimarisi (Multi-Agent):** 
  - 🧠 **Orchestrator (Ana Ajan):** Kullanıcı isteklerini analiz eder, plan yapar ve görevleri alt ajanlara dağıtır.
  - 📈 **Piyasa Analisti (Market Analyzer):** CoinGecko üzerinden anlık fiyat, hacim, trend ve borsa listelemelerini çeker.
  - 💼 **Trader Ajanı (Trader Agent):** Binance entegrasyonu ile spot bakiye sorgulama ve işlem (trade) simülasyonları yapar.
  - 🔍 **Araştırmacı Ajan (Researcher):** Tavily arama motoru ile güncel kripto haberlerini ve makroekonomik gelişmeleri araştırır.
- **Paralel Çalıştırma:** Ajanlar görevleri birbirini beklemeden aynı anda çalıştırır. (Örn: Bir yandan Binance bakiyesi çekilirken, diğer yandan güncel fiyatlar analiz edilir).
- **Akıllı Arayüz (UI):** ChatGPT benzeri, ajanların çalışma adımlarını, çağırdıkları araçları (tools) ve düşünce süreçlerini gerçek zamanlı kronolojik sırayla (Streaming) gösteren pürüzsüz web arayüzü.
- **Kalıcı Hafıza:** PostgreSQL destekli asenkron veritabanı yapısı sayesinde geçmiş sohbetleriniz ve ajanların bağlam hafızası (Memory) asla kaybolmaz. Sohbet başlıkları Llama 3.1 ile otomatik oluşturulur.
- **Telegram Bildirimleri:** Alınan kararları, piyasa raporlarını veya kritik bakiye uyarılarını tek bir komutla anında Telegram telefonunuza iletir.

## 🛠 Teknolojiler

- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy (Async), PostgreSQL
- **Yapay Zeka:** LangChain, LangGraph (v2), OpenRouter (Llama 3.1, vb.)
- **Frontend:** HTML, TailwindCSS, Vanilla JS (SSE - Server Sent Events)
- **Altyapı:** Docker & Docker Compose, Nginx

## 🚀 Kurulum & Çalıştırma

Proje tamamen Dockerize edilmiştir. Çalıştırmak için sisteminizde `docker` ve `docker-compose` kurulu olması yeterlidir.

### 1. Ortam Değişkenlerini Ayarlayın
Proje dizininde bir `.env` dosyası oluşturun ve API anahtarlarınızı girin:

```env
# 1. Orchestrator Agent (Ana Ajan - Yüksek kapasiteli model)
ORCHESTRATOR_BASE_URL=https://openrouter.ai/api/v1
ORCHESTRATOR_API_KEY=your_orchestrator_api_key
ORCHESTRATOR_MODEL=deepseek/deepseek-v4-flash

# 2. Sub-Agents (Alt Ajanlar - Hızlı/Ucuz modeller)
SUB_AGENT_BASE_URL=https://openrouter.ai/api/v1
SUB_AGENT_API_KEY=your_subagent_api_key
SUB_AGENT_MODEL=deepseek/deepseek-v4-flash

# 3. Title Generator (Sohbet Başlığı Üretici - Hafif modeller)
TITLE_BASE_URL=https://openrouter.ai/api/v1
TITLE_API_KEY=your_title_api_key
TITLE_MODEL=meta-llama/llama-3.1-8b-instruct

# Binance API
BINANCE_SPOT_API_KEY=your_binance_api_key
BINANCE_SPOT_SECRET_KEY=your_binance_secret_key

# Araştırma Aracı & API'ler
TAVILY_API_KEY=your_tavily_api_key
COINGECKO_API_KEY=your_coingecko_api_key

# Telegram Bildirimleri (Opsiyonel)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Veritabanı
POSTGRES_USER=swarmuser
POSTGRES_PASSWORD=swarmpassword
POSTGRES_DB=tradeswarm
DB_HOST=localhost
DB_PORT=5432
```

### 2. Konteynerleri Başlatın
Aşağıdaki komutla tüm altyapıyı tek seferde ayağa kaldırın:
```bash
docker-compose up -d --build
```
*Bu komut; PostgreSQL veritabanını, FastAPI sunucusunu ve Nginx arayüz sunucusunu başlatacaktır.*

### 3. Arayüze Erişin
Tarayıcınızı açın ve aşağıdaki adrese gidin:
👉 `http://localhost:3000`

## 🧠 Nasıl Çalışır? (Teknik Mimari)
Sistem LangGraph StateGraph üzerine kuruludur.
1. **Kullanıcı Girdisi:** Arayüzden gelen mesaj FastAPI'ye iletilir.
2. **Orchestrator Düğümü:** Ana ajan mesajı alır. Gerekli araçları (Piyasa Analisti, Trader vb.) seçer.
3. **Paralel Çalışma:** Seçilen alt ajanlar, kendi `run_id` ve `parent_ids` kimlikleriyle izole şekilde arka planda çalışır.
4. **Gerçek Zamanlı Akış (SSE):** Alt ajanların çalıştırdığı toollar ve sonuçları, Backend'den Frontend'e `Server-Sent Events` ile anlık olarak aktarılır.
5. **Kapsüllü UI:** Frontend, gelen asenkron verileri ebeveyn ID'lerine göre eşleştirip, ait oldukları alt ajanın UI kutusuna dinamik olarak yerleştirir.

## 🤝 Katkıda Bulunma
Bu proje geliştirilmeye açıktır. Yeni bir "Ajan" veya "Borsa" entegre etmek isterseniz Pull Request göndermekten çekinmeyin!