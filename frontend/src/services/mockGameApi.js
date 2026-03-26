const TOTAL_ROUNDS = 5;

const MOCK_GAMES = [
  {
    topic: 'Space Exploration',
    rounds: [
      {
        lieId: 2,
        statements: [
          { id: 1, text: 'The Voyager 1 spacecraft is currently in interstellar space.' },
          { id: 2, text: 'The first human landed on Mars in 1997.' },
          { id: 3, text: 'Saturn has more known moons than any other planet in our solar system.' },
        ],
      },
      {
        lieId: 1,
        statements: [
          { id: 1, text: 'A day on Venus is shorter than a day on Earth.' },
          { id: 2, text: 'The James Webb Space Telescope observes primarily in infrared wavelengths.' },
          { id: 3, text: 'The Moon is slowly moving away from Earth over time.' },
        ],
      },
      {
        lieId: 3,
        statements: [
          { id: 1, text: 'The Apollo 13 mission returned safely to Earth despite a major in-flight failure.' },
          { id: 2, text: 'Neutron stars can spin hundreds of times per second.' },
          { id: 3, text: 'Mercury has the thickest atmosphere of all terrestrial planets.' },
        ],
      },
      {
        lieId: 1,
        statements: [
          { id: 1, text: 'Jupiter is the hottest planet in our solar system.' },
          { id: 2, text: 'The International Space Station orbits Earth roughly every 90 minutes.' },
          { id: 3, text: 'A light-year is a measure of distance, not time.' },
        ],
      },
      {
        lieId: 2,
        statements: [
          { id: 1, text: 'Mars has the largest volcano known in the solar system: Olympus Mons.' },
          { id: 2, text: 'The Hubble Space Telescope was launched in 2009.' },
          { id: 3, text: 'Some exoplanets are found by observing tiny dips in a star’s brightness.' },
        ],
      },
    ],
  },
];

const sessionStore = new Map();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSessionId() {
  return `mock-${Math.random().toString(36).slice(2, 10)}`;
}

function getGameByTopic(topic) {
  const normalizedTopic = topic?.trim().toLowerCase();
  return (
    MOCK_GAMES.find((game) => game.topic.toLowerCase() === normalizedTopic) ??
    MOCK_GAMES[0]
  );
}

export async function startGame(topic) {
  await wait(800);
  const game = getGameByTopic(topic);
  const sessionId = createSessionId();

  sessionStore.set(sessionId, {
    score: 0,
    game,
    answers: {},
  });

  return {
    sessionId,
    totalRounds: TOTAL_ROUNDS,
    topic: game.topic,
  };
}

export async function getRound(sessionId, roundNumber) {
  await wait(200);
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found. Please start a new mock game.');
  }

  const round = session.game.rounds[roundNumber - 1];
  if (!round) {
    throw new Error('Round not found.');
  }

  return {
    roundNumber,
    statements: round.statements,
  };
}

export async function submitAnswer(sessionId, roundNumber, selectedId) {
  await wait(200);
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found. Please start a new mock game.');
  }

  const round = session.game.rounds[roundNumber - 1];
  if (!round) {
    throw new Error('Round not found.');
  }

  const correct = selectedId === round.lieId;
  if (!(roundNumber in session.answers)) {
    session.answers[roundNumber] = selectedId;
    if (correct) {
      session.score += 1;
    }
  }

  return {
    correct,
    lieId: round.lieId,
    lieText: round.statements.find((item) => item.id === round.lieId)?.text ?? '',
    score: session.score,
    completed: roundNumber >= TOTAL_ROUNDS,
  };
}

export async function resetSession(sessionId) {
  await wait(50);
  sessionStore.delete(sessionId);
}
