const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});


app.use(express.static('public'));

let room = {
  players: {},
  hostId: null,
  currentQuestion: 0,
  state: 'lobby',
  questions: [
    
    {q:"Tu as déjà retourné un sous-vêtement pour le remettre ?",answers:["Jamais","Une fois en dépannage","Parfois","C'est une habitude"],scores:[0,10,20,25],category:"🚿"},
    {q:"Tu utilises la même éponge de cuisine depuis combien de temps ?",answers:["Moins d'1 mois","2-3 mois","Plus de 6 mois","Je sais plus depuis quand"],scores:[0,10,20,25],category:"🧼"},
    {q:"Tu changes de brosse à dents tous les combien ?",answers:["Tous les 3 mois","Tous les 6 mois","Une fois par an","Je sais plus"],scores:[0,10,20,25],category:"🦷"},
    {q:"Tu as dormi sans draps parce que tu n'avais pas changé le lit ?",answers:["Non","Oui une nuit","Plusieurs nuits de suite","C'est souvent"],scores:[0,10,20,25],category:"😈"},
    {q:"As tu déjà laissé ta vaisselle trainer au point de la faire moisire ?",answers:["Non jamais","Oui une fois","Oui plusieurs fois","Il y en a actuellement"],scores:[0,10,20,30],category:"🧼"},
    {q:"Tu t'es endormi plusieurs nuits de suite sans te brosser les dents ?",answers:["Non jamais","Oui une fois","Oui plusieurs fois","Oui c'est arrivé récemment"],scores:[0,10,20,30],category:"🦷"},
    {q:"Tu as remis un slip sale parce que tu n'avais plus rien de propre ?",answers:["Jamais","Une fois en voyage","Plusieurs fois","C'est arrivé récemment"],scores:[0,10,20,30],category:"💩"},
    {q:"Es tu déjà sorti des toilettes apres un caca sans t'essuyer ?",answers:["Jamais","Une fois en urgence","Quelques fois","Récemment"],scores:[0,15,25,35],category:"💩"},
    {q:"As tu déjà graotuillé vers le trou du cul pour ensuite sentir le fruit de ta récolte en rapprochant tes doigts de ton nez ?",answers:["Non","Une fois par curiosité","Oui parfois","Oui, j'assume aimer ca"],scores:[0,10,25,35],category:"💩"},
    {q:"Tu as déjà porté le même slip plus de 3 jours d'affilée ?",answers:["Jamais","Oui en dépannage","Oui sans raison","Oui plusieurs fois"],scores:[0,15,25,35],category:"😈"},
    {q:"T'as déjà pissé dans une bouteille pour éviter d'aller aux toilettes ?",answers:["Non jamais","Oui en voiture/trajet","Oui chez moi","Oui et c'est pratique"],scores:[0,15,30,40],category:"😈"},
    {q:"Se mettre sur/dans son lit avec les vetements de la journée ?",answers:["Non jamais","Oui parfois","Oui souvent","Oui c'est une habitude"],scores:[0,15,30,40],category:"😈"},
    {q:"Fautre de PQ, as tu déjà utilisé un vêtement ou tout autre objet insolite pour t'essuyer ?",answers:["Non jamais","Oui une fois en vraie urgence","Oui et c'était calculé","Oui plusieurs fois"],scores:[0,15,30,45],category:"😈"}
  ],
  ranks: [
    {max:60,      name:"🧼 Propre",           punchline:"Tu es soit très propre, soit tu as menti"},
    {max:150,     name:"🤨 Hygiène douteuse",  punchline:"Quelques mauvaises habitudes isolées"},
    {max:280,     name:"😬 Tu schmoutes",      punchline:"Moyenne nationale, soyons honnêtes"},
    {max:430,     name:"🤢 Crado",             punchline:"Tes amis le savaient déjà"},
    {max:600,     name:"🪳 Ami des cafards",   punchline:"Tu as des habitudes documentables"},
    {max:Infinity,name:"👑 Lord des Égouts",   punchline:"Tu es un patrimoine vivant"}
  ]
};

io.on('connection', (socket) => {
  console.log('Joueur connecté:', socket.id);

socket.on('join', (name) => {
  if (!room.hostId) room.hostId = socket.id;

  room.players[socket.id] = {
    name,
    score: 0,
    avatar: `avatars/avatar${Math.floor(Math.random() * 10) + 1}.png`,
    validated: true, // true pour ne pas bloquer la question en cours
    answer: -1,
    afkCount: 0
  };

  socket.emit('joined', { id: socket.id, players: room.players });
  io.emit('playersUpdate', room.players);
  socket.emit('isHost', socket.id === room.hostId);

  // Si partie en cours → envoie la question actuelle au nouveau joueur
  if (room.state === 'answering') {
    socket.emit('startGame', {
      question: room.questions[room.currentQuestion],
      index: room.currentQuestion,
      total: room.questions.length
    });
  } else if (room.state === 'revealing') {
    socket.emit('startGame', {
      question: room.questions[room.currentQuestion],
      index: room.currentQuestion,
      total: room.questions.length
    });
  }
});


  socket.on('startGame', () => {
    if (socket.id === room.hostId && room.state === 'lobby') {
      room.state = 'answering';
      room.currentQuestion = 0;
      resetAnswers();
      io.emit('startGame', {
        question: room.questions[0],
        index: 0,
        total: room.questions.length
      });
    }
  });

  socket.on('selectAnswer', (answerIndex) => {
    if (room.state === 'answering' && room.players[socket.id]) {
      room.players[socket.id].answer = answerIndex;
      room.players[socket.id].afkCount = 0;
      const answered = Object.values(room.players).filter(p => p.answer >= 0).length;
      const total = Object.keys(room.players).length;
      io.emit('answeredCount', { answered, total });
      io.emit('playerAnswerUpdate', {
        playerId: socket.id,
        answerIndex,
        validated: room.players[socket.id].validated
      });
    }
  });

  socket.on('validateAnswer', () => {
    if (room.state === 'answering' && room.players[socket.id]) {
      room.players[socket.id].validated = true;
      io.emit('playerAnswerUpdate', {
        playerId: socket.id,
        answerIndex: room.players[socket.id].answer,
        validated: true
      });
      const allValidated = Object.values(room.players).every(p => p.validated);
      if (allValidated) revealAnswers();
    }
  });

  socket.on('nextQuestion', () => {
    if (socket.id === room.hostId && room.state === 'revealing') {

      // MI-PARCOURS après Q20 (index 19)
      if (room.currentQuestion === 19) {
        room.state = 'midreveal';
        const players = Object.values(room.players)
          .sort((a, b) => b.score - a.score);
        io.emit('midReveal', players);
        return;
      }

      room.currentQuestion++;
      if (room.currentQuestion >= room.questions.length) {
        endGame();
      } else {
        room.state = 'answering';
        resetAnswers();
        io.emit('nextQuestion', {
          question: room.questions[room.currentQuestion],
          index: room.currentQuestion,
          total: room.questions.length
        });
      }
    }
  });

  socket.on('continueAfterMidReveal', () => {
  if (socket.id === room.hostId && room.state === 'midreveal') {
    room.currentQuestion++;
    room.state = 'answering';
    resetAnswers();
    io.emit('continueGame'); // ← broadcast à TOUS
    io.emit('nextQuestion', {
      question: room.questions[room.currentQuestion],
      index: room.currentQuestion,
      total: room.questions.length
    });
  }
});


  socket.on('disconnect', () => {
    delete room.players[socket.id];
    io.emit('playersUpdate', room.players);
    if (socket.id === room.hostId) {
      const remaining = Object.keys(room.players);
      if (remaining.length > 0) {
        room.hostId = remaining[0];
        io.to(room.hostId).emit('isHost', true);
      } else {
        room.hostId = null;
      }
    }
  });
});

function revealAnswers() {
  room.state = 'revealing';

  Object.keys(room.players).forEach(playerId => {
    const player = room.players[playerId];
    if (player.answer >= 0 && player.validated) {
      player.score += room.questions[room.currentQuestion].scores[player.answer];
    } else {
      player.afkCount++;
      if (player.afkCount >= 2) delete room.players[playerId];
    }
  });

  io.emit('reveal', {
    question: room.questions[room.currentQuestion],
    players: room.players
  });
  io.emit('playersUpdate', room.players);
}

function resetAnswers() {
  Object.values(room.players).forEach(player => {
    player.validated = false;
    player.answer = -1;
  });
}

function endGame() {
  room.state = 'ended';
  const sorted = Object.entries(room.players)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([id, player]) => {
      const rank = room.ranks.find(r => player.score <= r.max);
      return { id, ...player, rank: rank.name, punchline: rank.punchline };
    });
  io.emit('gameEnd', sorted);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur sur port ${PORT}`);
});







