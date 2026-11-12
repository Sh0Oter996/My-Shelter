'use strict';

// === РАСКРЫТИЕ ===
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
    // Открываем новые комнаты на 3-м раунде
    if (round === 3 && !secretRoomsUnlocked.includes('Генераторная')) {
        secretRoomsUnlocked.push('Генераторная');
        log(`<b>🔓 Новое открытие!</b> Вы нашли способ пробраться в Генераторную. Внутри: ящик с инструментами и запас топлива на неделю.`);
    }
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
    html += \`
    <div class="action-card" style="border: 1px dashed #f0a500; padding: 10px; margin: 10px 0; background: #2a1a3e;">
        <span class="label" style="color:#f0a500; font-weight:bold;">Секретная карта действия</span>
        <span class="value">${p.actionCard ? p.actionCard.name + ': ' + p.actionCard.desc : 'Нет карты'}</span>
        ${p.actionCard && !p.actionCardUsed ? `<button onclick="startActionCard()" style="margin-top: 8px; font-size: 14px;">Активировать</button>` : '<span style="color:#e94560; font-size:12px;">(Использована)</span>'}
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
function startActionCard() {
    const p = players[currentIndex];
    if (!p.actionCard || p.actionCardUsed) return;

    // Для простоты: если карта "Подглядывание" - просим выбрать игрока
    if (p.actionCard.id === 'reveal') {
        const targetName = prompt("Введите имя игрока, чью характеристику хотите подсмотреть:");
        const target = players.find(t => t.name === targetName && t.alive);
        if (target) {
            // Находим скрытую характеристику
            const hiddenFields = FIELDS.filter(f => !target.revealed[f.key] && f.key !== 'profession' && f.key !== 'sex');
            if (hiddenFields.length > 0) {
                const randomField = randomItem(hiddenFields);
                target.revealed[randomField.key] = true; // Открываем её для всех
                log(`<b>🃏 ${p.name}</b> использует карту "Подглядывание" и раскрывает <b>${randomField.label}: ${displayValue(randomField, target)}</b> у игрока ${target.name}!`);
                p.actionCardUsed = true;
                closeModal('modalOverlay'); // На всякий случай
                $('revealPanel').style.display = 'none';
                currentIndex = (currentIndex + 1) % players.length;
                nextPlayerTurn();
            } else {
                alert("У этого игрока нет скрытых характеристик!");
            }
        }
    } else {
        alert("Эта карта пока в разработке или требует особых условий.");
    }
}

// === ГОЛОСОВАНИЕ ===
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

    // Условие: проверяем, был ли у него навык врача
    if (player.skill === 'Первая помощь') {
        log(`<b>⚠️ Условие:</b> Вы изгнали единственного медика. Здоровье выживших ухудшается. (Это повлияет на концовку)`);
        // Здесь можно добавить глобальный флаг, например window.isMedicDead = true;
    }
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

// === МОДАЛКИ И ФИНАЛ ===
function endGame() {
    const survivors = players.filter(p => p.alive).map(p => p.name);
    log(`=== Игра окончена. Выжили: ${survivors.join(', ')} ===`);

    // 1. Логика определения концовки (из предыдущего сообщения)
    let endingType = 'neutral';
    const survivedSkill = players.filter(p => p.alive && p.skill === 'Первая помощь').length;

    if (survivors.length === survivorsTarget && survivedSkill > 0) {
        endingType = 'good';
    } else if (survivors.length === 0) {
        endingType = 'bad';
    }

    const endingText = SCENARIO.endings[endingType];
    log(`<b>=== КОНЦОВКА: ${endingType.toUpperCase()} ===</b>`);
    log(`<i>${endingText}</i>`);

    // 2. Формируем HTML-блок для эпилога
    const storyHtml = `
        <div style="background: #2a1a3e; border: 1px solid #9b59b6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="color:#af7ac5; margin-top:0;">Эпилог: ${endingType === 'good' ? 'Надежда' : endingType === 'neutral' ? 'Суровое выживание' : 'Трагедия'}</h3>
            <p>${endingText}</p>
            <p><b>Открытые комнаты:</b> ${SCENARIO.rooms.filter(r => !r.locked || secretRoomsUnlocked.includes(r.name)).map(r => r.name).join(', ')}</p>
        </div>
    `;

    // 3. Находим контейнер на странице
    const list = $('finalPlayersList');

    // ВСТАВЛЯЕМ ЭПИЛОГ ПЕРВЫМ (используем =)
    list.innerHTML = storyHtml;

    // 4. Проходимся по игрокам и ДОБАВЛЯЕМ их характеристики (используем +=)
    players.forEach(p => {
        const isSurvivor = p.alive;
        let playerHtml = `<div class="final-player ${isSurvivor ? 'survivor' : 'eliminated'}">`;
        playerHtml += `<b class="player-tag">${p.name}</b>${isSurvivor ? ' 🟢 выжил' : ' 🔴 выбыл'}:<br>`;

        const lines = FIELDS.map(f => {
            const isRevealed = !!p.revealed[f.key];
            const value = displayValue(f, p);
            if (isRevealed) return `• ${f.label}: <b>${value}</b>`;
            return `<span class="hidden-trait">• ${f.label}: ${value}</span>`;
        });
        playerHtml += lines.join('<br>');
        playerHtml += '</div>';

        // ДОБАВЛЯЕМ КАЖДОГО ИГРОКА К ТОМУ, ЧТО УЖЕ НАПИСАНО (используем +=)
        list.innerHTML += playerHtml;
    });

    // 5. Скрываем игровые панели и показываем финальный экран
    $('voteCardPanel').style.display = 'none';
    $('revealPanel').style.display = 'none';
    $('passScreen').style.display = 'none';
    $('voteResultPanel').style.display = 'none';
    $('deciderPanel').style.display = 'none';

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