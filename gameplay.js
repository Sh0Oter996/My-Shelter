'use strict';

// ==================== БУНКЕР: КОМНАТЫ, РЕСУРСЫ, СЦЕНАРИЙ ====================
function isRoomDiscovered(room) {
    return !room.discoverRound || discoveredRoomIds.includes(room.id);
}

function isRoomOpened(room) {
    return openedRoomIds.includes(room.id);
}

function roomStatus(room) {
    if (!isRoomDiscovered(room)) return 'hidden';
    if (isRoomOpened(room)) return 'open';
    if (room.broken) return 'broken';
    if (room.locked) return 'locked';
    return 'open';
}

function findRoomOpener(room) {
    if (!room.unlock) return null;
    const professions = room.unlock.professions || [];
    const skills = room.unlock.skills || [];
    return players.find(p => p.alive && (
        professions.includes(p.profession) ||
        (p.revealed && p.revealed.skill && skills.includes(p.skill))
    )) || null;
}

function changeResource(key, delta, reason) {
    if (typeof resources[key] !== 'number') resources[key] = 0;
    resources[key] = Math.max(0, resources[key] + delta);
    const meta = RESOURCE_META[key] || { label: key, icon: '•' };
    log(`${meta.icon} ${meta.label}: <b>${signed(delta)}</b>${reason ? ` — ${reason}` : ''} (теперь ${resources[key]})`);
    if (SCENARIO) renderStoryPanel();
}

function changeStability(delta, reason) {
    stability = Math.max(-5, Math.min(5, stability + delta));
    log(`🧠 Стабильность: <b>${signed(delta)}</b>${reason ? ` — ${reason}` : ''} (теперь ${stability})`);
    if (SCENARIO) renderStoryPanel();
}

function openRoom(room, opener) {
    if (isRoomOpened(room)) return;
    openedRoomIds.push(room.id);

    if (opener) {
        const verb = room.broken ? 'починил(а)' : 'открыл(а)';
        log(`🔓 <span class="player-tag">${opener.name}</span> ${verb} помещение «${room.name}».`);
    } else {
        log(`🔓 Доступно помещение «${room.name}».`);
    }

    (room.inventory || []).forEach(item => {
        log(`&nbsp;&nbsp;• <b>${item.name}</b> — ${item.desc}`);
        (item.effects || []).forEach(effect => {
            if (effect.resource) changeResource(effect.resource, effect.delta, `находка в «${room.name}»`);
            if (effect.stability) changeStability(effect.stability, `находка в «${room.name}»`);
        });
    });
}

function checkRoomEvents() {
    if (!SCENARIO) return;
    let changed = false;

    // 1. Открываем сведения о скрытых комнатах, когда приходит их раунд
    SCENARIO.rooms.forEach(room => {
        if (!isRoomDiscovered(room) && room.discoverRound && round >= room.discoverRound) {
            discoveredRoomIds.push(room.id);
            changed = true;
            log(`🔍 <b>Новое помещение:</b> «${room.name}». ${room.desc}`);
            if (room.locked || room.broken) {
                log(`&nbsp;&nbsp;Дверь ${room.broken ? 'неисправна' : 'заперта'}: ${room.unlock ? room.unlock.text : 'нужен особый доступ'}.`);
            }
        }
    });

    // 2. Открываем или ремонтируем комнаты, если в бункере есть нужный специалист
    SCENARIO.rooms.forEach(room => {
        if (!isRoomDiscovered(room) || isRoomOpened(room)) return;

        if (!room.locked && !room.broken) {
            openRoom(room, null);
            changed = true;
            return;
        }

        const opener = findRoomOpener(room);
        if (opener) {
            openRoom(room, opener);
            changed = true;
        }
    });

    renderStoryPanel();
}

function resourcesBarHtml() {
    const parts = Object.keys(RESOURCE_META).map(key => {
        const meta = RESOURCE_META[key];
        const value = resources[key] || 0;
        return `<span class="resource-chip ${value <= 1 ? 'low' : ''}">${meta.icon} ${meta.label}: <b>${value}</b></span>`;
    });
    parts.push(`<span class="resource-chip ${stability < 0 ? 'low' : ''}">🧠 Стабильность: <b>${signed(stability)}</b></span>`);
    return `<div class="resources-bar">${parts.join('')}</div>`;
}

function roomCardHtml(room) {
    const status = roomStatus(room);
    const labels = { open: 'открыта', locked: 'заперта', broken: 'неисправна' };
    let html = `<div class="room-card ${status}">`;
    html += `<div class="room-head"><b>${room.name}</b><span class="room-status">${labels[status] || ''}</span></div>`;
    html += `<div class="room-desc">${room.desc}</div>`;

    if (status === 'open') {
        const loot = (room.inventory || [])
            .map(item => `• ${item.name} — ${item.desc}`)
            .join('<br>');
        html += `<div class="room-loot"><b>Найдено:</b><br>${loot || 'ничего полезного'}</div>`;
    } else {
        html += `<div class="room-lock">🔒 ${room.unlock ? room.unlock.text : 'нужен особый доступ'}</div>`;
        html += `<div class="room-loot unknown">Содержимое пока неизвестно.</div>`;
    }

    html += `</div>`;
    return html;
}

function renderStoryPanel() {
    if (!SCENARIO) return;
    const panel = $('storyPanel');
    if (!panel) return;

    panel.style.display = 'block';
    $('storyTitle').textContent = SCENARIO.title;
    $('storyDesc').innerHTML =
        `<b>Апокалипсис:</b> ${SCENARIO.apocalypse}<br><br>` +
        `<b>Бункер:</b> ${SCENARIO.bunkerDesc}` +
        (SCENARIO.bunkerSize ? `<br><span class="story-meta">${SCENARIO.bunkerSize}</span>` : '');

    const knownRooms = SCENARIO.rooms.filter(isRoomDiscovered);
    const hiddenCount = SCENARIO.rooms.length - knownRooms.length;

    let html = resourcesBarHtml();
    html += `<div class="rooms-grid">${knownRooms.map(roomCardHtml).join('')}</div>`;
    if (hiddenCount > 0) {
        html += `<p class="room-hint">🚪 За закрытыми дверями осталось помещений: <b>${hiddenCount}</b>. Возможно, вы найдёте их позже.</p>`;
    } else {
        html += `<p class="room-hint">Все помещения бункера известны.</p>`;
    }

    $('storyRooms').innerHTML = html;
}

function resetScenarioRuntime() {
    resources = Object.assign({}, SCENARIO.startResources || {});
    stability = 0;
    discoveredRoomIds = [];
    openedRoomIds = [];
    endingType = 'neutral';

    players.forEach(p => {
        p.bonusLuggage = p.bonusLuggage || [];
        p.actionCardUsed = false;
        p.conditionCardTriggered = false;
        p._acted = false;
    });

    checkRoomEvents();
    players.forEach(p => triggerCondition(p, 'start'));
    triggerRoundConditions();
    renderStoryPanel();
}

// ==================== КАРТЫ УСЛОВИЙ ====================
function triggerRoundConditions() {
    players.filter(p => p.alive).forEach(p => triggerCondition(p, 'round'));
}

function triggerCondition(player, trigger) {
    const card = player.conditionCard;
    if (!card || player.conditionCardTriggered) return;
    if (card.trigger !== trigger) return;
    if (trigger === 'round' && card.round !== round) return;

    player.conditionCardTriggered = true;
    log(`🎴 <b>Условие «${card.name}»</b> срабатывает у <span class="player-tag">${player.name}</span>: ${card.desc}`);
    applyConditionEffect(player, card.effect || {});
}

function applyConditionEffect(player, effect) {
    if (effect.luggage) {
        player.bonusLuggage = player.bonusLuggage || [];
        player.bonusLuggage.push(effect.luggage);
        log(`🎒 <span class="player-tag">${player.name}</span> получает бонусный багаж: <b>${effect.luggage}</b>.`);
    }
    if (effect.resource) {
        changeResource(effect.resource.key, effect.resource.delta, `условие «${player.conditionCard.name}»`);
    }
    if (effect.stability) {
        changeStability(effect.stability, `условие «${player.conditionCard.name}»`);
    }
    if (effect.revealHiddenRoom) {
        revealHiddenRoomByCondition(player);
    }
}

function revealHiddenRoomByCondition(player) {
    const hidden = SCENARIO.rooms.filter(room => !isRoomDiscovered(room));
    if (hidden.length === 0) {
        log(`🔍 ${player.name} ищет тайное помещение, но все комнаты уже известны.`);
        return;
    }

    const room = hidden[hidden.length - 1];
    discoveredRoomIds.push(room.id);
    log(`🔍 <span class="player-tag">${player.name}</span> находит схему и тайное помещение: «${room.name}». ${room.desc}`);
    checkRoomEvents();
}

// ==================== РАСКРЫТИЕ ====================
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

function secretCardsHtml(p) {
    let html = '';

    if (p.actionCard) {
        html += `<div class="secret-card action-card">` +
            `<div class="secret-card-title">🃏 Секретная карта действия</div>` +
            `<div class="secret-card-name">${p.actionCard.icon || ''} ${p.actionCard.name}</div>` +
            `<div class="secret-card-desc">${p.actionCard.desc}</div>` +
            (p.actionCardUsed
                ? '<div class="secret-card-state used">Карта использована</div>'
                : '<button class="card-btn" onclick="openActionCardModal()">Активировать карту</button>') +
            `</div>`;
    }

    if (p.conditionCard) {
        html += `<div class="secret-card condition-card ${p.conditionCardTriggered ? 'triggered' : ''}">` +
            `<div class="secret-card-title">🎴 Секретное условие</div>` +
            `<div class="secret-card-name">${p.conditionCard.name}</div>` +
            `<div class="secret-card-desc">${p.conditionCard.desc}</div>` +
            `<div class="secret-card-state">${p.conditionCardTriggered ? '✅ Условие уже сработало' : '⏳ Условие ещё не сработало'}</div>` +
            `</div>`;
    }

    if (p.bonusLuggage && p.bonusLuggage.length) {
        html += `<div class="bonus-luggage">🎒 Бонусный багаж: <b>${p.bonusLuggage.join(', ')}</b></div>`;
    }

    return html;
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

    html += secretCardsHtml(p);

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

function revealTrait(key) {
    const p = players[currentIndex];
    if (p.revealed[key]) return;

    const field = FIELDS.find(f => f.key === key);
    let value = p[key];

    // Обработка карты "Придумай сам"
    if (value === CUSTOM_MARKER) {
        const input = prompt(`Вы выбрали «${field.label}: Придумай сам». Введите своё значение:`);
        if (input === null) return;
        const trimmed = input.trim();
        if (trimmed === '') {
            alert('Значение не может быть пустым.');
            return;
        }
        p[key] = trimmed;
        value = trimmed;
    }

    p.revealed[key] = true;
    p._acted = true;

    log(`<span class="player-tag">${p.name}</span> раскрывает <b>${field.label}: ${displayValue(field, p)}</b>`);

    // Если раскрыт навык — вдруг именно его не хватало для закрытой комнаты
    checkRoomEvents();

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

    triggerRoundConditions();
    checkRoomEvents();
    renderStoryPanel();

    nextPlayerTurn();
}

// ==================== КАРТЫ ДЕЙСТВИЙ ====================
function openActionCardModal() {
    const owner = players[currentIndex];
    if (!owner || !owner.alive) return;

    if (!owner.actionCard) {
        alert('У вас нет карты действия.');
        return;
    }
    if (owner.actionCardUsed) {
        alert('Эта карта уже использована.');
        return;
    }

    const targets = players.filter(p => p.alive && p.name !== owner.name);
    if (targets.length === 0) {
        alert('Нет других живых игроков, на которых можно применить карту.');
        return;
    }

    actionCardOwnerIndex = currentIndex;

    $('actionModalTitle').textContent = `${owner.actionCard.icon || '🃏'} ${owner.actionCard.name}`;
    $('actionModalDesc').textContent = owner.actionCard.desc;
    $('actionModalBody').innerHTML = `
        <label class="action-label">Выберите игрока:
            <select id="actionTarget">
                ${targets.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
        </label>
        <div id="actionOptions"></div>`;

    $('actionTarget').addEventListener('change', updateActionOptions);
    updateActionOptions();
    $('actionModalOverlay').classList.add('open');
}

function updateActionOptions() {
    const owner = players[actionCardOwnerIndex];
    const targetSelect = $('actionTarget');
    const box = $('actionOptions');
    const applyBtn = $('applyActionBtn');

    if (!owner || !targetSelect) {
        box.innerHTML = '<i>Нет доступной цели.</i>';
        applyBtn.disabled = true;
        return;
    }

    const target = players.find(p => p.alive && p.name === targetSelect.value);
    if (!target) {
        box.innerHTML = '<i>Выберите живого игрока.</i>';
        applyBtn.disabled = true;
        return;
    }

    const cardId = owner.actionCard ? owner.actionCard.id : '';
    let options = [];

    if (cardId === 'reveal') {
        options = FIELDS.filter(f =>
            f.key !== 'profession' && f.key !== 'sex' &&
            !target.revealed[f.key] &&
            target[f.key] !== CUSTOM_MARKER
        ).map(f => ({ value: f.key, label: `${f.label} (скрыта)` }));
    } else if (cardId === 'swap') {
        options = FIELDS.filter(f =>
            f.key !== 'sex' &&
            owner.revealed[f.key] && target.revealed[f.key] &&
            owner[f.key] !== CUSTOM_MARKER && target[f.key] !== CUSTOM_MARKER
        ).map(f => ({
            value: f.key,
            label: `${f.label}: у вас «${displayValue(f, owner)}», у цели «${displayValue(f, target)}»`
        }));
    } else if (cardId === 'steal') {
        options = ['luggage1', 'luggage2']
            .filter(key => target[key] && target[key] !== CUSTOM_MARKER && target[key] !== '—')
            .map(key => {
                const field = FIELDS.find(f => f.key === key);
                return { value: key, label: `${field.label}: ${target[key]}` };
            });
    }

    if (options.length === 0) {
        box.innerHTML = '<i>Для этой карты нет подходящей цели. Выберите другого игрока.</i>';
        applyBtn.disabled = true;
        return;
    }

    box.innerHTML = `
        <label class="action-label">Что применить:
            <select id="actionField">
                ${options.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('')}
            </select>
        </label>`;
    applyBtn.disabled = false;
}

function applyActionCard() {
    const owner = players[actionCardOwnerIndex];
    if (!owner || owner.actionCardUsed || !owner.actionCard) return;

    const targetSelect = $('actionTarget');
    const fieldSelect = $('actionField');
    if (!targetSelect || !fieldSelect) return;

    const target = players.find(p => p.alive && p.name === targetSelect.value);
    const fieldKey = fieldSelect.value;
    const card = owner.actionCard;

    if (!target) {
        alert('Выберите живого игрока.');
        return;
    }

    if (card.id === 'reveal') {
        const field = FIELDS.find(f => f.key === fieldKey);
        if (!field || target.revealed[fieldKey] || target[fieldKey] === CUSTOM_MARKER) {
            alert('Эту характеристику нельзя раскрыть.');
            return;
        }
        target.revealed[fieldKey] = true;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и раскрывает у <span class="player-tag">${target.name}</span> <b>${field.label}: ${displayValue(field, target)}</b>.`);
    } else if (card.id === 'swap') {
        const field = FIELDS.find(f => f.key === fieldKey);
        if (!field || !owner.revealed[fieldKey] || !target.revealed[fieldKey]) {
            alert('Обменять можно только уже открытую у обоих характеристику.');
            return;
        }
        const ownerValue = owner[fieldKey];
        const targetValue = target[fieldKey];
        if (ownerValue === targetValue) {
            alert('У вас одинаковые значения — обмен ничего не изменит.');
            return;
        }
        owner[fieldKey] = targetValue;
        target[fieldKey] = ownerValue;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и меняется с <span class="player-tag">${target.name}</span> характеристикой <b>${field.label}</b>. Теперь у ${owner.name}: <b>${displayValue(field, owner)}</b>, у ${target.name}: <b>${displayValue(field, target)}</b>.`);
    } else if (card.id === 'steal') {
        if (fieldKey !== 'luggage1' && fieldKey !== 'luggage2') {
            alert('Выберите багаж.');
            return;
        }
        const item = target[fieldKey];
        if (!item || item === CUSTOM_MARKER || item === '—') {
            alert('У этого игрока нет подходящего багажа.');
            return;
        }
        owner.bonusLuggage = owner.bonusLuggage || [];
        owner.bonusLuggage.push(item);
        target[fieldKey] = '—';
        target.revealed[fieldKey] = true;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и забирает у <span class="player-tag">${target.name}</span> багаж: <b>${item}</b>.`);
    } else {
        alert('Неизвестная карта действия.');
        return;
    }

    owner.actionCardUsed = true;
    closeActionCardModal();

    if (card.id === 'reveal' || card.id === 'swap') {
        checkRoomEvents();
    }
    renderStoryPanel();
    showPlayerCard();
}

function closeActionCardModal() {
    $('actionModalOverlay').classList.remove('open');
    actionCardOwnerIndex = null;
}

// ==================== ГОЛОСОВАНИЕ ====================
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

function applyEliminationLosses(player) {
    let hadRole = false;

    ROLE_LOSS.forEach(rule => {
        const match = (rule.professions || []).includes(player.profession) ||
                      (rule.skills || []).includes(player.skill);
        if (!match) return;

        hadRole = true;
        log(`⚠️ <b>Потеря специалиста:</b> ${rule.text}.`);
        changeResource(rule.resource, -1);
    });

    if (!hadRole) {
        log(`ℹ️ ${player.name} не был ключевым специалистом — бункер справится.`);
    }
}

function markEliminated(name) {
    const player = players.find(p => p.name === name);
    if (!player || !player.alive) return;

    player.alive = false;
    log(`❌ <span class="player-tag">${player.name}</span> изгнан(а) из убежища.`);

    // Каждое изгнание бьёт по атмосфере в бункере
    changeStability(-1, `изгнание ${player.name}`);
    applyEliminationLosses(player);
    triggerCondition(player, 'elimination');
    renderStoryPanel();
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

// ==================== КОНЦОВКА ====================
function countCoverage() {
    const alive = players.filter(p => p.alive);
    return {
        medic: alive.some(p => p.skill === 'Первая помощь' || ['Хирург', 'Биолог'].includes(p.profession)),
        engineer: alive.some(p => ['Инженер', 'Электрик', 'Механик'].includes(p.profession)),
        food: alive.some(p => ['Фермер', 'Охотник', 'Повар'].includes(p.profession)),
        guard: alive.some(p => ['Охранник', 'Спецназовец', 'Мент', 'Сапёр'].includes(p.profession))
    };
}

function evaluateEnding() {
    const survivors = players.filter(p => p.alive);
    const coverage = countCoverage();
    const coveredCount = Object.values(coverage).filter(Boolean).length;
    const coverageNeeded = Math.min(3, Math.max(1, survivorsTarget));
    const allResourcesOk = Object.keys(RESOURCE_META).every(key => (resources[key] || 0) > 0);
    const criticalOk = (resources.food || 0) > 0 && (resources.water || 0) > 0;
    const bonusRoomsOpened = SCENARIO.rooms.filter(room =>
        (room.locked || room.broken || room.discoverRound) && openedRoomIds.includes(room.id)
    ).length;
    const roomsNeeded = Math.min(2, Math.max(1, survivors.length));

    let type = 'neutral';
    if (survivors.length === 0 ||
        !criticalOk ||
        stability <= -3 ||
        ((resources.power || 0) <= 0 && (resources.medicine || 0) <= 0)) {
        type = 'bad';
    } else if (allResourcesOk &&
        coveredCount >= coverageNeeded &&
        bonusRoomsOpened >= roomsNeeded &&
        stability >= -1) {
        type = 'good';
    }

    const info = (SCENARIO.endings && SCENARIO.endings[type]) || { title: 'Финал', text: '' };
    return {
        type,
        title: info.title,
        text: info.text,
        coverage,
        coveredCount,
        bonusRoomsOpened,
        roomsNeeded
    };
}

function endGame() {
    const survivors = players.filter(p => p.alive);
    const eliminated = players.filter(p => !p.alive);
    const result = evaluateEnding();
    endingType = result.type;

    log(`=== Игра окончена. Выжили: ${survivors.map(p => p.name).join(', ') || 'никто'} ===`);
    log(`<b>=== КОНЦОВКА: ${result.title} ===</b>`);
    log(`<i>${result.text}</i>`);

    const coveredNames = [
        result.coverage.medic ? 'медик' : '',
        result.coverage.engineer ? 'техник' : '',
        result.coverage.food ? 'добытчик еды' : '',
        result.coverage.guard ? 'защитник' : ''
    ].filter(Boolean).join(', ') || 'ключевых специалистов не осталось';

    const openedRoomNames = SCENARIO.rooms
        .filter(room => openedRoomIds.includes(room.id))
        .map(room => room.name)
        .join(', ') || 'ничего не открыто';

    const resourceLine = Object.keys(RESOURCE_META)
        .map(key => `${RESOURCE_META[key].icon} ${RESOURCE_META[key].label}: ${resources[key] || 0}`)
        .join(' · ');

    const endingBlock = $('endingBlock');
    if (endingBlock) {
        endingBlock.innerHTML = `
            <div class="ending-block ${result.type}">
                <h3>${result.title}</h3>
                <p>${result.text}</p>
                <p><b>Сценарий:</b> ${SCENARIO.title}</p>
                <p><b>Остались в бункере:</b> ${survivors.map(p => p.name).join(', ') || 'никто'}</p>
                <p><b>Изгнаны:</b> ${eliminated.map(p => p.name).join(', ') || 'никого не изгнали'}</p>
                <p><b>Специалисты:</b> ${coveredNames}</p>
                <p><b>Открытые помещения:</b> ${openedRoomNames}</p>
                <p><b>Ресурсы:</b> ${resourceLine}</p>
                <p><b>Стабильность:</b> ${signed(stability)}</p>
            </div>`;
    }

    let listHtml = '';
    players.forEach(p => {
        const isSurvivor = p.alive;
        const actionText = p.actionCard
            ? `${p.actionCard.name}${p.actionCardUsed ? ' (использована)' : ' (не использована)'}`
            : 'нет';
        const conditionText = p.conditionCard
            ? `${p.conditionCard.name}${p.conditionCardTriggered ? ' (сработало)' : ' (не сработало)'}`
            : 'нет';
        const bonusText = p.bonusLuggage && p.bonusLuggage.length
            ? p.bonusLuggage.join(', ')
            : 'нет';

        let playerHtml = `<div class="final-player ${isSurvivor ? 'survivor' : 'eliminated'}">`;
        playerHtml += `<b class="player-tag">${p.name}</b>${isSurvivor ? ' 🟢 выжил' : ' 🔴 выбыл'}:<br>`;

        const lines = FIELDS.map(f => {
            const isRevealed = !!p.revealed[f.key];
            const value = displayValue(f, p);
            if (isRevealed) return `• ${f.label}: <b>${value}</b>`;
            return `<span class="hidden-trait">• ${f.label}: ${value}</span>`;
        });
        playerHtml += lines.join('<br>');
        playerHtml += `<br><span class="final-extra">🃏 Карта: ${actionText} · 🎴 Условие: ${conditionText} · 🎒 Бонус: ${bonusText}</span>`;
        playerHtml += `</div>`;

        listHtml += playerHtml;
    });
    $('finalPlayersList').innerHTML = listHtml;

    $('voteCardPanel').style.display = 'none';
    $('revealPanel').style.display = 'none';
    $('passScreen').style.display = 'none';
    $('voteResultPanel').style.display = 'none';
    $('deciderPanel').style.display = 'none';
    $('actionModalOverlay').classList.remove('open');

    $('endGamePanel').className = `end-game-panel ${result.type}`;
    $('endGamePanel').style.display = 'block';
    renderStoryPanel();
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
        const bonus = p.bonusLuggage && p.bonusLuggage.length
            ? `<br>🎒 Бонусный багаж: <b>${p.bonusLuggage.join(', ')}</b>`
            : '';
        html += `<div class="revealed-item">
                    <b class="player-tag">${p.name}</b>${status}:<br>
                    ${lines.join('<br>')}${bonus}
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
    populateScenarioSelect();
    renderNameInputs();
    updateAutoVoteRounds(true);
    renderVoteQuotaRows(true);

    $('scenarioSelect').addEventListener('change', updateScenarioHint);
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

    $('fabRestart').addEventListener('click', restartGame);

    $('confirmRestartBtn').addEventListener('click', confirmRestart);
    $('cancelRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('closeRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('restartModalOverlay').addEventListener('click', e => {
        if (e.target === $('restartModalOverlay')) closeModal('restartModalOverlay');
    });

    // карты действий
    $('applyActionBtn').addEventListener('click', applyActionCard);
    $('cancelActionBtn').addEventListener('click', closeActionCardModal);
    $('closeActionBtn').addEventListener('click', closeActionCardModal);
    $('actionModalOverlay').addEventListener('click', e => {
        if (e.target === $('actionModalOverlay')) closeActionCardModal();
    });

    // закрытие модалок по клику на фон
    $('modalOverlay').addEventListener('click', e => {
        if (e.target === $('modalOverlay')) closeModal('modalOverlay');
    });
    $('logModalOverlay').addEventListener('click', e => {
        if (e.target === $('logModalOverlay')) closeModal('logModalOverlay');
    });
});
