// ================================================================
// iOS Safari/Chrome 縦長表示バグ対策コード
// iPhone縦長表示時、初期レンダリングでFlexboxのセンタリングが
// 正しく計算されない問題を解決するための強制リフロー処理
// ================================================================

// DOMContentLoadedイベント内で以下のコードを追加：
// 
// renderDailyZen()とapplyZoom()の実行後に配置すること

// iOS対策: レンダリング完了後にflexboxを強制再計算
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
