'use strict';

// ==================== БУНКЕР: КОМНАТЫ И СТАРТОВЫЕ ПАРАМЕТРЫ ====================
function isRoomDiscovered(room) {
    return !room.discoverRound || discoveredRoomIds.includes(room.id);
}

function canPlayerOpenRoom(room, player) {
    if (!room.unlock) return false;
    const professions = room.unlock.professions || [];
    const skills = room.unlock.skills || [];
    return professions.includes(player.profession) || skills.includes(player.skill);
}

function findRoomOpener(room, aliveOnly = true) {
    return players.find(p => (!aliveOnly || p.alive) && canPlayerOpenRoom(room, p)) || null;
}

function isRoomOpenAtEnd(room) {
    if (!isRoomDiscovered(room)) return false;
    if (!room.locked && !room.broken) return true;
    return players.some(p => p.alive && canPlayerOpenRoom(room, p));
}

function roomGameStatus(room) {
    if (!isRoomDiscovered(room)) return 'hidden';
    if (!room.locked && !room.broken) return 'open';
    return room.broken ? 'broken' : 'locked';
}

function checkRoomEvents() {
    if (!SCENARIO) return;
    let changed = false;

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

    if (changed) {
        renderBunkerBar();
        renderStoryModal();
    }
}

function baseResourceChips() {
    const parts = Object.keys(RESOURCE_META).map(key => {
        const meta = RESOURCE_META[key];
        const value = baseResources[key] || 0;
        return `<span class="resource-chip ${value <= 1 ? 'low' : ''}">${meta.icon} ${meta.label}: <b>${value}</b></span>`;
    });
    parts.push(`<span class="resource-chip">🧠 Стабильность: <b>${signed(baseStability)}</b></span>`);
    return `<div class="resources-bar">${parts.join('')}</div>`;
}

function renderBunkerBar() {
    if (!SCENARIO) return;
    $('bunkerBar').style.display = 'block';
    $('bunkerBarTitle').textContent = SCENARIO.title;
    $('bunkerResources').innerHTML = baseResourceChips();
}

function roomCardHtml(room, finalMode = false) {
    const status = finalMode
        ? (isRoomOpenAtEnd(room) ? 'open' : 'closed')
        : roomGameStatus(room);
    const labels = { open: 'открыта', locked: 'заперта', broken: 'неисправна', closed: 'закрыта' };

    let html = `<div class="room-card ${status}">`;
    html += `<div class="room-head"><b>${room.name}</b><span class="room-status">${labels[status] || ''}</span></div>`;
    html += `<div class="room-desc">${room.desc}</div>`;

    const loot = (room.inventory || [])
        .map(item => `• ${item.name} — ${item.desc}`)
        .join('<br>');
    html += `<div class="room-loot"><b>Содержимое:</b><br>${loot || 'ничего полезного'}</div>`;

    if (room.locked || room.broken) {
        html += `<div class="room-lock">🔒 ${room.unlock ? room.unlock.text : 'нужен особый доступ'}</div>`;
        const potentialAlive = findRoomOpener(room, true);
        const potentialEver = findRoomOpener(room, false);
        if (!potentialEver) {
            html += `<div class="room-warning">⚠️ В игре нет специалиста, способного открыть эту комнату.</div>`;
        } else if (!potentialAlive) {
            html += `<div class="room-warning">⚠️ Специалист был, но его изгнали — комната не откроется.</div>`;
        } else if (finalMode) {
            html += isRoomOpenAtEnd(room)
                ? `<div class="room-note ok">Открыта: специалист прошёл в бункер.</div>`
                : `<div class="room-note bad">Закрыта: специалист не прошёл в бункер.</div>`;
        } else {
            html += `<div class="room-note">Специалист в игре есть. Комната откроется в финале, если он пройдёт в бункер.</div>`;
        }
    } else {
        html += `<div class="room-note ok">Доступна. Содержимое учитывается в финале.</div>`;
    }

    html += `</div>`;
    return html;
}

function renderStoryModal() {
    if (!SCENARIO) return;
    const finalMode = phase === 'end';

    $('storyTitle').textContent = SCENARIO.title;
    $('storyDesc').innerHTML =
        `<b>Апокалипсис:</b> ${SCENARIO.apocalypse}<br><br>` +
        `<b>Бункер:</b> ${SCENARIO.bunkerDesc}` +
        `<br><span class="story-meta">${SCENARIO.bunkerSize}</span>` +
        `<br><br><b>Стартовые параметры:</b>${baseResourceChips()}` +
        `<p class="hint" style="margin-top:8px;">Эти параметры не меняются до конца. Итоговые значения зависят от характеристик игроков, которые пройдут в бункер, и от открытых комнат.</p>`;

    const knownRooms = SCENARIO.rooms.filter(isRoomDiscovered);
    const hiddenCount = SCENARIO.rooms.length - knownRooms.length;
    let html = `<div class="rooms-grid">${knownRooms.map(room => roomCardHtml(room, finalMode)).join('')}</div>`;
    if (hiddenCount > 0) {
        html += `<p class="room-hint">🚪 За закрытыми дверями осталось неизвестных помещений: <b>${hiddenCount}</b>. Возможно, вы найдёте их позже.</p>`;
    } else {
        html += `<p class="room-hint">Все помещения бункера известны.</p>`;
    }
    $('storyRooms').innerHTML = html;
}

function openStoryModal(initial = false) {
    if (!SCENARIO) return;
    renderStoryModal();
    $('storyContinueBtn').textContent = awaitingGameStart ? 'Войти в бункер' : 'Закрыть';
    $('storyModalOverlay').classList.add('open');
}

function closeStoryModal() {
    $('storyModalOverlay').classList.remove('open');
    if (awaitingGameStart) {
        awaitingGameStart = false;
        nextPlayerTurn();
    }
}

function prepareScenario() {
    baseResources = Object.assign({}, SCENARIO.startResources || {});
    baseStability = 0;
    finalResources = {};
    finalStability = 0;
    finalState = null;
    discoveredRoomIds = [];
    openedRoomIds = [];
    endingType = 'neutral';
    phase = 'reveal';

    players.forEach(p => {
        p.bonusLuggage = [];
        p.actionCardUsed = false;
        p.conditionCardTriggered = false;
        p._acted = false;
    });

    checkRoomEvents();
    renderBunkerBar();
    renderStoryModal();
}

// ==================== ЭФФЕКТЫ ХАРАКТЕРИСТИК ====================
function emptyEffects() {
    return {};
}

function addEffect(target, key, value) {
    if (!value) return;
    target[key] = (target[key] || 0) + value;
}

function mergeEffects(target, source) {
    Object.keys(source || {}).forEach(key => addEffect(target, key, source[key]));
}

function effectsNotEmpty(effects) {
    return !!effects && Object.values(effects).some(value => value !== 0);
}

function effectSum(effects) {
    return Object.values(effects || {}).reduce((sum, value) => sum + value, 0);
}

function getHealthEffects(value) {
    if (HEALTH_GOOD.includes(value)) return { medicine: 1, stability: 1 };
    if (HEALTH_NEUTRAL.includes(value)) return {};
    if (HEALTH_SEVERE.includes(value)) return { medicine: -2, stability: -2 };
    if (HEALTH_MODERATE.includes(value)) return { medicine: -1, stability: -1 };
    if (HEALTH_MILD.includes(value)) return { medicine: -1 };
    return {};
}

function getPhobiaEffects(value) {
    if (value === 'Нет фобий') return { stability: 1 };
    if (PHOBIA_SEVERE.includes(value)) return { stability: -1 };
    return {};
}

function getCharacterEffects(value) {
    const effects = emptyEffects();
    if (CHARACTER_POSITIVE.includes(value)) addEffect(effects, 'stability', 1);
    if (CHARACTER_NEGATIVE.includes(value)) addEffect(effects, 'stability', -1);
    mergeEffects(effects, CHARACTER_EXTRA_EFFECTS[value] || {});
    return effects;
}

function getAgeEffects(age) {
    const years = Number(age);
    if (!Number.isFinite(years)) return {};
    if (years <= 15) return { food: -1, medicine: -1 };
    if (years <= 17) return { power: -1 };
    if (years <= 55) return { power: 1 };
    if (years <= 65) return { medicine: -1 };
    return { medicine: -1, power: -1, stability: -1 };
}

function getTraitEffectEntries(player) {
    const entries = [];
    const push = (fieldKey, fieldLabel, label, effects) => {
        if (!effectsNotEmpty(effects)) return;
        entries.push({ field: fieldKey, fieldLabel, label: String(label), effects });
    };

    push('profession', 'Профессия', player.profession, PROFESSION_EFFECTS[player.profession] || {});
    push('health', 'Здоровье', player.health, getHealthEffects(player.health));
    push('age', 'Возраст', `${player.age} лет`, getAgeEffects(player.age));
    push('hobby', 'Хобби', player.hobby, HOBBY_EFFECTS[player.hobby] || {});
    push('phobia', 'Фобия', player.phobia, getPhobiaEffects(player.phobia));
    push('skill', 'Навык', player.skill, SKILL_EFFECTS[player.skill] || {});
    push('character', 'Характер', player.character, getCharacterEffects(player.character));
    push('luggage1', 'Багаж 1', player.luggage1, LUGGAGE_EFFECTS[player.luggage1] || {});
    push('luggage2', 'Багаж 2', player.luggage2, LUGGAGE_EFFECTS[player.luggage2] || {});
    push('fact1', 'Факт 1', player.fact1, FACT_EFFECTS[player.fact1] || {});
    push('fact2', 'Факт 2', player.fact2, FACT_EFFECTS[player.fact2] || {});

    return entries;
}

function inventoryItemEffects(item) {
    const effects = emptyEffects();
    (item.effects || []).forEach(effect => {
        if (effect.resource) addEffect(effects, effect.resource, effect.delta);
        if (effect.stability) addEffect(effects, 'stability', effect.stability);
    });
    return effects;
}

function effectsText(effects) {
    const parts = [];
    Object.keys(RESOURCE_META).forEach(key => {
        const value = effects[key] || 0;
        if (value) parts.push(`${signed(value)} ${RESOURCE_META[key].icon}`);
    });
    if (effects.stability) parts.push(`${signed(effects.stability)} 🧠`);
    return parts.join(', ') || '—';
}

function effectClass(effects) {
    const sum = effectSum(effects);
    return sum > 0 ? 'positive' : sum < 0 ? 'negative' : 'neutral';
}

// ==================== ФИНАЛЬНЫЙ РАСЧЁТ ====================
function computeFinalState() {
    const state = {
        base: Object.assign({}, baseResources),
        baseStability,
        resources: Object.assign({}, baseResources),
        stability: baseStability,
        traitEntries: [],
        roomEntries: [],
        conditionEntries: [],
        luggageEntries: [],
        openedRoomIds: [],
        openedRoomNames: [],
        closedRoomNames: [],
        unknownRoomCount: 0
    };

    const survivors = players.filter(p => p.alive);

    // 1. Характеристики прошедших игроков
    survivors.forEach(player => {
        getTraitEffectEntries(player).forEach(entry => {
            mergeEffects(state.resources, entry.effects);
            state.stability += entry.effects.stability || 0;
            state.traitEntries.push({ source: player.name, sourceType: 'player', ...entry });
        });
    });

    // 2. Комнаты: открыты, если к финалу в бункере остался способный открыть игрок
    SCENARIO.rooms.forEach(room => {
        if (!isRoomDiscovered(room)) {
            state.unknownRoomCount += 1;
            return;
        }
        if (isRoomOpenAtEnd(room)) {
            state.openedRoomIds.push(room.id);
            state.openedRoomNames.push(room.name);
            (room.inventory || []).forEach(item => {
                const effects = inventoryItemEffects(item);
                if (!effectsNotEmpty(effects)) return;
                mergeEffects(state.resources, effects);
                state.stability += effects.stability || 0;
                state.roomEntries.push({
                    source: room.name,
                    sourceType: 'room',
                    field: 'room',
                    fieldLabel: 'Комната',
                    label: item.name,
                    effects
                });
            });
        } else {
            state.closedRoomNames.push(room.name);
        }
    });

    // 3. Карты условий: entry — только для прошедших, elimination — только для изгнанных
    players.forEach(player => {
        const card = player.conditionCard;
        if (!card) return;
        const applies = (card.trigger === 'entry' && player.alive) ||
                        (card.trigger === 'elimination' && !player.alive);
        player.conditionCardTriggered = applies;
        if (!applies) return;

        const effects = emptyEffects();
        if (card.effect.resources) mergeEffects(effects, card.effect.resources);
        if (card.effect.stability) addEffect(effects, 'stability', card.effect.stability);

        if (effectsNotEmpty(effects)) {
            mergeEffects(state.resources, effects);
            state.stability += effects.stability || 0;
        }

        if (card.effect.luggage) {
            player.bonusLuggage = player.bonusLuggage || [];
            player.bonusLuggage.push(card.effect.luggage);
        }

        state.conditionEntries.push({
            source: player.name,
            sourceType: 'condition',
            field: 'condition',
            fieldLabel: card.trigger === 'entry' ? 'Условие входа' : 'Условие изгнания',
            label: card.name,
            effects,
            luggage: card.effect.luggage || null
        });
    });

    // 4. Бонусный багаж прошедших (украденный или выданный условиями)
    survivors.forEach(player => {
        (player.bonusLuggage || []).forEach(item => {
            const effects = LUGGAGE_EFFECTS[item] || {};
            if (!effectsNotEmpty(effects)) return;
            mergeEffects(state.resources, effects);
            state.stability += effects.stability || 0;
            state.luggageEntries.push({
                source: player.name,
                sourceType: 'luggage',
                field: 'bonus',
                fieldLabel: 'Бонусный багаж',
                label: item,
                effects
            });
        });
    });

    Object.keys(RESOURCE_META).forEach(key => {
        state.resources[key] = Math.max(0, Math.round(state.resources[key] || 0));
    });
    state.stability = Math.max(-5, Math.min(5, Math.round(state.stability || 0)));

    return state;
}

function evaluateEnding(state) {
    const resources = state.resources;

    let type = 'neutral';
    if (state.resources.food <= 0 ||
        state.resources.water <= 0 ||
        state.stability <= -3 ||
        (state.resources.power <= 0 && state.resources.medicine <= 0)) {
        type = 'bad';
    } else if (resources.food >= 3 &&
        resources.water >= 3 &&
        resources.power >= 2 &&
        resources.medicine >= 2 &&
        resources.defense >= 2 &&
        state.stability >= 0) {
        type = 'good';
    }

    const info = (SCENARIO.endings && SCENARIO.endings[type]) || { title: 'Финал', text: '' };
    return { type, title: info.title, text: info.text };
}

function resourceTableHtml(state) {
    const rows = Object.keys(RESOURCE_META).map(key => {
        const meta = RESOURCE_META[key];
        const before = state.base[key] || 0;
        const after = state.resources[key] || 0;
        const delta = after - before;
        return `<tr>
            <td>${meta.icon} ${meta.label}</td>
            <td>${before}</td>
            <td><b>${after}</b></td>
            <td class="${delta > 0 ? 'plus' : delta < 0 ? 'minus' : ''}">${signed(delta)}</td>
        </tr>`;
    }).join('');

    const stabilityDelta = state.stability - state.baseStability;
    const stabilityRow = `<tr>
        <td>🧠 Стабильность</td>
        <td>${signed(state.baseStability)}</td>
        <td><b>${signed(state.stability)}</b></td>
        <td class="${stabilityDelta > 0 ? 'plus' : stabilityDelta < 0 ? 'minus' : ''}">${signed(stabilityDelta)}</td>
    </tr>`;

    return `<table class="param-table">
        <thead><tr><th>Параметр</th><th>Старт</th><th>Финал</th><th>Δ</th></tr></thead>
        <tbody>${rows}${stabilityRow}</tbody>
    </table>`;
}

function renderEffectList(entries, sign) {
    const filtered = entries.filter(entry => {
        const score = effectSum(entry.effects);
        return sign > 0 ? score > 0 : sign < 0 ? score < 0 : score === 0;
    });
    if (filtered.length === 0) return '<i>Нет.</i>';

    return filtered.map(entry => {
        const title = `${entry.source}${entry.fieldLabel ? ` · ${entry.fieldLabel}` : ''}: ${entry.label}`;
        const luggage = entry.luggage ? ` (+ багаж «${entry.luggage}»)` : '';
        return `<div class="effect-entry ${effectClass(entry.effects)}">
            <span class="effect-title">${escapeHtml(title)}</span>
            <span class="effect-values">${effectsText(entry.effects)}${escapeHtml(luggage)}</span>
        </div>`;
    }).join('');
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
        const hint = p.conditionCard.trigger === 'entry'
            ? 'Сработает в финале, если вы пройдёте в бункер.'
            : 'Сработает в финале, если вас изгонят.';
        html += `<div class="secret-card condition-card">` +
            `<div class="secret-card-title">🎴 Секретное условие</div>` +
            `<div class="secret-card-name">${p.conditionCard.name}</div>` +
            `<div class="secret-card-desc">${p.conditionCard.desc}</div>` +
            `<div class="secret-card-state">⏳ ${hint}</div>` +
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

    checkRoomEvents();
    renderBunkerBar();
    renderStoryModal();

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

    const card = owner.actionCard;
    const field = FIELDS.find(f => f.key === card.field);

    if (card.kind === 'reveal') {
        if (!field || target.revealed[field.key]) {
            box.innerHTML = `<i>У игрока ${escapeHtml(target.name)} характеристика «${field ? field.label : '?'}» уже открыта.</i>`;
            applyBtn.disabled = true;
        } else if (target[field.key] === CUSTOM_MARKER) {
            box.innerHTML = `<i>Эту характеристику нельзя раскрыть картой: игрок ещё не придумал значение.</i>`;
            applyBtn.disabled = true;
        } else {
            box.innerHTML = `<div class="action-hint">Будет раскрыто: <b>${field.label}</b> у игрока <b>${escapeHtml(target.name)}</b>.</div>`;
            applyBtn.disabled = false;
        }
        return;
    }

    if (card.kind === 'swap') {
        if (!field || !owner.revealed[field.key]) {
            box.innerHTML = `<i>У вас характеристика «${field ? field.label : '?'}» ещё не открыта.</i>`;
            applyBtn.disabled = true;
        } else if (!target.revealed[field.key]) {
            box.innerHTML = `<i>У игрока ${escapeHtml(target.name)} характеристика «${field.label}» ещё не открыта.</i>`;
            applyBtn.disabled = true;
        } else if (owner[field.key] === target[field.key]) {
            box.innerHTML = `<i>У вас одинаковые значения — обмен ничего не изменит.</i>`;
            applyBtn.disabled = true;
        } else {
            box.innerHTML = `<div class="action-hint">Обмен «<b>${field.label}</b>»:<br>
                у вас — <b>${displayValue(field, owner)}</b>, у цели — <b>${displayValue(field, target)}</b>.</div>`;
            applyBtn.disabled = false;
        }
        return;
    }

    if (card.kind === 'steal') {
        const options = ['luggage1', 'luggage2']
            .filter(key => target[key] && target[key] !== CUSTOM_MARKER && target[key] !== '—')
            .map(key => {
                const luggageField = FIELDS.find(f => f.key === key);
                return { value: key, label: `${luggageField.label}: ${target[key]}` };
            });

        if (options.length === 0) {
            box.innerHTML = `<i>У игрока ${escapeHtml(target.name)} нет подходящего багажа.</i>`;
            applyBtn.disabled = true;
            return;
        }

        box.innerHTML = `
            <label class="action-label">Что забрать:
                <select id="actionField">
                    ${options.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('')}
                </select>
            </label>`;
        applyBtn.disabled = false;
        return;
    }

    box.innerHTML = '<i>Неизвестная карта.</i>';
    applyBtn.disabled = true;
}

function applyActionCard() {
    const owner = players[actionCardOwnerIndex];
    if (!owner || owner.actionCardUsed || !owner.actionCard) return;

    const targetSelect = $('actionTarget');
    if (!targetSelect) return;

    const target = players.find(p => p.alive && p.name === targetSelect.value);
    const card = owner.actionCard;
    const field = FIELDS.find(f => f.key === card.field);

    if (!target) {
        alert('Выберите живого игрока.');
        return;
    }

    if (card.kind === 'reveal') {
        if (!field || target.revealed[field.key] || target[field.key] === CUSTOM_MARKER) {
            alert('Эту характеристику нельзя раскрыть.');
            return;
        }
        target.revealed[field.key] = true;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и раскрывает у <span class="player-tag">${target.name}</span> <b>${field.label}: ${displayValue(field, target)}</b>.`);
    } else if (card.kind === 'swap') {
        if (!field || !owner.revealed[field.key] || !target.revealed[field.key]) {
            alert('Обменять можно только уже открытую у обоих характеристику.');
            return;
        }
        if (owner[field.key] === target[field.key]) {
            alert('У вас одинаковые значения — обмен ничего не изменит.');
            return;
        }
        const ownerValue = owner[field.key];
        const targetValue = target[field.key];
        owner[field.key] = targetValue;
        target[field.key] = ownerValue;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и меняется с <span class="player-tag">${target.name}</span> характеристикой <b>${field.label}</b>. Теперь у ${owner.name}: <b>${displayValue(field, owner)}</b>, у ${target.name}: <b>${displayValue(field, target)}</b>.`);
    } else if (card.kind === 'steal') {
        const fieldSelect = $('actionField');
        const slot = fieldSelect ? fieldSelect.value : '';
        if (slot !== 'luggage1' && slot !== 'luggage2') {
            alert('Выберите багаж.');
            return;
        }
        const item = target[slot];
        if (!item || item === CUSTOM_MARKER || item === '—') {
            alert('У этого игрока нет подходящего багажа.');
            return;
        }
        owner.bonusLuggage = owner.bonusLuggage || [];
        owner.bonusLuggage.push(item);
        target[slot] = '—';
        target.revealed[slot] = true;
        log(`🃏 <b>${owner.name}</b> использует «${card.name}» и забирает у <span class="player-tag">${target.name}</span> багаж: <b>${item}</b>.`);
    } else {
        alert('Неизвестная карта действия.');
        return;
    }

    owner.actionCardUsed = true;
    closeActionCardModal();
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
    renderStoryModal();
}

function eliminate(name) {
    markEliminated(name);
    voteElimsRemaining = Math.max(0, voteElimsRemaining - 1);
    lastVoteOutcome = `На предыдущем голосовании изгнан(а): ${name}.`;
    afterEliminationStep();
}

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
function endGame() {
    const state = computeFinalState();
    finalState = state;
    finalResources = state.resources;
    finalStability = state.stability;
    openedRoomIds = state.openedRoomIds.slice();
    phase = 'end';

    const result = evaluateEnding(state);
    endingType = result.type;

    const survivors = players.filter(p => p.alive);
    const eliminated = players.filter(p => !p.alive);

    log(`=== Игра окончена. Выжили: ${survivors.map(p => p.name).join(', ') || 'никто'} ===`);
    log(`<b>=== КОНЦОВКА: ${result.title} ===</b>`);
    log(`<i>${result.text}</i>`);
    log(`Базовые параметры: ${Object.keys(RESOURCE_META).map(key => `${RESOURCE_META[key].label} ${state.base[key] || 0}`).join(', ')}.`);
    log(`Итоговые параметры: ${Object.keys(RESOURCE_META).map(key => `${RESOURCE_META[key].label} ${state.resources[key] || 0}`).join(', ')}.`);

    const allEntries = [
        ...state.traitEntries,
        ...state.roomEntries,
        ...state.conditionEntries,
        ...state.luggageEntries
    ];
    const positive = allEntries.filter(entry => effectSum(entry.effects) > 0);
    const negative = allEntries.filter(entry => effectSum(entry.effects) < 0);
    const neutralCount = allEntries.length - positive.length - negative.length;

    const triggeredConditions = state.conditionEntries
        .map(entry => `${entry.source} — «${entry.label}»`)
        .join(', ') || 'никакие';

    const skippedConditions = players
        .filter(p => p.conditionCard && !p.conditionCardTriggered)
        .map(p => `${p.name} — «${p.conditionCard.name}»`)
        .join(', ') || 'нет';

    const endingBlock = $('endingBlock');
    if (endingBlock) {
        endingBlock.innerHTML = `
            <div class="ending-block ${result.type}">
                <h3>${result.title}</h3>
                <p>${result.text}</p>
                <p><b>Сценарий:</b> ${SCENARIO.title}</p>
                <p><b>Прошли в бункер:</b> ${survivors.map(p => p.name).join(', ') || 'никто'}</p>
                <p><b>Изгнаны:</b> ${eliminated.map(p => p.name).join(', ') || 'никого не изгнали'}</p>

                <h4>Параметры бункера</h4>
                ${resourceTableHtml(state)}

                <h4>Что помогло</h4>
                <div class="effect-list positive-list">${renderEffectList(positive, 1)}</div>

                <h4>Что помешало</h4>
                <div class="effect-list negative-list">${renderEffectList(negative, -1)}</div>

                ${neutralCount > 0 ? `<h4>Нейтральные характеристики</h4><div class="effect-list neutral-list">${renderEffectList(allEntries, 0)}</div>` : ''}

                <p><b>Открытые комнаты:</b> ${state.openedRoomNames.join(', ') || 'ничего не открыто'}</p>
                <p><b>Закрытые комнаты:</b> ${state.closedRoomNames.join(', ') || 'нет'}</p>
                ${state.unknownRoomCount > 0 ? `<p><b>Неизвестные комнаты:</b> ${state.unknownRoomCount}</p>` : ''}
                <p><b>Сработавшие условия:</b> ${triggeredConditions}</p>
                <p><b>Не сработавшие условия:</b> ${skippedConditions}</p>
            </div>`;
    }

    let listHtml = '';
    players.forEach(p => {
        const isSurvivor = p.alive;
        const actionText = p.actionCard
            ? `${p.actionCard.name}${p.actionCardUsed ? ' (использована)' : ' (не использована)'}`
            : 'нет';

        let conditionText = 'нет';
        if (p.conditionCard) {
            if (p.conditionCardTriggered) {
                conditionText = `${p.conditionCard.name} (сработало)`;
            } else if (p.conditionCard.trigger === 'entry') {
                conditionText = `${p.conditionCard.name} (не сработало: не прошёл)`;
            } else {
                conditionText = `${p.conditionCard.name} (не сработало)`;
            }
        }

        const bonusText = p.bonusLuggage && p.bonusLuggage.length
            ? p.bonusLuggage.join(', ')
            : 'нет';

        let playerHtml = `<div class="final-player ${isSurvivor ? 'survivor' : 'eliminated'}">`;
        playerHtml += `<b class="player-tag">${p.name}</b>${isSurvivor ? ' 🟢 прошёл в бункер' : ' 🔴 изгнан'}:<br>`;

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
    $('storyModalOverlay').classList.remove('open');

    $('endGamePanel').className = `end-game-panel ${result.type}`;
    $('endGamePanel').style.display = 'block';
    renderBunkerBar();
    renderStoryModal();
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
    $('fabStory').addEventListener('click', () => openStoryModal(false));
    $('openBunkerBtn').addEventListener('click', () => openStoryModal(false));
    $('closeRevealedBtn').addEventListener('click', () => closeModal('modalOverlay'));
    $('closeLogBtn').addEventListener('click', () => closeModal('logModalOverlay'));

    $('fabRestart').addEventListener('click', restartGame);

    $('closeStoryBtn').addEventListener('click', closeStoryModal);
    $('storyContinueBtn').addEventListener('click', closeStoryModal);
    $('storyModalOverlay').addEventListener('click', e => {
        if (e.target === $('storyModalOverlay')) closeStoryModal();
    });

    $('confirmRestartBtn').addEventListener('click', confirmRestart);
    $('cancelRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('closeRestartBtn').addEventListener('click', () => closeModal('restartModalOverlay'));
    $('restartModalOverlay').addEventListener('click', e => {
        if (e.target === $('restartModalOverlay')) closeModal('restartModalOverlay');
    });

    $('applyActionBtn').addEventListener('click', applyActionCard);
    $('cancelActionBtn').addEventListener('click', closeActionCardModal);
    $('closeActionBtn').addEventListener('click', closeActionCardModal);
    $('actionModalOverlay').addEventListener('click', e => {
        if (e.target === $('actionModalOverlay')) closeActionCardModal();
    });

    $('modalOverlay').addEventListener('click', e => {
        if (e.target === $('modalOverlay')) closeModal('modalOverlay');
    });
    $('logModalOverlay').addEventListener('click', e => {
        if (e.target === $('logModalOverlay')) closeModal('logModalOverlay');
    });
});
