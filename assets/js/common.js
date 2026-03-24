// ==================== GA4 Event Tracking ====================
function trackGA4Event(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
}

// ==================== Navigation Component ====================
function createNavComponent() {
    const nav = document.createElement('nav');
    nav.className = 'main-nav';
    nav.innerHTML = `
        <div class="nav-content">
            <!-- Desktop Layout -->
            <div class="lang-switch desktop-nav">
                <button class="form-btn">
                    <img src="assets/images/from.svg" alt="" class="form-icon form-icon-default">
                    <img src="assets/images/from-active.svg" alt="" class="form-icon form-icon-active">
                    <span data-i18n="feedback_form">回饋表單</span>
                </button>
                <button class="lang-btn active" data-lang="tw">中文</button>
                <span class="lang-divider">|</span>
                <button class="lang-btn" data-lang="en">En</button>
            </div>
            <!-- Mobile Hamburger Button -->
            <button class="mobile-menu-btn" aria-label="開啟選單">
                <img src="assets/images/btn_menu.svg" alt="選單" class="menu-icon">
                <img src="assets/images/btn_close.svg" alt="關閉" class="close-icon">
            </button>
        </div>
        <!-- Mobile Menu Overlay -->
        <div class="mobile-menu-overlay">
            <div class="mobile-menu-content">
                <button class="form-btn">
                    <img src="assets/images/from.svg" alt="" class="form-icon form-icon-default">
                    <img src="assets/images/from-active.svg" alt="" class="form-icon form-icon-active">
                    <span data-i18n="feedback_form">回饋表單</span>
                </button>
                <div class="mobile-lang-row">
                    <img src="assets/images/earth.svg" alt="" class="earth-icon">
                    <button class="lang-btn active" data-lang="tw">中文</button>
                    <span class="lang-divider">|</span>
                    <button class="lang-btn" data-lang="en">En</button>
                </div>
               
                
            </div>
        </div>
    `;
    return nav;
}

function initNavComponent() {
    const placeholder = document.getElementById('nav-component');
    if (placeholder) {
        placeholder.replaceWith(createNavComponent());
    }
}

// ==================== Internationalization ====================
const i18n = {
    tw: {
        welcome: '歡迎光臨',
        feedback_form: '回饋表單',
        enter_btn: '開始導覽',
        seasonal_unit: '當季單元',
        special_unit: '特別單元',
        permanent_unit: '常態單元',
        enter_intro: '進入介紹',
        play_audio: '播放語音導覽',
        pause_audio: '暫停播放',
        back_home: '返回首頁',
        loading: '載入中...',
        survey_link: '前往問卷'
    },
    en: {
        welcome: 'Welcome',
        feedback_form: 'Feedback',
        enter_btn: 'Show Me How It Works',
        seasonal_unit: 'Current Program',
        special_unit: 'Special Feature',
        permanent_unit: 'Year-Round Program',
        enter_intro: 'Introduction',
        play_audio: 'Play Audio Guide',
        pause_audio: 'Pause',
        back_home: 'Home',
        loading: 'Loading...',
        survey_link: 'Go to Survey'
    }
};

// ==================== Language Management ====================
function getCurrentLang() {
    return localStorage.getItem('gallery_lang') || 'tw';
}

function setCurrentLang(lang) {
    localStorage.setItem('gallery_lang', lang);
}

function applyLanguage(lang) {
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[lang] && i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });

    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Trigger custom event for content update
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

// ==================== Mobile Menu ====================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const nav = document.querySelector('.main-nav');

    if (menuBtn && overlay) {
        menuBtn.addEventListener('click', () => {
            const isOpening = !nav.classList.contains('menu-open');
            nav.classList.toggle('menu-open');
            document.body.classList.toggle('mobile-menu-open');

            // GA4 追蹤：手機選單開關
            trackGA4Event('mobile_menu_toggle', {
                'action': isOpening ? 'open' : 'close'
            });
        });

        // Close menu when clicking overlay background
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                nav.classList.remove('menu-open');
                document.body.classList.remove('mobile-menu-open');
            }
        });

        // Close menu when selecting an option
        overlay.querySelectorAll('.lang-btn, .form-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                nav.classList.remove('menu-open');
                document.body.classList.remove('mobile-menu-open');
            });
        });
    }
}

// ==================== Survey QRCode Popup ====================
let surveyData = null;

// 創建 popup HTML 結構
function createSurveyPopup() {
    const popup = document.createElement('div');
    popup.id = 'survey-popup';
    popup.className = 'survey-popup-overlay';
    popup.innerHTML = `
        <button class="survey-popup-close" aria-label="關閉"></button>
        <div class="survey-popup-content">         
            <div class="survey-popup-title" data-i18n="feedback_form">回饋表單</div>
            <img class="survey-qrcode-img" src="" alt="QR Code">
            <a class="survey-link" href="" target="_blank" data-i18n="survey_link">前往問卷</a>
        </div>
    `;
    document.body.appendChild(popup);

    // 點擊背景關閉
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            closeSurveyPopup();
        }
    });

    // 點擊關閉按鈕
    popup.querySelector('.survey-popup-close').addEventListener('click', closeSurveyPopup);

    // 點擊問卷連結 - GA4 追蹤
    popup.querySelector('.survey-link').addEventListener('click', () => {
        trackGA4Event('survey_link_click');
    });

    return popup;
}

// 載入問卷調查資料
async function loadSurveyData() {
    if (surveyData) return surveyData;

    try {
        const response = await fetch('data/content.csv');
        if (response.ok) {
            const csvText = await response.text();
            const data = parseCSVSimple(csvText);
            // 找問卷調查的項目
            surveyData = data.find(item => item.UnitType === '問卷調查');
            return surveyData;
        }
    } catch (error) {
        console.error('Error loading survey data:', error);
    }
    return null;
}

// 簡化版 CSV 解析
function parseCSVSimple(text) {
    const rows = [];
    let currentCell = '';
    let inQuotes = false;
    let currentRow = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length > 0 || currentCell !== '') {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    if (currentRow.length > 0 || currentCell !== '') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headers = rows[0];
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = (values[index] || '').trim();
            });
            if (row.UnitType && row.UnitType !== '') {
                data.push(row);
            }
        }
    }

    return data;
}

// 開啟問卷 popup
async function openSurveyPopup() {
    // GA4 追蹤：開啟問卷
    trackGA4Event('survey_open');

    let popup = document.getElementById('survey-popup');
    if (!popup) {
        popup = createSurveyPopup();
    }

    const data = await loadSurveyData();
    if (data) {
        const lang = getCurrentLang();
        const isMobile = window.innerWidth <= 768;

        // 根據語言和裝置類型選擇正確的圖片欄位
        let imageFile;
        if (lang === 'tw') {
            imageFile = isMobile ? data.Image_TW_Mobile : data.Image_TW_PC;
        } else {
            imageFile = isMobile ? data.Image_EN_Mobile : data.Image_EN_PC;
        }
        const url = data.URL || '';

        const img = popup.querySelector('.survey-qrcode-img');
        const link = popup.querySelector('.survey-link');

        if (imageFile) {
            img.src = `data/images/${imageFile}`;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }

        if (url) {
            link.href = url;
            link.style.display = 'inline-block';
        } else {
            link.style.display = 'none';
        }
    }

    // 更新語言
    const lang = getCurrentLang();
    popup.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[lang] && i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });

    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉問卷 popup
function closeSurveyPopup() {
    const popup = document.getElementById('survey-popup');
    if (popup) {
        // GA4 追蹤：關閉問卷
        trackGA4Event('survey_close');

        popup.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 初始化問卷按鈕
function initSurveyButtons() {
    document.querySelectorAll('.form-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openSurveyPopup();
        });
    });
}

// Initialize components and language switching
document.addEventListener('DOMContentLoaded', () => {
    // Initialize nav component first
    initNavComponent();

    const currentLang = getCurrentLang();
    applyLanguage(currentLang);

    // GA4 設定用戶語系屬性（用於追蹤所有互動的語系）
    if (typeof gtag !== 'undefined') {
        gtag('set', 'user_properties', {
            'user_language': currentLang === 'tw' ? '中文' : 'English'
        });
    }

    // Language button click handlers
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            setCurrentLang(lang);
            applyLanguage(lang);

            // GA4 語系切換事件追蹤 + 更新用戶語系屬性
            if (typeof gtag !== 'undefined') {
                const langLabel = lang === 'tw' ? '中文' : 'English';
                gtag('event', 'language_switch', {
                    'language': langLabel
                });
                gtag('set', 'user_properties', {
                    'user_language': langLabel
                });
            }
        });
    });

    // Initialize mobile menu
    initMobileMenu();

    // Initialize survey buttons
    initSurveyButtons();

    // GA4 追蹤：返回首頁按鈕
    const backHomeBtn = document.querySelector('.back-home-btn');
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            trackGA4Event('back_to_home');
        });
    }
});
