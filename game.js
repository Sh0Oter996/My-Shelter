'use strict';

const CUSTOM_MARKER = "__custom__";

// ==================== ДАННЫЕ ====================
const POOLS = {
    profession: ["Хирург", "Инженер", "Учитель начальных классов", "Фермер", "Охранник", "Охотник", "Сапёр", "Гимнаст", "Повар", "Психолог", "Электрик", "Механик", "Биолог", "Диджей", "Спецназовец", "МЧСник", "Блогер", "Священник", "Рэпер", "Инфоцыган", "Хакер", "Астролог", "Трейдер", "Модель", "Дизайнер", "Переводчик", "Геолог", "Пилот истребителя", "Стриптизёрша", "Вышибала", "Шахтер", "Курьер", "Мент", "Программист"],
    sex: ["Мужчина", "Женщина"],
    orientation: ["Гетеросексуальность", "Гомосексуальность", "Бисексуальность", "Асексуальность", "Аромантичность"],
    health: ["Идеальное здоровье", "Астигматизм", "Диабет", "Альцгеймер", "Рак лёгких", "Туберкулёз", "Хламидиоз", "Гепатит C", "Гастрит", "Аритмия", "Аллергия на солнечный свет", "Аутизм", "ДЦП", "Синдром дауна", "Алкоголизм", "Никотиновая зависимость", "Гемофилия", "Полная слепота на один глаз", "Нет руки", "Нет ноги", "Covid-19", "Депрессия", "Плоскостопие", "Неправильный прикус", "Акне", "Герпес", "Бешенство", "Чума", "Перхоть", "Сломана рука", "Синдром туретта", "Карлик", "Нимфомания", "Насморк", "Серные пробки в ушах", "Диарея", "Геморрой", "Солнечные ожоги", "Облысение", "Синдром сухого глаза", "Растяжение ладышки", "Гиперлордоз", "Поясничная грыжа", "Альбинизм", "Корь", "Ветрянка", "Грипп", "Множественные укусы насекомых (нелетально)"],
    age: [10, 14, 16, 18, 20, 22, 24, 27, 29, 30, 33, 34, 36, 39, 41, 44, 55, 59, 63, 67, 72, 75, 81, 87, 93, 99],
    hobby: ["Садоводство", "Рыбалка", "Чтение книг", "Медитация", "Шахматы", "Рисование", "Стрельба из лука", "Муравьиная ферма", "Вязание", "Йога", "Клептомания", "Жонглирование", "Игра на гитаре", "Стрельба  из лука", "Спидкубинг", "Квадробинг", "Хобби-хорсинг", "Скалолазание"],
    phobia: ["Клаустрофобия", "Боязнь темноты", "Акрофобия", "Социофобия", "Нет фобий", "Боязнь воды", "Боязнь огня", "Арахнофобия", "Боязнь глубины", "Трипофобия", "Боязнь животных", "Танатофобия", "Мизофобия", "Гемофобия", "Боязнь клоунов", "Номофобия", "Фобофобия", "Эргофобия", "Эйсоптрофобия", "Погонофобия", "Монофобия", "Аэрофобия", "Эротофобия", "Таргетпаника"],
    skill: ["Первая помощь", "Взлом замков", "Радиосвязь", "Охота", "Кулинария", "Ориентирование", "Программирование", "Управление самолётом", "Фотографическая память", "Акробатика", "Каллиграфия", "Метание ножей", "Шитьё"],
    character: ["Общительный", "Замкнутый", "Стрессоустойчивый", "Пофигист", "Вспыльчивый", "Доброжелательный", "Скромный", "Самокритичный", "Пацифист", "Гордый", "Трудолюбивый", "Ленивый", "Ответственный", "Безответственный", "Меркантильный", "Цундере", "Пикми", "Педантичный", "Оптимист", "Пессимист", "Реалист", "Щедрый", "Верный", "Вежливый", "Эмпатичный", "Эгоистичный", "Лицемер", "Пунктуальный", "Хозяйственный", "Отважный", "Бесстрашный", "Трусливый", "Любознательный", "Спонтанный", "Скептик", "Хладнокровный", "Циклоидный", "Застревающий"],
    luggage1: [],
    luggage2: [],
    fact1: [],
    fact2: []
};

const FIELDS = [
    { key: 'profession', label: 'Профессия' },
    { key: 'sex', label: 'Пол', unique: false },
    { key: 'orientation', label: 'Ориентация', unique: false },
    { key: 'health', label: 'Здоровье' },
    { key: 'age', label: 'Возраст', customChance: 0.03 },
    { key: 'hobby', label: 'Хобби', customChance: 0.1 },
    { key: 'phobia', label: 'Фобия' },
    { key: 'skill', label: 'Навык', customChance: 0.1 },
    { key: 'character', label: 'Характер', customChance: 0.2 },
    { key: 'luggage1', label: 'Багаж 1', customChance: 0.07 },
    { key: 'luggage2', label: 'Багаж 2', customChance: 0.07 },
    { key: 'fact1', label: 'Факт1', customChance: 0.08 },
    { key: 'fact2', label: 'Факт2', customChance: 0.08 }
];

const REVEALABLE_FIELDS = FIELDS.filter(f => f.key !== 'profession' && f.key !== 'sex');

// ==================== СОСТОЯНИЕ ====================
let players = [];
let currentIndex = 0;
let round = 1;
let phase = "reveal";
let voteRounds = [2, 4, 6];
let voteQuotas = {};            // раунд -> сколько игроков изгнать на голосовании
let survivorsTarget = 2;

let votes = {};
let votedSet = new Set();
let voteCandidates = null;
let isTiebreak = false;

let voteOrder = [];
let voteCursor = 0;
let pendingAction = null;

// Сколько игроков ещё нужно изгнать в текущем раунде голосования
let voteElimsRemaining = 0;
// Сколько всего изгоняем в текущем раунде (для подписей «голосование X из Y»)
let voteQuotaTotal = 0;
// Номер текущего голосования внутри раунда
let voteStep = 1;
// Что произошло на предыдущем голосовании этого раунда
let lastVoteOutcome = '';

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
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push({ name: names[i], alive: true, revealed: {} });
    }

    // по каждому полю отдельно
    for (const key of Object.keys(POOLS)) {
        const fieldMeta = FIELDS.find(f => f.key === key) || {};
        const isUnique = fieldMeta.unique !== false;
        const customChance = fieldMeta.customChance || 0;

        // 1) бросаем кубик для каждого игрока — кому достанется маркер
        const customPlayers = [];
        const normalPlayers = [];
        for (let i = 0; i < count; i++) {
            if (customChance > 0 && Math.random() < customChance) {
                customPlayers.push(i);
            } else {
                normalPlayers.push(i);
            }
        }

        // 2) раздаём значения обычным игрокам
        if (isUnique) {
            // уникально — перемешиваем пул и берём по числу обычных игроков
            const pool = ensurePoolSize(POOLS[key], normalPlayers.length, "Вариант");
            const shuffled = shuffle(pool).slice(0, normalPlayers.length);
            normalPlayers.forEach((playerIdx, j) => {
                result[playerIdx][key] = shuffled[j];
            });
        } else {
            // неуникально — каждому независимо случайное
            normalPlayers.forEach(playerIdx => {
                result[playerIdx][key] = randomItem(POOLS[key]);
            });
        }

        // 3) помечаем маркером тех, кому достался «придумай сам»
        customPlayers.forEach(playerIdx => {
            result[playerIdx][key] = CUSTOM_MARKER;
        });
    }

    // профессия и пол открыты с начала игры
    result.forEach(p => {
        p.revealed = { profession: true, sex: true };
    });
    return result;
}
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function displayValue(field, player) {
    const raw = player[field.key];
    if (raw === CUSTOM_MARKER) return '✏️ Придумай сам';
    if (field.key === 'age') return player.age + ' лет';
    return raw;
}
function revealTrait(key) {
    const p = players[currentIndex];
    if (p.revealed[key]) return;

    const field = FIELDS.find(f => f.key === key);
    let value = p[key];

    // Если выпало «Придумай сам» — запрашиваем ввод у игрока
    if (value === CUSTOM_MARKER) {
        const input = prompt(`Вы выбрали «${field.label}: Придумай сам». Введите своё значение:`);
        // Если игрок нажал "Отмена" или ввёл пустоту — не даём раскрыть
        if (input === null) return;
        const trimmed = input.trim();
        if (trimmed === '') {
            alert('Значение не может быть пустым.');
            return;
        }
        // Заменяем маркер на введённое значение
        p[key] = trimmed;
        value = trimmed;
    }

    // Помечаем характеристику как раскрытую
    p.revealed[key] = true;
    p._acted = true;

    // Записываем в журнал (используем displayValue, чтобы всё было красиво)
    log(`<span class="player-tag">${p.name}</span> раскрывает <b>${field.label}: ${displayValue(field, p)}</b>`);

    // Скрываем карточку и передаём ход дальше
    $('revealPanel').style.display = 'none';
    currentIndex = (currentIndex + 1) % players.length;
    nextPlayerTurn();
}

// ==================== РАСЧЁТ РАУНДОВ ГОЛОСОВАНИЯ ====================
function computeVoteRounds(totalPlayers, survivorsWanted) {
    const eliminationsNeeded = Math.max(0, totalPlayers - survivorsWanted);
    if (eliminationsNeeded === 0) return [];

    const maxRounds = REVEALABLE_FIELDS.length; // максимум раундов раскрытия
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

// Автоматический план: раунды голосования и число изгнаний в каждом.
// Если изгнаний больше, чем раундов раскрытия, распределяем их по раундам.
function computeVotePlan(totalPlayers, survivorsWanted) {
    const needed = Math.max(0, totalPlayers - survivorsWanted);
    if (needed === 0) return { rounds: [], quotas: {} };

    const maxRounds = REVEALABLE_FIELDS.length;
    if (needed > maxRounds) {
        const rounds = [];
        const quotas = {};
        for (let r = 1; r <= maxRounds; r++) rounds.push(r);
        const base = Math.floor(needed / maxRounds);
        const extra = needed % maxRounds;
        rounds.forEach((r, index) => {
            quotas[r] = base + (index < extra ? 1 : 0);
        });
        return { rounds, quotas };
    }

    const rounds = computeVoteRounds(totalPlayers, survivorsWanted);
    const quotas = {};
    rounds.forEach(r => { quotas[r] = 1; });
    return { rounds, quotas };
}

function updateAutoVoteRounds(force = false) {
    const total = parseInt($('playerCount').value) || 4;
    let surv = parseInt($('survivorsCount').value) || 1;
    if (surv >= total) {
        surv = total - 1;
        $('survivorsCount').value = surv;
    }
    const plan = computeVotePlan(total, surv);
    const input = $('voteRoundsInput');
    if (force || input.value.trim() === '') {
        input.value = plan.rounds.join(', ');
        voteQuotas = plan.quotas;
    }
}

// ==================== ПЛАН ИЗГНАНИЙ ====================
function getMaxEliminationsPerVote() {
    const total = parseInt($('playerCount').value) || 4;
    const surv = parseInt($('survivorsCount').value) || 1;
    return Math.max(1, total - surv);
}

let renderedQuotaRoundsKey = null;

// Строит строки «После раунда N изгнать K» и хранит значения в voteQuotas
function renderVoteQuotaRows(force = false) {
    const rounds = parseVoteRounds($('voteRoundsInput').value);
    const key = rounds.join(',');
    if (!force && key === renderedQuotaRoundsKey) {
        updateVotePlanHint();
        return;
    }
    renderedQuotaRoundsKey = key;

    const maxElim = getMaxEliminationsPerVote();
    const previous = voteQuotas;
    voteQuotas = {};
    rounds.forEach(r => {
        const value = parseInt(previous[r]);
        voteQuotas[r] = Math.max(1, Math.min(maxElim, isNaN(value) ? 1 : value));
    });

    const container = $('voteQuotaRows');
    if (rounds.length === 0) {
        container.innerHTML = '<i>Сначала задайте хотя бы один раунд голосования.</i>';
        updateVotePlanHint();
        return;
    }

    container.innerHTML = rounds.map(r => `
        <div class="quota-row">
            <span>После раунда <b>${r}</b> изгнать</span>
            <input type="number" min="1" max="${maxElim}" value="${voteQuotas[r]}" data-quota-round="${r}">
            <span>игрок(ов)</span>
        </div>`).join('');

    container.querySelectorAll('[data-quota-round]').forEach(input => {
        const roundNumber = parseInt(input.dataset.quotaRound);
        input.addEventListener('input', () => {
            const value = parseInt(input.value);
            if (!isNaN(value) && value >= 1) {
                voteQuotas[roundNumber] = Math.min(getMaxEliminationsPerVote(), value);
                updateVotePlanHint();
            }
        });
        input.addEventListener('change', () => {
            let value = parseInt(input.value);
            if (isNaN(value)) value = 1;
            value = Math.max(1, Math.min(getMaxEliminationsPerVote(), value));
            input.value = value;
            voteQuotas[roundNumber] = value;
            updateVotePlanHint();
        });
    });

    updateVotePlanHint();
}

function updateVotePlanHint() {
    const el = $('votePlanHint');
    const total = parseInt($('playerCount').value) || 4;
    const surv = parseInt($('survivorsCount').value) || 1;
    const needed = Math.max(0, total - surv);
    const rounds = parseVoteRounds($('voteRoundsInput').value);
    const planned = rounds.reduce((sum, r) => sum + (parseInt(voteQuotas[r]) || 1), 0);

    if (rounds.length === 0) {
        el.className = 'plan-hint warn';
        el.innerHTML = '⚠️ Не задан ни один раунд голосования.';
    } else if (planned === needed) {
        el.className = 'plan-hint ok';
        el.innerHTML = `✅ Будет изгнано <b>${planned}</b> — ровно столько, чтобы осталось <b>${surv}</b>.`;
    } else if (planned > needed) {
        el.className = 'plan-hint ok';
        el.innerHTML = `Будет изгнано <b>${planned}</b>, нужно <b>${needed}</b>. Игра закончится, когда останется <b>${surv}</b>.`;
    } else {
        el.className = 'plan-hint warn';
        el.innerHTML = `⚠️ Будет изгнано <b>${planned}</b>, а чтобы осталось <b>${surv}</b>, нужно <b>${needed}</b>. Добавьте изгнания, иначе игра не завершится.`;
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
    if (count < 4 || count > 15) { alert("Выберите 4–15 игроков."); return; }

    survivorsTarget = parseInt($('survivorsCount').value) || 1;
    if (survivorsTarget >= count) { alert("Выживших должно быть меньше, чем игроков."); return; }
    if (survivorsTarget < 1) { alert("Выживших должно быть хотя бы 1."); return; }

    voteRounds = parseVoteRounds($('voteRoundsInput').value);
    if (voteRounds.length === 0) {
        const autoPlan = computeVotePlan(count, survivorsTarget);
        voteRounds = autoPlan.rounds;
        voteQuotas = autoPlan.quotas;
        $('voteRoundsInput').value = voteRounds.join(', ');
    }

    // Нормализуем план изгнаний для актуального списка раундов
    const maxPerVote = Math.max(1, count - survivorsTarget);
    const normalizedQuotas = {};
    voteRounds.forEach(r => {
        const value = parseInt(voteQuotas[r]);
        normalizedQuotas[r] = Math.max(1, Math.min(maxPerVote, isNaN(value) ? 1 : value));
    });
    voteQuotas = normalizedQuotas;

    const eliminationsNeeded = count - survivorsTarget;
    const plannedEliminations = voteRounds.reduce((sum, r) => sum + voteQuotas[r], 0);
    if (plannedEliminations < eliminationsNeeded) {
        alert(`По плану изгоняется ${plannedEliminations} игрок(ов), а чтобы осталось ${survivorsTarget}, нужно изгнать ${eliminationsNeeded}. Увеличьте число изгнаний или уменьшите число выживших.`);
        return;
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
    voteElimsRemaining = 0;
    voteQuotaTotal = 0;
    voteStep = 1;
    lastVoteOutcome = '';

    $('setup').style.display = 'none';
    $('gameArea').style.display = 'block';
    $('fabBtn').style.display = 'flex';
    $('fabLog').style.display = 'flex';
    $('fabRestart').style.display = 'flex';

    const planText = voteRounds.map(r => `после раунда ${r} — изгнать ${voteQuotas[r]}`).join('; ');
    log("=== Игра началась! Игроков: " + count + " ===");
    log("Должно выжить: " + survivorsTarget);
    log("Профессии всех игроков открыты с начала игры.");
    log("Голосования: " + planText + ".");
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
        if (voteRounds.includes(round)) startVoteRound();
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

    // Профессия и пол — уже открыты всем, показываем отдельно, некликабельно
    let html = `
    <div class="trait revealed" style="margin-bottom: 8px;">
        <span class="label">Профессия (уже открыта всем)</span>
        <span class="value">${p.profession}</span>
    </div>
    <div class="trait revealed" style="margin-bottom: 12px;">
        <span class="label">Пол (уже открыт всем)</span>
        <span class="value">${p.sex}</span>
    </div>
`;

    // Остальные характеристики — кликабельны, если ещё не раскрыты
    REVEALABLE_FIELDS.forEach(f => {
        const isRevealed = p.revealed[f.key];
        const cls = isRevealed ? 'trait revealed' : 'trait';
        html += `<div class="${cls}" ${isRevealed ? '' : `data-reveal="${f.key}"`}>
                    <span class="label">${f.label}</span>
                    <span class="value">${displayValue(f, p)}</span>
                </div>`;
    });
    $('currentTraits').innerHTML = html;

    $('currentTraits').querySelectorAll('[data-reveal]').forEach(el => {
        el.addEventListener('click', () => revealTrait(el.dataset.reveal));
    });

    $('revealStatus').textContent = "Профессия уже раскрыта. Выберите одну из оставшихся характеристик.";
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
// Запускает голосование, назначенное на текущий раунд. Если в этом раунде
// изгоняем несколько игроков, сначала идёт первое голосование, а следующие —
// сразу после каждого изгнания.
function startVoteRound() {
    const aliveCount = players.filter(p => p.alive).length;
    const planned = Math.max(1, parseInt(voteQuotas[round]) || 1);
    voteQuotaTotal = Math.max(0, Math.min(planned, aliveCount - survivorsTarget));
    voteElimsRemaining = voteQuotaTotal;
    voteStep = 1;
    lastVoteOutcome = '';

    if (voteQuotaTotal <= 0) { nextRound(); return; }

    log(`--- Раунд ${round}: голосование. Нужно изгнать: ${voteQuotaTotal} ---`);
    startVote();
}

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
        log(`--- Раунд ${round}: Анонимное голосование ${voteStep} из ${voteQuotaTotal} ---`);
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
    $('voteStepInfo').textContent = isTiebreak
        ? '— переголосование'
        : (voteQuotaTotal > 1 ? `— голосование ${voteStep} из ${voteQuotaTotal}` : '');
    $('voteQuotaHint').innerHTML = isTiebreak
        ? `Переголосование среди лидеров. В этом раунде осталось изгнать: <b>${voteElimsRemaining}</b>.`
        : `В этом раунде изгоняем: <b>${voteQuotaTotal}</b>. Сейчас идёт голосование <b>${voteStep}</b> из <b>${voteQuotaTotal}</b>.`;
    $('voteLastResult').textContent = lastVoteOutcome;

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
    $('voteResultStepInfo').textContent = isTiebreak
        ? '— переголосование'
        : (voteQuotaTotal > 1 ? `— голосование ${voteStep} из ${voteQuotaTotal}` : '');
    $('voteResultQuotaHint').innerHTML = `В этом раунде нужно изгнать: <b>${voteQuotaTotal}</b>, уже изгнано: <b>${voteQuotaTotal - voteElimsRemaining}</b>.`;

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

    // Если лидеров ровно столько же, сколько ещё нужно изгнать, изгоняем всех сразу.
    // Например, изгоняем двоих, а голоса разделились ровно между двумя лидерами —
    // оба покидают убежище, второе голосование не запускается.
    if (candidates.length > 1 && candidates.length === voteElimsRemaining) {
        log(`⚖️ Голоса разделились ровно между ${candidates.length} лидерами: ${candidates.join(', ')}. Изгоняем всех сразу, дополнительное голосование не нужно.`);
        eliminateSeveral(candidates);
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

function markEliminated(name) {
    const player = players.find(p => p.name === name);
    if (!player || !player.alive) return;
    player.alive = false;
    log(`❌ <span class="player-tag">${player.name}</span> изгнан(а) из убежища.`);
}

function eliminate(name) {
    markEliminated(name);
    voteElimsRemaining = Math.max(0, voteElimsRemaining - 1);
    lastVoteOutcome = `На предыдущем голосовании изгнан(а): ${name}.`;
    afterEliminationStep();
}

// Изгнание нескольких игроков сразу (например, при равенстве голосов)
function eliminateSeveral(names) {
    names.forEach(markEliminated);
    voteElimsRemaining = Math.max(0, voteElimsRemaining - names.length);
    lastVoteOutcome = `На предыдущем голосовании изгнаны: ${names.join(', ')}.`;
    afterEliminationStep();
}

function afterEliminationStep() {
    const aliveCount = players.filter(p => p.alive).length;
    if (aliveCount <= survivorsTarget) { endGame(); return; }

    if (voteElimsRemaining > 0) {
        voteStep++;
        log(`🗳️ Нужно изгнать ещё ${voteElimsRemaining}. Запускается голосование ${voteStep} из ${voteQuotaTotal}.`);
        startVote();
        return;
    }

    afterVoteStep();
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
            const value = displayValue(f, p);
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
            const value = displayValue(f, p);
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
    renderVoteQuotaRows(true);

    $('playerCount').addEventListener('change', () => {
        renderNameInputs();
        updateAutoVoteRounds();
        renderVoteQuotaRows(true);
    });
    $('survivorsCount').addEventListener('change', () => {
        updateAutoVoteRounds(true);
        renderVoteQuotaRows(true);
    });
    $('voteRoundsInput').addEventListener('input', () => renderVoteQuotaRows());
    $('recalcBtn').addEventListener('click', () => {
        updateAutoVoteRounds(true);
        renderVoteQuotaRows(true);
    });
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