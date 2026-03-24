// ==================== Gallery Module ====================

let galleryData = [];
let currentSlide = 0;
let currentUnitType = '';
let swiperInstance = null;

// 取得每頁顯示的 slide 數量（PC: 3, 手機: 1）
function getSlidesPerView() {
    return window.innerWidth <= 768 ? 1 : 3;
}

// ==================== CSV Loading ====================
async function loadLatestCSV() {
    try {
        const response = await fetch('data/content.csv');
        if (response.ok) {
            const csvText = await response.text();
            console.log('Loaded CSV: content.csv');
            return parseCSV(csvText);
        }
        console.warn('content.csv not found');
        return [];
    } catch (error) {
        console.error('Error loading CSV:', error);
        return [];
    }
}

function parseCSV(text) {
    const rows = [];
    let currentCell = '';
    let inQuotes = false;
    let currentRow = [];

    // 逐字元解析，以正確處理括號內的換行
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            currentCell += '"'; // 處理雙引號轉義 ""
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // 處理 CRLF
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
            // Only add rows with valid UnitType
            if (row.UnitType && row.UnitType !== '') {
                data.push(row);
            }
        }
    }

    return data;
}

// ==================== Filter Data by Unit Type ====================
function filterByUnitType(data, unitType) {
    return data.filter(item => item.UnitType === unitType);
}

function getUnitTypeLabel(unitType, lang) {
    const mapping = {
        '常態單元': 'permanent_unit',
        '當季單元': 'seasonal_unit',
        // '特別單元': 'special_unit',

    };
    const key = mapping[unitType];
    if (key && i18n[lang] && i18n[lang][key]) {
        return i18n[lang][key];
    }
    return unitType;
}

// ==================== Render Functions ====================
function renderIntroPage(items) {
    if (items.length === 0) return;

    const item = items[0];
    const lang = getCurrentLang();

    const imageEl = document.getElementById('main-image');
    const titleEl = document.getElementById('content-title');
    const descEl = document.getElementById('content-description');
    const audioContainer = document.querySelector('.audio-player');
    const audioBtn = document.getElementById('audio-btn');

    if (imageEl) {
        const isMobile = window.innerWidth <= 768;
        let imageFile;
        if (lang === 'tw') {
            imageFile = isMobile ? item.Image_TW_Mobile : item.Image_TW_PC;
        } else {
            imageFile = isMobile ? item.Image_EN_Mobile : item.Image_EN_PC;
        }
        imageEl.src = `data/images/${imageFile}`;
        imageEl.alt = lang === 'tw' ? item.Title_TW : item.Title_EN;
    }

    if (titleEl) {
        titleEl.textContent = 'Mr. Art';
    }

    if (descEl) {
        descEl.textContent = lang === 'tw' ? item.Desc_TW : item.Desc_EN;
    }

    // 處理音訊
    const audioFile = lang === 'tw' ? item.Voice_TW : item.Voice_EN;
    if (audioFile && audioFile !== '無' && audioFile !== '') {
        const audioSrc = `data/voice/${audioFile}`;
        if (audioContainer) audioContainer.style.display = 'block';
        // 透過父視窗播放音訊
        playAudio(audioSrc);
    } else {
        if (audioContainer) audioContainer.style.display = 'none';
        if (audioBtn) audioBtn.classList.remove('playing');
        stopAudio();
    }
}

function renderSlider(items) {
    const track = document.getElementById('slider-track');
    if (!track) return;

    // Destroy existing swiper if it exists
    if (swiperInstance) {
        swiperInstance.destroy(true, true);
        swiperInstance = null;
    }

    // Clear existing content
    track.innerHTML = '';

    // Create slides
    items.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide slide';

        const slideInner = document.createElement('div');
        slideInner.className = 'slide-inner';

        const lang = getCurrentLang();
        const isMobile = window.innerWidth <= 768;
        let imageFile;
        if (lang === 'tw') {
            imageFile = isMobile ? item.Image_TW_Mobile : item.Image_TW_PC;
        } else {
            imageFile = isMobile ? item.Image_EN_Mobile : item.Image_EN_PC;
        }
        const img = document.createElement('img');
        img.src = `data/images/${imageFile}`;
        img.alt = item.Title_TW || '';

        img.onload = () => slideInner.classList.add('loaded');
        img.onerror = () => img.classList.add('error');

        // 標題
        const titleText = lang === 'tw' ? item.Title_TW : item.Title_EN;
        const slideTitle = document.createElement('div');
        slideTitle.className = 'slide-title';
        slideTitle.textContent = titleText;

        slideInner.appendChild(img);
        slideInner.appendChild(slideTitle);
        slide.appendChild(slideInner);

        slide.addEventListener('click', () => {
            // 移除所有 slide 的 selected 狀態
            document.querySelectorAll('.swiper-slide').forEach(s => s.classList.remove('selected'));
            // 添加當前 slide 的 selected 狀態
            slide.classList.add('selected');
            updateSlideContent(items[index], true); // forcePlay: 用戶點擊
            swiperInstance.slideTo(index);

            // GA4 追蹤：點擊輪播項目
            const lang = getCurrentLang();
            const slideTitle = lang === 'tw' ? item.Title_TW : item.Title_EN;
            if (typeof trackGA4Event !== 'undefined') {
                trackGA4Event('carousel_click', {
                    'slide_index': index,
                    'slide_title': slideTitle
                });
            }
        });
        track.appendChild(slide);
    });

    // Initialize Swiper
    swiperInstance = new Swiper('#gallery-swiper', {
        slidesPerView: 1.2, // 手機端顯示 1.5 張，暗示後面還有內容
        spaceBetween: 0,
        centeredSlides: false,
        initialSlide: 0,
        breakpoints: {
            769: {
                slidesPerView: 3.5, // 桌面端固定顯示 3.5 張
                spaceBetween: 15,
                centeredSlides: false,
            }
        },
        on: {
            slideChange: function () {
                currentSlide = this.activeIndex;
                // 更新 selected 狀態
                document.querySelectorAll('.swiper-slide').forEach(s => s.classList.remove('selected'));
                const activeSlide = document.querySelectorAll('.swiper-slide')[currentSlide];
                if (activeSlide) activeSlide.classList.add('selected');
                updateSlideContent(galleryData[currentSlide], true); // forcePlay: 用戶滑動

                // GA4 追蹤：輪播滑動
                const currentItem = galleryData[currentSlide];
                if (currentItem && typeof trackGA4Event !== 'undefined') {
                    const lang = getCurrentLang();
                    const slideTitle = lang === 'tw' ? currentItem.Title_TW : currentItem.Title_EN;
                    trackGA4Event('carousel_slide', {
                        'slide_index': currentSlide,
                        'slide_title': slideTitle
                    });
                }
            }
        }
    });

    // 設定第一張為 selected
    const firstSlide = document.querySelector('.swiper-slide');
    if (firstSlide) firstSlide.classList.add('selected');

    // Update content for first slide
    updateSlideContent(items[0]);
}

// forcePlay: 用戶主動操作時為 true，會終止 intro 音訊
function updateSlideContent(item, forcePlay = false) {
    if (!item) return;

    const lang = getCurrentLang();
    const titleEl = document.getElementById('content-title');
    const descEl = document.getElementById('content-description');
    const audioContainer = document.querySelector('.audio-player');
    const audioBtn = document.getElementById('audio-btn');

    if (titleEl) {
        titleEl.textContent = 'Mr. Art';
    }

    if (descEl) {
        descEl.textContent = lang === 'tw' ? item.Desc_TW : item.Desc_EN;
    }

    // 處理音訊
    const audioFile = lang === 'tw' ? item.Voice_TW : item.Voice_EN;
    if (audioFile && audioFile !== '無' && audioFile !== '') {
        const audioSrc = `data/voice/${audioFile}`;
        if (audioContainer) audioContainer.style.display = 'block';
        // 透過父視窗播放音訊
        playAudio(audioSrc, forcePlay);
    } else {
        if (audioContainer) audioContainer.style.display = 'none';
        if (audioBtn) audioBtn.classList.remove('playing');
        stopAudio();
    }

    // Reset scroll position
    const textContent = document.querySelector('.text-content');
    if (textContent) {
        textContent.scrollTop = 0;
    }
}

// ==================== Slider Controls ====================
function goToSlide(index) {
    const items = galleryData;
    const slidesPerView = getSlidesPerView();
    const maxSlide = Math.max(0, items.length - slidesPerView);

    if (index < 0) index = maxSlide;
    if (index > maxSlide) index = 0;

    currentSlide = index;
    updateSliderPosition();
    updateDots();
    updateActiveSlide();
    updateSlideContent(items[index]);
}

// Swiper handles position internally
function updateSliderPosition() { }

function updateActiveSlide() {
    // Swiper adds swiper-slide-active class automatically
}

function updateDots() {
    // Swiper pagination handles this
}

function updateSlideTitles() {
    const lang = getCurrentLang();
    const slideTitles = document.querySelectorAll('.slide-title');
    slideTitles.forEach((titleEl, index) => {
        if (galleryData[index]) {
            const item = galleryData[index];
            titleEl.textContent = lang === 'tw' ? item.Title_TW : item.Title_EN;
        }
    });
}

function updateSlideImages() {
    const lang = getCurrentLang();
    const isMobile = window.innerWidth <= 768;
    const slideImages = document.querySelectorAll('.slide img');
    slideImages.forEach((img, index) => {
        if (galleryData[index]) {
            const item = galleryData[index];
            let imageFile;
            if (lang === 'tw') {
                imageFile = isMobile ? item.Image_TW_Mobile : item.Image_TW_PC;
            } else {
                imageFile = isMobile ? item.Image_EN_Mobile : item.Image_EN_PC;
            }
            img.src = `data/images/${imageFile}`;
        }
    });
}

function nextSlide() {
    if (swiperInstance) swiperInstance.slideNext();
}

function prevSlide() {
    if (swiperInstance) swiperInstance.slidePrev();
}

// ==================== Audio Controls (via postMessage to parent) ====================
let isAudioPlaying = false;
let currentAudioSrc = '';
let isWaitingForIntro = false; // 是否正在等待 intro 音訊播完

// 取得當前頁面的音訊來源類型
function getAudioSource() {
    const path = window.location.pathname;
    if (path.includes('intro.html')) {
        return 'intro';
    }
    return 'gallery';
}

// 向父視窗發送音訊控制訊息
function sendAudioCommand(action, src, source, forcePlay) {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: action, src: src, source: source, forcePlay: forcePlay }, '*');
    }
}

// 播放音訊 (forcePlay: 用戶點擊時強制播放，會終止 intro 音訊)
function playAudio(src, forcePlay = false) {
    currentAudioSrc = src;
    const source = getAudioSource();
    sendAudioCommand('audio:play', src, source, forcePlay);
}

// 暫停音訊
function pauseAudio() {
    sendAudioCommand('audio:pause');
}

// 停止音訊
function stopAudio() {
    sendAudioCommand('audio:stop');
    currentAudioSrc = '';
}

// 監聽來自父視窗的音訊狀態
function initAudioStatusListener() {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'audio:status') {
            const audioBtn = document.getElementById('audio-btn');
            if (!audioBtn) return;

            switch (event.data.status) {
                case 'playing':
                    isAudioPlaying = true;
                    isWaitingForIntro = false;
                    audioBtn.classList.add('playing');
                    break;
                case 'waiting':
                    // intro 音訊還在播放，gallery 音訊需要等待
                    isWaitingForIntro = true;
                    isAudioPlaying = false;
                    audioBtn.classList.remove('playing');
                    break;
                case 'paused':
                case 'stopped':
                case 'ended':
                case 'error':
                    isAudioPlaying = false;
                    audioBtn.classList.remove('playing');
                    break;
            }
        }
    });
}

function initAudioControls() {
    const audioBtn = document.getElementById('audio-btn');
    if (!audioBtn) return;

    // 初始化音訊狀態監聽
    initAudioStatusListener();

    audioBtn.addEventListener('click', () => {
        // 取得當前 slide 資訊（用於 GA4 追蹤）
        const currentItem = galleryData[currentSlide];
        const lang = getCurrentLang();
        const slideTitle = currentItem ? (lang === 'tw' ? currentItem.Title_TW : currentItem.Title_EN) : '';

        if (isAudioPlaying) {
            pauseAudio();
            // GA4 追蹤：暫停音訊
            if (typeof trackGA4Event !== 'undefined') {
                trackGA4Event('audio_pause', {
                    'slide_title': slideTitle
                });
            }
        } else {
            if (currentAudioSrc) {
                playAudio(currentAudioSrc);
                // GA4 追蹤：播放音訊
                if (typeof trackGA4Event !== 'undefined') {
                    trackGA4Event('audio_play', {
                        'slide_title': slideTitle
                    });
                }
            }
        }
    });
}

function resetAudioButton() {
    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) {
        audioBtn.classList.remove('playing');
    }
    isAudioPlaying = false;
}

// ==================== Drag Scroll ====================
function initDragScroll() {
    const scrollContainer = document.querySelector('.text-content');
    if (!scrollContainer) return;

    let isDown = false;
    let startY;
    let scrollTop;

    scrollContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        scrollContainer.classList.add('active');
        startY = e.pageY - scrollContainer.offsetTop;
        scrollTop = scrollContainer.scrollTop;
        scrollContainer.style.cursor = 'grabbing';
        scrollContainer.style.userSelect = 'none';

        // 防止瀏覽器預設的拖動行為（如產生圖片/文字的半透明影子）
        e.preventDefault();
    });

    // 禁用瀏覽器原生拖拽行為
    scrollContainer.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    scrollContainer.addEventListener('mouseleave', () => {
        isDown = false;
        scrollContainer.style.cursor = 'grab';
        scrollContainer.style.userSelect = 'auto'; // 恢復選取
    });

    scrollContainer.addEventListener('mouseup', () => {
        isDown = false;
        scrollContainer.style.cursor = 'grab';
        scrollContainer.style.userSelect = 'auto'; // 恢復選取
    });

    scrollContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const y = e.pageY - scrollContainer.offsetTop;
        const walk = (y - startY) * 2; // 滾動速度倍率
        scrollContainer.scrollTop = scrollTop - walk;
    });

    // Touch support
    let touchStartY;
    let touchScrollTop;

    scrollContainer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].pageY;
        touchScrollTop = scrollContainer.scrollTop;
    }, { passive: true });

    scrollContainer.addEventListener('touchmove', (e) => {
        const y = e.touches[0].pageY;
        const walk = (y - touchStartY) * 1.5;
        scrollContainer.scrollTop = touchScrollTop - walk;
    }, { passive: false });

    // 設定初始游標
    scrollContainer.style.cursor = 'grab';
}

// ==================== Initialize Gallery ====================
async function initGallery(unitType) {
    currentUnitType = unitType;
    currentSlide = 0;

    // Load CSV data
    const allData = await loadLatestCSV();
    galleryData = filterByUnitType(allData, unitType);

    // Render based on unit type (主視覺頁面使用 renderIntroPage)
    const isIntroPage = unitType.includes('主視覺');
    if (isIntroPage) {
        renderIntroPage(galleryData);
    } else {
        renderSlider(galleryData);
    }

    // Initialize audio controls
    initAudioControls();

    // Listen for language changes
    document.addEventListener('languageChanged', () => {
        if (isIntroPage) {
            renderIntroPage(galleryData);
        } else {
            updateSlideContent(galleryData[currentSlide]);
            // 更新所有 slide 標題和圖片
            updateSlideTitles();
            updateSlideImages();
        }
    });

    // Initialize drag scroll for text content
    initDragScroll();
}
