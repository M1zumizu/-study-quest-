// ==========================================
// 🎮 Study Quest - JavaScriptゲームロジック
// ==========================================

// ==========================================
// 📊 基本データ & ステート管理
// ==========================================
let totalExp = 0;
let currentLevel = 1;
let seconds = 0;
let timerInterval = null;
let currentView = 'home';
let nigateLogs = [];
let currentRankingType = 'daily';

// ⏱️・📝 実績トラッキング用データ
let quizCorrectCount = 0;
let lastFailedQuizId = null;
let lastStudyDate = null;
let streakCount = 0;

// 🏷️ カスタムジャンル初期データ（サンプル問題＋指定ジャンル）
let customGenres = ["サンプル問題", "国語", "数学＆算数", "英語", "理科", "社会", "情報"];

// 🏆 アチーブメントマスター定義（全10種）
const achievementsMaster = [
    { id: "badge1", name: "最初の一歩", desc: "初めてタイマーを開始する" },
    { id: "badge2", name: "ランナー誕生", desc: "プレイヤー名を「名無し」から変更する" },
    { id: "badge3", name: "🌱 再出発", desc: "1日以上空いた後に、もう一度勉強する" },
    { id: "badge4", name: "🔥 3日間の冒険", desc: "3日連続で学習を記録する" },
    { id: "badge5", name: "⏱️ 集中モード", desc: "1回のタイマーで30分（1800秒）以上勉強する" },
    { id: "badge6", name: "クイズ見習い", desc: "復習クイズで累計10問正解する" },
    { id: "badge7", name: "🧠 リベンジ成功", desc: "前回間違えたクイズ問題に正解する" },
    { id: "badge8", name: "自作の達人", desc: "新しいカスタムジャンルを1つ追加する" },
    { id: "badge9", name: "全国デビュー", desc: "設定でランキング参加をONにする" },
    { id: "badge10", name: "💎 積み重ねの証", desc: "累計1000 EXPを獲得する" }
];

// 🏆 解放済みアチーブメントステート
let unlockedAchievements = {};

// ⚙️ 設定データ
let playerName = "名無し";
let rankingEnabled = false;
let soundEnabled = true;

// ❓ クイズ初期データ（「サンプル問題」として固定保護）
const defaultQuizList = [
    { id: "sample_1", genre: "サンプル問題", q: "英単語『study』の意味は？", a: "勉強する", explanation: "「研究する」という意味でも使われます。", isSample: true },
    { id: "sample_2", genre: "サンプル問題", q: "かけ算： 7 × 8 ＝ ？", a: "56", explanation: "九九の7の段です。", isSample: true },
    { id: "sample_3", genre: "サンプル問題", q: "理科：水の化学式は？", a: "H2O", explanation: "水素原子2つと酸素原子1つでできています。", isSample: true },
    { id: "sample_4", genre: "サンプル問題", q: "英単語『obvious』の意味は？", a: "明らかな", explanation: "「明白な」「わかりきった」という意味の形容詞です。", isSample: true },
    { id: "sample_5", genre: "サンプル問題", q: "歴史：日本で最初の幕府は？", a: "鎌倉幕府", explanation: "1192年（または1185年）に源頼朝が作りました。", isSample: true }
];

let activeQuizList = [...defaultQuizList];
let currentQuizIndex = 0;
let currentQuizFilter = "すべて";

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
// 🗓️ 期間別XP（本日・今週・今月）管理機能
// ==========================================
function getDateKeys() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const firstDay = new Date(year, 0, 1);
    const pastDays = (now - firstDay) / 86400000;
    const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

    return {
        daily: `${year}-${month}-${date}`,
        weekly: `${year}-W${weekNum}`,
        monthly: `${year}-${month}`
    };
}

function checkPeriodExpReset() {
    const keys = getDateKeys();
    const lastKeys = JSON.parse(localStorage.getItem('lastDateKeys') || '{}');

    if (lastKeys.daily !== keys.daily) localStorage.setItem('dailyExp', '0');
    if (lastKeys.weekly !== keys.weekly) localStorage.setItem('weeklyExp', '0');
    if (lastKeys.monthly !== keys.monthly) localStorage.setItem('monthlyExp', '0');

    localStorage.setItem('lastDateKeys', JSON.stringify(keys));
}

function addExpWithPeriod(amount) {
    checkPeriodExpReset();

    let dExp = parseInt(localStorage.getItem('dailyExp') || '0') + amount;
    let wExp = parseInt(localStorage.getItem('weeklyExp') || '0') + amount;
    let mExp = parseInt(localStorage.getItem('monthlyExp') || '0') + amount;

    localStorage.setItem('dailyExp', dExp.toString());
    localStorage.setItem('weeklyExp', wExp.toString());
    localStorage.setItem('monthlyExp', mExp.toString());

    totalExp += amount;

    if (totalExp >= 1000) {
        unlockAchievement('💎 積み重ねの証', 'badge10');
    }

    checkLevelUp();
    saveData();
}

// ==========================================
// 🏷️ カスタムジャンル管理機能
// ==========================================
function promptAddGenre(event) {
    if (event) event.stopPropagation();
    const newGenre = prompt("新しいジャンル名を入力してください:");
    
    if (newGenre && newGenre.trim() !== "") {
        const trimmed = newGenre.trim();
        if (!customGenres.includes(trimmed)) {
            customGenres.push(trimmed);
            updateAllGenreSelects();
            unlockAchievement('自作の達人', 'badge8');
            saveData();
            alert(`ジャンル「${trimmed}」を追加しました！`);
        } else {
            alert("そのジャンルは既に存在します。");
        }
    }
}

function promptManageGenres(event) {
    if (event) event.stopPropagation();
    const target = prompt(`操作したい既存のジャンル名を入力してください:\n現在のジャンル: ${customGenres.join(', ')}`);
    if (!target) return;

    const trimmedTarget = target.trim();

    if (trimmedTarget === "サンプル問題") {
        alert("「サンプル問題」ジャンルは変更・削除できません。");
        return;
    }

    const index = customGenres.indexOf(trimmedTarget);

    if (index === -1) {
        alert("該当するジャンルが見つかりませんでした。");
        return;
    }

    const action = prompt(`「${trimmedTarget}」に対する操作を選択してください:\n1: 名前を変更する\n2: ジャンルを削除する\n(1 または 2 を入力)`);

    if (action === "1") {
        const newName = prompt(`「${trimmedTarget}」の新しいジャンル名を入力してください:`, trimmedTarget);
        if (newName && newName.trim() !== "" && newName.trim() !== trimmedTarget) {
            const trimmedNew = newName.trim();
            customGenres[index] = trimmedNew;

            nigateLogs.forEach(item => { if (item.genre === trimmedTarget) item.genre = trimmedNew; });
            activeQuizList.forEach(q => { if (q.genre === trimmedTarget) q.genre = trimmedNew; });

            updateAllGenreSelects();
            renderWeaknessList();
            loadQuizQuestion();
            saveData();
            alert(`ジャンルを「${trimmedNew}」に変更しました！`);
        }
    } else if (action === "2") {
        const confirmDelete = confirm(`「${trimmedTarget}」を削除してもよろしいですか？\n※このジャンルに設定されていた問題は「その他」に変更されます。`);
        if (confirmDelete) {
            customGenres.splice(index, 1);

            nigateLogs.forEach(item => { if (item.genre === trimmedTarget) item.genre = "その他"; });
            activeQuizList.forEach(q => { if (q.genre === trimmedTarget) q.genre = "その他"; });

            updateAllGenreSelects();
            renderWeaknessList();
            loadQuizQuestion();
            saveData();
            alert(`ジャンル「${trimmedTarget}」を削除しました。`);
        }
    }
}

function updateAllGenreSelects() {
    const selectIds = ['weaknessGenre', 'weaknessFilter', 'quizGenreFilter', 'customGenre'];

    selectIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = "";

        if (id === 'weaknessFilter' || id === 'quizGenreFilter') {
            const optAll = document.createElement('option');
            optAll.value = "すべて";
            optAll.innerText = "すべて";
            select.appendChild(optAll);
        }

        customGenres.forEach(g => {
            if ((id === 'weaknessGenre' || id === 'customGenre') && g === "サンプル問題") {
                return;
            }

            const opt = document.createElement('option');
            opt.value = g;
            opt.innerText = g;
            select.appendChild(opt);
        });

        if (customGenres.includes(currentValue) || currentValue === "すべて") {
            select.value = currentValue;
        }
    });
}

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

    if (viewName === 'achievement') {
        renderAchievements();
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

    unlockAchievement('最初の一歩', 'badge1');

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

    if (seconds >= 1800) {
        unlockAchievement('⏱️ 集中モード', 'badge5');
    }

    const todayStr = getDateKeys().daily;
    if (seconds > 0) {
        if (lastStudyDate && lastStudyDate !== todayStr) {
            const lastDate = new Date(lastStudyDate);
            const todayDate = new Date(todayStr);
            const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streakCount++;
                if (streakCount >= 3) {
                    unlockAchievement('🔥 3日間の冒険', 'badge4');
                }
            } else if (diffDays > 1) {
                unlockAchievement('🌱 再出発', 'badge3');
                streakCount = 1;
            }
        } else if (!lastStudyDate) {
            streakCount = 1;
        }
        lastStudyDate = todayStr;
    }

    const earnedExp = seconds * 5;
    if (earnedExp > 0) {
        addExpWithPeriod(earnedExp);
    } else {
        saveData();
    }

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';

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
    while (totalExp >= currentLevel * 100) {
        currentLevel++;
    }
    updateGameDisplay();
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

    const qInput = document.getElementById('weaknessQuestion');
    const aInput = document.getElementById('weaknessAnswer');
    const genreSelect = document.getElementById('weaknessGenre');

    if (!qInput || !aInput) return;

    const qVal = qInput.value.trim();
    const aVal = aInput.value.trim();
    if (qVal === "" || aVal === "") return;

    const genre = genreSelect ? genreSelect.value : "国語";
    const sharedId = Date.now();

    const newItem = {
        id: sharedId,
        genre: genre,
        text: `${qVal} | ${aVal}`,
        hidden: true
    };
    nigateLogs.unshift(newItem);

    const newQuiz = {
        id: sharedId,
        genre: genre,
        q: qVal,
        a: aVal,
        explanation: "苦手ノートから自動追加された問題です。"
    };
    activeQuizList.unshift(newQuiz);

    const earnedExp = 15; 
    addExpWithPeriod(earnedExp);

    renderWeaknessList();
    loadQuizQuestion();

    qInput.value = "";
    aInput.value = "";
}

function insertWeaknessToList(text, genre = "国語") {
    const newItem = {
        id: Date.now(),
        genre: genre,
        text: text,
        hidden: true
    };
    nigateLogs.unshift(newItem);
    renderWeaknessList();
    saveData();
}

function deleteWeakness(id, event) {
    if (event) event.stopPropagation();

    nigateLogs = nigateLogs.filter(item => (item.id || item) !== id);
    activeQuizList = activeQuizList.filter(q => q.id !== id || q.isSample || q.genre === "サンプル問題");

    renderWeaknessList();
    renderQuizManageList();
    loadQuizQuestion();
    saveData();
}

function editWeakness(id, event) {
    if (event) event.stopPropagation();
    const item = nigateLogs.find(i => (i.id || i) === id);
    if (!item) return;

    const currentText = typeof item === 'object' ? item.text : item;
    const newText = prompt("編集後のテキストを入力してください:\n(例: 問題 | 解答 または 文章の{隠したい部分})", currentText);
    if (newText !== null && newText.trim() !== "") {
        const trimmedText = newText.trim();
        if (typeof item === 'object') {
            item.text = trimmedText;
        }

        const quizItem = activeQuizList.find(q => q.id === id);
        if (quizItem && !quizItem.isSample && quizItem.genre !== "サンプル問題") {
            if (trimmedText.includes('{')) {
                const match = trimmedText.match(/^(.*?)\{(.*?)\}(.*)$/);
                if (match) {
                    quizItem.q = (match[1] + " ___ " + match[3]).trim();
                    quizItem.a = match[2].trim();
                }
            } else if (trimmedText.includes('|')) {
                const parts = trimmedText.split('|');
                quizItem.q = parts[0].trim();
                quizItem.a = parts[1].trim();
            } else {
                quizItem.q = trimmedText;
            }
        }

        renderWeaknessList();
        renderQuizManageList();
        loadQuizQuestion();
        saveData();
    }
}

function toggleMaskWeakness(id, event) {
    if (event) event.stopPropagation();
    const item = nigateLogs.find(i => i.id === id);
    if (item && typeof item === 'object') {
        item.hidden = !item.hidden;
        renderWeaknessList();
    }
}

function renderWeaknessList() {
    const list = document.getElementById('weaknessList');
    const filterSelect = document.getElementById('weaknessFilter');
    if (!list) return;

    const filter = filterSelect ? filterSelect.value : "すべて";
    list.innerHTML = "";

    const filteredLogs = nigateLogs.filter(item => {
        if (typeof item !== 'object') return true;
        return filter === "すべて" || item.genre === filter;
    });

    if (filteredLogs.length === 0) {
        list.innerHTML = `<div class="empty-message">登録されている苦手問題はありません！</div>`;
        return;
    }

    filteredLogs.forEach((item, index) => {
        const id = typeof item === 'object' ? (item.id || index) : index;
        const genre = typeof item === 'object' ? (item.genre || "国語") : "国語";
        const text = typeof item === 'object' ? item.text : item;
        const hidden = typeof item === 'object' ? (item.hidden !== undefined ? item.hidden : true) : true;

        let rawText = text;

        if (!rawText.includes('{') && rawText.includes('|')) {
            const parts = rawText.split('|');
            rawText = `${parts[0]} | {${parts.slice(1).join('|').trim()}}`;
        }

        const displayText = rawText.replace(/\{([^}]+)\}/g, (match, target) => {
            const maskStyle = hidden
                ? 'background:#ff4757; color:#ff4757; border-radius:3px; padding:0 4px; cursor:pointer; user-select:none;'
                : 'color:var(--pink-neon); cursor:pointer; text-decoration:underline; font-weight:bold;';

            return `<span onclick="toggleMaskWeakness(${id}, event)" style="${maskStyle}" title="タップで表示/非表示">${target}</span>`;
        });

        const div = document.createElement('div');
        div.className = 'log-item';
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:6px;';
        div.innerHTML = `
            <div style="flex:1; word-break:break-all; margin-right:8px;">
                <span style="font-size:0.75rem; background:var(--card-bg); padding:2px 6px; border-radius:4px; margin-right:6px; border:1px solid rgba(255,255,255,0.1);">${genre}</span>
                <span>${displayText}</span>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">
                <button onclick="editWeakness(${id}, event)" style="font-size:0.7rem; background:none; border:1px solid #888; color:#ccc; border-radius:3px; padding:2px 6px; cursor:pointer;">編集</button>
                <button onclick="deleteWeakness(${id}, event)" style="font-size:0.7rem; background:none; border:1px solid #ef4444; color:#ef4444; border-radius:3px; padding:2px 6px; cursor:pointer;">削除</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// ==========================================
// 🔄 復習クイズ機能
// ==========================================
function filterQuizGenre() {
    const filterSelect = document.getElementById('quizGenreFilter');
    currentQuizFilter = filterSelect ? filterSelect.value : "すべて";
    currentQuizIndex = 0;
    loadQuizQuestion();
}

function getFilteredQuizList() {
    return activeQuizList.filter(q => currentQuizFilter === "すべて" || (q.genre && q.genre === currentQuizFilter));
}

function loadQuizQuestion() {
    const list = getFilteredQuizList();
    const qText = document.getElementById('quizQuestionText');
    const rText = document.getElementById('quizResultText');
    const eText = document.getElementById('quizExplanationText');

    if (list.length === 0) {
        if (qText) qText.innerText = "該当するジャンルのクイズがありません！";
        if (rText) rText.innerText = "";
        if (eText) eText.style.display = "none";
        return;
    }

    if (currentQuizIndex >= list.length) currentQuizIndex = 0;

    const currentQuiz = list[currentQuizIndex];
    if (qText) qText.innerText = `[${currentQuiz.genre || '国語'}] ${currentQuiz.q}`;
    if (rText) rText.innerText = "";
    if (eText) eText.style.display = "none";

    const answerInput = document.getElementById('userQuizAnswer');
    if (answerInput) {
        answerInput.value = "";
        answerInput.disabled = false;
    }

    const submitBtn = document.getElementById('submitAnswerBtn');
    if (submitBtn) submitBtn.disabled = false;
}

function normalizeAnswer(str) {
    if (!str) return "";
    return str
        .trim()
        .toLowerCase()
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, "");
}

function submitQuizAnswer(event) {
    if (event) event.stopPropagation();

    const list = getFilteredQuizList();
    const answerInput = document.getElementById('userQuizAnswer');
    const resultDisplay = document.getElementById('quizResultText');
    const expDisplay = document.getElementById('quizExplanationText');
    const submitBtn = document.getElementById('submitAnswerBtn');

    if (!answerInput || list.length === 0) return;

    const userAnswer = normalizeAnswer(answerInput.value);
    if (userAnswer === "") return;

    const currentQuiz = list[currentQuizIndex];
    const correctAnswer = normalizeAnswer(currentQuiz.a);

    answerInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (userAnswer === correctAnswer) {
        resultDisplay.style.color = "var(--green-neon)";
        resultDisplay.innerText = "⭕ 正解！ (+20XP)";
        
        quizCorrectCount++;
        if (quizCorrectCount >= 10) {
            unlockAchievement('クイズ見習い', 'badge6');
        }

        if (lastFailedQuizId === currentQuiz.id) {
            unlockAchievement('🧠 リベンジ成功', 'badge7');
            lastFailedQuizId = null;
        }

        addExpWithPeriod(20);
    } else {
        resultDisplay.style.color = "var(--pink-neon)";
        resultDisplay.innerText = `❌ 不正解... 正解: 「${currentQuiz.a}」`;
        lastFailedQuizId = currentQuiz.id;
        insertWeaknessToList(`${currentQuiz.q} | ${currentQuiz.a}`, currentQuiz.genre || "国語");
    }

    if (currentQuiz.explanation) {
        expDisplay.innerText = `💡 解説: ${currentQuiz.explanation}`;
        expDisplay.style.display = "block";
    }

    setTimeout(() => {
        currentQuizIndex = (currentQuizIndex + 1) % list.length;
        loadQuizQuestion();
    }, 2500);
}

function toggleQuizForm(event) {
    if (event) event.stopPropagation();
    const form = document.getElementById('quizFormContainer');
    if (form) {
        const isHidden = form.style.display === 'none';
        form.style.display = isHidden ? 'block' : 'none';
        if (isHidden) renderQuizManageList();
    }
}

function addCustomQuiz(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const genre = document.getElementById('customGenre').value;
    const qInput = document.getElementById('customQuestion');
    const aInput = document.getElementById('customAnswer');
    const eInput = document.getElementById('customExplanation');

    if (!qInput || !aInput) return;

    const newItem = {
        id: Date.now(),
        genre: genre,
        q: qInput.value.trim(),
        a: aInput.value.trim(),
        explanation: eInput ? eInput.value.trim() : ""
    };

    activeQuizList.unshift(newItem);
    qInput.value = "";
    aInput.value = "";
    if (eInput) eInput.value = "";

    renderQuizManageList();
    loadQuizQuestion();
    saveData();
}

function deleteCustomQuiz(id, event) {
    if (event) event.stopPropagation();

    const targetQuiz = activeQuizList.find(q => q.id === id);
    if (targetQuiz && (targetQuiz.isSample || targetQuiz.genre === "サンプル問題")) {
        alert("サンプル問題は削除できません。");
        return;
    }

    activeQuizList = activeQuizList.filter(q => q.id !== id);
    nigateLogs = nigateLogs.filter(item => (typeof item === 'object' ? item.id : item) !== id);

    renderQuizManageList();
    renderWeaknessList();
    loadQuizQuestion();
    saveData();
}

function renderQuizManageList() {
    const container = document.getElementById('quizManageList');
    if (!container) return;

    container.innerHTML = "<p style='font-size:0.75rem; color:var(--text-sub); margin-bottom:6px;'>【作成済みクイズ一覧】</p>";

    activeQuizList.forEach(q => {
        const isSample = q.isSample || q.genre === "サンプル問題";
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom:4px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;';
        
        const actionHtml = isSample 
            ? `<span style="font-size:0.65rem; color:#888;">固定</span>`
            : `<button onclick="deleteCustomQuiz(${q.id || 0}, event)" style="font-size:0.65rem; color:#ef4444; border:1px solid #ef4444; background:none; border-radius:3px; cursor:pointer; padding:2px 4px;">削除</button>`;

        div.innerHTML = `
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:75%;">[${q.genre || '国語'}] ${q.q}</span>
            ${actionHtml}
        `;
        container.appendChild(div);
    });
}

// ==========================================
// 🏆 アチーブメント描画・管理機能
// ==========================================
// ==========================================
// 🏆 アチーブメント描画・管理機能（修正版）
// ==========================================
function renderAchievements() {
    // 描画先コンテナのID表記ゆれ・HTML構造に柔軟に対応
    const container = document.getElementById('achievementList') || 
                      document.getElementById('achievementContainer') ||
                      document.getElementById('badgeContainer') ||
                      document.querySelector('#card-achievement');

    if (!container) return;

    // カードタイトル等を保護しつつ描画領域を確保
    let listArea = container.querySelector('.achievement-list-inner');
    if (!listArea) {
        if (container.id === 'card-achievement') {
            listArea = document.createElement('div');
            listArea.className = 'achievement-list-inner';
            listArea.style.marginTop = '12px';
            container.appendChild(listArea);
        } else {
            listArea = container;
        }
    }

    listArea.innerHTML = "";

    achievementsMaster.forEach(item => {
        // ID(badge1等) と 名前("最初の一歩"等) の両方で獲得状況を判定
        const isUnlocked = unlockedAchievements[item.id] === true || unlockedAchievements[item.name] === true;

        const div = document.createElement('div');
        div.id = item.id;
        div.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
        div.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            margin-bottom: 8px;
            border-radius: 8px;
            background: ${isUnlocked ? 'rgba(74, 222, 128, 0.12)' : 'rgba(255, 255, 255, 0.03)'};
            border: 1px solid ${isUnlocked ? 'var(--green-neon, #4ade80)' : 'rgba(255, 255, 255, 0.1)'};
            transition: all 0.3s ease;
        `;

        div.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="font-weight:bold; font-size:0.95rem; color:${isUnlocked ? '#fff' : '#aaa'}; display:flex; align-items:center; gap:6px;">
                    <span>${isUnlocked ? '🏆' : '🔒'}</span>
                    <span>${item.name}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-sub, #aaa);">
                    条件: ${item.desc}
                </div>
            </div>
            <div style="font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:4px; ${isUnlocked ? 'background:rgba(74,222,128,0.2); color:var(--green-neon, #4ade80);' : 'background:rgba(255,255,255,0.05); color:#777;'}">
                ${isUnlocked ? '達成！' : '未達成'}
            </div>
        `;
        listArea.appendChild(div);
    });
}

function unlockAchievement(name, badgeId) {
    // 重複解放防止チェック（IDと名前の両方を検証）
    if ((badgeId && unlockedAchievements[badgeId]) || unlockedAchievements[name]) return;

    // 保存用にIDと名前の両方に解放フラグをセット
    if (badgeId) unlockedAchievements[badgeId] = true;
    if (name) unlockedAchievements[name] = true;

    saveData();
    renderAchievements();

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

function unlockAchievement(name, badgeId) {
    if (unlockedAchievements[name]) return;

    unlockedAchievements[name] = true;
    saveData();
    renderAchievements();

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
        soundEnabled: soundEnabled,
        genres: customGenres,
        quizzes: activeQuizList,
        quizCorrectCount: quizCorrectCount,
        lastFailedQuizId: lastFailedQuizId,
        lastStudyDate: lastStudyDate,
        streakCount: streakCount
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
        renderAchievements();
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
        if (Array.isArray(gameState.genres) && gameState.genres.length > 0) customGenres = gameState.genres;
        if (Array.isArray(gameState.quizzes) && gameState.quizzes.length > 0) {
            activeQuizList = gameState.quizzes;
        }

        if (gameState.quizCorrectCount !== undefined) quizCorrectCount = gameState.quizCorrectCount;
        if (gameState.lastFailedQuizId !== undefined) lastFailedQuizId = gameState.lastFailedQuizId;
        if (gameState.lastStudyDate !== undefined) lastStudyDate = gameState.lastStudyDate;
        if (gameState.streakCount !== undefined) streakCount = gameState.streakCount;

        updateGameDisplay();
        renderWeaknessList();
        renderAchievements();
        updateSettingsDisplay();
    } catch (error) {
        console.error('Study Quest：データ読み込みエラー', error);
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
    if (value !== '' && value !== '名無し') {
        playerName = value;
        unlockAchievement('ランナー誕生', 'badge2');
    } else {
        playerName = '名無し';
    }

    input.value = playerName;
    saveData();
    alert('ニックネームを保存しました！');
}

function setRankingParticipation(isEnabled, event) {
    if (event) event.stopPropagation();
    rankingEnabled = Boolean(isEnabled);

    if (rankingEnabled) {
        unlockAchievement('全国デビュー', 'badge9');
        alert('ランキングへの参加をONにしました！');
    } else {
        alert('ランキングへの参加をOFFにしました。');
    }

    saveData();
    updateSettingsDisplay();
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
// 🚀 ページ読み込み時の初期化
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateAllGenreSelects();
    loadQuizQuestion();
    renderAchievements();
    showView('home');
});

// ==========================================
// 🏆 マルチランキング機能 (Firebase連携)
// ==========================================
function switchRankingTab(type, event) {
    if (event) event.stopPropagation();
    currentRankingType = type;

    const tabs = ['daily', 'weekly', 'monthly', 'overall'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    loadRanking();
}

async function sendScoreToRanking() {
    if (!rankingEnabled || !window.firestoreUtils || !window.db) return;

    checkPeriodExpReset();

    const { doc, setDoc } = window.firestoreUtils;
    const playerId = getOrCreatePlayerId();
    const playerNameVal = playerName || '名無し';

    const keys = getDateKeys();
    const dailyExp = parseInt(localStorage.getItem('dailyExp') || '0');
    const weeklyExp = parseInt(localStorage.getItem('weeklyExp') || '0');
    const monthlyExp = parseInt(localStorage.getItem('monthlyExp') || '0');

    const payloadBase = {
        playerName: playerNameVal,
        level: currentLevel,
        totalExp: totalExp,
        updatedAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(window.db, `rankings_daily_${keys.daily}`, playerId), {
            ...payloadBase, exp: dailyExp
        }, { merge: true });

        await setDoc(doc(window.db, `rankings_weekly_${keys.weekly}`, playerId), {
            ...payloadBase, exp: weeklyExp
        }, { merge: true });

        await setDoc(doc(window.db, `rankings_monthly_${keys.monthly}`, playerId), {
            ...payloadBase, exp: monthlyExp
        }, { merge: true });

        await setDoc(doc(window.db, `rankings_overall`, playerId), {
            ...payloadBase, exp: totalExp
        }, { merge: true });

        console.log("期間別ランキングの送信成功");
    } catch (e) {
        console.error("ランキング送信エラー:", e);
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

    const keys = getDateKeys();
    let collectionName = 'rankings_overall';
    let labelText = '累計獲得XP';

    if (currentRankingType === 'daily') {
        collectionName = `rankings_daily_${keys.daily}`;
        labelText = '本日獲得XP';
    } else if (currentRankingType === 'weekly') {
        collectionName = `rankings_weekly_${keys.weekly}`;
        labelText = '今週獲得XP';
    } else if (currentRankingType === 'monthly') {
        collectionName = `rankings_monthly_${keys.monthly}`;
        labelText = '今月獲得XP';
    }

    try {
        const { collection, query, orderBy, limit, getDocs } = window.firestoreUtils;
        const q = query(collection(window.db, collectionName), orderBy("exp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            displayElem.innerHTML = "<p style='color:var(--text-sub); font-size:0.85rem;'>この期間のデータはまだありません。</p>";
            return;
        }

        let html = '<ol class="ranking-list" style="padding-left:20px; margin:0;">';
        let rank = 1;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const pName = data.playerName || '名無し';
            const lvl = data.level || 1;
            const exp = data.exp !== undefined ? data.exp : (data.totalExp || 0);
            html += `<li style="margin-bottom:6px; font-size:0.9rem;"><strong>${rank}位</strong> : ${pName} (Lv.${lvl}) - <strong>${exp} XP</strong> <span style="font-size:0.75rem; color:#aaa;">(${labelText})</span></li>`;
            rank++;
        });
        html += '</ol>';

        displayElem.innerHTML = html;
    } catch (e) {
        console.error("ランキング取得エラー:", e);
        displayElem.innerHTML = "<p style='color:#ef4444; font-size:0.85rem;'>データの取得に失敗しました。<br>(コンソールエラーを確認してください)</p>";
    }
}