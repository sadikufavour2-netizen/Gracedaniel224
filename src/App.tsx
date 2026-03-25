/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Send, RotateCcw, User, Cpu, Hash, Menu, X as CloseIcon, Volume2, VolumeX, Music, Music2, BarChart3 } from "lucide-react";
import { } from 'recharts';

type Player = "X" | "O" | null;

const SOUNDS = {
  move: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  draw: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  reset: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3"
};

export default function App() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isJTNext, setIsJTNext] = useState(true);
  const [winner, setWinner] = useState<Player | "Draw">(null);
  const [stats, setStats] = useState(() => {
    const savedStats = localStorage.getItem("jt-vs-ai-stats");
    return savedStats ? JSON.parse(savedStats) : {
      jtWins: 0,
      aiWins: 0,
      draws: 0,
    };
  });

  const [hallOfFame, setHallOfFame] = useState<{name: string, wins: number}[]>(() => {
    const savedHof = localStorage.getItem("jt-vs-ai-hof");
    return savedHof ? JSON.parse(savedHof) : [
      { name: "JT", wins: 0 },
      { name: "AI", wins: 0 }
    ];
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem("jt-vs-ai-music");
    return saved ? JSON.parse(saved) : false;
  });
  const [isSfxEnabled, setIsSfxEnabled] = useState(() => {
    const saved = localStorage.getItem("jt-vs-ai-sfx");
    return saved ? JSON.parse(saved) : true;
  });

  const [bgMusic] = useState(() => new Audio(SOUNDS.music));

  useEffect(() => {
    bgMusic.loop = true;
    if (isMusicEnabled) {
      bgMusic.play().catch(() => setIsMusicEnabled(false));
    } else {
      bgMusic.pause();
    }
    return () => bgMusic.pause();
  }, [isMusicEnabled, bgMusic]);

  const playSfx = useCallback((soundUrl: string) => {
    if (isSfxEnabled) {
      const audio = new Audio(soundUrl);
      audio.play().catch(() => {});
    }
  }, [isSfxEnabled]);

  useEffect(() => {
    localStorage.setItem("jt-vs-ai-stats", JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem("jt-vs-ai-hof", JSON.stringify(hallOfFame));
  }, [hallOfFame]);

  useEffect(() => {
    localStorage.setItem("jt-vs-ai-music", JSON.stringify(isMusicEnabled));
  }, [isMusicEnabled]);

  const checkWinner = (squares: Player[]): Player | "Draw" => {
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

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every((square) => square !== null)) {
      return "Draw";
    }

    return null;
  };

  const minimax = useCallback((squares: Player[], depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(squares);
    if (result === "O") return 10 - depth;
    if (result === "X") return depth - 10;
    if (result === "Draw") return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "O";
          const score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "X";
          const score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }, []);

  const getBestMove = useCallback((squares: Player[]): number => {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = "O";
        const score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }, [minimax]);

  const handleSquareClick = (index: number) => {
    if (board[index] || winner || !isJTNext) return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);
    setIsJTNext(false);
    playSfx(SOUNDS.move);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
      setWinner(gameResult);
      updateStats(gameResult);
      playSfx(gameResult === "Draw" ? SOUNDS.draw : SOUNDS.win);
    }
  };

  const aiMove = useCallback(() => {
    if (winner || isJTNext) return;

    const newBoard = [...board];
    const bestMove = getBestMove(newBoard);
    
    if (bestMove !== -1) {
      newBoard[bestMove] = "O";
      setBoard(newBoard);
      setIsJTNext(true);
      playSfx(SOUNDS.move);

      const gameResult = checkWinner(newBoard);
      if (gameResult) {
        setWinner(gameResult);
        updateStats(gameResult);
        playSfx(gameResult === "Draw" ? SOUNDS.draw : SOUNDS.win);
      }
    }
  }, [board, isJTNext, winner, getBestMove, playSfx]);

  useEffect(() => {
    if (!isJTNext && !winner) {
      const timeout = setTimeout(aiMove, 600);
      return () => clearTimeout(timeout);
    }
  }, [isJTNext, winner, aiMove]);

  const updateStats = (result: Player | "Draw") => {
    setStats((prev: any) => ({
      jtWins: result === "X" ? prev.jtWins + 1 : prev.jtWins,
      aiWins: result === "O" ? prev.aiWins + 1 : prev.aiWins,
      draws: result === "Draw" ? prev.draws + 1 : prev.draws,
    }));

    if (result === "X" || result === "O") {
      setHallOfFame((prev: any) => {
        const newHof = [...prev];
        const playerIndex = result === "X" ? 0 : 1;
        newHof[playerIndex].wins += 1;
        return newHof.sort((a, b) => b.wins - a.wins);
      });
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsJTNext(true);
    setWinner(null);
    playSfx(SOUNDS.reset);
  };

  const resetAllStats = () => {
    setStats({ jtWins: 0, aiWins: 0, draws: 0 });
    setHallOfFame([{ name: "JT", wins: 0 }, { name: "AI", wins: 0 }]);
    playSfx(SOUNDS.reset);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-mono flex flex-col items-center justify-center p-4 space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center w-full z-20">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-purple-500"
          >
            <Menu size={28} />
          </button>
          <a 
            href="https://analytics.vgdh.io/grace-daniel224.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-purple-500 flex items-center space-x-2"
            title="View Analytics"
          >
            <BarChart3 size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Analytics</span>
          </a>
        </div>
        <div className="text-3xl font-black tracking-tighter text-purple-600 italic bg-black/50 backdrop-blur-md px-4 py-1 rounded-md border border-purple-900/30">
          VERSE
        </div>
      </div>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-[#0a0a0a] border-r border-white/10 z-50 p-8 flex flex-col space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic text-purple-500">Settings</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <CloseIcon size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-30">Audio</h3>
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Music2 size={20} className={isMusicEnabled ? "text-purple-500" : "opacity-30"} />
                        <span className="text-sm font-bold">Background Music</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isMusicEnabled ? "bg-purple-600" : "bg-white/10"}`}>
                        <motion.div 
                          animate={{ x: isMusicEnabled ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                        />
                      </div>
                    </button>
                    <button 
                      onClick={() => setIsSfxEnabled(!isSfxEnabled)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Volume2 size={20} className={isSfxEnabled ? "text-purple-500" : "opacity-30"} />
                        <span className="text-sm font-bold">Sound Effects</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isSfxEnabled ? "bg-purple-600" : "bg-white/10"}`}>
                        <motion.div 
                          animate={{ x: isSfxEnabled ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-lg"
                        />
                      </div>
                    </button>
                    <a 
                      href="https://analytics.vgdh.io/grace-daniel224.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <BarChart3 size={20} className="text-purple-500" />
                        <span className="text-sm font-bold">View Analytics</span>
                      </div>
                      <Send size={16} className="opacity-30 -rotate-45" />
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-30">Data</h3>
                  <button 
                    onClick={resetAllStats}
                    className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/20"
                  >
                    <RotateCcw size={18} />
                    <span className="text-sm font-bold uppercase">Reset Leaderboard</span>
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-white/10 text-center space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] opacity-20 uppercase tracking-[0.3em]">
                    Built by @Gracedaniel224
                  </div>
                  <a 
                    href="https://x.com/VerseEcosystem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] opacity-20 uppercase tracking-[0.3em] hover:opacity-100 transition-opacity"
                  >
                    X: @VerseEcosystem
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] opacity-20 uppercase tracking-[0.3em]">
                    JT vs AI v2.1
                  </div>
                  <div className="text-[10px] opacity-20 uppercase tracking-[0.3em]">
                    Powered by GetVerse
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 pt-12"
      >
        <h1 className="text-6xl font-black tracking-tighter italic uppercase text-white">
          JT <span className="text-purple-500">vs</span> AI
        </h1>
        <div className="flex items-center justify-center space-x-2 text-xs opacity-50 uppercase tracking-widest">
          <Hash size={14} />
          <span>The Ultimate Challenge</span>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-4"
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-purple-500/20 p-4 rounded-xl bg-purple-500/5 flex flex-col items-center space-y-1">
            <User className="text-purple-500" size={20} />
            <span className="text-[10px] opacity-50 uppercase">JT Wins</span>
            <span className="text-2xl font-bold">{stats.jtWins}</span>
          </div>
          <div className="border border-white/10 p-4 rounded-xl bg-white/5 flex flex-col items-center space-y-1">
            <Cpu className="text-white/70" size={20} />
            <span className="text-[10px] opacity-50 uppercase">AI Wins</span>
            <span className="text-2xl font-bold">{stats.aiWins}</span>
          </div>
          <div className="border border-purple-500/20 p-4 rounded-xl bg-purple-500/5 flex flex-col items-center space-y-1">
            <Trophy className="text-purple-400" size={20} />
            <span className="text-[10px] opacity-50 uppercase">Draws</span>
            <span className="text-2xl font-bold">{stats.draws}</span>
          </div>
        </div>

        {/* Hall of Fame */}
        <div className="border border-white/10 rounded-2xl bg-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-purple-500 italic">Hall of Fame</h3>
            <Trophy size={16} className="text-purple-500" />
          </div>
          <div className="space-y-3">
            {hallOfFame.map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <span className="text-xs opacity-30 font-bold">0{idx + 1}</span>
                  <span className={`text-sm font-bold ${entry.name === "JT" ? "text-purple-500" : "text-white"}`}>
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-50 uppercase tracking-tighter">Wins</span>
                  <span className="text-lg font-black">{entry.wins}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Game Board */}
      <div className="relative group">
        <div className="grid grid-cols-3 gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
          {board.map((square, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: square ? 1 : 0.98, backgroundColor: "rgba(168, 85, 247, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSquareClick(i)}
              className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-3xl font-black rounded-xl border border-white/5 transition-colors"
              disabled={!!square || !!winner || !isJTNext}
            >
              <AnimatePresence mode="wait">
                {square === "X" && (
                  <motion.span
                    key="X"
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-purple-500"
                  >
                    JT
                  </motion.span>
                )}
                {square === "O" && (
                  <motion.span
                    key="O"
                    initial={{ scale: 0, rotate: 15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-white"
                  >
                    AI
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md rounded-2xl z-10 space-y-4 border border-purple-500/30"
            >
              <h2 className="text-3xl font-black uppercase italic text-white">
                {winner === "Draw" ? "It's a Draw!" : winner === "X" ? "JT Wins!" : "AI Wins!"}
              </h2>
              <button
                onClick={resetGame}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-500 transition-colors uppercase text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <RotateCcw size={16} />
                <span>Play Again</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Telegram */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex flex-col items-center space-y-2">
          <a 
            href="https://t.me/GetVerse/486213"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-xs opacity-50 hover:opacity-100 transition-opacity uppercase tracking-widest border-b border-transparent hover:border-purple-500/50 pb-1"
          >
            <Send size={14} className="text-purple-500" />
            <span>Join Our Telegram Channel</span>
          </a>
          <a 
            href="https://x.com/VerseEcosystem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] opacity-40 uppercase tracking-widest hover:opacity-100 transition-opacity"
          >
            X: @VerseEcosystem
          </a>
        </div>
        
        <div className="flex flex-col items-center space-y-1">
          <div className="text-[10px] opacity-50 font-bold uppercase tracking-[0.2em] text-purple-500">
            Built by @Gracedaniel224
          </div>
          <div className="text-[10px] opacity-20 uppercase tracking-[0.3em]">
            Powered by GetVerse
          </div>
        </div>
      </div>
    </div>
  );
}
