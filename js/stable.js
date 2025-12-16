// Mac Chrome表示バグ対策: 強制リフロー・GPUレイヤー・visibility・opacityハック
function forMacAppearance() {
    const app = document.getElementById('app');
    const zenWordDisplay = document.getElementById('zen-word-display');
    const meaningContainer = document.getElementById('meaning-container');
    // 1. 強制リフロー
    if (app) {
        app.offsetHeight;
        app.style.transform = 'translateZ(0)';
        app.style.willChange = 'transform';
    }
    if (zenWordDisplay) {
        zenWordDisplay.offsetHeight;
        zenWordDisplay.style.visibility = 'hidden';
        zenWordDisplay.offsetHeight;
        zenWordDisplay.style.visibility = 'visible';
        zenWordDisplay.style.willChange = 'transform';
    }
    if (meaningContainer) {
        meaningContainer.offsetHeight;
        meaningContainer.style.visibility = 'hidden';
        meaningContainer.offsetHeight;
        meaningContainer.style.visibility = 'visible';
        meaningContainer.style.transform = 'translateZ(0)';
    }
    // 2. setTimeout/animationFrame遅延
    setTimeout(() => {
        if (app) app.style.opacity = '0.99';
        requestAnimationFrame(() => {
            if (app) app.style.opacity = '1';
        });
    }, 50);
    // 3. CSSアニメーションで再描画（例: 一瞬だけ色変更）
    if (app) {
        app.style.transition = 'background-color 0.2s';
        app.style.backgroundColor = '#f0f0f0';
        setTimeout(() => {
            app.style.backgroundColor = '';
        }, 200);
    }
    // 4. window.scrollTo(0,1)で一瞬スクロール
    window.scrollTo(0, 1);
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}
// 擬似クリック判定用フラグ
let isSimulatedClick = false;
// Appleデバイス再描画バグ対策: リサイズ＆クリックイベント発火処理を関数化
// 擬似的にkakejiku-containerをクリックするデバッグ関数
function debugSimulateKakejikuClick() {
    const kakejiku = document.getElementById('kakejiku-container');
    if (kakejiku) {
        isSimulatedClick = true;
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        kakejiku.dispatchEvent(evt);
    }
}
// js/script.js
// Safari表示バグ対策: 強制再描画・リフロー・CSSハックをまとめて実行
function forSafariAppearance() {
    const app = document.getElementById('app');
    const zenWordDisplay = document.getElementById('zen-word-display');
    const meaningContainer = document.getElementById('meaning-container');
    const meaningElement = document.getElementById('meaning');
    
    // 1. 強制リフロー（visibility切り替えなし）
    if (app) {
        app.offsetHeight;
        app.style.transform = 'translateZ(0)';
        app.style.willChange = 'transform';
    }
    if (zenWordDisplay) {
        zenWordDisplay.offsetHeight;
        zenWordDisplay.style.willChange = 'transform';
    }
    // 説明エリアは触らない（初回レンダリングが正しいため）
    if (meaningContainer) {
        meaningContainer.offsetHeight;
    }
    if (meaningPaper) {
        meaningPaper.offsetHeight;
    }
    
    // 2. setTimeout/animationFrame遅延は削除
    // 3. CSSアニメーションも削除
    // 4. スクロール処理も削除
}

// ページキャッシュクリア機能
function clearPageCache() {
    // ブラウザキャッシュを強制リロード
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            registrations.forEach(function(registration) {
                registration.unregister();
            });
        });
    }
    
    // キャッシュストレージをクリア
    if ('caches' in window) {
        caches.keys().then(function(names) {
            names.forEach(function(name) {
                caches.delete(name);
            });
        });
    }
    
    // セッションストレージとローカルストレージをクリア
    sessionStorage.clear();
    localStorage.clear();

    // Appleデバイスごとに分岐
        if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
            debugSimulateKakejikuClick();
        } else if (/Macintosh/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent) && !/Windows/.test(navigator.userAgent)) {
            forMacAppearance();
        }
    // Safari表示バグ対策
    if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
        forSafariAppearance();
    }
    // 強制リロード（無効化）
    // location.reload(true); // ←リロードはしません
// ← 余分な閉じカッコ削除
}

// Ctrl+Shift+R でキャッシュクリア
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        clearPageCache();
    }
});

// 漢数字変換マップ
const KANSUJI_MAP = {
    '0': '〇', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
    '6': '六', '7': '七', '8': '八', '9': '九', '10': '十'
};

/**
 * 数値を漢数字の文字列に変換する（十進表記）
 * 例: 2025年10月16日 -> 二〇二五年一〇月一六日
 * @param {string} str 変換対象の文字列 (年、月、日など)
 * @returns {string} 漢数字に変換された文字列
 */
function toKansuji(str) {
    // 全ての数値を十進表記に変換（各桁を個別に変換）
    return Array.from(str).map(char => KANSUJI_MAP[char] || char).join('');
}


// 二十四節気データを取得する関数（強化版）
async function getSekkiData() {
    try {
        const data = await fetchWithRetry('json/sekki_data.json');
        return data.sekkiData;
    } catch (error) {
        console.error("二十四節気データの取得中にエラーが発生しました:", error);
        
        // フォールバック: 最小限のデータで動作継続
        return [{
            month: 1, day: 1, sekki: "データ読み込み失敗"
        }];
    }
}

// 現在の日付に基づいて二十四節気を計算する関数 (変更なし)
async function getCurrentSekki() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    const sekkiData = await getSekkiData();

    const dateValue = currentMonth * 100 + currentDay;
    
    let currentSekkiString = "データなし (Error)";
    let nextSekki = sekkiData[0]; 

    for (let i = 0; i < sekkiData.length; i++) {
        const sekki = sekkiData[i];
        const sekkiValue = sekki.month * 100 + sekki.day;
        
        if (i === sekkiData.length - 1) {
            if (dateValue >= sekkiValue || dateValue < nextSekki.month * 100 + nextSekki.day) {
                currentSekkiString = sekki.sekki;
                break;
            }
        } else {
            nextSekki = sekkiData[i + 1];
            const nextSekkiValue = nextSekki.month * 100 + nextSekki.day;

            if (dateValue >= sekkiValue && dateValue < nextSekkiValue) {
                currentSekkiString = sekki.sekki;
                break;
            }
        }
    }
    
    if (currentSekkiString === "データなし (Error)") {
        const lastSekki = sekkiData[sekkiData.length - 1];
        if (dateValue >= lastSekki.month * 100 + lastSekki.day) {
            currentSekkiString = lastSekki.sekki;
        }
    }
    
    const [name, readingWithParen] = currentSekkiString.split(' ');
    let reading = '';
    
    if (readingWithParen) {
        const readingBody = readingWithParen.replace(/[()（）]/g, '');
        reading = `（${readingBody}）`;
    }

    return {
        name: name,
        reading: reading
    };
}


// 日付と二十四節気の情報を取得する関数
async function getDateAndSekki() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
    
    const { name: sekkiName, reading: sekkiReading } = await getCurrentSekki();

    const weekdayString = `（${weekday}）`;
    
    // PC/タブレット版 (縦書き): 年月日を漢数字に変換
    const kansujiYear = toKansuji(String(year));
    const kansujiMonth = toKansuji(String(month));
    const kansujiDay = toKansuji(String(day));

    // 日付の表示フォーマット
    const dateInfoPC = `${kansujiYear}年${kansujiMonth}月${kansujiDay}日${weekdayString}`; 
    
    // モバイル版 (横書き) - 漢数字使用
    const dateInfoMobile = `${kansujiYear}年${kansujiMonth}月${kansujiDay}日${weekdayString}`; 

    return {
        dateInfoPC: dateInfoPC,
        dateInfoMobile: dateInfoMobile,
        sekkiName: sekkiName,
        sekkiReading: sekkiReading
    };
}

// 無制限データ読み込み用の関数（リトライ機能付き）
async function fetchWithRetry(url, maxRetries = 10, timeout = 30000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            // タイムアウト付きfetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, { 
                signal: controller.signal,
                cache: 'no-cache', // キャッシュを無効化
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            if (i < maxRetries - 1) {
                const delay = Math.min(1000 * Math.pow(2, i), 5000); // 指数バックオフ（最大5秒）
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
            }
        }
    }
}

// 禅語データのキャッシュ変数
let zenWordsCache = null;
let lastLoadDate = null;

// 日めくりカレンダー方式で禅語を取得する関数（1日1回更新）
async function getDailyZenWord() {
    try {
        const todayString = new Date().toDateString(); // "Wed Nov 09 2024"
        
        // キャッシュが無いか、日付が変わった場合のみ再読み込み
        if (!zenWordsCache || lastLoadDate !== todayString) {
            console.log('禅語データを読み込み中...');
            
            const timestamp = Date.now();
            const response = await fetch(`json/zen_words.json?v=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            zenWordsCache = await response.json();
            lastLoadDate = todayString;
            
            console.log('禅語データの読み込み完了');
        }
        
        const words = zenWordsCache.zenWords;
        
        // 基準日：今年の1月1日（no1が1月1日）
        const today = new Date();
        const currentYear = today.getFullYear();
        const START_DATE = new Date(currentYear, 0, 1); // 月は0ベース（1月=0）
        
        // 今日の日付を日本時間で正規化（時間を0:00:00に設定）
        const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startDateNormalized = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
        
        // 経過日数を計算（1月1日からの日数）
        const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // データインデックスを計算（366項目でループ）
        let dailyIndex;
        if (diffDays >= 0) {
            // 1月1日以降：順次表示
            dailyIndex = diffDays % words.length;
        } else {
            // 前年の場合（通常発生しないが安全のため）
            dailyIndex = (words.length + (diffDays % words.length)) % words.length;
        }
        
        return words[dailyIndex];
    } catch (error) {
        console.error("禅語の取得中にエラーが発生しました:", error);
        
        // エラー時のフォールバック: 既存のキャッシュがあれば使用
        if (zenWordsCache && zenWordsCache.zenWords) {
            console.log("キャッシュデータを使用します");
            const words = zenWordsCache.zenWords;
            
            // 既存のロジックで今日の禅語を計算
            const today = new Date();
            const currentYear = today.getFullYear();
            const START_DATE = new Date(currentYear, 0, 1);
            
            const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startDateNormalized = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
            
            const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let dailyIndex;
            if (diffDays >= 0) {
                dailyIndex = diffDays % words.length;
            } else {
                dailyIndex = (words.length + (diffDays % words.length)) % words.length;
            }
            
            return words[dailyIndex];
        }
        
        return null;
    }
}

// DOMにコンテンツをレンダリングする関数
async function renderDailyZen() {
    const zenWord = await getDailyZenWord();
    const { dateInfoPC, dateInfoMobile, sekkiName, sekkiReading } = await getDateAndSekki();

    const isMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
    
    const dateEl = document.getElementById('date-info');
    const sekkiEl = document.getElementById('sekki-info'); 
    const readingEl = document.getElementById('reading'); 
    
    if (zenWord) {
        readingEl.textContent = zenWord.reading;
        const zengoElement = document.getElementById('zengo');
        zengoElement.textContent = zenWord.zengo;
        
        // 7文字以上の禅語は小さくする
        if (zenWord.zengo.length >= 7) {
            zengoElement.classList.add('long-zengo');
        } else {
            zengoElement.classList.remove('long-zengo');
        }
        
        // 説明文に theme, meaning, source_person, source_text_en を追加
        const fullMeaning = `【${zenWord.theme.trim()}】\n${zenWord.meaning.trim()}＜${zenWord.source_person.trim()}：${zenWord.source_text_en.trim()}＞`;
        document.getElementById('meaning').textContent = fullMeaning;
        
        // テキスト挿入後に説明エリアの幅を再計算
        recalculateMeaningWidth();
    } else {
        readingEl.textContent = "";
        const zengoElement = document.getElementById('zengo');
        zengoElement.textContent = "エラー";
        zengoElement.classList.remove('long-zengo'); // エラー時はクラスを削除
        document.getElementById('meaning').textContent = "データ読み込みに失敗しました。";
        recalculateMeaningWidth();
    }
    

    
    // 日付と節気の表示を要素に直接設定
    if (!isMobile) {
        // PC版: 縦書きなので一行で表示
        dateEl.textContent = dateInfoPC;
        sekkiEl.textContent = sekkiReading ? `${sekkiName}${sekkiReading}` : sekkiName;
    } else {
        // モバイル版: 改行文字で2行に分ける（dateInfoMobileを使用）
        dateEl.textContent = dateInfoMobile;
        sekkiEl.textContent = sekkiReading ? `${sekkiName}\n${sekkiReading}` : sekkiName;
    }
}

// テキスト挿入後に説明エリアの幅を強制的に再計算する関数
function recalculateMeaningWidth() {
    const meaningContainer = document.getElementById('meaning-container');
    const meaningElement = document.getElementById('meaning');
    
    if (!meaningContainer || !meaningElement) return;
    
    // 横長画面(landscape)でのみ実行
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    if (!isLandscape) return;
    
    // Appleデバイスの判定
    const isAppleDevice = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent);
    
    if (isAppleDevice) {
        // Appleデバイス: 強制リフローのみ
        meaningElement.offsetWidth;
        meaningContainer.offsetWidth;
        meaningElement.offsetHeight;
        meaningContainer.offsetHeight;
    } else {
        // その他のデバイス: 強制リフロー + リセット
        meaningElement.offsetWidth;
        meaningContainer.offsetWidth;
        
        requestAnimationFrame(() => {
            meaningElement.style.width = '';
            meaningContainer.style.width = '';
        });
    }
}

// デバッグモード用の変数
let debugMode = false;
let debugIndex = 0;
let allZenWords = [];

// デバッグモード用の禅語データを取得する関数（キャッシュシステム使用）
async function loadAllZenWords() {
    try {
        // getDailyZenWord()と同じキャッシュシステムを使用
        const todayString = new Date().toDateString();
        
        if (!zenWordsCache || lastLoadDate !== todayString) {
            // まだキャッシュされていない場合は、getDailyZenWord()を呼んでキャッシュを作成
            await getDailyZenWord();
        }
        
        allZenWords = zenWordsCache ? zenWordsCache.zenWords : [];
        return allZenWords;
    } catch (error) {
        console.error("禅語データの読み込み中にエラーが発生しました:", error);
        allZenWords = [];
        return [];
    }
}

// デバッグモード用の禅語表示関数
async function renderDebugZen(index) {
    if (allZenWords.length === 0) {
        await loadAllZenWords();
    }
    
    if (allZenWords.length === 0) {
        return;
    }
    
    // インデックスの範囲チェック
    if (index < 0) index = allZenWords.length - 1;
    if (index >= allZenWords.length) index = 0;
    
    debugIndex = index;
    const zenWord = allZenWords[index];
    
    if (!zenWord) {
        return;
    }
    const { dateInfoPC, dateInfoMobile, sekkiName, sekkiReading } = await getDateAndSekki();

    const isMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
    
    const dateEl = document.getElementById('date-info');
    const sekkiEl = document.getElementById('sekki-info'); 
    const readingEl = document.getElementById('reading'); 
    
    if (zenWord) {
        readingEl.textContent = zenWord.reading;
        const zengoElement = document.getElementById('zengo');
        zengoElement.textContent = zenWord.zengo;
        
        // 7文字以上の禅語は小さくする
        if (zenWord.zengo.length >= 7) {
            zengoElement.classList.add('long-zengo');
        } else {
            zengoElement.classList.remove('long-zengo');
        }
        
        // デバッグモード用の表示（修正版）
        const theme = zenWord.theme?.trim() || 'テーマなし';
        const meaning = zenWord.meaning?.trim() || '説明なし';
        const sourcePerson = zenWord.source_person?.trim() || '出典不明';
        const sourceTextEn = zenWord.source_text_en?.trim() || 'Unknown';
        
        const fullMeaning = `[DEBUG ${index + 1}/${allZenWords.length}]【${theme}】\n${meaning}＜${sourcePerson}：${sourceTextEn}＞`;
        document.getElementById('meaning').textContent = fullMeaning;
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

// キーボードイベントハンドラ
document.addEventListener('keydown', async (event) => {
    // F9: デバッグモードの切り替え
    if (event.key === 'F9') {
        event.preventDefault();
        debugMode = !debugMode;
        
        if (debugMode) {
            console.log('デバッグモードON - 矢印キーで禅語を切り替えできます');
            
            await loadAllZenWords();
            console.log(`データ読み込み完了: 全${allZenWords.length}項目`);
            console.log(`最初の項目: ${allZenWords[0]?.no} - ${allZenWords[0]?.zengo}`);
            console.log(`最後の項目: ${allZenWords[allZenWords.length-1]?.no} - ${allZenWords[allZenWords.length-1]?.zengo}`);
            
            // 現在の日めくりインデックスを初期値として設定
            const today = new Date();
            const currentYear = today.getFullYear();
            const START_DATE = new Date(currentYear, 0, 1); // 月は0ベース（1月=0）
            const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startDateNormalized = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
            const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
                debugIndex = diffDays % allZenWords.length;
            } else {
                debugIndex = (allZenWords.length + (diffDays % allZenWords.length)) % allZenWords.length;
            }
            
            console.log(`基準日(${currentYear}/1/1)からの経過日数: ${diffDays}日`);
            console.log(`本日の禅語インデックス: ${debugIndex + 1}/${allZenWords.length}`);
            
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



// ページ読み込み時の初期化(表示・フォント・モーダル・レイアウト修正)
document.addEventListener('DOMContentLoaded', async () => {
    // iPhone横向き表示バグ対策: 初回のみリロード
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        if (isLandscape) {
            // 横向きの場合、初回のみリロード
            const hasReloaded = sessionStorage.getItem('iphone_landscape_reloaded');
            if (!hasReloaded) {
                // 初回表示時のみリロード
                sessionStorage.setItem('iphone_landscape_reloaded', 'true');
                setTimeout(() => {
                    location.reload();
                }, 100);
                return; // リロード前に処理を中断
            }
        } else {
            // 縦向きの場合はフラグをクリア
            sessionStorage.removeItem('iphone_landscape_reloaded');
        }
    }
    
    // コンテンツを描画
    await renderDailyZen();
    document.getElementById('app').classList.add('fonts-loaded');
    setupModal();
    // 初回ズーム適用
    applyZoom();
    
    // iOS対策: レンダリング完了後にflexboxを強制再計算（iPhone縦長のみ）
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        if (isPortrait) {
            const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            const isChrome = /Chrome/.test(navigator.userAgent);
            
            if (isSafari) {
                // Safari: display:none による強制再計算
                requestAnimationFrame(() => {
                    const zenWordDisplay = document.getElementById('zen-word-display');
                    if (zenWordDisplay) {
                        zenWordDisplay.style.display = 'none';
                        zenWordDisplay.offsetHeight;
                        zenWordDisplay.style.display = '';
                    }
                });
            } else if (isChrome) {
                // Chrome: より強力な対策（二段階リフロー）
                requestAnimationFrame(() => {
                    const zenWordDisplay = document.getElementById('zen-word-display');
                    const kakejikuContainer = document.getElementById('kakejiku-container');
                    if (zenWordDisplay && kakejikuContainer) {
                        // 1. 親要素を強制再描画
                        kakejikuContainer.style.display = 'flex';
                        kakejikuContainer.offsetHeight;
                        
                        // 2. 子要素を強制再描画
                        zenWordDisplay.style.display = 'none';
                        zenWordDisplay.offsetHeight;
                        zenWordDisplay.style.display = '';
                        
                        // 3. もう一度親要素を再計算
                        kakejikuContainer.offsetHeight;
                    }
                });
            }
        }
    }

});



// 強制再描画函数
function forceReflow() {
    const app = document.getElementById('app');
    const zenWordDisplay = document.getElementById('zen-word-display');
    
    // 強制的にレイアウト再計算を実行
    if (app) {
        app.offsetHeight;
        app.style.transform = 'translateZ(0)';
    }
    
    if (zenWordDisplay) {
        zenWordDisplay.offsetHeight;
        // 一時的にvisibilityをhiddenにしてから戻す（再描画強制）
        zenWordDisplay.style.visibility = 'hidden';
        zenWordDisplay.offsetHeight; // 強制レンダリング
        zenWordDisplay.style.visibility = 'visible';
    }
}

// モーダル表示機能
function setupModal() {
    const kakejikuContainer = document.getElementById('kakejiku-container');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalMeaning = document.getElementById('modal-meaning');
    
    // 縦長（モバイル）時のみ掛け軸クリックでモーダル表示
    kakejikuContainer.addEventListener('click', () => {
        const isPortraitMobile = window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
        if (isSimulatedClick) {
            isSimulatedClick = false;
            return;
        }
        if (isPortraitMobile) {
            if (modalOverlay.classList.contains('show')) {
                // すでに開いていれば閉じる
                modalOverlay.classList.remove('show');
            } else {
                // 閉じていれば開く
                const meaningText = document.getElementById('meaning').textContent;
                modalMeaning.textContent = meaningText;
                modalOverlay.classList.add('show');
            }
        }
    });
    
    // モーダルを閉じる
    function closeModal() {
        modalOverlay.classList.remove('show');
        // モーダル閉じる時も再描画実行（位置ずれ修正）
        setTimeout(() => {
            forceReflow();
        }, 300); // アニメーション完了後
    }
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Escキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// リサイズ時にレスポンシブな表示を再適用
window.addEventListener('resize', () => {
    if (debugMode) {
        renderDebugZen(debugIndex);
    } else {
        renderDailyZen();
    }
    // ズームを再計算
    applyZoom();
    
    // iPhone縦横切り替え時の強制リセット
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
        setTimeout(() => {
            const kakejiku = document.getElementById('kakejiku-container');
            const zenWordDisplay = document.getElementById('zen-word-display');
            if (kakejiku && zenWordDisplay) {
                // 強制リフロー
                kakejiku.offsetHeight;
                zenWordDisplay.offsetHeight;
            }
        }, 100);
    }

});

/**
 * W980×H739 の固定デザインをウィンドウサイズに合わせてズームイン・ズームアウト
 * 横長画面（landscape）のみで適用
 */
function applyZoom() {
    const wrapper = document.getElementById('scale-wrapper');
    if (!wrapper) return;

    // モバイル（縦長）ではズーム無効化
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    
    if (!isLandscape) {
        wrapper.style.transform = ''; // スケールをリセット
        // 縦長に戻った時は掛け軸サイズもリセット
        const kakejiku = document.getElementById('kakejiku-container');
        if (kakejiku) {
            kakejiku.style.width = '';
            kakejiku.style.height = '';
        }
        return;
    }

    const designWidth = 1049;
    const designHeight = 739;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // ウィンドウサイズに対するスケール係数を計算（縦横比を保持）
    const scaleX = windowWidth / designWidth;
    const scaleY = windowHeight / designHeight;
    
    // 小さい方のスケールを採用（はみ出さないように）
    const scale = Math.min(scaleX, scaleY);

    // iPhone横置きの場合はtranslateY(50%)を保持
    const isiPhoneLandscape = window.matchMedia("(orientation: landscape) and (max-width: 896px) and (max-height: 414px)").matches;
    
    if (isiPhoneLandscape) {
        // iPhone横置き: iPhone画面サイズに合わせたスケールを1.35倍大きく調整
        const iPhoneScale = Math.min(windowWidth / designWidth, windowHeight / designHeight) * 1.215; // 0.9 * 1.35 = 1.215
        wrapper.style.transform = `translateY(-12.5%) scale(${iPhoneScale})`;
    } else {
        // その他のデバイス: scaleのみ適用
        wrapper.style.transform = `scale(${scale})`;
    }
}