'use strict';

// Гарантируем, что у каждой закрытой/неисправной комнаты есть хотя бы один
// потенциальный открыватель среди игроков. Если игрока с нужной профессией
// или навыком нет, выдаём её одному из участников.
function canOpenRoomForGuarantee(room, player) {
    const professions = (room.unlock && room.unlock.professions) || [];
    const skills = (room.unlock && room.unlock.skills) || [];
    return professions.includes(player.profession) || skills.includes(player.skill);
}

function ensureRoomOpeners(list) {
    if (!SCENARIO) return;
    const rooms = SCENARIO.rooms.filter(room => (room.locked || room.broken) && room.unlock);

    rooms.forEach(room => {
        if (list.some(p => canOpenRoomForGuarantee(room, p))) return;

        const isSoleOpener = player => rooms.some(other => {
            if (other === room) return false;
            if (!canOpenRoomForGuarantee(other, player)) return false;
            return !list.some(q => q !== player && canOpenRoomForGuarantee(other, q));
        });

        let candidates = list.filter(p => !isSoleOpener(p));
        if (candidates.length === 0) candidates = list;

        const chosen = randomItem(candidates);
        const professions = (room.unlock.professions || []);
        const skills = (room.unlock.skills || []);
        if (professions.length > 0) {
            chosen.profession = randomItem(professions);
        } else if (skills.length > 0) {
            chosen.skill = randomItem(skills);
        }
    });
}

function generatePlayers(count, names) {
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push({
            name: names[i],
            alive: true,
            revealed: {},
            bonusLuggage: [],
            actionCard: null,
            actionCardUsed: false,
            conditionCard: null,
            conditionCardTriggered: false
        });
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
    ensureRoomOpeners(result);
    result.forEach(p => {
        p.revealed = { profession: true, sex: true };
    });

    // секретные карты: действие и условие
    const actionDeck = shuffle(ACTION_CARDS);
    const conditionDeck = shuffle(CONDITION_CARDS);
    result.forEach((p, i) => {
        p.actionCard = actionDeck[i % actionDeck.length];
        p.conditionCard = conditionDeck[i % conditionDeck.length];
    });

    return result;
}

function pickScenario() {
    const select = $('scenarioSelect');
    const id = select ? select.value : 'random';
    if (id && id !== 'random') {
        const found = SCENARIOS.find(s => s.id === id);
        if (found) return found;
    }
    return randomItem(SCENARIOS);
}

function populateScenarioSelect() {
    const select = $('scenarioSelect');
    if (!select) return;
    select.innerHTML = '<option value="random">🎲 Случайный сценарий</option>' +
        SCENARIOS.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    updateScenarioHint();
}

function updateScenarioHint() {
    const hint = $('scenarioHint');
    if (!hint) return;
    const select = $('scenarioSelect');
    const scenario = select && select.value !== 'random'
        ? SCENARIOS.find(s => s.id === select.value)
        : null;

    if (scenario) {
        hint.innerHTML = `<b>${scenario.title}</b><br>${scenario.bunkerSize}<br><i>${scenario.apocalypse}</i>`;
    } else {
        hint.textContent = 'Сценарий, бункер, комнаты и концовка выбираются случайно при старте игры.';
    }
}

function initGame() {
    const count = parseInt($('playerCount').value);
    if (count < 4 || count > 15) { alert("Выберите 4–15 игроков."); return; }

    survivorsTarget = parseInt($('survivorsCount').value) || 1;
    if (survivorsTarget >= count) { alert("Выживших должно быть меньше, чем игроков."); return; }
    if (survivorsTarget < 1) { alert("Выживших должно быть хотя бы 1."); return; }

    SCENARIO = pickScenario();

    voteRounds = parseVoteRounds($('voteRoundsInput').value);
    if (voteRounds.length === 0) {
        const autoPlan = computeVotePlan(count, survivorsTarget);
        voteRounds = autoPlan.rounds;
        voteQuotas = autoPlan.quotas;
        $('voteRoundsInput').value = voteRounds.join(', ');
    }

    const maxRevealRound = REVEALABLE_FIELDS.length;
    if (voteRounds.some(r => r > maxRevealRound)) {
        alert(`Голосование можно назначить не позже ${maxRevealRound}-го раунда: к этому моменту все характеристики уже раскрыты.`);
        return;
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
    actionCardOwnerIndex = null;
    endingType = 'neutral';
    finalState = null;
    awaitingGameStart = false;

    $('setup').style.display = 'none';
    $('gameArea').style.display = 'block';
    $('endGamePanel').style.display = 'none';
    $('endingBlock').innerHTML = '';
    $('bunkerBar').style.display = 'block';
    $('fabBtn').style.display = 'flex';
    $('fabLog').style.display = 'flex';
    $('fabRestart').style.display = 'flex';
    $('fabStory').style.display = 'flex';

    log(`<b>=== ${SCENARIO.title} ===</b>`);
    log(`<i>${SCENARIO.apocalypse}</i>`);
    log(`<i>${SCENARIO.bunkerDesc}</i>`);
    log(`<b>Размеры бункера:</b> ${SCENARIO.bunkerSize}`);

    const planText = voteRounds.map(r => `после раунда ${r} — изгнать ${voteQuotas[r]}`).join('; ');
    log("=== Игра началась! Игроков: " + count + " ===");
    log("Должно выжить: " + survivorsTarget);
    log("Профессии всех игроков открыты с начала игры.");
    log("Голосования: " + planText + ".");
    log("Раунд 1: каждый игрок раскрывает одну характеристику на свой выбор.");

    // Фиксируем стартовые параметры, открываем известные комнаты и показываем предысторию.
    prepareScenario();
    awaitingGameStart = true;
    openStoryModal(true);
}


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

function getMaxEliminationsPerVote() {
    const total = parseInt($('playerCount').value) || 4;
    const surv = parseInt($('survivorsCount').value) || 1;
    return Math.max(1, total - surv);
}

let renderedQuotaRoundsKey = null;

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
