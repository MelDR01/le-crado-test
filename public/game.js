const socket = io();
let playerId = null;
let isHost = false;
let currentAnswer = -1;
let timerInterval = null;

// ==================
// CONNEXION / LOBBY
// ==================
document.getElementById('joinBtn').onclick = () => {
  const name = document.getElementById('nameInput').value.trim();
  if (name) socket.emit('join', name);
};

socket.on('joined', (data) => {
  playerId = data.id;
  document.getElementById('lobby').style.display = 'flex';
  document.getElementById('game').style.display = 'none';
  document.getElementById('endScreen').style.display = 'none';
  renderLobbyPlayers(data.players);
});

socket.on('isHost', (host) => {
  isHost = host;
  document.getElementById('startBtn').style.display = host ? 'block' : 'none';
});

socket.on('playersUpdate', (players) => {
  renderLobbyPlayers(players);
});

document.getElementById('startBtn').onclick = () => socket.emit('startGame');

function renderLobbyPlayers(players) {
  const list = document.getElementById('playersList');
  if (!list) return;
  list.innerHTML = '';
  Object.values(players).forEach(p => {
    const div = document.createElement('div');
    div.className = 'player';
    div.innerHTML = `<img src="${p.avatar}" onerror="this.style.display='none'"><span>${p.name}</span>`;
    list.appendChild(div);
  });
}

// ==================
// DÉMARRAGE JEU
// ==================
socket.on('startGame', (data) => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
  document.getElementById('endScreen').style.display = 'none';
  currentAnswer = -1;
  updateCounter(data.index, data.total);
  showQuestion(data.question);
  startTimer();
});

// ==================
// QUESTIONS
// ==================
socket.on('nextQuestion', (data) => {
  currentAnswer = -1;
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('validateBtn').style.display = 'block';
  document.getElementById('validateBtn').disabled = true;
  document.getElementById('validateBtn').textContent = 'Valider';
  updateCounter(data.index, data.total);
  showQuestion(data.question);
  startTimer();
});

function updateCounter(index, total) {
  document.getElementById('questionCounter').textContent = `Question ${index + 1} / ${total}`;
  document.getElementById('answeredCounter').textContent = `0 / ? ont répondu`;
}

function showQuestion(question) {
  document.getElementById('question').textContent = question.q;
  document.getElementById('category').textContent = question.category || '';
  const container = document.getElementById('answers');
  container.innerHTML = '';

  document.getElementById('validateBtn').disabled = true;
  document.getElementById('validateBtn').style.display = 'block';
  document.getElementById('validateBtn').textContent = 'Valider';
  document.getElementById('nextBtn').style.display = 'none';

  question.answers.forEach((answer, i) => {
    const div = document.createElement('div');
    div.className = 'answer';
    div.id = `answer-${i}`;
    div.innerHTML = `<div class="answer-text">${answer}</div><div class="answer-avatars" id="avatars-${i}"></div>`;
    div.onclick = () => selectAnswer(i);
    container.appendChild(div);
  });
}

function selectAnswer(index) {
  currentAnswer = index;
  socket.emit('selectAnswer', index);
  document.querySelectorAll('.answer').forEach((ans, i) => {
    ans.classList.toggle('selected', i === index);
  });
  document.getElementById('validateBtn').disabled = false;
}

document.getElementById('validateBtn').onclick = () => {
  if (currentAnswer < 0) return;
  socket.emit('validateAnswer');
  document.getElementById('validateBtn').disabled = true;
  document.getElementById('validateBtn').textContent = '✅ Validé !';
};

socket.on('answeredCount', (data) => {
  document.getElementById('answeredCounter').textContent = `${data.answered} / ${data.total} ont répondu`;
});

// ==================
// TIMER
// ==================
function startTimer() {
  stopTimer();
  let time = 30;
  const timerEl = document.getElementById('timer');
  timerEl.textContent = time;
  timerEl.style.color = '#ff6b6b';
  timerEl.classList.remove('urgent');

  timerInterval = setInterval(() => {
    time--;
    timerEl.textContent = time;
    if (time <= 10) {
      timerEl.style.color = '#ff0000';
      timerEl.classList.add('urgent');
    }
    if (time <= 0) {
      stopTimer();
      socket.emit('validateAnswer');
      document.getElementById('validateBtn').disabled = true;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ==================
// REVEAL après chaque question (avatars sous réponses)
// ==================
socket.on('reveal', (data) => {
  stopTimer();
  document.getElementById('validateBtn').style.display = 'none';
  document.getElementById('timer').textContent = '⏹';
  document.getElementById('timer').classList.remove('urgent');

  data.question.answers.forEach((answer, i) => {
    const avatarContainer = document.getElementById(`avatars-${i}`);
    if (!avatarContainer) return;
    avatarContainer.innerHTML = '';

    Object.entries(data.players).forEach(([id, player]) => {
      if (player.answer === i) {
        const wrapper = document.createElement('div');
        const img = document.createElement('img');
        img.src = player.avatar;
        img.title = player.name;
        img.className = 'avatar-small';
        img.onerror = function() {
          this.outerHTML = `<span class="avatar-fallback">${player.name[0]}</span>`;
        };
        const span = document.createElement('span');
        span.className = 'avatar-name';
        span.textContent = player.name;
        wrapper.appendChild(img);
        wrapper.appendChild(span);
        avatarContainer.appendChild(wrapper);
      }
    });

    const answerDiv = document.getElementById(`answer-${i}`);
    if (answerDiv) {
      const score = data.question.scores[i];
      if (score === 0)       answerDiv.style.borderColor = '#4ecdc4';
      else if (score <= 15)  answerDiv.style.borderColor = '#f9ca24';
      else if (score <= 30)  answerDiv.style.borderColor = '#f0932b';
      else                   answerDiv.style.borderColor = '#eb4d4b';
      answerDiv.style.borderWidth = '3px';
      answerDiv.style.borderStyle = 'solid';
    }
  });

  if (isHost) document.getElementById('nextBtn').style.display = 'block';
});

document.getElementById('nextBtn').onclick = () => {
  socket.emit('nextQuestion');
  document.getElementById('validateBtn').textContent = 'Valider';
};

// ==================
// REVEAL MI-PARCOURS (Q20)
// ==================
socket.on('midReveal', (players) => {
  showRevealScreen(players, false);
});

// ==================
// FIN DE PARTIE (Q39)
// ==================
socket.on('gameEnd', (players) => {
  showRevealScreen(players, true);
});

// ==================
// ANIMATION REVEAL
// ==================
function showRevealScreen(players, isFinal) {
  stopTimer();
  document.getElementById('game').style.display = 'none';

  const screen = document.getElementById('revealScreen');
  const list   = document.getElementById('revealList');
  const subtitle = document.getElementById('revealSubtitle');
  const title    = document.getElementById('revealTitle');
  const continueBtn = document.getElementById('revealContinueBtn');

  subtitle.textContent = isFinal ? 'Classement final' : 'Mi-parcours — Q20 / 39';
  title.textContent    = isFinal ? '🏆 Résultats finaux' : '🚽 Point à mi-chemin';
  continueBtn.style.display = 'none';
  list.innerHTML = '';
  screen.style.display = 'flex';

  // Tri par score décroissant
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const total  = sorted.length;

  // Ordre alphabétique pour l'apparition
  const alphabetical = [...sorted].sort((a, b) => a.name.localeCompare(b.name));

  // Créer toutes les lignes dans l'ordre FINAL (score), cachées au départ
  sorted.forEach((player, i) => {
    const row = document.createElement('div');
    row.className = 'reveal-row';
    row.id = `reveal-row-${player.id || player.name}`;

    const position = i + 1;
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
    const isPodium = position <= (isFinal ? 3 : 3) && total >= 3;

    if (isPodium) row.classList.add('hidden-podium');

    let extraHTML = '';
    if (isFinal) {
      extraHTML = `
        <div>
          <div class="reveal-rank">${player.rank || ''}</div>
          <div class="reveal-punchline">${player.punchline || ''}</div>
        </div>`;
    }

    row.innerHTML = `
      <div class="reveal-position">${medal}</div>
      <div class="reveal-name">${player.name}</div>
      <div class="reveal-score">${player.score} pts</div>
      ${extraHTML}
    `;
    list.appendChild(row);
  });

  // Animation : apparition dans l'ordre alphabétique avec compteur animé
  let delay = 0;
  alphabetical.forEach((player) => {
    const row = document.getElementById(`reveal-row-${player.id || player.name}`);
    if (!row) return;

    setTimeout(() => {
      row.classList.add('visible');
      // Animer le score qui monte
      animateScore(row.querySelector('.reveal-score'), player.score);
    }, delay);

    delay += 600;
  });

  // Après que tout le monde est apparu → révéler le podium progressivement
  const totalDelay = delay + 800;

  if (total >= 3) {
    // Révèle le 3ème seul
    const third = sorted[2];
    setTimeout(() => {
      const row = document.getElementById(`reveal-row-${third.id || third.name}`);
      if (row) row.classList.replace('hidden-podium', 'revealed-podium');
    }, totalDelay);

    // Révèle les 2 premiers ensemble
    setTimeout(() => {
      [sorted[0], sorted[1]].forEach(p => {
        const row = document.getElementById(`reveal-row-${p.id || p.name}`);
        if (row) row.classList.replace('hidden-podium', 'revealed-podium');
      });

      // Bouton continuer après podium révélé (host seulement pour mi-parcours)
      if (!isFinal || isHost) {
        setTimeout(() => {
          if (!isFinal) {
            continueBtn.style.display = isHost ? 'block' : 'none';
          } else {
            continueBtn.style.display = 'none'; // fin = pas de continuer
          }
        }, 800);
      }
    }, totalDelay + 2000);

  } else {
    // Moins de 3 joueurs → pas de podium caché
    setTimeout(() => {
      if (!isFinal) continueBtn.style.display = isHost ? 'block' : 'none';
    }, totalDelay);
  }
}

function animateScore(el, targetScore) {
  if (!el) return;
  let current = 0;
  const duration = 1200;
  const steps = 40;
  const increment = targetScore / steps;
  const interval = duration / steps;

  const counter = setInterval(() => {
    current = Math.min(current + increment, targetScore);
    el.textContent = `${Math.round(current)} pts`;
    if (current >= targetScore) clearInterval(counter);
  }, interval);
}

// Bouton continuer après mi-parcours (host uniquement)
document.getElementById('revealContinueBtn').onclick = () => {
  socket.emit('continueAfterMidReveal');
  document.getElementById('revealScreen').style.display = 'none';
  document.getElementById('game').style.display = 'flex';
};
