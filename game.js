'use strict';

// ==================== ДАННЫЕ ====================
const POOLS = {
    profession: ["Врач", "Инженер", "Учитель", "Фермер", "Охранник", "Повар", "Психолог", "Электрик", "Механик", "Биолог"],
    health: ["Отличное", "Хорошее", "Среднее", "Слабое", "Хроническая болезнь", "Инвалидность", "Аллергия"],
    age: [18, 22, 27, 34, 41, 55, 63],
    hobby: ["Садоводство", "Рыбалка", "Чтение", "Спорт", "Ремонт техники", "Медитация", "Шахматы", "Рисование"],
    phobia: ["Клаустрофобия", "Боязнь темноты", "Акрофобия", "Социофобия", "Нет фобий", "Боязнь воды", "Боязнь огня"],
    skill: ["Первая помощь", "Взлом замков", "Радиосвязь", "Охота", "Кулинария", "Лидерство", "Ориентирование", "Стрельба"]
};

const FIELDS = [
    { key: 'profession', label: 'Профессия' },
    { key: 'health', label: 'Здоровье' },
    { key: 'age', label: 'Возраст' },
    { key: 'hobby', label: 'Хобби' },
    { key: 'phobia', label: 'Фобия' },
    { key: 'skill', label: 'Навык' }
];

const REVEALABLE_FIELDS = FIELDS.filter(f => f.key !== 'profession');

// ==================== СОСТОЯНИЕ ====================
let players = [];
let currentIndex = 0;
let round = 1;
let phase = "reveal";
let voteRounds = [2, 4, 6];
let survivorsTarget = 2;

let votes = {};
let votedSet = new Set();
let voteCandidates = null;
let isTiebreak = false;

let voteOrder = [];
let voteCursor = 0;
let pendingAction = null;

// ==================== УТИЛИТЫ ====================
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function ensurePoolSize(pool, needed, label) {
    const result = pool.slice();
    let n = 1;
    while (result.length < needed) result.push(`${label} ${n++}`);
    return result;
}

function $(id) { return document.getElementById(id); }

function log(msg) {
    const el = $('log');
    el.innerHTML += msg + '<br>';
    el.scrollTop = el.scrollHeight;
}

function generatePlayers(count, names) {
    const shuffled = {};
    for (const key of Object.keys(POOLS)) {
        const pool = ensurePoolSize(POOLS[key], count, "Вариант");
        shuffled[key] = shuffle(pool).slice(0, count);
    }
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push({
            name: names[i],
            profession: shuffled.profession[i],
            health: shuffled.health[i],
            age: shuffled.age[i],
            hobby: shuffled.hobby[i],
            phobia: shuffled.phobia[i],
            skill: shuffled.skill[i],
            alive: true,
            revealed: { profession: true }
        });
    }
    return result;
}

// ==================== РАСЧЁТ РАУНДОВ ГОЛОСОВАНИЯ ====================
function computeVoteRounds(totalPlayers, survivorsWanted) {
    const eliminationsNeeded = Math.max(0, totalPlayers - survivorsWanted);
    if (eliminationsNeeded === 0) return [];

    const maxRounds = REVEALABLE_FIELDS.length; // 5
    const votesNeeded = eliminationsNeeded;

    if (votesNeeded >= maxRounds) {
        const result = [];
        for (let r = 1; r <= maxRounds; r++) result.push(r);
        return result;
    }
    const startRound = Math.max(1, maxRounds - votesNeeded + 1);
    const result = [];
    for (let r = startRound; r <= maxRounds; r++) result.push(r);
    return result;
}

function updateAutoVoteRounds(force = false) {
    const total = parseInt($('playerCount').value) || 4;
    let surv = parseInt($('survivorsCount').value) || 1;
    if (surv >= total) {
        surv = total - 1;
        $('survivorsCount').value = surv;
    }
    const computed = computeVoteRounds(total, surv);
    const input = $('voteRoundsInput');
    if (force || input.value.trim() === '') {
        input.value = computed.join(', ');
    }
}

// ==================== НАСТРОЙКА ====================
function renderNameInputs() {
    const count = parseInt($('playerCount').value);
    const container = $('nameInputs');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'name-field';
        div.innerHTML = `<label>Игрок ${i}: <input type="text" id="name_${i}" value="Игрок ${i}" maxlength="20"></label>`;
        container.appendChild(div);
    }
    const survInput = $('survivorsCount');
    survInput.max = count - 1;
    if (parseInt(survInput.value) >= count) survInput.value = Math.max(1, count - 1);
}

function parseVoteRounds(str) {
    const parts = str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1);
    const unique = [...new Set(parts)].sort((a, b) => a - b);
    return unique.length ? unique : [];
}

function initGame() {
    const count = parseInt($('playerCount').value);
    if (count < 4 || count > 8) { alert("Выберите 4–8 игроков."); return; }

    survivorsTarget = parseInt($('survivorsCount').value) || 1;
    if (survivorsTarget >= count) { alert("Выживших должно быть меньше, чем игроков."); return; }
    if (survivorsTarget < 1) { alert("Выживших должно быть хотя бы 1."); return; }

    voteRounds = parseVoteRounds($('voteRoundsInput').value);
    if (voteRounds.length === 0) {
        voteRounds = computeVoteRounds(count, survivorsTarget);
        if (voteRounds.length === 0) voteRounds = [2];
    }

    const names = [];
    const used = new Set();
    for (let i = 1; i <= count; i++) {
        let name = $(`name_${i}`).value.trim() || `Игрок ${i}`;
        let base = name, suffix = 2;
        while (used.has(name)) { name = `${base} (${suffix++})`; }
        used.add(name);
        names.push(name);
    }

    players = generatePlayers(count, names);
    round = 1;
    phase = "reveal";
    currentIndex = 0;
    votes = {};
    votedSet = new Set();
    voteCandidates = null;

    $('setup').style.display = 'none';
    $('gameArea').style.display = 'block';
    $('fabBtn').style.display = 'flex';
    $('fabLog').style.display = 'flex';
    $('fabRestart').style.display = 'flex';

    log("=== Игра началась! Игроков: " + count + " ===");
    log("Должно выжить: " + survivorsTarget);
    log("Профессии всех игроков открыты с начала игры.");
    log("Голосование после раундов: " + voteRounds.join(', ') + ".");
    log("Раунд 1: каждый игрок раскрывает одну характеристику на свой выбор.");

    nextPlayerTurn();
}

// ==================== ПРОМЕЖУТОЧНЫЙ ЭКРАН (только раскрытие) ====================
function showPassScreen(title, playerName, action) {
    $('passTitle').textContent = title;
    $('passPlayerName').textContent = playerName;
    $('passScreen').style.display = 'block';
    $('revealPanel').style.display = 'none';
    $('voteCardPanel').style.display = 'none';
    $('voteResultPanel').style.display = 'none';
    $('deciderPanel').style.display = 'none';

    pendingAction = action;
    $('passBtn').textContent = action === 'reveal'
        ? "Я — этот игрок, показать мою карточку"
        : "Я — этот игрок, продолжить";
}

function onPassConfirmed() {
    $('passScreen').style.display = 'none';
    if (pendingAction === 'reveal') showPlayerCard();
}

// ==================== ХОД ИГРОКА (РАСКРЫТИЕ) ====================
function nextPlayerTurn() {
    const remaining = players.filter(p => p.alive && !p._acted);
    if (remaining.length === 0) {
        if (voteRounds.includes(round)) startVote();
        else nextRound();
        return;
    }

    let guard = 0;
    while (!players[currentIndex].alive || players[currentIndex]._acted) {
        currentIndex = (currentIndex + 1) % players.length;
        if (guard++ > players.length * 2) break;
    }

    showPassScreen("Передайте устройство", players[currentIndex].name, 'reveal');
}

function showPlayerCard() {
    const p = players[currentIndex];
    $('revealPanel').style.display = 'block';
    $('currentPlayerName').textContent = p.name;

    let html = '';
    REVEALABLE_FIELDS.forEach(f => {
        const isRevealed = p.revealed[f.key];
        const cls = isRevealed ? 'trait revealed' : 'trait';
        html += `<div class="${cls}" ${isRevealed ? '' : `data-reveal="${f.key}"`}>
                    <span class="label">${f.label}</span>
                    <span class="value">${p[f.key]}${f.key === 'age' ? ' лет' : ''}</span>
                </div>`;
    });
    $('currentTraits').innerHTML = html;

    // навешиваем обработчики
    $('currentTraits').querySelectorAll('[data-reveal]').forEach(el => {
        el.addEventListener('click', () => revealTrait(el.dataset.reveal));
    });

    $('revealStatus').textContent = "Выберите характеристику.";
}

function revealTrait(key) {
    const p = players[currentIndex];
    if (p.revealed[key]) return;
    p.revealed[key] = true;
    p._acted = true;

    const field = FIELDS.find(f => f.key === key);
    const value = (key === 'age') ? p.age + " лет" : p[key];
    log(`<span class="player-tag">${p.name}</span> раскрывает <b>${field.label}: ${value}</b>`);

    $('revealPanel').style.display = 'none';
    currentIndex = (currentIndex + 1) % players.length;
    nextPlayerTurn();
}

function nextRound() {
    round++;
    phase = "reveal";
    players.forEach(p => p._acted = false);
    currentIndex = 0;
    log(`--- Раунд ${round}: каждый раскрывает ещё одну характеристику ---`);
    nextPlayerTurn();
}

// ==================== ГОЛОСОВАНИЕ (БЕЗ ПРОМЕЖУТОЧНОГО ЭКРАНА) ====================
function startVote(candidates = null) {
    phase = "vote";
    votes = {};
    votedSet = new Set();
    voteCandidates = candidates;
    isTiebreak = candidates !== null;
    voteCursor = 0;

    $('revealPanel').style.display = 'none';
    $('voteResultPanel').style.display = 'none';
    $('passScreen').style.display = 'none';
    $('deciderPanel').style.display = 'none';

    if (isTiebreak) {
        log(`--- Раунд ${round}: Переголосование среди лидеров (${candidates.join(', ')}) ---`);
    } else {
        log(`--- Раунд ${round}: Анонимное голосование ---`);
    }

    const alive = players.filter(p => p.alive);
    if (alive.length <= survivorsTarget) { endGame(); return; }

    voteOrder = players.map((p, i) => i).filter(i => players[i].alive);
    nextVoter();
}

// Сразу открывает персональную страницу голосующего — без passScreen
function nextVoter() {
    if (voteCursor >= voteOrder.length) {
        showVoteResults();
        return;
    }
    showVoteCard();
}

function showVoteCard() {
    const idx = voteOrder[voteCursor];
    const voter = players[idx];

    $('voteCardPanel').style.display = 'block';
    $('voteVoterName').textContent = voter.name;
    $('voteRound').textContent = round;

    let targets = players.filter(p => p.alive && p.name !== voter.name);
    if (voteCandidates) targets = targets.filter(p => voteCandidates.includes(p.name));

    let html = '';
    targets.forEach(p => {
        html += `<button class="vote-btn" data-target="${p.name}">${p.name}</button>`;
    });
    $('voteButtons').innerHTML = html || '<i>Нет доступных кандидатов.</i>';

    $('voteButtons').querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', () => castVote(btn.dataset.target));
    });

    $('voteCount').textContent = votedSet.size;
    $('voteTotal').textContent = voteOrder.length;
    $('voteNote').textContent = isTiebreak
        ? "Переголосование среди лидеров. Выберите одного из них."
        : "";
}

function castVote(targetName) {
    const idx = voteOrder[voteCursor];
    const voter = players[idx];
    if (votedSet.has(idx)) return;

    votedSet.add(idx);
    if (!votes[targetName]) votes[targetName] = 0;
    votes[targetName]++;

    log(`<span class="player-tag">${voter.name}</span> проголосовал(а) анонимно.`);

    $('voteCardPanel').style.display = 'none';
    voteCursor++;
    nextVoter();
}

function showVoteResults() {
    $('voteResultRound').textContent = round;

    let html = '';
    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
        html = '<p>Никто не голосовал.</p>';
    } else {
        html = '<div class="revealed-item">';
        sorted.forEach(([name, count]) => {
            html += `<div>${name}: <b>${count}</b> голос(ов)</div>`;
        });
        html += '</div>';
    }
    $('voteResults').innerHTML = html;
    $('voteCardPanel').style.display = 'none';
    $('deciderPanel').style.display = 'none';
    $('voteResultPanel').style.display = 'block';
    log("Голосование завершено. Результаты показаны на экране.");
}

// ==================== ОБРАБОТКА РЕЗУЛЬТАТОВ ====================
function applyVoteResults() {
    $('voteResultPanel').style.display = 'none';

    let max = 0, candidates = [];
    for (const [name, count] of Object.entries(votes)) {
        if (count > max) { max = count; candidates = [name]; }
        else if (count === max) { candidates.push(name); }
    }

    if (candidates.length === 0) {
        log("Никто не голосовал. Пропуск.");
        afterVoteStep();
        return;
    }

    if (candidates.length === 1) {
        eliminate(candidates[0]);
        return;
    }

    const eliminatedPlayers = players.filter(p => !p.alive);

    if (eliminatedPlayers.length > 0) {
        log(`⚖️ Равенство голосов среди: ${candidates.join(', ')}. Решающий голос отдают выбывшие игроки.`);
        startEliminatedDecider(candidates);
    } else {
        log(`⚖️ Равенство голосов среди: ${candidates.join(', ')}. Переголосование только среди них.`);
        startVote(candidates);
    }
}

// ==================== РЕШАЮЩИЙ ГОЛОС ВЫБЫВШИХ ====================
function startEliminatedDecider(candidates) {
    $('deciderPanel').style.display = 'block';
    $('voteCardPanel').style.display = 'none';
    $('voteResultPanel').style.display = 'none';

    const eliminated = players.filter(p => !p.alive);
    $('deciderVoters').innerHTML =
        '<b>Выбывшие игроки (совещаются вместе):</b> ' +
        eliminated.map(p => `<span class="player-tag">${p.name}</span>`).join(', ');

    let html = '';
    candidates.forEach(name => {
        html += `<button class="decider-btn" data-target="${name}">${name}</button>`;
    });
    $('deciderButtons').innerHTML = html;

    $('deciderButtons').querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', () => castDeciderVote(btn.dataset.target));
    });
}

function castDeciderVote(targetName) {
    $('deciderButtons').innerHTML =
        `<p>Решающий голос отдан за: <span class="player-tag">${targetName}</span></p>`;

    if (!votes[targetName]) votes[targetName] = 0;
    votes[targetName]++;

    log(`🗳️ Выбывшие игроки отдали общий решающий голос за <span class="player-tag">${targetName}</span>.`);
    showVoteResults();
}

function eliminate(name) {
    const eliminated = players.find(p => p.name === name);
    if (eliminated) eliminated.alive = false;
    log(`❌ <span class="player-tag">${name}</span> изгнан(а) из убежища.`);

    const aliveCount = players.filter(p => p.alive).length;
    if (aliveCount <= survivorsTarget) endGame();
    else afterVoteStep();
}

function afterVoteStep() {
    nextRound();
}

// ==================== КОНЕЦ ИГРЫ ====================
function endGame() {
    const survivors = players.filter(p => p.alive).map(p => p.name);
    log(`=== Игра окончена. Выжили: ${survivors.join(', ')} ===`);

    $('voteCardPanel').style.display = 'none';
    $('revealPanel').style.display = 'none';
    $('passScreen').style.display = 'none';
    $('voteResultPanel').style.display = 'none';
    $('deciderPanel').style.display = 'none';

    const list = $('finalPlayersList');
    let html = '';
    players.forEach(p => {
        const isSurvivor = p.alive;
        html += `<div class="final-player ${isSurvivor ? 'survivor' : 'eliminated'}">`;
        html += `<b class="player-tag">${p.name}</b>${isSurvivor ? ' 🟢 выжил' : ' 🔴 выбыл'}:<br>`;
        const lines = FIELDS.map(f => {
            const isRevealed = !!p.revealed[f.key];
            const value = f.key === 'age' ? p.age + ' лет' : p[f.key];
            if (isRevealed) return `• ${f.label}: <b>${value}</b>`;
            return `<span class="hidden-trait">• ${f.label}: ${value}</span>`;
        });
        html += lines.join('<br>');
        html += '</div>';
    });
    list.innerHTML = html;

    $('endGamePanel').style.display = 'block';
}

// ==================== МОДАЛКИ ====================
function openRevealedModal() {
    let html = '';
    players.forEach(p => {
        const isEliminated = !p.alive;
        const lines = FIELDS.map(f => {
            const isRevealed = !!p.revealed[f.key];
            const value = f.key === 'age' ? p.age + ' лет' : p[f.key];
            if (isRevealed) return `• ${f.label}: <b>${value}</b>`;
            if (isEliminated) return `<span class="hidden-trait">• ${f.label}: ${value}</span>`;
            return null;
        }).filter(Boolean);

        if (!isEliminated && lines.length === 0) return;

        const status = isEliminated ? ' <span style="color:#e94560;">[выбыл]</span>' : '';
        html += `<div class="revealed-item">
                    <b class="player-tag">${p.name}</b>${status}:<br>
                    ${lines.join('<br>')}
                </div>`;
    });

    $('modalContent').innerHTML = html || '<i>Пока никто ничего не раскрыл.</i>';
    $('modalOverlay').classList.add('open');
}

function openLogModal() {
    $('logModalOverlay').classList.add('open');
}
function restartGame() {
    $('restartModalOverlay').classList.add('open');
}

function confirmRestart() {
    // принудительная перезагрузка без кеша
    location.reload();
}
function closeModal(id) {
    $(id).classList.remove('open');
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    renderNameInputs();
    updateAutoVoteRounds(true);

    $('playerCount').addEventListener('change', () => {
        renderNameInputs();
        updateAutoVoteRounds();
    });
    $('survivorsCount').addEventListener('change', updateAutoVoteRounds);
    $('recalcBtn').addEventListener('click', () => updateAutoVoteRounds(true));
    $('startBtn').addEventListener('click', initGame);
    $('passBtn').addEventListener('click', onPassConfirmed);
    $('voteResultBtn').addEventListener('click', applyVoteResults);
    $('restartBtn').addEventListener('click', () => location.reload());

    $('fabBtn').addEventListener('click', openRevealedModal);
    $('fabLog').addEventListener('click', openLogModal);
    $('closeRevealedBtn').addEventListener('click', () => closeModal('modalOverlay'));
    $('closeLogBtn').addEventListener('click', () => closeModal('logModalOverlay'));

    $('fabRestart').addEventListener('click', restartGame);   // открывает модалку

    $('confirmRestartBtn').addEventListener('click', confirmRestart);
    $('cancelRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('closeRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('restartModalOverlay').addEventListener('click', e => {
        if (e.target === $('restartModalOverlay')) closeModal('restartModalOverlay');
    });

    // закрытие модалок по клику на фон
    $('modalOverlay').addEventListener('click', e => {
        if (e.target === $('modalOverlay')) closeModal('modalOverlay');
    });
    $('logModalOverlay').addEventListener('click', e => {
        if (e.target === $('logModalOverlay')) closeModal('logModalOverlay');
    });
});