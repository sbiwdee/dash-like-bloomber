// Конфигурация приложения
const CONFIG = {
  updateInterval: 300000, // 5 минут
  tickerUpdateInterval: 8000, // 8 секунд
  timeUpdateInterval: 1000, // 1 секунда
  retryAttempts: 3,
  musicVolume: 0.15,
  fallbackValues: {
    btc: '67,500',
    eth: '3,450',
    gold: '2,340.00',
    oil: '87,50',
    'usd-cbr': '92,10',
    'usd-mb': '92,35'
  },
  chartPoints: 30, // Количество точек на графике
  chartUpdateInterval: 60000, // Обновление графиков каждую минуту
  historyDays: 1 // Загружаем данные за последний день для актуальности
};

// API URLs
const API_URLS = {
  crypto: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
  cryptoHistory: 'https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days={days}',
  gold: 'https://api.gold-api.com/price/XAU',
  goldHistory: 'https://api.gold-api.com/rates/XAU/{days}',
  oil: 'https://www.alphavantage.co/query?function=WTI&interval=weekly&apikey=GAJYW71E8KK0I7CL',
  usdRub: 'https://www.cbr-xml-daily.ru/daily_json.js'
};

// Заглушки для новостей
const NEWS_LIST = [
  "Bitcoin превысил 70 000 долларов",
  "Ethereum готовится к обновлению Dencun",
  "Рынок криптовалют стабилизируется после волатильности",
  "Simple Exchange запустил новый офис в Дубае",
  "Крупные институты увеличивают позиции в BTC"
];

const AD_TEXT = "Simple Exchange - надежный обменник криптовалют с офисами в Москве и Нижнем Новгороде. Работаем по всему миру. Покупка и продажа USDT, оплата счетов от иностранных контрагентов. Быстрые и безопасные сделки с криптовалютой.";

// Кэширование DOM-элементов
const elements = {
  time: {
    moscow: document.getElementById('moscow'),
    dubai: document.getElementById('dubai'),
    london: document.getElementById('london'),
    ny: document.getElementById('ny'),
    bangkok: document.getElementById('bangkok') // Добавлено время Бангкока
  },
  // Элементы для бегущей строки индексов
  ticker: {
    btc: document.getElementById('btc-ticker'),
    eth: document.getElementById('eth-ticker'),
    gold: document.getElementById('gold-ticker'),
    oil: document.getElementById('oil-ticker'),
    'usd-cbr': document.getElementById('usd-cbr-ticker'),
    'usd-mb': document.getElementById('usd-mb-ticker')
  },
  tickerChange: {
    btc: document.getElementById('btc-change'),
    eth: document.getElementById('eth-change'),
    gold: document.getElementById('gold-change'),
    oil: document.getElementById('oil-change'),
    'usd-cbr': document.getElementById('usd-cbr-change'),
    'usd-mb': document.getElementById('usd-mb-change')
  },
  // Элементы для основных графиков
  main: {
    btc: document.getElementById('btc-main'),
    eth: document.getElementById('eth-main'),
    gold: document.getElementById('gold-main'),
    oil: document.getElementById('oil-main'),
    'usd-cbr': document.getElementById('usd-cbr-main'),
    'usd-mb': document.getElementById('usd-mb-main')
  },
  mainChange: {
    btc: document.getElementById('btc-main-change'),
    eth: document.getElementById('eth-main-change'),
    gold: document.getElementById('gold-main-change'),
    oil: document.getElementById('oil-main-change'),
    'usd-cbr': document.getElementById('usd-cbr-main-change'),
    'usd-mb': document.getElementById('usd-mb-main-change')
  },
  charts: {
    'btc-main': document.getElementById('chart-btc-main'),
    'eth-main': document.getElementById('chart-eth-main'),
    'gold-main': document.getElementById('chart-gold-main'),
    'oil-main': document.getElementById('chart-oil-main'),
    'usd-cbr-main': document.getElementById('chart-usd-cbr-main'),
    'usd-mb-main': document.getElementById('chart-usd-mb-main')
  },
  ticker: document.getElementById('ticker'),
  music: document.getElementById('bg-music')
};

// Состояние приложения
const state = {
  currentNewsIndex: 0,
  prevValues: {
    btc: null,
    eth: null,
    gold: null,
    oil: null,
    'usd-cbr': null,
    'usd-mb': null
  },
  isMusicPlaying: false,
  chartData: {
    btc: [],
    eth: [],
    gold: [],
    oil: [],
    'usd-cbr': [],
    'usd-mb': []
  },
  chartColors: {
    btc: '#F7931A',
    eth: '#627EEA',
    gold: '#FFD700',
    oil: '#333333',
    'usd-cbr': '#1E88E5',
    'usd-mb': '#43A047'
  },
  mainCharts: {}
};

// Улучшенная функция fetch с повторными попытками
async function fetchWithRetry(url, options = {}, retries = CONFIG.retryAttempts) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Централизованная обработка ошибок
function handleError(error, context) {
  console.error(`Ошибка в ${context}:`, error);
}

// Форматирование чисел
function formatNumber(num) {
  return new Intl.NumberFormat('ru-RU').format(num);
}

// Форматирование изменения в процентах
function formatChange(value, prevValue) {
  if (!prevValue) return '--';
  const change = ((value - prevValue) / prevValue * 100);
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}

// Функция обновления значения
function updateValue(id, newValue) {
  const valueElement = elements.main[id];
  
  if (!valueElement) {
    console.error("Элемент не найден:", id);
    return;
  }
  
  valueElement.textContent = newValue;
  
  // Сохраняем предыдущее значение для сравнения
  state.prevValues[id] = newValue;
  
  // Обновляем данные для графика
  const numericValue = parseFloat(newValue.replace(/,/g, '').replace(/\./g, ''));
  updateChartData(id, numericValue);
  
  // Обновляем изменение
  updateChange(id, numericValue);
}

// Обновление изменения
function updateChange(id, currentValue) {
  const prevValue = state.prevValues[id];
  const changeElement = elements.mainChange[id];
  const tickerChangeElement = elements.tickerChange[id];
  
  if (!changeElement || !tickerChangeElement || !prevValue) return;
  
  const prev = parseFloat(prevValue.replace(/,/g, '').replace(/\./g, ''));
  const change = ((currentValue - prev) / prev * 100);
  
  const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  
  changeElement.textContent = changeText;
  tickerChangeElement.textContent = changeText;
  
  // Обновляем классы для цвета
  const className = change >= 0 ? 'positive' : 'negative';
  changeElement.className = `chart-change ${className}`;
  tickerChangeElement.className = `index-change ${className}`;
}

// Обновление бегущей строки индексов
function updateTickerValues() {
  Object.keys(CONFIG.fallbackValues).forEach(id => {
    const tickerElement = elements.ticker[id];
    if (!tickerElement || !state.prevValues[id]) return;
    
    tickerElement.textContent = formatNumber(state.prevValues[id]);
  });
}

// Обновление данных для графика
function updateChartData(id, value) {
  if (!state.chartData[id]) {
    state.chartData[id] = [];
  }
  
  // Добавляем новое значение с текущей временной меткой
  state.chartData[id].push({
    time: new Date(),
    value: value
  });
  
  // Ограничиваем количество точек
  if (state.chartData[id].length > CONFIG.chartPoints) {
    state.chartData[id].shift();
  }
  
  // Обновляем график
  updateMainChart(id);
}

// Создание основного графика
function createMainChart(id) {
  const ctx = elements.charts[`${id}-main`];
  if (!ctx) return;
  
  const data = state.chartData[id] || [];
  const labels = data.map(point => point.time.toLocaleTimeString());
  
  state.mainCharts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: id.toUpperCase(),
        data: data.map(point => point.value),
        borderColor: getChartColor(id),
        backgroundColor: getChartColor(id) + '20',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#000',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 4,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: '#333',
            borderColor: '#333'
          },
          ticks: {
            color: '#888',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          display: true,
          grid: {
            color: '#333',
            borderColor: '#333'
          },
          ticks: {
            color: '#888',
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// Обновление основного графика
function updateMainChart(id) {
  const chart = state.mainCharts[id];
  const data = state.chartData[id] || [];
  
  if (!chart || data.length < 2) {
    if (!chart) createMainChart(id);
    return;
  }
  
  const labels = data.map(point => point.time.toLocaleTimeString());
  
  chart.data.labels = labels;
  chart.data.datasets[0].data = data.map(point => point.value);
  
  // Обновляем цвет линии в зависимости от тренда
  if (data.length > 1) {
    const lastValue = data[data.length - 1].value;
    const prevValue = data[data.length - 2].value;
    chart.data.datasets[0].borderColor = lastValue >= prevValue ? '#00C853' : '#d32f2f';
    chart.data.datasets[0].backgroundColor = (lastValue >= prevValue ? '#00C853' : '#d32f2f') + '20';
  }
  
  chart.update('none');
}

// Получение цвета для графика
function getChartColor(id) {
  const colors = {
    btc: '#F7931A',
    eth: '#627EEA',
    gold: '#FFD700',
    oil: '#333333',
    'usd-cbr': '#1E88E5',
    'usd-mb': '#43A047'
  };
  
  return colors[id] || '#00C853';
}

// Загрузка исторических данных для графиков
async function loadHistoricalData() {
  try {
    // Загрузка исторических данных для криптовалют
    const btcHistory = await fetchWithRetry(
      API_URLS.cryptoHistory.replace('{id}', 'bitcoin').replace('{days}', CONFIG.historyDays)
    );
    
    const ethHistory = await fetchWithRetry(
      API_URLS.cryptoHistory.replace('{id}', 'ethereum').replace('{days}', CONFIG.historyDays)
    );
    
    // Обработка данных Bitcoin
    if (btcHistory.prices) {
      state.chartData.btc = btcHistory.prices.map(point => ({
        time: new Date(point[0]),
        value: point[1]
      }));
      updateMainChart('btc');
    }
    
    // Обработка данных Ethereum
    if (ethHistory.prices) {
      state.chartData.eth = ethHistory.prices.map(point => ({
        time: new Date(point[0]),
        value: point[1]
      }));
      updateMainChart('eth');
    }
    
    // Для остальных активов используем текущие значения с симуляцией истории
    Object.keys(CONFIG.fallbackValues).forEach(id => {
      if (id !== 'btc' && id !== 'eth') {
        const numericValue = parseFloat(CONFIG.fallbackValues[id].replace(/,/g, '').replace(/\./g, ''));
        
        // Создаем начальные данные
        state.chartData[id] = [];
        for (let i = 0; i < CONFIG.chartPoints; i++) {
          state.chartData[id].push({
            time: new Date(Date.now() - (CONFIG.chartPoints - i) * 60000),
            value: numericValue
          });
        }
        
        updateMainChart(id);
      }
    });
    
    console.log("Исторические данные загружены");
    
  } catch (error) {
    handleError(error, 'загрузке исторических данных');
    
    // Если не удалось загрузить историю, используем текущие значения
    Object.keys(CONFIG.fallbackValues).forEach(id => {
      const numericValue = parseFloat(CONFIG.fallbackValues[id].replace(/,/g, '').replace(/\./g, ''));
      
      // Создаем начальные данные
      state.chartData[id] = [];
      for (let i = 0; i < CONFIG.chartPoints; i++) {
        state.chartData[id].push({
          time: new Date(Date.now() - (CONFIG.chartPoints - i) * 60000),
          value: numericValue
        });
      }
      
      updateMainChart(id);
    });
  }
}

// Обновление графиков на основе реальных изменений
function updateChartsWithRealData() {
  Object.keys(state.chartData).forEach(id => {
    if (state.chartData[id].length > 0) {
      const lastValue = state.chartData[id][state.chartData[id].length - 1].value;
      
      // Для криптовалют используем реальные данные из API
      // Для остальных симулируем небольшие изменения
      if (id === 'btc' || id === 'eth') {
        // Данные уже обновлены через updateValue
      } else {
        // Генерируем небольшое изменение в пределах ±0.5%
        const change = (Math.random() - 0.5) * 0.01;
        const newValue = lastValue * (1 + change);
        updateChartData(id, newValue);
      }
    }
  });
}

// Оптимизация обновления времени
function updateTime() {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  
  elements.time.moscow.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Europe/Moscow' });
  elements.time.dubai.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Asia/Dubai' });
  elements.time.london.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Europe/London' });
  elements.time.ny.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'America/New_York' });
  elements.time.bangkok.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Asia/Bangkok' }); // Добавлено время Бангкока
}

// Обновление всех курсов
async function fetchAllRates() {
  try {
    const [cryptoData, goldData, oilData, rubData] = await Promise.allSettled([
      fetchWithRetry(API_URLS.crypto),
      fetchWithRetry(API_URLS.gold),
      fetchWithRetry(API_URLS.oil),
      fetchWithRetry(API_URLS.usdRub)
    ]);

    // Обработка криптовалют
    if (cryptoData.status === 'fulfilled') {
      updateValue('btc', formatNumber(cryptoData.value.bitcoin.usd));
      updateValue('eth', formatNumber(cryptoData.value.ethereum.usd));
    } else {
      handleError(cryptoData.reason, 'криптовалютах');
      updateValue('btc', CONFIG.fallbackValues.btc);
      updateValue('eth', CONFIG.fallbackValues.eth);
    }
    
    // Обработка золота
    if (goldData.status === 'fulfilled' && goldData.value.price) {
      updateValue('gold', goldData.value.price.toFixed(2));
    } else {
      handleError(goldData.reason, 'золоте');
      updateValue('gold', CONFIG.fallbackValues.gold);
    }
    
    // Обработка нефти
    if (oilData.status === 'fulfilled') {
      try {
        const oilRes = oilData.value;
        if (!oilRes || !oilRes.data || !Array.isArray(oilRes.data)) {
          throw new Error("Неверный формат ответа API");
        }
        
        const sortedData = [...oilRes.data].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sortedData.length === 0) {
          throw new Error("Отсутствуют данные по нефти");
        }
        
        const latestData = sortedData[0];
        if (!latestData || typeof latestData.value !== 'string') {
          throw new Error("Некорректное значение цены");
        }
        
        const numericPrice = parseFloat(latestData.value);
        if (isNaN(numericPrice)) {
          throw new Error(`Не удалось преобразовать "${latestData.value}" в число`);
        }
        
        updateValue('oil', numericPrice.toFixed(2));
      } catch (e) {
        handleError(e, 'нефти');
        updateValue('oil', CONFIG.fallbackValues.oil);
      }
    } else {
      handleError(oilData.reason, 'нефти');
      updateValue('oil', CONFIG.fallbackValues.oil);
    }
    
    // Обработка USD/RUB
    if (rubData.status === 'fulfilled') {
      try {
        const usdRub = rubData.value;
        const cbr = usdRub.Valute.USD.Value;
        updateValue('usd-cbr', cbr.toFixed(2));
        updateValue('usd-mb', (cbr + 0.25).toFixed(2));
      } catch (e) {
        handleError(e, 'USD/RUB');
        updateValue('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
        updateValue('usd-mb', CONFIG.fallbackValues['usd-mb']);
      }
    } else {
      handleError(rubData.reason, 'USD/RUB');
      updateValue('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
      updateValue('usd-mb', CONFIG.fallbackValues['usd-mb']);
    }
    
    // Обновляем значения в бегущей строке
    updateTickerValues();
    
  } catch (error) {
    handleError(error, 'загрузке курсов');
    // Применяем все значения по умолчанию в случае общей ошибки
    Object.entries(CONFIG.fallbackValues).forEach(([key, value]) => {
      updateValue(key, value);
    });
    updateTickerValues();
  }
}

// Плавное обновление бегущей строки
function updateTicker() {
  const ticker = elements.ticker;
  const isAd = Math.random() > 0.5;
  const newText = isAd 
    ? `РЕКЛАМА: ${AD_TEXT}` 
    : `НОВОСТЬ: ${NEWS_LIST[state.currentNewsIndex]}`;
  
  // Плавная смена текста без перезапуска анимации
  ticker.style.transition = 'opacity 0.5s';
  ticker.style.opacity = '0';
  
  setTimeout(() => {
    ticker.textContent = newText;
    ticker.style.opacity = '1';
    state.currentNewsIndex = (state.currentNewsIndex + 1) % NEWS_LIST.length;
  }, 500);
}

// Автоматическое управление музыкой
function initMusic() {
  // Устанавливаем громкость
  elements.music.volume = CONFIG.musicVolume;
  
  // Пытаемся автоматически запустить музыку
  const playPromise = elements.music.play();
  
  if (playPromise !== undefined) {
    playPromise.then(() => {
      // Автовоспроизведение успешно начато
      state.isMusicPlaying = true;
      console.log("Музыка автоматически запущена");
    }).catch(error => {
      // Автовоспроизведение заблокировано браузером
      console.error("Автовоспроизведение заблокировано:", error);
      
      // Добавляем обработчик клика для запуска музыки при первом взаимодействии
      document.addEventListener('click', function enableMusic() {
        elements.music.play().then(() => {
          state.isMusicPlaying = true;
          console.log("Музыка запущена после клика");
        }).catch(e => {
          console.error("Не удалось запустить музыку после клика:", e);
        });
        
        // Удаляем обработчик после первого использования
        document.removeEventListener('click', enableMusic);
      }, { once: true });
    });
  }
}

// Автоматический перезапуск страницы каждые 24 часа для предотвращения зависаний
function setupAutoRefresh() {
  const refreshInterval = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
  
  setTimeout(() => {
    console.log("Автоматическое обновление страницы через 24 часа");
    window.location.reload(true);
  }, refreshInterval);
}

// Инициализация графиков
async function initCharts() {
  // Загружаем исторические данные при запуске
  await loadHistoricalData();
  
  // Запускаем обновление графиков с реальными данными
  setInterval(updateChartsWithRealData, CONFIG.chartUpdateInterval);
}

// Инициализация приложения
async function initApp() {
  // Сразу отображаем значения по умолчанию
  Object.entries(CONFIG.fallbackValues).forEach(([key, value]) => {
    elements.main[key].textContent = value;
  });
  
  // Инициализируем графики с историческими данными
  await initCharts();
  
  // Запуск обновлений
  fetchAllRates();
  setInterval(fetchAllRates, CONFIG.updateInterval);
  
  updateTime();
  setInterval(updateTime, CONFIG.timeUpdateInterval);
  
  updateTicker();
  setInterval(updateTicker, CONFIG.tickerUpdateInterval);
  
  // Автоматическое управление музыкой
  initMusic();
  
  // Настройка автоматического обновления страницы
  setupAutoRefresh();
  
  // Переход в полноэкранный режим (опционально)
  document.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Ошибка при попытке перейти в полноэкранный режим: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);
