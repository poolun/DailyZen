// ===================================================================
// 定数
// ===================================================================

// 漢数字変換マップ
const KANSUJI_MAP = {
    '0': '〇', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
    '6': '六', '7': '七', '8': '八', '9': '九', '10': '十'
};
// JSONファイルパス
const ZEN_WORDS_URL = 'json/zen_words.json';
const SEKKI_DATA_URL = 'json/sekki_data.json';

// ===================================================================
// ブラウザ描画バグ対策関数 (Mac Chrome / Safari)
// 強制リフローやGPUレイヤー化など、特定環境での表示バグを修正
// ===================================================================

/**
 * 強制再描画/リフローを実行するコアロジック
 * @param {HTMLElement | null} appEl - メインのアプリ要素
 * @param {HTMLElement | null} displayEl - 禅語表示要素
 */
function applyRenderingFix(appEl, displayEl) {
    // 1. GPUレイヤー化による強制リフロー (will-changeはCSSで設定推奨)
    if (appEl) {
        // offsetHeightを呼ぶことで強制的にレイアウト再計算
        appEl.offsetHeight; 
        appEl.style.transform = 'translateZ(0)'; // GPUレイヤー化
    }
    
    // 2. visibilityハックによる再描画
    if (displayEl) {
        // hidden -> visibleで再描画を強制
        displayEl.style.visibility = 'hidden';
        displayEl.offsetHeight; // 強制レンダリング
        displayEl.style.visibility = 'visible';
    }
    
    // 3. 一瞬のopacity/setTimeoutハック
    // このハックはUXへの影響が大きいため、基本的に推奨されないが、バグ対策として残す場合は最小限に。
    setTimeout(() => {
        if (appEl) appEl.style.opacity = '0.999';
        requestAnimationFrame(() => {
            if (appEl) appEl.style.opacity = '1';
        });
    }, 50);

    // 4. スクロールハック (UXに影響するためコメントアウト/非推奨)
    /*
    window.scrollTo(0, 1);
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
    */
}

/** Mac Chrome表示バグ対策 */
function forMacAppearance() {
    const app = document.getElementById('app');
    const zenWordDisplay = document.getElementById('zen-word-display');
    applyRenderingFix(app, zenWordDisplay);
    
    // Mac Chrome固有の追加ハック (例: 背景色アニメーション)
    if (app) {
        app.style.transition = 'background-color 0.05s'; // アニメーション時間を短縮
        app.style.backgroundColor = '#f0f0f0';
        setTimeout(() => {
            app.style.backgroundColor = '';
            app.style.transition = '';
        }, 100);
    }
}

/** Safari表示バグ対策 */
function forSafariAppearance() {
    const app = document.getElementById('app');
    const zenWordDisplay = document.getElementById('zen-word-display');
    applyRenderingFix(app, zenWordDisplay);

    // Safari固有の追加ハック (必要であればここに記述)
    if (app) {
        // (省略)
    }
}

// ===================================================================
// キャッシュ管理機能
// ===================================================================

/** ページキャッシュを強制的にクリアする */
function clearPageCache() {
    console.log('--- キャッシュクリアを実行中 ---');
    
    // 1. Service Workerの解除
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
        });
    }
    
    // 2. Cache Storageのクリア
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    
    // 3. ストレージのクリア
    sessionStorage.clear();
    localStorage.clear();
    
    console.log('--- キャッシュクリア完了 ---');
    
    // キャッシュクリア後の表示修正はDOMContentLoadedで実行されるためここでは省略
}

// Ctrl+Shift+R でキャッシュクリアをトリガー
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        clearPageCache();
    }
});

// ===================================================================
// データ処理・レンダリング機能
// ===================================================================

/**
 * 数値を漢数字の文字列に変換する（十進表記）
 * @param {string} str 変換対象の文字列
 * @returns {string} 漢数字に変換された文字列
 */
function toKansuji(str) {
    return Array.from(str).map(char => KANSUJI_MAP[char] || char).join('');
}

/**
 * JSONデータを取得する汎用関数
 * @param {string} url - データのURL
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`データの取得中にエラーが発生しました (${url}):`, error);
        return null;
    }
}

// 二十四節気データを取得する関数
async function getSekkiData() {
    const data = await fetchData(SEKKI_DATA_URL);
    return data ? data.sekkiData : [];
}

// 禅語データを取得する関数
async function getAllZenWords() {
    const data = await fetchData(ZEN_WORDS_URL);
    return data ? data.zenWords : [];
}

// ( getCurrentSekki, getDateAndSekki, getDailyZenWord 関数はロジック変更なし )
// ... (中略) ...

/**
 * 日付を基にした固定シードで禅語を取得する関数
 * ロジック変更なし
 */
async function getDailyZenWord() {
    const words = await getAllZenWords();
    if (words.length === 0) return null;
    
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    let seed = 0;
    for (let i = 0; i < dateString.length; i++) {
        seed = seed * 31 + dateString.charCodeAt(i);
    }
    
    const dailyIndex = Math.abs(seed) % words.length;
    return words[dailyIndex];
}

/**
 * DOMにコンテンツをレンダリングする関数
 * @param {object} zenWord - 表示する禅語データ
 * @param {object} dateData - 日付と節気データ
 * @param {boolean} isDebug - デバッグモードかどうか
 * @param {number} [debugIndex] - デバッグモードでのインデックス
 */
function updateDOM(zenWord, dateData, isDebug = false, debugIndex = 0) {
    const { dateInfoPC, dateInfoMobile, sekkiName, sekkiReading } = dateData;
    const isMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
    
    const dateEl = document.getElementById('date-info');
    const sekkiEl = document.getElementById('sekki-info'); 
    const readingEl = document.getElementById('reading'); 
    const zengoEl = document.getElementById('zengo');
    const meaningEl = document.getElementById('meaning');
    
    if (zenWord) {
        readingEl.textContent = zenWord.reading;
        zengoEl.textContent = zenWord.zengo;
        
        let meaningText = zenWord.meaning;
        if (isDebug) {
            meaningText = `[DEBUG ${debugIndex + 1}/${allZenWords.length}] ${meaningText}`;
        }
        meaningEl.textContent = meaningText;
    } else {
        readingEl.textContent = "";
        zengoEl.textContent = "エラー";
        meaningEl.textContent = "データ読み込みに失敗しました。";
    }
    
    // 日付と節気の表示
    if (!isMobile) {
        dateEl.textContent = dateInfoPC;
        sekkiEl.textContent = sekkiReading ? `${sekkiName}${sekkiReading}` : sekkiName;
    } else {
        dateEl.textContent = dateInfoMobile;
        sekkiEl.textContent = sekkiReading ? `${sekkiName}\n${sekkiReading}` : sekkiName;
    }
}

async function renderDailyZen() {
    const zenWord = await getDailyZenWord();
    const dateData = await getDateAndSekki();
    updateDOM(zenWord, dateData);
}

// ===================================================================
// モーダル表示機能
// ===================================================================

/** kakejiku-containerがクリックされたときにモーダル表示または閉じる処理 */
function handleKakejikuClick() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMeaning = document.getElementById('modal-meaning');
    const meaningText = document.getElementById('meaning').textContent;
    const isPortraitMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;

    // 縦長（モバイル）時のみ処理
    if (isPortraitMobile) {
        if (modalOverlay.classList.contains('show')) {
            closeModal();
        } else {
            modalMeaning.textContent = meaningText;
            modalOverlay.classList.add('show');
        }
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.remove('show');
    // モーダル閉じる時も再描画実行（位置ずれ修正）
    // NOTE: アニメーションを考慮し、時間差で強制リフローを実行
    setTimeout(() => {
        const app = document.getElementById('app');
        if (app) app.offsetHeight;
    }, 300); 
}

function setupModal() {
    const kakejikuContainer = document.getElementById('kakejiku-container');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    
    // クリックイベントのリスナーは一つに集約
    kakejikuContainer.addEventListener('click', handleKakejikuClick);
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
            closeModal();
        }
    });
}

// ===================================================================
// デバッグ機能 (スコープの隔離)
// ===================================================================
(function() {
    let debugMode = false;
    let debugIndex = 0;
    let allZenWords = [];

    /** 擬似クリック処理 (デバッグ用) */
    function debugSimulateKakejikuClick() {
        // 擬似クリックによる副作用を避けるため、直接クリックハンドラを呼び出す
        // ただし、モバイル判定とDOM要素の存在チェックは行う
        const isPortraitMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
        if (isPortraitMobile && document.getElementById('kakejiku-container')) {
            // モーダル表示のロジックを直接実行する
            handleKakejikuClick();
        }
        // NOTE: 元のコードで想定していたのは、Appleデバイスでの初回描画バグ対策として
        // モーダル表示を引き起こす「クリック」を擬似的に発生させることです。
        // 上記のように直接ハンドラを呼び出すことで、イベント伝播の副作用を避けられます。
    }

    async function renderDebugZen(index) {
        if (allZenWords.length === 0) {
            allZenWords = await getAllZenWords();
        }
        
        if (allZenWords.length === 0) return;
        
        if (index < 0) index = allZenWords.length - 1;
        if (index >= allZenWords.length) index = 0;
        
        debugIndex = index;
        const zenWord = allZenWords[index];
        const dateData = await getDateAndSekki();

        updateDOM(zenWord, dateData, true, debugIndex);
        
        console.log(`デバッグモード: ${index + 1}/${allZenWords.length} - ${zenWord.zengo}`);
    }

    // キーボードイベントハンドラ
    document.addEventListener('keydown', async (event) => {
        // F9: デバッグモードの切り替え
        if (event.key === 'F9') {
            event.preventDefault();
            debugMode = !debugMode;
            
            if (debugMode) {
                console.log('デバッグモードON - 矢印キーで禅語を切り替えできます');
                allZenWords = await getAllZenWords();
                
                // 現在の日付ベースのインデックスを初期値として設定
                const today = new Date();
                const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
                let seed = 0;
                for (let i = 0; i < dateString.length; i++) {
                    seed = seed * 31 + dateString.charCodeAt(i);
                }
                debugIndex = Math.abs(seed) % allZenWords.length;
                
                await renderDebugZen(debugIndex);
            } else {
                console.log('デバッグモードOFF');
                await renderDailyZen(); // 通常モードに戻る
            }
            return;
        }
        
        // デバッグモード時の矢印キー操作
        if (debugMode) {
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                await renderDebugZen(debugIndex + 1);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                await renderDebugZen(debugIndex - 1);
            }
        }
    });

    // リサイズ時にレスポンシブな表示を再適用
    window.addEventListener('resize', () => {
        if (debugMode) {
            renderDebugZen(debugIndex);
        } else {
            renderDailyZen();
        }
    });

    // 外部からの呼び出し用（DOMContentLoaded内でのみ使用）
    window._debugSimulateKakejikuClick = debugSimulateKakejikuClick;
    window._renderDailyZen = renderDailyZen;
})();


// ===================================================================
// 初期化
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. コンテンツのレンダリング
    await window._renderDailyZen();
    document.getElementById('app').classList.add('fonts-loaded');
    
    // 2. モーダル機能のセットアップ
    setupModal();

    // 3. Appleデバイス/Mac Chrome表示バグ対策の適用
    const userAgent = navigator.userAgent;
    const isMacChrome = /Macintosh/.test(userAgent) && /Chrome/.test(userAgent) && !/Windows/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isIOS = /iP(hone|ad|od)/.test(userAgent);

    if (isIOS) {
        // iOSは描画後に擬似クリックでレイアウト修正を試みる
        window._debugSimulateKakejikuClick();
    } else if (isMacChrome) {
        forMacAppearance();
    } 
    
    if (isSafari) {
        forSafariAppearance();
    }
});
