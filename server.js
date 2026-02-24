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
    {q:"Tu te laves le visage le matin ?",answers:["Oui","Je mouille juste","Non"],scores:[0,5,10],category:"🚿"},
    {q:"Après un bon caca, tu te nettoies comment ?",answers:["Papier seulement","Eau + papier","Bidet ou douche","Je ne fais rien"],scores:[10,5,0,20],category:"🚿"},
    {q:"Tu te douches après le sport ?",answers:["Toujours","Parfois","Rarement","Jamais"],scores:[0,5,10,15],category:"🚿"},
    {q:"Sous la douche, tu te laves spécifiquement les jambes ?",answers:["Oui toujours","Parfois","Non l'eau coule ça suffit","Jamais"],scores:[0,5,15,15],category:"🚿"},
    {q:"Sous la douche, tu te laves spécifiquement les pieds ?",answers:["Oui toujours","Parfois","Non l'eau coule ça suffit","Jamais"],scores:[0,5,15,15],category:"🚿"},
    {q:"Tu changes ton pyjama tous les combien ?",answers:["Moins de 3 jours","1 semaine","2 semaines","Je ne le change pas"],scores:[0,5,10,15],category:"🚿"},
    {q:"As tu déjà sniffer un vêtement pour vérifier sa portabilité ?",answers:["Non jamais","Oui parfois","C'est mon seul critère","Oui et je préfère quand ça sent"],scores:[0,5,10,15],category:"🚿"},
    {q:"Après avoir fait pipi, tu t'essuies spécifiquement le zizi ?",answers:["Oui toujours","Parfois","Non je secoue","Jamais"],scores:[0,5,10,15],category:"🚿"},
    {q:"La dernière fois que t'as nettoyé ta piaule ?",answers:["Cette semaine","Il y a 2-3 semaines","Le mois dernier","Je ne sais plus"],scores:[0,5,10,15],category:"🧼"},
    {q:"T'as déjà passé la serpillière chez toi ?",answers:["Oui régulièrement","Oui une fois","Non"],scores:[0,5,15],category:"🧼"},
    {q:"Tu laisses la vaisselle dans l'évier combien de temps ?",answers:["Je la fais juste après","Quelques heures","Quelques jours","Plus"],scores:[0,5,10,15],category:"🧼"},
    {q:"Tu as du linge sale par terre en ce moment ?",answers:["Non","Oui un peu","Oui beaucoup","C'est permanent"],scores:[0,5,10,15],category:"🧼"},
    {q:"Tu as déjà mangé dans ton lit et laissé des miettes ?",answers:["Non jamais","Oui une fois","Oui souvent","C'est mon restaurant principal"],scores:[0,5,10,15],category:"🧼"},
    {q:"Tu te laves les mains en rentrant chez toi ?",answers:["Toujours","Parfois","Quand j'y pense","Jamais"],scores:[0,5,10,15],category:"👐"},
    {q:"T'as déjà soufflé sur un aliment tombé par terre pour le 'désinfecter' puis tu l'as mangé ?",answers:["Non jamais","Oui une fois","Oui souvent","C'est automatique"],scores:[0,5,10,15],category:"👐"},
    {q:"Tu as déjà bu dans un verre visiblement pas propre ?",answers:["Jamais","Oui en dépannage","Oui sans trop y penser","Oui et ça me dérange pas"],scores:[0,5,10,15],category:"👐"},
    {q:"Tu t'es déjà couché avec tes vêtements de la journée sans te changer ?",answers:["Jamais","Oui une fois très fatigué","Plusieurs fois","C'est habituel"],scores:[0,5,10,15],category:"😈"},
    {q:"Combien de jours MAX tes affaires sont elles restées dans ton sac de sport ?",answers:["Je les retire direct","1 jour","entre 2 et 5 jours","Plus de 5 jours"],scores:[0,5,10,15],category:"😈"},
    {q:"C'est quoi ton record de jours sans douche ?",answers:["1 jour","2-3 jours","4-6 jours","1 semaine ou plus"],scores:[0,5,15,20],category:"🚿"},
    {q:"Tu portes tes chaussettes combien de jours maximum ?",answers:["1 jour","2 jours","3 jours","Plus"],scores:[0,5,15,20],category:"🚿"},
    {q:"Tu changes tes draps tous les combien ?",answers:["1 semaine","2 semaines","1 mois","Plus d'un mois"],scores:[0,5,15,20],category:"🧼"},
    {q:"Ta serviette de bain passe en machine tous les combien ?",answers:["Moins d'une semaine","2 semaines","1 mois","Plus"],scores:[0,5,15,20],category:"🧼"},
    {q:"Tu te laves les mains avant de cuisiner ?",answers:["Toujours","Parfois","Rarement","Jamais"],scores:[0,5,15,20],category:"👐"},
    {q:"Tu te brosses les dents combien de fois par jour ?",answers:["2 fois ou plus","1 fois","Parfois","Rarement"],scores:[0,5,15,20],category:"🦷"},
    {q:"As tu déjà pratiqué la technique dite de la coupole (pété dans ta main sour forme d'une coupole pour sentir l'odeur ensuite) ?",answers:["Non jamais","Peut être une fois par curiosité","Oui parfois","Oui régulièrement"],scores:[0,5,15,20],category:"💩"},
    {q:"Les gens autour de toi t'ont déjà fait une remarque sur l'odeur de tes pieds ?",answers:["Jamais","Une fois","Parfois","Souvent"],scores:[0,5,15,20],category:"💩"},
    {q:"C'est quoi ton record de jours d'affilée sans douche ?",answers:["1 jour","2-3 jours","4-6 jours","1 semaine ou plus"],scores:[0,10,20,25],category:"🚿"},
    {q:"Tu as déjà retourné un sous-vêtement pour le remettre ?",answers:["Jamais","Une fois en dépannage","Parfois","C'est une habitude"],scores:[0,10,20,25],category:"🚿"},
    {q:"Tu utilises la même éponge de cuisine depuis combien de temps ?",answers:["Moins d'1 mois","2-3 mois","Plus de 6 mois","Je sais plus depuis quand"],scores:[0,10,20,25],category:"🧼"},
    {q:"Tu changes de brosse à dents tous les combien ?",answers:["Tous les 3 mois","Tous les 6 mois","Une fois par an","Je sais plus"],scores:[0,10,20,25],category:"🦷"},
    {q:"Tu as dormi sans draps parce que tu n'avais pas changé le lit ?",answers:["Non","Oui une nuit","Plusieurs nuits de suite","C'est souvent"],scores:[0,10,20,25],category:"😈"},
    {q:"Tu as trouvé de la moisissure sur de la vaisselle et tu l'as quand même utilisée ?",answers:["Non jamais","Oui une fois","Oui plusieurs fois","Oui sans hésiter"],scores:[0,10,20,30],category:"🧼"},
    {q:"Tu t'es endormi plusieurs nuits de suite sans te brosser les dents ?",answers:["Non jamais","Oui une fois","Oui plusieurs fois","Oui c'est arrivé récemment"],scores:[0,10,20,30],category:"🦷"},
    {q:"Tu as remis un slip sale parce que tu n'avais plus rien de propre ?",answers:["Jamais","Une fois en voyage","Plusieurs fois","C'est arrivé récemment"],scores:[0,10,20,30],category:"💩"},
    {q:"Tu es déjà sorti sans t'essuyer les fesses parce que tu avais la flemme ?",answers:["Jamais","Une fois en urgence","Quelques fois","Récemment"],scores:[0,15,25,35],category:"💩"},
    {q:"Tu t'es déjà gratté les fesses et senti le doigt ?",answers:["Non","Une fois par curiosité","Oui parfois","Oui et j'assume"],scores:[0,10,25,35],category:"💩"},
    {q:"Tu as déjà porté le même slip plus de 3 jours d'affilée ?",answers:["Jamais","Oui en dépannage","Oui sans raison","Oui plusieurs fois"],scores:[0,15,25,35],category:"😈"},
    {q:"Tu as déjà uriné dans une bouteille pour éviter d'aller aux toilettes ?",answers:["Non jamais","Oui en voiture/trajet","Oui chez moi","Oui et c'est pratique"],scores:[0,15,30,40],category:"😈"},
    {q:"Tu as déjà utilisé un vêtement comme papier toilette en urgence ?",answers:["Non jamais","Oui une fois en vraie urgence","Oui et c'était calculé","Oui plusieurs fois"],scores:[0,15,30,45],category:"😈"}
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




