// ==========================================
// 🎮 Study Quest - JavaScriptゲームロジック
// ==========================================

// ==========================================
// 📊 基本データ
// ==========================================
let totalExp = 0;
let currentLevel = 1;
let seconds = 0;
let timerInterval = null;
let currentView = 'home';
let nigateLogs = [];

// ==========================================
// 🏆 アチーブメントデータ
// ==========================================
let unlockedAchievements = {};

// ==========================================
// ⚙️ 設定データ
// ==========================================
let playerName = "名無し";
let rankingEnabled = false;
let soundEnabled = true;

// ==========================================
// 🆔 プレイヤーID管理（端末ごとに固定）
// ==========================================
function getOrCreatePlayerId() {
    let id = localStorage.getItem('studyQuestPlayerId');
    if (!id) {
        id = 'player_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        localStorage.setItem('studyQuestPlayerId', id);
    }
    return id;
}

// ==========================================
// 🗓️ 週間ID算出ヘルパー関数
// ==========================================
function getWeeklyId() {
    const now = new Date();
    const startYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = (now - startYear) / 86400000;
    const weekNum = Math.ceil((pastDays + startYear.getDay() + 1) / 7);
    return `${now.getFullYear()}_w${weekNum}`;
}

// ==========================================
// ❓ デフォルトクイズ
// ==========================================
const defaultQuizList = [
    { q: "英単語『study』の意味は？", a: "勉強する" },
    { q: "かけ算： 7 × 8 ＝ ？", a: "56" },
    { q: "理科：水の化学式は？", a: "H2O" },
    { q: "英単語『obvious』の意味は？", a: "明らかな" },
    { q: "歴史：日本で最初の幕府は？", a: "鎌倉幕府" }
];

let activeQuizList = [...defaultQuizList];
let currentQuizIndex = 0;

// ==========================================
// 🖥️ 画面切り替え
// ==========================================
function showView(viewName) {
    currentView = viewName;

    const cards = {
        timer: document.getElementById('card-timer'),
        weakness: document.getElementById('card-weakness'),
        review: document.getElementById('card-review'),
        achievement: document.getElementById('card-achievement'),
        settings: document.getElementById('card-settings'),
        ranking: document.getElementById('card-ranking')
    };

    if (viewName === 'home') {
        document.body.className = 'view-home';
        for (const key in cards) {
            if (!cards[key]) continue;
            // ★ key === 'ranking' を追加（ホーム画面ではランキングを隠す）
            if (key === 'settings' || key === 'ranking') {
                cards[key].classList.add('hidden');
            } else {
                cards[key].classList.remove('hidden');
            }
        }
        clearSidebarActive();
        return;
    }

    document.body.className = 'view-single';
    for (const key in cards) {
        if (!cards[key]) continue;
        if (key === viewName) {
            cards[key].classList.remove('hidden');
        } else {
            cards[key].classList.add('hidden');
        }
    }

    updateSidebarActive(viewName);

    if (viewName === 'timer') {
        unlockAchievement('最初の一歩', 'badge1');
    }

    if (viewName === 'settings') {
        updateSettingsDisplay();
    }

    if (viewName === 'ranking') {
        loadRanking();
    }
}

function handleCardClick(cardName) {
    if (currentView === 'home') {
        showView(cardName);
    }
}

function goBackToHome(event) {
    if (event) event.stopPropagation();
    showView('home');
}

function clearSidebarActive() {
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        item.classList.remove('active');
    });
}

function updateSidebarActive(viewName) {
    clearSidebarActive();
    const activeItem = document.getElementById(`menu-${viewName}`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// ==========================================
// ⏱️ タイマー機能
// ==========================================
function startTimer(event) {
    if (event) event.stopPropagation();
    if (timerInterval) return;

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';

    timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer(event) {
    if (event) event.stopPropagation();

    clearInterval(timerInterval);
    timerInterval = null;

    const earnedExp = seconds * 5;
    totalExp += earnedExp;

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';

    checkLevelUp();

    if (seconds > 0) {
        unlockAchievement('集中マスター', 'badge2');
    }

    saveData();
    seconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    document.getElementById('timerDisplay').innerText =
        String(min).padStart(2, '0') + ":" + String(sec).padStart(2, '0');
}

function checkLevelUp() {
    let levelUp = false;
    while (totalExp >= currentLevel * 100) {
        currentLevel++;
        levelUp = true;
    }

    if (levelUp) {
        unlockAchievement('伝説の勇者', 'badge3');
    }

    updateGameDisplay();
    saveData();
}

function updateGameDisplay() {
    const levelDisplay = document.getElementById('levelDisplay');
    const expText = document.getElementById('expText');
    const expFill = document.getElementById('expFill');

    const nextThreshold = currentLevel * 100;

    if (levelDisplay) levelDisplay.innerText = "Lv. " + currentLevel;
    if (expText) expText.innerText = `${totalExp} / ${nextThreshold} XP`;

    if (expFill) {
        const previousThreshold = (currentLevel - 1) * 100;
        const neededExp = nextThreshold - previousThreshold;
        const currentExpInLevel = totalExp - previousThreshold;
        let progress = (currentExpInLevel / neededExp) * 100;
        progress = Math.max(0, Math.min(100, progress));
        expFill.style.width = progress + "%";
    }
}

// ==========================================
// 📝 苦手問題機能
// ==========================================
function addWeakness(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const input = document.getElementById('weaknessInput');
    if (!input) return;

    const value = input.value.trim();
    if (value === "") return;

    nigateLogs.unshift(value);
    renderWeaknessList();
    input.value = "";

    unlockAchievement('最初の一歩', 'badge1');
    saveData();
}

function insertWeaknessToList(value) {
    if (!nigateLogs.includes(value)) {
        nigateLogs.unshift(value);
    }
    renderWeaknessList();
    saveData();
}

function renderWeaknessList() {
    const list = document.getElementById('weaknessList');
    if (!list) return;

    list.innerHTML = "";

    if (nigateLogs.length === 0) {
        list.innerHTML = `<div class="empty-message">まだ苦手問題はありません！</div>`;
        return;
    }

    nigateLogs.forEach(value => {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `<span>👾 ${value}</span>`;
        list.appendChild(item);
    });
}

// ==========================================
// 🔄 クイズ機能（入力判定式）
// ==========================================
function loadQuizQuestion() {
    if (activeQuizList.length === 0) {
        document.getElementById('quizQuestionText').innerText = "クイズがありませんピヨ！";
        document.getElementById('quizResultText').innerText = "";
        return;
    }

    const currentQuiz = activeQuizList[currentQuizIndex];
    document.getElementById('quizQuestionText').innerText = currentQuiz.q;
    
    const resultText = document.getElementById('quizResultText');
    if (resultText) resultText.innerText = "";

    const answerInput = document.getElementById('userQuizAnswer');
    if (answerInput) {
        answerInput.value = "";
        answerInput.disabled = false;
    }

    const submitBtn = document.getElementById('submitAnswerBtn');
    if (submitBtn) submitBtn.disabled = false;
}

function submitQuizAnswer(event) {
    if (event) event.stopPropagation();

    const answerInput = document.getElementById('userQuizAnswer');
    const resultDisplay = document.getElementById('quizResultText');
    const submitBtn = document.getElementById('submitAnswerBtn');

    if (!answerInput || activeQuizList.length === 0) return;

    const userAnswer = answerInput.value.trim().toLowerCase();
    if (userAnswer === "") return;

    const currentQuiz = activeQuizList[currentQuizIndex];
    const correctAnswer = currentQuiz.a.trim().toLowerCase();

    answerInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (userAnswer === correctAnswer) {
        resultDisplay.style.color = "var(--green-neon)";
        resultDisplay.innerText = "⭕ 正解！ (+20XP)";
        totalExp += 20;
        checkLevelUp();
    } else {
        resultDisplay.style.color = "var(--pink-neon)";
        resultDisplay.innerText = `❌ 残念... 正解は「${currentQuiz.a}」ピヨ`;
        insertWeaknessToList(`${currentQuiz.q} (答: ${currentQuiz.a})`);
    }

    saveData();

    setTimeout(() => {
        currentQuizIndex = (currentQuizIndex + 1) % activeQuizList.length;
        loadQuizQuestion();
    }, 1800);
}

function toggleQuizForm(event) {
    if (event) event.stopPropagation();
    const form = document.getElementById('quizFormContainer');
    if (form) {
        form.style.display = (form.style.display === 'block') ? 'none' : 'block';
    }
}

function addCustomQuiz(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const qInput = document.getElementById('customQuestion');
    const aInput = document.getElementById('customAnswer');
    if (!qInput || !aInput) return;

    const qValue = qInput.value.trim();
    const aValue = aInput.value.trim();

    if (qValue === "" || aValue === "") return;

    activeQuizList.unshift({ q: qValue, a: aValue });
    currentQuizIndex = 0;

    qInput.value = "";
    aInput.value = "";

    toggleQuizForm(event);
    loadQuizQuestion();
}

// ==========================================
// 🏆 アチーブメント機能
// ==========================================
function unlockAchievement(name, badgeId) {
    if (unlockedAchievements[name]) return;

    unlockedAchievements[name] = true;

    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.classList.add('unlocked');
    }

    saveData();

    if (soundEnabled) {
        playAchievementSound();
    }

    const toast = document.getElementById('steamToast');
    const nameDisplay = document.getElementById('steamBadgeName');

    if (toast && nameDisplay) {
        nameDisplay.innerText = name;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

function playAchievementSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.3);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.log("Audio exception: " + e);
    }
}

function triggerSteamTest(type) {
    if (type === 'first') {
        unlockedAchievements['最初の一歩'] = false;
        unlockAchievement('最初の一歩', 'badge1');
    } else if (type === 'timer') {
        unlockedAchievements['集中マスター'] = false;
        unlockAchievement('集中マスター', 'badge2');
    } else if (type === 'hero') {
        unlockedAchievements['伝説の勇者'] = false;
        unlockAchievement('伝説の勇者', 'badge3');
    }
}

// ==========================================
// 💾 保存・読み込み機能
// ==========================================
function saveData() {
    const gameState = {
        level: currentLevel,
        exp: totalExp,
        logs: nigateLogs,
        achievements: unlockedAchievements,
        playerName: playerName,
        rankingEnabled: rankingEnabled,
        soundEnabled: soundEnabled
    };

    try {
        localStorage.setItem('studyQuestData', JSON.stringify(gameState));
        sendScoreToRanking();
        return true;
    } catch (error) {
        console.error('Study Quest：データ保存失敗', error);
        return false;
    }
}

function loadData() {
    const savedData = localStorage.getItem('studyQuestData');

    if (!savedData) {
        updateGameDisplay();
        renderWeaknessList();
        updateSettingsDisplay();
        return;
    }

    try {
        const gameState = JSON.parse(savedData);

        if (gameState.level !== undefined) currentLevel = gameState.level;
        if (gameState.exp !== undefined) totalExp = gameState.exp;
        if (Array.isArray(gameState.logs)) nigateLogs = gameState.logs;
        if (gameState.achievements && typeof gameState.achievements === 'object') {
            unlockedAchievements = gameState.achievements;
        }

        if (gameState.playerName !== undefined) playerName = gameState.playerName;
        if (gameState.rankingEnabled !== undefined) rankingEnabled = gameState.rankingEnabled;
        if (gameState.soundEnabled !== undefined) soundEnabled = gameState.soundEnabled;

        updateGameDisplay();
        renderWeaknessList();
        restoreAchievements();
        updateSettingsDisplay();
    } catch (error) {
        console.error('Study Quest：データ読み込みエラー', error);
    }
}

function restoreAchievements() {
    const achievementMap = {
        '最初の一歩': 'badge1',
        '集中マスター': 'badge2',
        '伝説の勇者': 'badge3'
    };

    for (const achievementName in achievementMap) {
        const badgeId = achievementMap[achievementName];
        const badge = document.getElementById(badgeId);
        if (badge) badge.classList.remove('unlocked');
    }

    for (const achievementName in unlockedAchievements) {
        if (unlockedAchievements[achievementName] !== true) continue;
        const badgeId = achievementMap[achievementName];
        if (badgeId) {
            const badge = document.getElementById(badgeId);
            if (badge) badge.classList.add('unlocked');
        }
    }
}

// ==========================================
// ⚙️ 設定機能
// ==========================================
function savePlayerName(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const input = document.getElementById('playerNameInput');
    if (!input) return;

    const value = input.value.trim();
    playerName = value === '' ? '名無し' : value;
    input.value = playerName;

    saveData();
    alert('ニックネームを保存しました！');
}

function setRankingParticipation(isEnabled, event) {
    if (event) event.stopPropagation();
    rankingEnabled = Boolean(isEnabled);
    saveData();
    updateSettingsDisplay();

    if (rankingEnabled) {
        alert('ランキングへの参加をONにしました！');
    } else {
        alert('ランキングへの参加をOFFにしました。');
    }
}

function setSoundEnabled(isEnabled, event) {
    if (event) event.stopPropagation();
    soundEnabled = Boolean(isEnabled);
    saveData();
    updateSettingsDisplay();
}

function updateSettingsDisplay() {
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) playerNameInput.value = playerName;

    const rankingStatus = document.getElementById('rankingStatus');
    if (rankingStatus) {
        rankingStatus.innerText = rankingEnabled
            ? '現在：ランキングに参加しています 🏆'
            : '現在：ランキングに参加していません';
    }

    const soundStatus = document.getElementById('soundStatus');
    if (soundStatus) {
        soundStatus.innerText = soundEnabled ? '現在：ON 🔊' : '現在：OFF 🔇';
    }
}

function resetGameData(event) {
    if (event) event.stopPropagation();
    const result = confirm("本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。");
    if (!result) return;

    localStorage.removeItem('studyQuestData');
    localStorage.removeItem('studyQuestPlayerId');
    location.reload();
}

// ==========================================
// 🚀 ページ読み込み時
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadQuizQuestion();
    showView('home');
});

// ==========================================
// 🏆 ランキング機能 (Firebase連携)
// ==========================================
async function sendScoreToRanking() {
    if (!rankingEnabled || !window.firestoreUtils || !window.db) {
        return;
    }

    const { doc, setDoc } = window.firestoreUtils;
    const playerId = getOrCreatePlayerId();
    const currentWeek = getWeeklyId();

    try {
        await setDoc(doc(window.db, `rankings_${currentWeek}`, playerId), {
            playerName: playerName,
            totalExp: totalExp,
            level: currentLevel,
            updatedAt: new Date()
        });
        console.log("今週のスコア上書き送信成功");
    } catch (e) {
        console.error("スコア送信エラー:", e);
    }
}

async function loadRanking() {
    const displayElem = document.getElementById('rankingDisplay');
    if (!displayElem) return;

    if (!window.firestoreUtils || !window.db) {
        displayElem.innerHTML = "<p style='color:#ef4444; font-size:0.85rem;'>ランキング機能の初期化に失敗しています。</p>";
        return;
    }

    displayElem.innerHTML = "<p style='color:var(--text-sub); font-size:0.85rem;'>読み込み中...</p>";

    const { collection, query, orderBy, limit, getDocs } = window.firestoreUtils;
    const currentWeek = getWeeklyId();

    try {
        const q = query(collection(window.db, `rankings_${currentWeek}`), orderBy("totalExp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            displayElem.innerHTML = "<p style='color:var(--text-sub); font-size:0.85rem;'>今週のランキングデータがまだありません。</p>";
            return;
        }

        let html = '<ol class="ranking-list">';
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const pName = data.playerName || '名無し';
            const lvl = data.level || 1;
            const exp = data.totalExp || 0;
            html += `<li><strong>${rank}位</strong> : ${pName} - Lv.${lvl} (${exp} XP)</li>`;
            rank++;
        });
        html += '</ol>';

        displayElem.innerHTML = html;
    } catch (e) {
        console.error("ランキング取得エラー:", e);
        displayElem.innerHTML = "<p style='color:#ef4444; font-size:0.85rem;'>データの取得に失敗しました。</p>";
    }
}