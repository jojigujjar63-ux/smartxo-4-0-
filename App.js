import { useEffect, useRef, useState } from "react";
import "./styles.css";

/*
  SmartXO 4.0 — Ultimate Edition
  - Modern neon theme + animations
  - PVP & PVC with Easy / Medium / Hard (Minimax)
  - Avatars, custom names
  - Scoreboard (localStorage)
  - Sounds + Background music + Mute
*/

const AVATARS = [
  "https://avatars.dicebear.com/api/adventurer/alpha.svg",
  "https://avatars.dicebear.com/api/avataaars/blue.svg",
  "https://avatars.dicebear.com/api/bottts/charlie.svg",
  "https://avatars.dicebear.com/api/identicon/omega.svg",
  "https://i.pravatar.cc/150?img=12",
  "https://i.pravatar.cc/150?img=47",
];

// Sounds (CDN small clips)
const CLICK_SFX =
  "https://assets.mixkit.co/sfx/preview/mixkit-video-game-retro-click-237.wav";
const WIN_SFX =
  "https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-game-over-470.mp3";
const BG_MUSIC =
  "https://assets.mixkit.co/music/preview/mixkit-future-trap-1247.mp3";

export default function App() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState("PVP"); // PVP | PVC
  const [difficulty, setDifficulty] = useState("Hard"); // Easy | Medium | Hard
  const [playerX, setPlayerX] = useState({
    name: "Player X",
    avatar: AVATARS[0],
  });
  const [playerO, setPlayerO] = useState({
    name: "Player O",
    avatar: AVATARS[1],
  });
  const [winner, setWinner] = useState(null); // "X"|"O"|"Draw"|null
  const [score, setScore] = useState({ X: 0, O: 0, Draws: 0 });
  const [muted, setMuted] = useState(false);
  const [animLine, setAnimLine] = useState([]);
  const [showSettings, setShowSettings] = useState(true);

  const sfxClick = useRef(null);
  const sfxWin = useRef(null);
  const bgAudio = useRef(null);

  // load saved
  useEffect(() => {
    const savedScore = localStorage.getItem("smartxo4:score");
    if (savedScore) setScore(JSON.parse(savedScore));
    const savedThemeMute = localStorage.getItem("smartxo4:muted");
    if (savedThemeMute) setMuted(JSON.parse(savedThemeMute));
    const savedNames = localStorage.getItem("smartxo4:names");
    if (savedNames) {
      const v = JSON.parse(savedNames);
      if (v.playerX) setPlayerX(v.playerX);
      if (v.playerO) setPlayerO(v.playerO);
    }
    const savedMode = localStorage.getItem("smartxo4:mode");
    if (savedMode) setMode(savedMode);
    const savedDiff = localStorage.getItem("smartxo4:diff");
    if (savedDiff) setDifficulty(savedDiff);
  }, []);

  useEffect(() => {
    localStorage.setItem("smartxo4:score", JSON.stringify(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem(
      "smartxo4:names",
      JSON.stringify({ playerX, playerO })
    );
  }, [playerX, playerO]);

  useEffect(() => {
    localStorage.setItem("smartxo4:mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("smartxo4:diff", difficulty);
  }, [difficulty]);

  useEffect(() => {
    localStorage.setItem("smartxo4:muted", JSON.stringify(muted));
    if (bgAudio.current) {
      bgAudio.current.muted = muted;
      muted ? bgAudio.current.pause() : bgAudio.current.play().catch(() => {});
    }
  }, [muted]);

  // preload sounds
  useEffect(() => {
    sfxClick.current = new Audio(CLICK_SFX);
    sfxWin.current = new Audio(WIN_SFX);
    bgAudio.current = new Audio(BG_MUSIC);
    bgAudio.current.loop = true;
    bgAudio.current.volume = 0.15;
    if (!muted) {
      bgAudio.current.play().catch(() => {});
    }
    return () => {
      bgAudio.current?.pause();
    };
    // eslint-disable-next-line
  }, []);

  // monitor board for results and for computer move
  useEffect(() => {
    const res = calculateWinner(board);
    if (res) {
      if (res.symbol === null) {
        setWinner("Draw");
        setScore((s) => ({ ...s, Draws: s.Draws + 1 }));
      } else {
        setWinner(res.symbol);
        setAnimLine(res.line || []);
        setScore((s) => ({ ...s, [res.symbol]: s[res.symbol] + 1 }));
        sfxWin.current?.play();
      }
      return;
    }

    // if PVC and it's O's turn, let computer play
    if (mode === "PVC" && !isXNext && !winner) {
      const delay =
        difficulty === "Easy" ? 350 : difficulty === "Medium" ? 600 : 450;
      const t = setTimeout(() => makeComputerMove(), delay);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [board, isXNext, mode, difficulty]);

  const playClick = () => {
    if (muted) return;
    sfxClick.current.currentTime = 0;
    sfxClick.current.play().catch(() => {});
  };

  const handleCell = (i) => {
    if (board[i] || winner) return;
    const newB = board.slice();
    newB[i] = isXNext ? "X" : "O";
    setBoard(newB);
    playClick();
    setIsXNext(!isXNext);
  };

  const resetRound = (keepScore = true) => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setAnimLine([]);
    if (!keepScore) setScore({ X: 0, O: 0, Draws: 0 });
  };

  const makeComputerMove = () => {
    const b = board.slice();
    const empties = b
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null);
    if (empties.length === 0) return;
    let move = null;
    if (difficulty === "Easy") {
      move = empties[Math.floor(Math.random() * empties.length)];
    } else if (difficulty === "Medium") {
      move =
        findWinningOrBlockingMove(b, "O") ??
        findWinningOrBlockingMove(b, "X") ??
        empties[Math.floor(Math.random() * empties.length)];
    } else {
      move =
        minimaxDecision(b, "O") ??
        empties[Math.floor(Math.random() * empties.length)];
    }
    if (move !== null) {
      b[move] = "O";
      setBoard(b);
      playClick();
      setIsXNext(true);
    }
  };

  function findWinningOrBlockingMove(b, sym) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let [a, b1, c] of lines) {
      const arr = [b[a], b[b1], b[c]];
      const cntSym = arr.filter((x) => x === sym).length;
      const cntNull = arr.filter((x) => x === null).length;
      if (cntSym === 2 && cntNull === 1) {
        return [a, b1, c][arr.indexOf(null)];
      }
    }
    return null;
  }

  function minimaxDecision(boardState, aiSymbol) {
    const human = aiSymbol === "X" ? "O" : "X";
    function minimax(bState, player) {
      const r = calculateWinner(bState);
      if (r) {
        if (r.symbol === aiSymbol) return { score: 10 };
        if (r.symbol === human) return { score: -10 };
        return { score: 0 };
      }
      const avail = bState
        .map((v, i) => (v === null ? i : null))
        .filter((v) => v !== null);
      const moves = [];
      for (let idx of avail) {
        const nb = bState.slice();
        nb[idx] = player;
        const next = player === aiSymbol ? human : aiSymbol;
        const res = minimax(nb, next);
        moves.push({ index: idx, score: res.score });
      }
      if (player === aiSymbol) {
        let best = -Infinity,
          bestMove = null;
        for (let m of moves)
          if (m.score > best) {
            best = m.score;
            bestMove = m;
          }
        return bestMove || { score: 0 };
      } else {
        let best = Infinity,
          bestMove = null;
        for (let m of moves)
          if (m.score < best) {
            best = m.score;
            bestMove = m;
          }
        return bestMove || { score: 0 };
      }
    }
    const choice = minimax(boardState, aiSymbol);
    return choice ? choice.index : null;
  }

  // helpers for avatars/names
  const setAvatar = (which, url) => {
    if (which === "X") setPlayerX((p) => ({ ...p, avatar: url }));
    else setPlayerO((p) => ({ ...p, avatar: url }));
  };
  const setName = (which, name) => {
    if (which === "X") setPlayerX((p) => ({ ...p, name }));
    else setPlayerO((p) => ({ ...p, name }));
  };

  const exportScore = () => {
    const data = JSON.stringify(score, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "smartxo-score.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className={`neon-wrap ${muted ? "muted" : ""}`}>
      <audio ref={bgAudio} src={BG_MUSIC} />
      <div className="neon-card">
        <div className="neon-header">
          <div className="brand">
            <h1 className="neon-title">SmartXO 4.0</h1>
            <div className="neon-sub">Ultimate Neon Arena</div>
          </div>
          <div className="header-controls">
            <button className="tiny" onClick={() => setShowSettings((s) => !s)}>
              {showSettings ? "Hide" : "Show"} Settings
            </button>
            <button className="tiny" onClick={() => setMuted((m) => !m)}>
              {muted ? "Unmute" : "Mute"}
            </button>
            <button className="tiny" onClick={exportScore}>
              Export Score
            </button>
          </div>
        </div>

        {showSettings && (
          <section className="settings">
            <div className="players-settings">
              <div className="player-card">
                <div className="avatar-wrap">
                  <img src={playerX.avatar} alt="X avatar" />
                </div>
                <input
                  value={playerX.name}
                  onChange={(e) => setName("X", e.target.value)}
                />
                <div className="avatars-chooser">
                  {AVATARS.map((a, i) => (
                    <img
                      key={i}
                      src={a}
                      className={playerX.avatar === a ? "chosen" : ""}
                      onClick={() => setAvatar("X", a)}
                      alt="av"
                    />
                  ))}
                </div>
              </div>

              <div className="player-card">
                <div className="avatar-wrap">
                  <img src={playerO.avatar} alt="O avatar" />
                </div>
                <input
                  value={playerO.name}
                  onChange={(e) => setName("O", e.target.value)}
                />
                <div className="avatars-chooser">
                  {AVATARS.map((a, i) => (
                    <img
                      key={i}
                      src={a}
                      className={playerO.avatar === a ? "chosen" : ""}
                      onClick={() => setAvatar("O", a)}
                      alt="av"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="controls-row">
              <label>
                Mode:
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="PVP">Player vs Player</option>
                  <option value="PVC">Player vs Computer</option>
                </select>
              </label>

              <label>
                Difficulty:
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </label>

              <div className="score-small">
                <div>
                  <strong>{playerX.name}</strong> X: {score.X}
                </div>
                <div>
                  <strong>Draws</strong>: {score.Draws}
                </div>
                <div>
                  <strong>{playerO.name}</strong> O: {score.O}
                </div>
              </div>

              <div className="settings-buttons">
                <button className="glow" onClick={() => resetRound(false)}>
                  Reset All (clear score)
                </button>
                <button onClick={() => resetRound(true)}>
                  New Round (keep score)
                </button>
              </div>
            </div>
          </section>
        )}

        <main className="game-area">
          <div className="status-bar">
            <div className="status-left">
              <div className="mini">
                <img src={playerX.avatar} alt="" className="mini-av" />
                <div>{playerX.name} (X)</div>
              </div>
              <div className="vs">VS</div>
              <div className="mini">
                <img src={playerO.avatar} alt="" className="mini-av" />
                <div>{playerO.name} (O)</div>
              </div>
            </div>
            <div className="status-center">
              {winner ? (
                winner === "Draw" ? (
                  <div className="bigstatus">🤝 Draw!</div>
                ) : (
                  <div className="bigstatus">
                    🏆 {winner === "X" ? playerX.name : playerO.name} Wins!
                  </div>
                )
              ) : (
                <div className="bigstatus">
                  Next:{" "}
                  {isXNext ? `${playerX.name} (X)` : `${playerO.name} (O)`}
                </div>
              )}
            </div>
            <div className="status-right">
              <div className="score-pill">X {score.X}</div>
              <div className="score-pill">D {score.Draws}</div>
              <div className="score-pill">O {score.O}</div>
            </div>
          </div>

          <div className="board-grid">
            {board.map((cell, i) => (
              <button
                key={i}
                className={`gcell ${cell ? cell : ""} ${
                  animLine.includes(i) ? "winner" : ""
                }`}
                onClick={() => handleCell(i)}
              >
                {cell}
              </button>
            ))}
          </div>
        </main>

        <footer className="neon-footer">
          <div>SmartXO 4.0 • neon edition • built with ❤️</div>
          <div className="footer-controls">
            <button
              onClick={() => {
                setBoard(Array(9).fill(null));
                setWinner(null);
                setAnimLine([]);
                setIsXNext(true);
              }}
            >
              Quick Reset
            </button>
            <button
              onClick={() => {
                setScore({ X: 0, O: 0, Draws: 0 });
                resetRound(false);
              }}
            >
              Clear Scores
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ---------- helper ---------- */

function calculateWinner(b) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let l of lines) {
    const [a, b1, c] = l;
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return { symbol: b[a], line: l };
    }
  }
  if (!b.includes(null)) return { symbol: null, line: [] };
  return null;
}
