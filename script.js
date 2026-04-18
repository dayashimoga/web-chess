import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.8/+esm';

// ═══════════════════════════════════════════════════
// PIECE IMAGE URLS (lichess cburnett set via jsDelivr)
// ═══════════════════════════════════════════════════
const PIECE_BASE = 'https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett';
const PIECE_URLS = {
    wk: `${PIECE_BASE}/wK.svg`, wq: `${PIECE_BASE}/wQ.svg`, wr: `${PIECE_BASE}/wR.svg`,
    wb: `${PIECE_BASE}/wB.svg`, wn: `${PIECE_BASE}/wN.svg`, wp: `${PIECE_BASE}/wP.svg`,
    bk: `${PIECE_BASE}/bK.svg`, bq: `${PIECE_BASE}/bQ.svg`, br: `${PIECE_BASE}/bR.svg`,
    bb: `${PIECE_BASE}/bB.svg`, bn: `${PIECE_BASE}/bN.svg`, bp: `${PIECE_BASE}/bP.svg`,
};

// Preload piece images
Object.values(PIECE_URLS).forEach(url => { const img = new Image(); img.src = url; });

// ═══════════════════════════════════════════════════
// APPLICATION STATE
// ═══════════════════════════════════════════════════
let chess = new Chess();
let flipped = false;
let mode = 'play';      // 'play' | 'analyze'
let aiColor = 'b';
let aiLevel = 5;
let selectedSquare = null;
let validMovesForSelected = [];
let lastMoveSquares = [];

// Move history tracking
let moveHistory = [];    // [{san, from, to, fen}, ...]
let currentMoveIdx = -1; // -1 = starting position

// ═══════════════════════════════════════════════════
// ACADEMY DATABASE & STATE
// ═══════════════════════════════════════════════════
const ACADEMY_DB = {
    openings: [
        { id: 'op1', idx: 'I', title: 'Ruy López', expected: ['e4','e5','Nf3','Nc6','Bb5'] },
        { id: 'op2', idx: 'I', title: 'Italian Game', expected: ['e4','e5','Nf3','Nc6','Bc4'] },
        { id: 'op3', idx: 'I', title: 'Petroff Defense', expected: ['e4','e5','Nf3','Nf6'] },
        { id: 'op4', idx: 'I', title: 'Sicilian Defense', expected: ['e4','c5'] },
        { id: 'op5', idx: 'I', title: 'Sicilian Open', expected: ['e4','c5','Nf3','d6','d4'] },
        { id: 'op6', idx: 'I', title: 'Sicilian Two Knights', expected: ['e4','c5','Nf3','Nc6'] },
        { id: 'op7', idx: 'I', title: 'French Defense', expected: ['e4','e6'] },
        { id: 'op8', idx: 'I', title: 'Caro-Kann Defense', expected: ['e4','c6'] },
        { id: 'op9', idx: 'I', title: 'Scandinavian Defense', expected: ['e4','d5'] },
        { id: 'op10', idx: 'I', title: "Queen's Gambit", expected: ['d4','d5','c4'] },
        { id: 'op11', idx: 'I', title: "Queen's Gambit Declined", expected: ['d4','d5','c4','e6'] },
        { id: 'op12', idx: 'I', title: "Queen's Gambit Accepted", expected: ['d4','d5','c4','dxc4'] },
        { id: 'op13', idx: 'I', title: "King's Indian Defense", expected: ['d4','Nf6','c4','g6'] },
        { id: 'op14', idx: 'I', title: 'Nimzo-Indian Defense', expected: ['d4','Nf6','c4','e6','Nc3','Bb4'] },
        { id: 'op15', idx: 'I', title: "King's Gambit", expected: ['e4','e5','f4'] },
        { id: 'op16', idx: 'I', title: 'Scotch Game', expected: ['e4','e5','Nf3','Nc6','d4'] },
        { id: 'op17', idx: 'I', title: 'Réti Opening', expected: ['Nf3','d5','c4'] },
        { id: 'op18', idx: 'I', title: 'English Opening', expected: ['c4'] },
        { id: 'op19', idx: 'I', title: 'Open Game', expected: ['e4','e5'] },
        { id: 'op20', idx: 'I', title: 'Closed Game', expected: ['d4','d5'] }
    ],
    tactics: [
        { id: 'tac1', idx: 'II', title: 'Mate in 2', desc: 'Find the forcing sequence to checkmate.', fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', expected: ['Nxe4', 'Qh5#'], isBlack: true },
        { id: 'tac2', idx: 'II', title: 'Classic Fork', desc: 'Attack two pieces at once with your knight.', fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', expected: ['Nxe5', 'dxe4', 'Qe2'], isBlack: false },
        { id: 'tac3', idx: 'II', title: 'Back Rank Mate', desc: 'Exploit the weakness of an unprotected back rank.', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', expected: ['Re8#'], isBlack: false },
        { id: 'tac4', idx: 'II', title: 'Discovered Attack', desc: 'Move one piece to reveal an attack from another.', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 4 6', expected: ['Nxe5', 'Nxe5', 'd4'], isBlack: false },
        { id: 'tac5', idx: 'II', title: 'Pin to Win', desc: 'Pin a piece against the king to win material.', fen: '2r3k1/5ppp/p7/1p6/4Q3/P6P/1q3PP1/4R1K1 w - - 0 25', expected: ['Qe8+', 'Rxe8', 'Rxe8#'], isBlack: false },
        { id: 'tac6', idx: 'II', title: "Morphy's Opera Sac", desc: 'A brilliant sacrifice from the famous Opera Game.', fen: '1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 1 17', expected: ['Rd8#'], isBlack: false },
        { id: 'tac7', idx: 'II', title: "The Greek Gift", desc: 'The classic bishop sacrifice on h7.', fen: 'r1bq1rk1/ppp1nppp/2n5/3pP3/1bB5/2N2N2/PP3PPP/R1BQR1K1 w - - 0 10', expected: ['Bxh7+', 'Kxh7', 'Ng5+'], isBlack: false },
        { id: 'tac8', idx: 'II', title: "Smothered Mate", desc: 'Use a knight to deliver mate to a trapped king.', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2N/4P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5', expected: ['Nxh5', 'Qxh5', 'g6'], isBlack: true },
        { id: 'tac9', idx: 'II', title: "Légal Trap", desc: 'A famous opening trap that punishes greedy play.', fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp3/4P3/5N2/PPPPBPPP/RNBQ1RK1 w kq - 0 6', expected: ['Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'], isBlack: false },
        { id: 'tac10', idx: 'II', title: "Double Attack", desc: 'Attack two targets at once, forcing material gain.', fen: 'r1bqkbnr/pppppppp/2n5/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', expected: ['d4'], isBlack: false },
        { id: 'tac11', idx: 'II', title: "Deflection", desc: 'Force a defending piece away from its duty.', fen: '6k1/5p1p/6p1/8/8/8/r4PPP/3R2K1 w - - 0 1', expected: ['Rd8+'], isBlack: false },
        { id: 'tac12', idx: 'II', title: "Zwischenzug", desc: 'An in-between move that changes everything.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3', expected: ['Ng5'], isBlack: false },
        { id: 'tac13', idx: 'II', title: "Overloaded Piece", desc: 'Exploit a piece with too many defensive tasks.', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1', expected: ['Re8+', 'Rxe8', 'Rxe8#'], isBlack: false },
        { id: 'tac14', idx: 'II', title: "X-Ray Attack", desc: 'Attack through one piece to hit a target behind.', fen: '4r1k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1', expected: ['Re8+','Rxe8','Rxe8#'], isBlack: false },
        { id: 'tac15', idx: 'II', title: "Skewer Tactic", desc: 'Attack a valuable piece, revealing a target behind.', fen: '8/8/8/8/8/1B6/1k6/1K5r w - - 0 1', expected: ['Ba4+'], isBlack: false }
    ],
    endgame: [
        { id: 'end1', idx: 'III', title: 'Lucena Position', desc: 'The most important rook endgame position.', fen: '1K6/P7/8/8/8/8/1r6/k7 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end2', idx: 'III', title: 'Philidor Position', desc: 'Defensive drawing technique in rook endgames.', fen: '8/8/8/8/8/4k3/4p3/4K3 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end3', idx: 'III', title: 'King & Pawn vs King', desc: 'Learn the key squares and opposition.', fen: '8/8/8/8/3K4/3P4/8/3k4 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end4', idx: 'III', title: 'King & Rook vs King', desc: 'Systematic technique to deliver checkmate.', fen: '8/8/8/8/8/8/3R4/K1k5 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end5', idx: 'III', title: 'Queen vs Pawn (7th)', desc: 'Technique to stop a pawn and deliver mate.', fen: '8/8/8/8/8/8/p7/K1Q5 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end6', idx: 'III', title: 'Vancura Position', desc: 'A rook vs passed pawn drawing technique.', fen: '8/8/8/8/8/p1K5/7R/k7 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end7', idx: 'III', title: 'Pawn Square Rule', desc: 'Can your king catch a passed pawn?', fen: '8/8/8/8/6p1/8/8/K1k5 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end8', idx: 'III', title: 'Rook & Bishop vs Rook', desc: 'A complex theoretical endgame.', fen: '8/8/8/8/8/R1B5/8/K1k4r w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end9', idx: 'III', title: 'Queen vs Rook', desc: 'Convert the queen advantage to victory.', fen: '8/8/8/8/8/1Q6/8/K1k4r w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end10', idx: 'III', title: 'Two Bishops Mate', desc: 'Coordinate two bishops to checkmate.', fen: '8/8/8/8/8/1BB5/8/K1k5 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end11', idx: 'III', title: 'Opposition', desc: 'The key concept in king and pawn endgames.', fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end12', idx: 'III', title: 'Fortress Draw', desc: 'Set up an impregnable defensive position.', fen: '8/8/8/8/8/1k6/1p6/1K1R4 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end13', idx: 'III', title: 'Stalemate Trick', desc: 'Escape a lost position with a stalemate trap.', fen: '5k2/5P2/5K2/8/8/8/8/8 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end14', idx: 'III', title: 'Active Rook Endgame', desc: 'Activity wins in rook endgames.', fen: '8/8/8/R7/1k6/1p6/1K6/8 w - - 0 1', expected: null, playVsEngine: true },
        { id: 'end15', idx: 'III', title: 'Bishop vs Knight', desc: 'When bishops dominate and when knights shine.', fen: '8/8/8/3B4/8/1k6/2n5/1K6 w - - 0 1', expected: null, playVsEngine: true }
    ],
    strategy: [
        { id: 'str1', idx: 'IV', title: 'Pawn Structure', desc: 'Doubled, isolated, and backward pawns — weaknesses to exploit.', expected: ['e4','e5','d4','exd4','Nf3','Nc6','Nxd4'], isBlack: false },
        { id: 'str2', idx: 'IV', title: 'Piece Activity', desc: 'Active pieces win games. Develop with tempo!', expected: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d3'], isBlack: false },
        { id: 'str3', idx: 'IV', title: 'The Outpost', desc: 'Place a knight on a square that cannot be attacked by pawns.', fen: 'r1bqkb1r/ppp2ppp/2np1n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5', expected: ['d4', 'exd4', 'Nd5'], isBlack: false },
        { id: 'str4', idx: 'IV', title: 'Weak Squares', desc: 'Target squares your opponent cannot protect with pawns.', expected: ['e4','d6','d4','Nf6','Nc3','g6','f4'], isBlack: false },
        { id: 'str5', idx: 'IV', title: 'The Bishop Pair', desc: 'Two bishops working together are a powerful weapon.', expected: ['e4','e5','Nf3','Nc6','Bc4','Bc5','d3','d6','Bg5'], isBlack: false },
        { id: 'str6', idx: 'IV', title: 'Rook on the 7th Rank', desc: 'A rook on the 7th attacks pawns and restricts the king.', fen: '3r2k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1', expected: ['Rd7'], isBlack: false },
        { id: 'str7', idx: 'IV', title: 'Doubled Rooks', desc: 'Stack rooks on an open file for maximum pressure.', fen: '8/pp3ppp/8/8/8/8/PP3PPP/R2R2K1 w - - 0 1', expected: ['Rac1'], isBlack: false },
        { id: 'str8', idx: 'IV', title: 'Minority Attack', desc: 'Use fewer pawns to attack the opponent pawn structure.', expected: ['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3'], isBlack: false },
        { id: 'str9', idx: 'IV', title: 'Prophylactic Thinking', desc: 'Prevent what your opponent wants to do.', expected: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2'], isBlack: false },
        { id: 'str10', idx: 'IV', title: 'Space Advantage', desc: 'Control more squares and restrict opponent pieces.', expected: ['e4','e6','d4','d5','e5'], isBlack: false }
    ],
    fundamentals: [
        { id: 'fund1', idx: '0', title: 'Piece Movement: Pawns', desc: 'Pawns move forward 1 square, capture diagonally. First move can be 2 squares.', expected: ['e4','d5','exd5'], isBlack: false },
        { id: 'fund2', idx: '0', title: 'Piece Movement: Knights', desc: 'Knights move in an L-shape and can jump over pieces.', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', expected: ['Nf3','Nc6','Nc3'], isBlack: false },
        { id: 'fund3', idx: '0', title: 'Piece Movement: Bishops', desc: 'Bishops move diagonally any number of squares.', fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2', expected: ['Bc4'], isBlack: false },
        { id: 'fund4', idx: '0', title: 'How to Castle', desc: 'Castling moves King 2 squares toward a Rook. King and Rook must not have moved.', fen: 'rnbqk2r/pppp1ppp/4pn2/8/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', expected: ['O-O'], isBlack: false },
        { id: 'fund5', idx: '0', title: 'En Passant Capture', desc: 'When a pawn moves 2 squares beside your pawn, capture it "in passing".', fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', expected: ['exd6'], isBlack: false },
        { id: 'fund6', idx: '0', title: 'What is Check?', desc: 'Check means the King is under attack. You must escape.', fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', expected: ['Qh4+'], isBlack: true },
        { id: 'fund7', idx: '0', title: "Scholar's Mate", desc: 'The fastest checkmate in 4 moves.', expected: ['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#'], isBlack: false },
        { id: 'fund8', idx: '0', title: 'The Pin Tactic', desc: 'A pin restricts a piece from moving — it would expose a valuable piece.', fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2', expected: ['Bg5'], isBlack: false },
        { id: 'fund9', idx: '0', title: 'The Fork Tactic', desc: 'A fork attacks two or more pieces simultaneously.', fen: 'r1bqkb1r/pppppppp/2n2n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', expected: ['d4'], isBlack: false },
        { id: 'fund10', idx: '0', title: 'Controlling the Center', desc: 'The center (d4,d5,e4,e5) is the most important area.', expected: ['e4','e5','d4','exd4','Nf3'], isBlack: false },
    ]
};


let academyProgress = JSON.parse(localStorage.getItem('chessAcademyXP') || '{"xp":0,"completed":[]}');
let activeLesson = null;
let activeLessonStep = 0;
let academyMode = 'theory'; // theory or practice

// ═══════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════
const boardEl           = document.getElementById('board');
const evalContainer     = document.getElementById('evalContainer');
const evalBar           = document.getElementById('evalBar');
const evalText          = document.getElementById('evalText');
const engineStatusEl    = document.getElementById('engineStatus');
const statusDot         = engineStatusEl.querySelector('.status-dot');
const movesListEl       = document.getElementById('movesList');
const promotionModal    = document.getElementById('promotionModal');
const gameResultEl      = document.getElementById('gameResult');

// ═══════════════════════════════════════════════════
// STOCKFISH ENGINE
// ═══════════════════════════════════════════════════
const STOCKFISH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
let engine = null;
let engineReady = false;

async function initEngine() {
    try {
        // Cross-origin workers need a blob URL wrapper
        const workerCode = `importScripts("${STOCKFISH_CDN}");`;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        engine = new Worker(blobUrl);
        engine.onmessage = onEngineMessage;
        engine.onerror = (e) => {
            console.error('Stockfish worker error:', e);
            setEngineStatus('error', 'Engine failed to load');
        };
        engine.postMessage('uci');
    } catch (e) {
        console.error('Stockfish load failed:', e);
        setEngineStatus('error', 'Engine unavailable');
    }
}

function onEngineMessage(event) {
    const line = event.data;

    if (line === 'uciok') {
        engineReady = true;
        engine.postMessage('isready');
    } else if (line === 'readyok') {
        setEngineStatus('ready', 'Engine Ready');
    } else if (typeof line === 'string' && line.startsWith('bestmove')) {
        const match = line.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (match && (mode === 'play' || (mode === 'academy' && activeLesson && activeLesson.playVsEngine))) {
            const isHuman = mode === 'academy' && activeLesson && activeLesson.playVsEngine && chess.turn() === (activeLesson.isBlack ? 'b' : 'w');
            if (!isHuman) {
                // Delay AI move significantly for realistic feel, giving 0.5s for previous animations to finish
                setTimeout(() => { executeEngineMove(match[1]); }, typeof engineDelay !== 'undefined' ? Math.max(engineDelay, 1500) : 1500);
            }
        }
        if (mode === 'analyze' || (mode === 'academy' && activeLesson && !activeLesson.playVsEngine)) {
            setEngineStatus('ready', 'Analysis complete');
        } else if (mode === 'academy' && activeLesson && activeLesson.playVsEngine) {
            const isHuman = chess.turn() === (activeLesson.isBlack ? 'b' : 'w');
            if (isHuman) setEngineStatus('ready', 'Awaiting your move...');
        }
    } else if (typeof line === 'string' && line.includes('score')) {
        parseEvalFromInfo(line);
        const pvMatch = line.match(/pv ([a-h][1-8])([a-h][1-8])[qrbn]?/);
        
        // --- Interactive Coach Branch ---
        if (pvMatch && mode === 'play' && typeof coachModeEnabled !== 'undefined' && coachModeEnabled && chess.turn() !== aiColor) {
            const hintDiv = document.getElementById('coachHintHud');
            const hintText = document.getElementById('coachHintText');
            if (hintDiv) hintDiv.classList.add('active');
            
            const evalStr = document.getElementById('evalText') ? document.getElementById('evalText').textContent : '';
            const evalBadge = `<span style="padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); font-family:'JetBrains Mono', monospace; border:1px solid rgba(255,255,255,0.1);">${evalStr}</span>`;
            
            const opText = currentOpeningText || "Standard Position";
            if (hintText) hintText.innerHTML = `<strong>Opening:</strong> ${opText}<br><div style="margin-top:6px; display:flex; align-items:center; gap:8px;"><strong>Eval:</strong> ${evalBadge}</div><div style="margin-top:6px;"><strong>Suggestion:</strong> Play <span class="text-neon-blue" style="font-weight:700;">${pvMatch[1]} &rarr; ${pvMatch[2]}</span></div>`;
            
            clearTheoryHighlights();
            const fromEl = document.getElementById(`sq-${pvMatch[1]}`);
            const toEl = document.getElementById(`sq-${pvMatch[2]}`);
            if (fromEl) fromEl.classList.add('theory-highlight');
            if (toEl) toEl.classList.add('theory-highlight');
            drawTheoryArrow(pvMatch[1], pvMatch[2]);
        }
        // --- Academy Theory Branch ---
        else if (pvMatch && mode === 'academy' && academyMode === 'theory' && activeLesson && activeLesson.playVsEngine) {
            const isHuman = chess.turn() === (activeLesson.isBlack ? 'b' : 'w');
            if (isHuman) {
                document.getElementById('academyHintText').innerHTML = `Theory Mode Guidance: Play to <strong class="text-neon-blue">${pvMatch[2]}</strong>`;
                clearTheoryHighlights();
                const fromEl = document.getElementById(`sq-${pvMatch[1]}`);
                const toEl = document.getElementById(`sq-${pvMatch[2]}`);
                if (fromEl) fromEl.classList.add('theory-highlight');
                if (toEl) toEl.classList.add('theory-highlight');
                drawTheoryArrow(pvMatch[1], pvMatch[2]);
            }
        }
    }
}

function setEngineStatus(state, text) {
    statusDot.className = 'status-dot ' + state;
    // Update text node (second child)
    const textNodes = [...engineStatusEl.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
    if (textNodes.length) textNodes[0].textContent = ' ' + text;
    else engineStatusEl.appendChild(document.createTextNode(' ' + text));
}

function parseEvalFromInfo(line) {
    const depthMatch = line.match(/depth (\d+)/);
    if (!depthMatch) return;

    let score = 0;
    let evalStr = '0.0';
    const isBlackTurn = chess.turn() === 'b';

    const mateMatch = line.match(/score mate (-?\d+)/);
    const cpMatch   = line.match(/score cp (-?\d+)/);

    if (mateMatch) {
        let mates = parseInt(mateMatch[1]);
        if (isBlackTurn) mates = -mates;
        score = mates > 0 ? 9999 : -9999;
        evalStr = (mates > 0 ? '+' : '') + 'M' + Math.abs(mates);
    } else if (cpMatch) {
        let cp = parseInt(cpMatch[1]);
        if (isBlackTurn) cp = -cp;
        score = cp;
        evalStr = (cp > 0 ? '+' : '') + (cp / 100).toFixed(1);
    } else {
        return;
    }

    evalText.textContent = evalStr;
    // Map score to bar height: 50% = even, clamped 3%–97%
    let pct = 50 + (score / 100) * 8;
    pct = Math.max(3, Math.min(97, pct));
    evalBar.style.height = pct + '%';
}

function requestEngineAnalysis(depthOverride) {
    if (!engineReady || !engine) return;
    engine.postMessage('stop');
    engine.postMessage('position fen ' + chess.fen());

    if (mode === 'play') {
        if (chess.turn() === aiColor) {
            setEngineStatus('thinking', 'AI thinking...');
            engine.postMessage('go depth ' + aiLevel);
        } else if (typeof coachModeEnabled !== 'undefined' && coachModeEnabled) {
            evalContainer.classList.remove('hidden');
            setEngineStatus('thinking', 'Coach analyzing...');
            engine.postMessage('go depth 12');
        }
    } else if (mode === 'analyze') {
        evalContainer.classList.remove('hidden');
        setEngineStatus('thinking', 'Analyzing...');
        engine.postMessage('go depth ' + (depthOverride || 18));
    } else if (mode === 'academy') {
        if (activeLesson && activeLesson.playVsEngine) {
            const isHuman = chess.turn() === (activeLesson.isBlack ? 'b' : 'w');
            if (!isHuman) {
                setEngineStatus('thinking', 'AI thinking...');
                engine.postMessage('go depth 20');
            } else if (academyMode === 'theory') {
                engine.postMessage('go depth 12');
            }
        }
    }
}

function executeEngineMove(uci) {
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promo = uci.length > 4 ? uci[4] : undefined;

    try {
        const move = chess.move({ from, to, promotion: promo });
        if (move) commitMove(move);
    } catch (e) {
        console.error('Engine move failed:', e);
    }
    setEngineStatus('ready', 'Engine Ready');
}

// ═══════════════════════════════════════════════════
// BOARD RENDERING
// ═══════════════════════════════════════════════════
function buildBoard() {
    boardEl.innerHTML = '';
    const files = flipped ? 'hgfedcba'.split('') : 'abcdefgh'.split('');
    const ranks = flipped ? '12345678'.split('') : '87654321'.split('');

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const sq = files[f] + ranks[r];
            const isLight = (r + f) % 2 === 0;

            const el = document.createElement('div');
            el.className = 'square ' + (isLight ? 'light' : 'dark');
            el.dataset.sq = sq;
            el.id = 'sq-' + sq;

            // Coordinates on edges
            if (f === 0) {
                const lbl = document.createElement('span');
                lbl.className = 'coord-rank';
                lbl.textContent = ranks[r];
                el.appendChild(lbl);
            }
            if (r === 7) {
                const lbl = document.createElement('span');
                lbl.className = 'coord-file';
                lbl.textContent = files[f];
                el.appendChild(lbl);
            }

            // Move indicator dot (hidden by default)
            const dot = document.createElement('div');
            dot.className = 'move-dot hidden';
            el.appendChild(dot);

            el.addEventListener('click', onSquareClick);
            boardEl.appendChild(el);
        }
    }
    renderPosition();
}

function renderPosition() {
    // Mark all existing pieces as stale for diff-based rendering
    const existingPieces = Array.from(document.querySelectorAll('.piece'));
    existingPieces.forEach(p => p.dataset.stale = 'true');

    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('highlight', 'in-check', 'selected', 'can-capture');
        const dot = sq.querySelector('.move-dot');
        if (dot) dot.classList.add('hidden');
    });

    // Highlight last move
    lastMoveSquares.forEach(s => {
        const el = document.getElementById('sq-' + s);
        if (el) el.classList.add('highlight');
    });

    // King in check
    if (chess.isCheck()) {
        const board = chess.board();
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const p = board[r][f];
                if (p && p.type === 'k' && p.color === chess.turn()) {
                    const sq = 'abcdefgh'[f] + (8 - r);
                    const el = document.getElementById('sq-' + sq);
                    if (el) el.classList.add('in-check');
                }
            }
        }
    }

    // Draw pieces — two-pass approach to prevent scrambling
    const board = chess.board();

    // PASS 1: Claim pieces already on the correct square (these never move in the DOM)
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const p = board[r][f];
            if (p) {
                const sq = 'abcdefgh'[f] + (8 - r);
                const sqEl = document.getElementById('sq-' + sq);
                if (sqEl) {
                    const pieceId = `${p.color}${p.type}`;
                    const resident = existingPieces.find(el =>
                        el.dataset.stale === 'true' &&
                        el.parentElement === sqEl &&
                        el.dataset.pieceType === pieceId
                    );
                    if (resident) {
                        resident.dataset.stale = 'false';
                    }
                }
            }
        }
    }

    // PASS 2: For squares that still need a piece, grab any remaining stale piece of that type and move it
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const p = board[r][f];
            if (p) {
                const sq = 'abcdefgh'[f] + (8 - r);
                const sqEl = document.getElementById('sq-' + sq);
                if (sqEl) {
                    // Check if this square already has a claimed piece
                    const alreadyClaimed = sqEl.querySelector('.piece:not([data-stale="true"])');
                    if (alreadyClaimed) continue;

                    const pieceId = `${p.color}${p.type}`;
                    let pieceEl = existingPieces.find(el =>
                        el.dataset.stale === 'true' && el.dataset.pieceType === pieceId
                    );
                    if (pieceEl) {
                        pieceEl.dataset.stale = 'false';
                        
                        // FLIP Physics Animation
                        const beforeRect = pieceEl.getBoundingClientRect();
                        sqEl.appendChild(pieceEl);
                        const afterRect = pieceEl.getBoundingClientRect();
                        
                        if (beforeRect.left !== 0 && beforeRect.top !== 0 && (beforeRect.left !== afterRect.left || beforeRect.top !== afterRect.top)) {
                            const dx = beforeRect.left - afterRect.left;
                            const dy = beforeRect.top - afterRect.top;
                            
                            pieceEl.style.transition = 'none';
                            pieceEl.style.transform = `translate(${dx}px, ${dy}px)`;
                            
                            // Force reflow
                            pieceEl.getBoundingClientRect();
                            
                            pieceEl.style.transition = 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)';
                            pieceEl.style.transform = 'translate(0, 0)';
                        } else {
                            pieceEl.style.transition = 'none';
                            pieceEl.style.transform = 'none';
                        }
                    } else {
                        // Create brand new piece element
                        pieceEl = document.createElement('div');
                        pieceEl.className = 'piece';
                        pieceEl.dataset.pieceType = pieceId;
                        pieceEl.style.backgroundImage = `url(${PIECE_URLS[pieceId]})`;
                        sqEl.appendChild(pieceEl);
                    }
                }
            }
        }
    }

    // Remove captured pieces (anything still marked stale)
    document.querySelectorAll('[data-stale="true"]').forEach(p => p.remove());
    document.querySelectorAll('[data-stale="true"]').forEach(p => p.remove());
    updateCapturedPieces();
    updateMovesList();
    checkGameEnd();
}

function updateCapturedPieces() {
    const history = chess.history({ verbose: true });
    let whiteScore = 0, blackScore = 0;
    const piecesValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9 };
    
    // Count pieces currently on board
    let whitePieces = { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 };
    let blackPieces = { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 };
    
    const board = chess.board();
    for (const row of board) {
        for (const p of row) {
            if (!p) continue;
            if (p.color === 'w' && piecesValues[p.type]) whitePieces[p.type]++;
            if (p.color === 'b' && piecesValues[p.type]) blackPieces[p.type]++;
        }
    }
    
    // Starting pieces - current pieces = captured by opponent
    const starting = { 'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1 };
    
    let capturedByWhiteHTML = '';
    let capturedByBlackHTML = '';
    
    // Calculate differences and generate HTML
    for (const type of ['q', 'r', 'b', 'n', 'p']) {
        const whiteMissing = Math.max(0, starting[type] - whitePieces[type]);
        const blackMissing = Math.max(0, starting[type] - blackPieces[type]);
        
        // White missing means black captured them
        for(let i=0; i<whiteMissing; i++) {
            capturedByBlackHTML += `<div class="captured-piece-img" style="background-image:url(${PIECE_URLS['w'+type]})"></div>`;
            blackScore += piecesValues[type];
        }
        
        // Black missing means white captured them
        for(let i=0; i<blackMissing; i++) {
            capturedByWhiteHTML += `<div class="captured-piece-img" style="background-image:url(${PIECE_URLS['b'+type]})"></div>`;
            whiteScore += piecesValues[type];
        }
    }
    
    const wScoreEl = document.getElementById('capturedWhite');
    const bScoreEl = document.getElementById('capturedBlack');
    
    if (wScoreEl) {
        wScoreEl.innerHTML = capturedByWhiteHTML + (whiteScore > blackScore ? `<span class="capture-score">+${whiteScore - blackScore}</span>` : '');
    }
    if (bScoreEl) {
        bScoreEl.innerHTML = capturedByBlackHTML + (blackScore > whiteScore ? `<span class="capture-score">+${blackScore - whiteScore}</span>` : '');
    }
}

// ═══════════════════════════════════════════════════
// CLICK-TO-MOVE INTERACTION
// ═══════════════════════════════════════════════════
function onSquareClick(e) {
    // Block interaction during promotion
    if (!promotionModal.classList.contains('hidden')) return;

    // In play mode, block clicks when it's AI's turn
    if (mode === 'play' && chess.turn() === aiColor && !chess.isGameOver()) return;
    
    // In academy mode, block clicks if it's the AI's expected turn
    if (mode === 'academy') {
        if (activeLesson && activeLesson.expected) {
            const isHumanTurn = activeLesson.isBlack ? (activeLessonStep % 2 !== 0) : (activeLessonStep % 2 === 0);
            if (!isHumanTurn) return; // Wait for engine to auto-play this step
        }
        if (activeLesson && activeLesson.playVsEngine && chess.turn() !== (activeLesson.isBlack ? 'b' : 'w')) return;
    }

    // If browsing history in analyze mode, jump to latest before allowing moves
    if (mode === 'analyze' && currentMoveIdx < moveHistory.length - 1) {
        jumpToMove(moveHistory.length - 1);
    }

    const sq = e.currentTarget.dataset.sq;
    const piece = chess.get(sq);

    if (selectedSquare) {
        // Check if clicked square is a valid target
        const targetMove = validMovesForSelected.find(m => m.to === sq);
        if (targetMove) {
            if (targetMove.flags.includes('p')) {
                // Pawn promotion
                showPromotionPicker(targetMove.from, targetMove.to);
            } else {
                if (mode === 'academy' && activeLesson && activeLesson.expected) {
                    const testMove = chess.move({ from: targetMove.from, to: targetMove.to });
                    if (testMove) {
                        if (testMove.san === activeLesson.expected[activeLessonStep]) {
                            document.getElementById('snd-success')?.play().catch(()=>{});
                            activeLessonStep++;
                            commitMove(testMove);
                            checkAcademyProgress();
                        } else {
                            chess.undo();
                            document.getElementById('snd-error')?.play().catch(()=>{});
                            const pEl = document.querySelector(`#sq-${targetMove.from} .piece`);
                            if(pEl) {
                                pEl.classList.remove('shake-error');
                                void pEl.offsetWidth; // Trigger reflow for reset
                                pEl.classList.add('shake-error');
                            }
                        }
                    }
                } else {
                    const move = chess.move({ from: targetMove.from, to: targetMove.to });
                    if (move) commitMove(move);
                }
            }
            clearSelection();
            return;
        }
        // Clicked own piece → reselect
        if (piece && piece.color === chess.turn()) {
            selectSquare(sq);
            return;
        }
        clearSelection();
    } else {
        // Select a piece of the active color
        if (piece && piece.color === chess.turn()) {
            selectSquare(sq);
        }
    }
}

function selectSquare(sq) {
    clearSelection();
    selectedSquare = sq;
    document.getElementById('sq-' + sq).classList.add('selected');

    validMovesForSelected = chess.moves({ square: sq, verbose: true });

    validMovesForSelected.forEach(m => {
        const el = document.getElementById('sq-' + m.to);
        if (el) {
            if (m.captured) el.classList.add('can-capture');
            el.querySelector('.move-dot').classList.remove('hidden');
        }
    });
}

function clearSelection() {
    if (selectedSquare) {
        const el = document.getElementById('sq-' + selectedSquare);
        if (el) el.classList.remove('selected');
    }
    selectedSquare = null;
    validMovesForSelected = [];
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('can-capture');
        const dot = sq.querySelector('.move-dot');
        if (dot) dot.classList.add('hidden');
    });
}

// ═══════════════════════════════════════════════════
// PROMOTION PICKER
// ═══════════════════════════════════════════════════
function showPromotionPicker(from, to) {
    const color = chess.turn();
    const pieces = ['q', 'r', 'b', 'n'];
    const container = promotionModal.querySelector('.promo-pieces');
    container.innerHTML = '';

    pieces.forEach(p => {
        const el = document.createElement('div');
        el.className = 'piece-opt';
        el.style.backgroundImage = `url(${PIECE_URLS[color + p]})`;
        el.onclick = (ev) => {
            ev.stopPropagation();
            promotionModal.classList.add('hidden');
            try {
                const move = chess.move({ from, to, promotion: p });
                if (move) commitMove(move);
            } catch (e) { console.error(e); }
        };
        container.appendChild(el);
    });

    promotionModal.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// MOVE COMMIT & HISTORY
// ═══════════════════════════════════════════════════
function commitMove(move) {
    lastMoveSquares = [move.from, move.to];

    // Truncate future history if we're branching
    if (currentMoveIdx < moveHistory.length - 1) {
        moveHistory = moveHistory.slice(0, currentMoveIdx + 1);
    }

    moveHistory.push({
        san: move.san,
        from: move.from,
        to: move.to,
        fen: chess.fen(),
        flags: move.flags
    });
    currentMoveIdx = moveHistory.length - 1;

    // Play sound based on move characteristics
    playSound(move);

    if (move.captured) {
        const sqEl = document.getElementById('sq-' + move.to);
        if (sqEl) {
            const ripple = document.createElement('div');
            ripple.className = 'capture-ripple';
            sqEl.appendChild(ripple);
            setTimeout(() => { if (ripple.parentNode) ripple.remove(); }, 600);
        }
    }

    renderPosition();

    // Request engine analysis or AI move
    if (!chess.isGameOver()) {
        requestEngineAnalysis();
    }
}

function playSound(move) {
    if (mode === 'analyze') return; // Don't spam sounds during PGN load or scrolling
    
    try {
        if (chess.isGameOver()) {
            document.getElementById('snd-end').play().catch(()=>{});
        } else if (chess.isCheck()) {
            document.getElementById('snd-check').play().catch(()=>{});
        } else if (move.flags.includes('c') || move.flags.includes('e')) { // capture or en passant
            document.getElementById('snd-capture').play().catch(()=>{});
        } else if (move.flags.includes('k') || move.flags.includes('q')) { // castling
            document.getElementById('snd-castle').play().catch(()=>{});
        } else {
            document.getElementById('snd-move').play().catch(()=>{});
        }
    } catch(e) {}
}

function jumpToMove(idx) {
    if (idx < -1 || idx >= moveHistory.length) return;
    currentMoveIdx = idx;

    if (idx === -1) {
        chess = new Chess();
        lastMoveSquares = [];
    } else {
        chess.load(moveHistory[idx].fen);
        lastMoveSquares = [moveHistory[idx].from, moveHistory[idx].to];
    }

    clearSelection();
    renderPosition();

    if (engine) engine.postMessage('stop');
    if (mode === 'analyze' && !chess.isGameOver()) {
        requestEngineAnalysis();
    }
}

// ═══════════════════════════════════════════════════
// MOVES LIST UI
// ═══════════════════════════════════════════════════
function updateMovesList() {
    let html = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
        const m1 = moveHistory[i];
        const m2 = moveHistory[i + 1];
        const moveNum = Math.floor(i / 2) + 1;

        html += `<div class="move-row">`;
        html += `<span class="move-num">${moveNum}.</span>`;
        html += `<button class="move-btn ${currentMoveIdx === i ? 'active' : ''}" data-idx="${i}">${m1.san}</button>`;
        if (m2) {
            html += `<button class="move-btn ${currentMoveIdx === i + 1 ? 'active' : ''}" data-idx="${i + 1}">${m2.san}</button>`;
        }
        html += `</div>`;
    }
    movesListEl.innerHTML = html;

    // Scroll natively within the container itself to avoid scrolling the whole webpage!
    const active = movesListEl.querySelector('.move-btn.active');
    if (active) {
        movesListEl.scrollTo({
            top: active.offsetTop - movesListEl.offsetTop - (movesListEl.clientHeight / 2) + (active.clientHeight / 2),
            behavior: 'smooth'
        });
    }

    // Bind click handlers
    movesListEl.querySelectorAll('.move-btn').forEach(btn => {
        btn.onclick = () => jumpToMove(parseInt(btn.dataset.idx));
    });
}

// ═══════════════════════════════════════════════════
// GAME STATE CHECKS
// ═══════════════════════════════════════════════════
function checkGameEnd() {
    if (!chess.isGameOver()) {
        gameResultEl.classList.add('hidden');
        return;
    }

    let result = '';
    if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        result = `Checkmate! ${winner} wins.`;
    } else if (chess.isDraw()) {
        if (chess.isStalemate()) result = 'Draw — Stalemate';
        else if (chess.isThreefoldRepetition()) result = 'Draw — Threefold Repetition';
        else if (chess.isInsufficientMaterial()) result = 'Draw — Insufficient Material';
        else result = 'Draw — 50 Move Rule';
    }

    if (result) {
        gameResultEl.textContent = result;
        gameResultEl.classList.remove('hidden');
    }
}

// ═══════════════════════════════════════════════════
// UI EVENT BINDINGS
// ═══════════════════════════════════════════════════

// New game
document.getElementById('newGameBtn').addEventListener('click', () => {
    chess = new Chess();
    moveHistory = [];
    currentMoveIdx = -1;
    lastMoveSquares = [];

    aiLevel = parseInt(document.getElementById('aiLevel').value);
    const colorSel = document.getElementById('playerColor').value;
    if (colorSel === 'random') {
        aiColor = Math.random() > 0.5 ? 'w' : 'b';
    } else {
        aiColor = colorSel === 'w' ? 'b' : 'w';
    }

    flipped = (aiColor === 'w'); // Flip if AI plays white
    evalContainer.classList.add('hidden');
    gameResultEl.classList.add('hidden');
    buildBoard();

    if (aiColor === 'w') {
        requestEngineAnalysis(); // AI moves first
    }
});

// Load PGN
document.getElementById('loadPgnBtn').addEventListener('click', () => {
    const pgnText = document.getElementById('pgnInput').value.trim();
    if (!pgnText) return;

    const testChess = new Chess();
    try {
        testChess.loadPgn(pgnText);
    } catch (e) {
        alert('Invalid PGN. Please check the format and try again.');
        return;
    }

    // Rebuild history from the loaded PGN
    const history = testChess.history({ verbose: true });
    chess = new Chess();
    moveHistory = [];
    for (const h of history) {
        chess.move(h.san);
        moveHistory.push({ san: h.san, from: h.from, to: h.to, fen: chess.fen() });
    }
    currentMoveIdx = moveHistory.length - 1;
    lastMoveSquares = moveHistory.length > 0
        ? [moveHistory[currentMoveIdx].from, moveHistory[currentMoveIdx].to]
        : [];

    flipped = false;
    mode = 'analyze';
    evalContainer.classList.remove('hidden');
    buildBoard();
    requestEngineAnalysis();
});

const FAMOUS_GAMES = {
    opera: "1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8#",
    century: "1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#",
    immortal: "1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 c6 5. Qd2 b5 6. f3 Nbd7 7. Nge2 Nb6 8. a3 Nc4 9. Qc1 Nxe3 10. Qxe3 Bg7 11. h4 h5 12. O-O-O b4 13. axb4 Rb8 14. Na2 a5 15. b5 cxb5 16. Kb1 Qc7 17. Nf4 O-O 18. g4 hxg4 19. h5 e5 20. h6 exf4 21. Qxf4 Bh8 22. h7+ Nxh7 23. Qh6 f6 24. Qxg6+ Qg7 25. Bc4+ bxc4 26. Qxg7+ Kxg7 27. Rdh1 Ng5 28. fxg4 Bd7 29. Rh6 Nxe4 30. Rh7+ Kg6 31. Rxd7 c3 32. b3 Rbe8 33. R7h6+ Kg5 34. R1h5+ Kxg4 35. Rh4+ Kf5 36. Rh5+ Ke6 37. Rh7 c2+ 38. Kxc2 Rc8+ 39. Kb2 Bg7 40. Rxg7 Rc7 41. d5+ Kf5 42. Nc3 Rxc3 43. Rxe4 Kxe4 44. Kxc3",
    deepblue: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6 8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5 14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4",
    carlsen: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 h6 8. Bh4 Qb6 9. a3 Be7 10. Bf2 Qc7 11. Qf3 Nbd7 12. O-O-O b5 13. g4 g5 14. h4 gxf4 15. Be2 b4 16. axb4 Ne5 17. Qxf4 Nexg4 18. Bxg4 e5 19. Qxf6 Bxf6 20. Nd5 Qd8 21. Nf5 Bg5+ 22. hxg5 Bxf5 23. Bxf5 Qxg5+ 24. Be3 Qg2 25. Rdg1 Qe2 26. Re1 Qc4 27. Kb1 Rb8 28. Bb6 Kf8 29. Bc7 Rb7 30. Bxd6+ Ke8 31. Bxe5",
    evergreen: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#",
    brilliancy: "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 c5 5. a3 Ba5 6. Ne2 cxd4 7. exd4 O-O 8. Ng3 d5 9. c5 e5 10. dxe5 Ne4 11. Nxe4 dxe4 12. Qxd8 Rxd8 13. Bg5 Re8 14. Bb5 Nc6 15. Bxc6 bxc6 16. Ne2 Bf5 17. O-O Rab8 18. Nd4 Bb1 19. a4 Bxa4 20. Rxa4 Bxc3 21. bxc3 Rxb2 22. Ra1 Rb3 23. Kh1 Rxc3 24. f4 exf3 25. gxf3 Rc2",
    spassky: "1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4",
    zugzwang: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 Na5 9. Bc2 c5 10. d4 Qc7 11. Nbd2 O-O 12. Nf1 Nc6 13. d5 Nd8 14. Ne3 Ne8 15. g4 g6 16. Ng3 Ng7 17. Kh1 f6 18. Rg1 Rf7 19. g5 Bf8 20. gxf6 Rxf6 21. Nh5 Nxh5 22. Qxh5 Rf7 23. Ng5 Qf4 24. Nxf7 Qxf7 25. Qh6",
    alphazero: "1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 Nbd7 7. a3 c5 8. cxd5 Nxd5 9. Nxd5 exd5 10. dxc5 Nxc5 11. Be5 Bf5 12. Be2 Bf6 13. Bxf6 Qxf6 14. Nd4 Ne6 15. Nxf5 Qxf5 16. O-O Rfd8 17. Bg4 Qe5 18. Qb3 Nc5 19. Qb5 b6 20. Rfd1 h5 21. Bf3 d4 22. Rxd4"
};

const famousGamesSelect = document.getElementById('famousGames');
if (famousGamesSelect) {
    famousGamesSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        if (!key || !FAMOUS_GAMES[key]) return;
        
        document.getElementById('pgnInput').value = FAMOUS_GAMES[key];
        document.getElementById('loadPgnBtn').click();
        
        // Jump to the beginning of the game to start playback from the start
        jumpToMove(-1);
        
        // Ensure playback triggers
        setTimeout(() => {
            const btnAutoPlay = document.getElementById('btnAutoPlay');
            if (btnAutoPlay && !btnAutoPlay.classList.contains('active')) {
                btnAutoPlay.click();
            }
        }, 500);
    });
}


// Reset board
document.getElementById('resetBoardBtn').addEventListener('click', () => {
    chess = new Chess();
    moveHistory = [];
    currentMoveIdx = -1;
    lastMoveSquares = [];
    flipped = false;
    evalContainer.classList.remove('hidden');
    gameResultEl.classList.add('hidden');
    buildBoard();

    if (engine) engine.postMessage('stop');
    evalText.textContent = '0.0';
    evalBar.style.height = '50%';
});

// Move navigation buttons
document.getElementById('btnStart').onclick = () => jumpToMove(-1);
document.getElementById('btnPrev').onclick  = () => jumpToMove(currentMoveIdx - 1);
document.getElementById('btnNext').onclick  = () => jumpToMove(currentMoveIdx + 1);
document.getElementById('btnEnd').onclick   = () => jumpToMove(moveHistory.length - 1);

let autoPlayTimer = null;
let replaySpeed = 1200;
const btnAutoPlay = document.getElementById('btnAutoPlay');
if (btnAutoPlay) {
    btnAutoPlay.onclick = () => {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
            btnAutoPlay.classList.remove('active');
        } else {
            btnAutoPlay.classList.add('active');
            autoPlayTimer = setInterval(() => {
                if (currentMoveIdx >= moveHistory.length - 1) {
                    clearInterval(autoPlayTimer);
                    autoPlayTimer = null;
                    btnAutoPlay.classList.remove('active');
                } else {
                    jumpToMove(currentMoveIdx + 1);
                }
            }, replaySpeed);
        }
    };
}

// ═══════════════════════════════════════════════════
// DIFFICULTY LEVEL DESCRIPTIONS
// ═══════════════════════════════════════════════════
const DIFF_DESCS = {
    '1': '🟢 Perfect for absolute beginners. AI makes mistakes and plays slowly.',
    '5': '🟡 Intermediate level. AI plays reasonable moves with occasional blunders.',
    '10': '🟠 Club-level strength. Good for improving players (1600-1800 Elo).',
    '15': '🔴 Expert strength. Tactical and positional play near master level.',
    '20': '⚫ Full Grandmaster strength. Stockfish at maximum depth — extremely hard.'
};
document.getElementById('aiLevel')?.addEventListener('change', (e) => {
    const desc = document.getElementById('difficultyDesc');
    if (desc) desc.textContent = DIFF_DESCS[e.target.value] || '';
});

// ═══════════════════════════════════════════════════
// PGN FILE UPLOAD
// ═══════════════════════════════════════════════════
document.getElementById('pgnFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const pgnText = evt.target.result;
        document.getElementById('pgnInput').value = pgnText;
        document.getElementById('loadPgnBtn').click();
        // Auto start replay from beginning 
        setTimeout(() => {
            jumpToMove(-1);
            setTimeout(() => {
                startAutoReplay();
            }, 500);
        }, 300);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset so same file can be re-uploaded
});

// ═══════════════════════════════════════════════════
// PGN FILE DOWNLOAD
// ═══════════════════════════════════════════════════
document.getElementById('downloadPgnBtn')?.addEventListener('click', () => {
    let pgn = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        pgn += moveNum + '. ' + moveHistory[i].san;
        if (moveHistory[i + 1]) pgn += ' ' + moveHistory[i + 1].san + ' ';
        else pgn += ' ';
    }
    if (!pgn.trim()) { alert('No moves to download.'); return; }
    
    const header = `[Event "Web Chess Game"]\n[Site "chess.quickutils.top"]\n[Date "${new Date().toISOString().split('T')[0]}"]\n[White "Player"]\n[Black "Stockfish AI"]\n[Result "*"]\n\n`;
    const blob = new Blob([header + pgn.trim()], { type: 'application/x-chess-pgn' });
    const link = document.createElement('a');
    link.download = 'chess_game_' + Date.now() + '.pgn';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
});

// ═══════════════════════════════════════════════════
// AUTO-REPLAY WITH SMOOTH ANIMATIONS
// ═══════════════════════════════════════════════════
function startAutoReplay() {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }
    const btn = document.getElementById('btnAutoPlay') || document.getElementById('autoReplayBtn');
    if (btn) btn.classList.add('active');
    
    autoPlayTimer = setInterval(() => {
        if (currentMoveIdx >= moveHistory.length - 1) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
            if (btn) btn.classList.remove('active');
        } else {
            jumpToMove(currentMoveIdx + 1);
        }
    }, replaySpeed);
}

document.getElementById('autoReplayBtn')?.addEventListener('click', () => {
    if (moveHistory.length === 0) return;
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
        document.getElementById('autoReplayBtn')?.classList.remove('active');
    } else {
        if (currentMoveIdx >= moveHistory.length - 1) jumpToMove(-1);
        startAutoReplay();
    }
});

// Replay speed slider
const replaySlider = document.getElementById('replaySpeedSlider');
if (replaySlider) {
    replaySlider.addEventListener('input', (e) => {
        replaySpeed = parseInt(e.target.value);
        const label = document.getElementById('replaySpeedVal');
        if (label) label.textContent = (replaySpeed / 1000).toFixed(1) + 's';
        // If auto-replaying, restart with new speed
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            startAutoReplay();
        }
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); jumpToMove(currentMoveIdx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); jumpToMove(currentMoveIdx + 1); }
    if (e.key === 'Home')       { e.preventDefault(); jumpToMove(-1); }
    if (e.key === 'End')        { e.preventDefault(); jumpToMove(moveHistory.length - 1); }
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        btn.classList.add('active');
        const tab = btn.dataset.tab;
        mode = tab;
        document.getElementById('tab-' + tab).classList.remove('hidden');

        if (mode === 'analyze') {
            evalContainer.classList.remove('hidden');
            if (!chess.isGameOver()) requestEngineAnalysis();
        } else {
            evalContainer.classList.add('hidden');
            if (engine) engine.postMessage('stop');
        }
    });
});

// Theme toggle — uses shared qu_theme key for cross-project consistency
(function() {
    const saved = localStorage.getItem('qu_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('themeBtn').textContent = saved === 'light' ? '☀️' : '🌙';
    }
    document.getElementById('themeBtn').addEventListener('click', () => {
        const root = document.documentElement;
        const isDark = root.getAttribute('data-theme') === 'dark';
        root.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('qu_theme', root.getAttribute('data-theme'));
    });
})();

// ═══════════════════════════════════════════════════
// OPENING BOOK — detects common openings
// ═══════════════════════════════════════════════════
const OPENINGS = [
    { moves: 'e4 e5 Nf3 Nc6 Bb5', name: 'Ruy López' },
    { moves: 'e4 e5 Nf3 Nc6 Bc4', name: 'Italian Game' },
    { moves: 'e4 e5 Nf3 Nf6', name: 'Petroff Defense' },
    { moves: 'e4 c5', name: 'Sicilian Defense' },
    { moves: 'e4 c5 Nf3 d6 d4', name: 'Sicilian Open' },
    { moves: 'e4 c5 Nf3 Nc6', name: 'Sicilian Two Knights' },
    { moves: 'e4 e6', name: 'French Defense' },
    { moves: 'e4 c6', name: 'Caro-Kann Defense' },
    { moves: 'e4 d5', name: 'Scandinavian Defense' },
    { moves: 'd4 d5 c4', name: "Queen's Gambit" },
    { moves: 'd4 d5 c4 e6', name: "Queen's Gambit Declined" },
    { moves: 'd4 d5 c4 dxc4', name: "Queen's Gambit Accepted" },
    { moves: 'd4 Nf6 c4 g6', name: "King's Indian Defense" },
    { moves: 'd4 Nf6 c4 e6 Nc3 Bb4', name: 'Nimzo-Indian Defense' },
    { moves: 'e4 e5 f4', name: "King's Gambit" },
    { moves: 'e4 e5 Nf3 Nc6 d4', name: 'Scotch Game' },
    { moves: 'Nf3 d5 c4', name: 'Réti Opening' },
    { moves: 'c4', name: 'English Opening' },
    { moves: 'e4 e5', name: 'Open Game' },
    { moves: 'd4 d5', name: 'Closed Game' },
];

function detectOpening() {
    const history = chess.history();
    const movesStr = history.join(' ');
    let bestMatch = null;
    for (const op of OPENINGS) {
        if (movesStr.startsWith(op.moves) && (!bestMatch || op.moves.length > bestMatch.moves.length)) {
            bestMatch = op;
        }
    }
    const el = document.getElementById('openingName');
    if (el) el.textContent = bestMatch ? bestMatch.name : '';
}

// ═══════════════════════════════════════════════════
// UTILITY BUTTONS — Export PGN, Copy FEN, Flip
// ═══════════════════════════════════════════════════
document.getElementById('exportPgn').addEventListener('click', () => {
    let pgn = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        pgn += moveNum + '. ' + moveHistory[i].san;
        if (moveHistory[i + 1]) pgn += ' ' + moveHistory[i + 1].san + ' ';
        else pgn += ' ';
    }
    navigator.clipboard.writeText(pgn.trim()).then(() => {
        const btn = document.getElementById('exportPgn');
        const orig = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = orig, 1500);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = pgn.trim();
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
    });
});

document.getElementById('copyFen').addEventListener('click', () => {
    navigator.clipboard.writeText(chess.fen()).then(() => {
        const btn = document.getElementById('copyFen');
        const orig = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = orig, 1500);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = chess.fen();
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
    });
});

document.getElementById('flipBoard').addEventListener('click', () => {
    const wrap = document.querySelector('.board-wrapper');
    if (wrap) {
        wrap.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        wrap.style.transform = flipped ? 'rotateY(-180deg)' : 'rotateY(180deg)';
        setTimeout(() => {
            flipped = !flipped;
            buildBoard();
            wrap.style.transition = 'none';
            wrap.style.transform = 'none';
        }, 300);
    } else {
        flipped = !flipped;
        buildBoard();
    }
});

// ═══════════════════════════════════════════════════
// DRAG-AND-DROP PIECE MOVEMENT
// ═══════════════════════════════════════════════════
let dragPiece = null;
let dragFrom = null;
let dragGhost = null;

function onPieceDragStart(e) {
    if (!promotionModal.classList.contains('hidden')) return;
    if (mode === 'play' && chess.turn() === aiColor && !chess.isGameOver()) return;
    
    // In academy mode, block clicks if it's the AI's expected turn
    if (mode === 'academy') {
        if (activeLesson && activeLesson.expected) {
            const isHumanTurn = activeLesson.isBlack ? (activeLessonStep % 2 !== 0) : (activeLessonStep % 2 === 0);
            if (!isHumanTurn) return; // Engine is moving
        }
        if (activeLesson && activeLesson.playVsEngine && chess.turn() !== (activeLesson.isBlack ? 'b' : 'w')) return;
    }

    if (mode === 'analyze' && currentMoveIdx < moveHistory.length - 1) {
        jumpToMove(moveHistory.length - 1);
    }
    
    const sqEl = e.target.closest('.square');
    if (!sqEl) return;
    const sq = sqEl.dataset.sq;
    const piece = chess.get(sq);
    if (!piece || piece.color !== chess.turn()) return;
    
    e.preventDefault();
    dragFrom = sq;
    dragPiece = e.target;
    
    // Create ghost
    dragGhost = dragPiece.cloneNode(true);
    dragGhost.style.position = 'fixed';
    dragGhost.style.width = sqEl.offsetWidth + 'px';
    dragGhost.style.height = sqEl.offsetHeight + 'px';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.zIndex = '9999';
    dragGhost.style.opacity = '0.85';
    document.body.appendChild(dragGhost);
    
    dragPiece.style.opacity = '0.3';
    selectSquare(sq);
    moveDragGhost(e);
}

function moveDragGhost(e) {
    if (!dragGhost) return;
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - dragGhost.offsetWidth / 2;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - dragGhost.offsetHeight / 2;
    dragGhost.style.left = x + 'px';
    dragGhost.style.top = y + 'px';
}

function onPieceDragEnd(e) {
    if (!dragFrom || !dragGhost) return;
    
    const x = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const y = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    dragGhost.remove();
    dragGhost = null;
    if (dragPiece) dragPiece.style.opacity = '1';
    
    // Find drop square
    const el = document.elementFromPoint(x, y);
    const sqEl = el ? el.closest('.square') : null;
    
    if (sqEl) {
        const to = sqEl.dataset.sq;
        const targetMove = validMovesForSelected.find(m => m.to === to);
        if (targetMove) {
            if (targetMove.flags.includes('p')) {
                showPromotionPicker(targetMove.from, targetMove.to);
            } else {
                if (mode === 'academy' && activeLesson && activeLesson.expected) {
                    const testMove = chess.move({ from: targetMove.from, to: targetMove.to });
                    if (testMove) {
                        if (testMove.san === activeLesson.expected[activeLessonStep]) {
                            document.getElementById('snd-success')?.play().catch(()=>{});
                            activeLessonStep++;
                            commitMove(testMove);
                            checkAcademyProgress();
                        } else {
                            chess.undo();
                            document.getElementById('snd-error')?.play().catch(()=>{});
                            const pEl = document.querySelector(`#sq-${targetMove.from} .piece`);
                            if(pEl) {
                                pEl.classList.remove('shake-error');
                                void pEl.offsetWidth; // Trigger reflow
                                pEl.classList.add('shake-error');
                            }
                        }
                    }
                } else {
                    const move = chess.move({ from: targetMove.from, to: targetMove.to });
                    if (move) commitMove(move);
                }
            }
        }
    }
    
    dragFrom = null;
    dragPiece = null;
    clearSelection();
}

boardEl.addEventListener('mousedown', e => {
    if (e.target.classList.contains('piece')) onPieceDragStart(e);
});
document.addEventListener('mousemove', moveDragGhost);
document.addEventListener('mouseup', onPieceDragEnd);

boardEl.addEventListener('touchstart', e => {
    if (e.target.classList.contains('piece')) onPieceDragStart(e);
}, { passive: false });
document.addEventListener('touchmove', e => {
    if (dragGhost) { e.preventDefault(); moveDragGhost(e); }
}, { passive: false });
document.addEventListener('touchend', onPieceDragEnd);

// Hook opening detection into commitMove
const origCommitMove = commitMove;
commitMove = function(move) {
    origCommitMove(move);
    detectOpening();
};

// ═══════════════════════════════════════════════════
// BOARD THEMES
// ═══════════════════════════════════════════════════
const BOARD_THEMES = {
    classic:  { light: '#f0d9b5', dark: '#b58863' },
    emerald:  { light: '#eeeed2', dark: '#769656' },
    midnight: { light: '#dee3e6', dark: '#4b7399' },
    marble:   { light: '#e8e0d0', dark: '#8b7d6b' },
};

document.getElementById('boardTheme').addEventListener('change', (e) => {
    const theme = BOARD_THEMES[e.target.value];
    if (theme) {
        document.documentElement.style.setProperty('--board-light', theme.light);
        document.documentElement.style.setProperty('--board-dark', theme.dark);
    }
});

// ═══════════════════════════════════════════════════
// MOVE TIMING SLIDER
// ═══════════════════════════════════════════════════
let engineDelay = 1200;
document.getElementById('moveTimingSlider').addEventListener('input', (e) => {
    engineDelay = parseInt(e.target.value);
    document.getElementById('moveTimingVal').textContent = (engineDelay / 1000).toFixed(1) + 's';
});

// ═══════════════════════════════════════════════════
// ACADEMY LOGIC & CURRICULUM
// ═══════════════════════════════════════════════════

function saveAcademyProgress() {
    localStorage.setItem('chessAcademyXP', JSON.stringify(academyProgress));
    updateAcademyUI();
}

function updateAcademyUI() {
    document.getElementById('academyXp').textContent = academyProgress.xp;
    document.getElementById('academyStreak').textContent = calculateStreak();
    
    // Calculate Elo based on completed
    let elo = 800 + (academyProgress.completed.length * 25);
    document.getElementById('academyElo').textContent = academyProgress.completed.length === 0 ? "Unranked" : Math.min(elo, 2500);

    const ops = ACADEMY_DB.openings.length;
    const tacs = ACADEMY_DB.tactics.length;
    const ends = ACADEMY_DB.endgame.length;
    const funds = ACADEMY_DB.fundamentals.length;
    const strs = ACADEMY_DB.strategy.length;

    const compOps = academyProgress.completed.filter(id => id.startsWith('op')).length;
    const compTacs = academyProgress.completed.filter(id => id.startsWith('tac')).length;
    const compEnds = academyProgress.completed.filter(id => id.startsWith('end')).length;
    const compFunds = academyProgress.completed.filter(id => id.startsWith('fund')).length;
    const compStrs = academyProgress.completed.filter(id => id.startsWith('str')).length;

    document.getElementById('ac-prog-ops').textContent = Math.round((compOps / ops) * 100) + '%';
    document.getElementById('ac-prog-tac').textContent = Math.round((compTacs / tacs) * 100) + '%';
    document.getElementById('ac-prog-end').textContent = Math.round((compEnds / ends) * 100) + '%';
    const fundEl = document.getElementById('ac-prog-fund');
    if (fundEl) fundEl.textContent = Math.round((compFunds / funds) * 100) + '%';
    const strEl = document.getElementById('ac-prog-str');
    if (strEl) strEl.textContent = Math.round((compStrs / strs) * 100) + '%';
}

function calculateStreak() {
    const today = new Date().toDateString();
    if (academyProgress.lastActive === today) return academyProgress.streak || 1;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (academyProgress.lastActive === yesterday.toDateString()) {
        academyProgress.streak = (academyProgress.streak || 0) + 1;
        academyProgress.lastActive = today;
        return academyProgress.streak;
    }
    
    academyProgress.streak = 1;
    academyProgress.lastActive = today;
    return 1;
}

function drawTheoryArrow(fromMove, toMove) {
    const board = document.getElementById('board');
    let svg = document.getElementById('theory-svg');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "theory-svg";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "100";
        
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        marker.setAttribute("markerWidth", "6");
        marker.setAttribute("markerHeight", "5");
        marker.setAttribute("refX", "4.5");
        marker.setAttribute("refY", "2.5");
        marker.setAttribute("orient", "auto");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 6 2.5, 0 5");
        polygon.setAttribute("fill", "rgba(59, 130, 246, 0.8)"); // Premium Blue

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        board.appendChild(svg);
        board.style.position = "relative";
        
        window.addEventListener('resize', () => { if(document.getElementById('theory-arrow-line')) clearTheoryArrow(); });
    }
    
    const fromEl = document.getElementById('sq-' + fromMove);
    const toEl = document.getElementById('sq-' + toMove);
    if (!fromEl || !toEl) return;
    
    // Account for board flipped state indirectly using bounding client layout
    const boardRect = board.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    
    const x1 = fromRect.left - boardRect.left + (fromRect.width/2);
    const y1 = fromRect.top - boardRect.top + (fromRect.height/2);
    const x2 = toRect.left - boardRect.left + (toRect.width/2);
    const y2 = toRect.top - boardRect.top + (toRect.height/2);
    
    let line = document.getElementById('theory-arrow-line');
    if (!line) {
        line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.id = 'theory-arrow-line';
        line.setAttribute("stroke", "rgba(59, 130, 246, 0.8)"); // Premium Blue
        line.setAttribute("stroke-width", "4.5");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-opacity", "1");
        line.setAttribute("marker-end", "url(#arrowhead)");
        svg.appendChild(line);
    }
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
}

function clearTheoryArrow() {
    const line = document.getElementById('theory-arrow-line');
    if (line) line.remove();
}

function clearTheoryHighlights() {
    document.querySelectorAll('.theory-highlight').forEach(el => el.classList.remove('theory-highlight'));
    clearTheoryArrow();
}

function checkAcademyProgress() {
    clearTheoryHighlights();
    if (!activeLesson || (!activeLesson.expected && !activeLesson.playVsEngine)) return;
    
    if (activeLesson.expected && activeLessonStep >= activeLesson.expected.length) {
        document.getElementById('academyHintText').innerHTML = '<strong>Lesson Complete! 🎉</strong> +50 XP';
        document.getElementById('snd-end')?.play().catch(()=>{});
        
        if (!academyProgress.completed.includes(activeLesson.id)) {
            academyProgress.completed.push(activeLesson.id);
            academyProgress.xp += 50;
            saveAcademyProgress();
            buildAcademyList();
        }
    } else if (activeLesson.expected) {
        const isHumanTurn = activeLesson.isBlack ? (activeLessonStep % 2 !== 0) : (activeLessonStep % 2 === 0);
        if (isHumanTurn) {
            const nextMove = activeLesson.expected[activeLessonStep];
            if (academyMode === 'theory') {
                document.getElementById('academyHintText').innerHTML = `Theory Mode: Play <strong class="text-neon-blue" style="font-size: 1.1rem">${nextMove}</strong>`;
                document.getElementById('btnAcademyHint')?.classList.add('hidden');
                
                // Highlight the specific engine squares natively
                const movesList = chess.moves({ verbose: true });
                const matchingMove = movesList.find(m => m.san === nextMove);
                if (matchingMove) {
                    const sqFrom = document.getElementById(`sq-${matchingMove.from}`);
                    const sqTo = document.getElementById(`sq-${matchingMove.to}`);
                    if (sqFrom) sqFrom.classList.add('theory-highlight');
                    if (sqTo) sqTo.classList.add('theory-highlight');
                    drawTheoryArrow(matchingMove.from, matchingMove.to);
                }
            } else {
                document.getElementById('academyHintText').textContent = 'Your turn. Find the best move.';
                document.getElementById('btnAcademyHint')?.classList.remove('hidden');
            }
        } else {
            document.getElementById('academyHintText').textContent = 'Engine is responding...';
            document.getElementById('btnAcademyHint')?.classList.add('hidden');
            
            // Auto play engine expected move
            setTimeout(() => {
                const testMove = chess.move(activeLesson.expected[activeLessonStep]);
                if (testMove) {
                    commitMove(testMove);
                    activeLessonStep++;
                    checkAcademyProgress();
                }
            }, 1500);
        }
    } else if (activeLesson.playVsEngine) {
        document.getElementById('academyHintText').textContent = 'Beat Stockfish from this position!';
        document.getElementById('btnAcademyHint')?.classList.add('hidden');
    }
}

function loadLesson(lesson) {
    activeLesson = lesson;
    activeLessonStep = 0;
    
    document.getElementById('academyCategories').classList.add('hidden');
    document.getElementById('academyActiveLesson').classList.remove('hidden');
    
    document.getElementById('al-title').textContent = lesson.title;
    document.getElementById('al-desc').textContent = lesson.desc || "Follow the moves to complete the lesson.";
    
    document.getElementById('academyHintText').textContent = "Starting lesson...";
    document.getElementById('btnAcademyHint')?.classList.add('hidden');

    chess = new Chess();
    if (lesson.pgn && typeof lesson.pgn === 'string') {
        const temp = new Chess();
        temp.loadPgn(lesson.pgn);
        // Load partial history
    } else if (lesson.fen) {
        chess.load(lesson.fen);
    }
    
    moveHistory = [];
    currentMoveIdx = -1;
    flipped = activeLesson.isBlack;
    buildBoard();
    
    // Start engine if needed
    if (activeLesson.playVsEngine) {
        requestEngineAnalysis();
    } else {
        checkAcademyProgress();
    }
}

document.getElementById('btnBackToAcademy')?.addEventListener('click', () => {
    document.getElementById('academyActiveLesson').classList.add('hidden');
    document.getElementById('academyCategories').classList.remove('hidden');
    activeLesson = null;
    activeLessonStep = 0;
});

document.querySelectorAll('.tab-btn[data-atab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn[data-atab]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        academyMode = e.target.dataset.atab;
        checkAcademyProgress(); 
    });
});

document.getElementById('btnAcademyHint')?.addEventListener('click', () => {
    if (activeLesson && activeLesson.expected && activeLessonStep < activeLesson.expected.length) {
        const m = activeLesson.expected[activeLessonStep];
        document.getElementById('academyHintText').innerHTML = `Hint: The move is <strong>${m}</strong>`;
        academyProgress.xp = Math.max(0, academyProgress.xp - 5); // Penalty
        saveAcademyProgress();
    }
});

function buildAcademyList() {
    ['fundamentals', 'openings', 'tactics', 'endgame', 'strategy'].forEach(cat => {
        const el = document.getElementById('ac-list-' + cat);
        if (!el) return;
        el.innerHTML = '';
        ACADEMY_DB[cat].forEach(item => {
            const div = document.createElement('div');
            const isComp = academyProgress.completed.includes(item.id);
            div.className = 'ac-item ' + (isComp ? 'completed' : '');
            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.9rem;">${isComp ? '✅' : '⬜'}</span>
                    <div>
                        <span class="ac-item-title">${item.title}</span>
                        ${item.desc ? `<p style="font-size:0.68rem;color:var(--text-muted);margin:2px 0 0 0;line-height:1.3;">${item.desc}</p>` : ''}
                    </div>
                </div>
            `;
            div.onclick = () => loadLesson(item);
            el.appendChild(div);
        });
    });
    updateAcademyUI();
}

// ═══════════════════════════════════════════════════
// SOUND TOGGLE
// ═══════════════════════════════════════════════════
let soundMuted = localStorage.getItem('chess_muted') === 'true';

const btnSoundToggle = document.getElementById('btnSoundToggle');
if (btnSoundToggle) {
    if (soundMuted) btnSoundToggle.classList.add('muted');
    btnSoundToggle.textContent = soundMuted ? '🔇' : '🔊';
    btnSoundToggle.addEventListener('click', () => {
        soundMuted = !soundMuted;
        localStorage.setItem('chess_muted', soundMuted);
        btnSoundToggle.textContent = soundMuted ? '🔇' : '🔊';
        btnSoundToggle.classList.toggle('muted', soundMuted);
    });
}

// Override playSound to respect mute
const _originalPlaySound = playSound;
playSound = function(move) {
    if (soundMuted) return;
    _originalPlaySound(move);
};

// ═══════════════════════════════════════════════════
// FULLSCREEN MODE
// ═══════════════════════════════════════════════════
const btnFullscreen = document.getElementById('btnFullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        const boardWrap = document.querySelector('.board-wrapper');
        if (!document.fullscreenElement) {
            (boardWrap || document.documentElement).requestFullscreen?.().catch(() => {});
            btnFullscreen.textContent = '⛶';
        } else {
            document.exitFullscreen?.();
            btnFullscreen.textContent = '⛶';
        }
    });
    document.addEventListener('fullscreenchange', () => {
        btnFullscreen.textContent = document.fullscreenElement ? '✕' : '⛶';
    });
}

// ═══════════════════════════════════════════════════
// GAME CLOCK (Fischer increment)
// ═══════════════════════════════════════════════════
let clockEnabled = false;
let clockWhite = 600000;   // 10 minutes in ms
let clockBlack = 600000;
let clockIncrement = 0;    // ms
let clockInterval = null;
let clockLastTick = 0;

const clockWhiteEl = document.getElementById('clockWhite');
const clockBlackEl = document.getElementById('clockBlack');

function formatClock(ms) {
    if (ms <= 0) return '0:00';
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

function updateClockDisplay() {
    if (!clockWhiteEl || !clockBlackEl) return;
    clockWhiteEl.textContent = formatClock(clockWhite);
    clockBlackEl.textContent = formatClock(clockBlack);
    
    // Active side highlight
    clockWhiteEl.classList.toggle('active-clock', chess.turn() === 'w' && !chess.isGameOver());
    clockBlackEl.classList.toggle('active-clock', chess.turn() === 'b' && !chess.isGameOver());
    
    // Low time warning
    clockWhiteEl.classList.toggle('low-time', clockWhite < 30000 && clockWhite > 0);
    clockBlackEl.classList.toggle('low-time', clockBlack < 30000 && clockBlack > 0);
}

function tickClock() {
    if (!clockEnabled || chess.isGameOver()) {
        stopClock();
        return;
    }
    const now = performance.now();
    const dt = now - clockLastTick;
    clockLastTick = now;
    
    if (chess.turn() === 'w') {
        clockWhite -= dt;
        if (clockWhite <= 0) {
            clockWhite = 0;
            gameResultEl.textContent = 'White lost on time! Black wins.';
            gameResultEl.classList.remove('hidden');
            stopClock();
        }
    } else {
        clockBlack -= dt;
        if (clockBlack <= 0) {
            clockBlack = 0;
            gameResultEl.textContent = 'Black lost on time! White wins.';
            gameResultEl.classList.remove('hidden');
            stopClock();
        }
    }
    updateClockDisplay();
}

function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    clockLastTick = performance.now();
    clockInterval = setInterval(tickClock, 100);
}

function stopClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}

// Hook into commitMove for clock increment
const _origCommitMove = commitMove;
commitMove = function(move) {
    if (clockEnabled && mode === 'play') {
        // Add increment for the side that just moved
        const movingSide = move.color;
        if (movingSide === 'w') clockWhite += clockIncrement;
        else clockBlack += clockIncrement;
        updateClockDisplay();
    }
    _origCommitMove(move);
    // Also detect opening after each move
    detectOpening();
};

// Clock control selector
const clockSelect = document.getElementById('clockSelect');
if (clockSelect) {
    clockSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'none') {
            clockEnabled = false;
            stopClock();
        } else {
            clockEnabled = true;
            const [baseMin, inc] = val.split('+').map(Number);
            clockWhite = baseMin * 60000;
            clockBlack = baseMin * 60000;
            clockIncrement = (inc || 0) * 1000;
        }
        updateClockDisplay();
    });
}

// ═══════════════════════════════════════════════════
// COACH MODE TOGGLE
// ═══════════════════════════════════════════════════
let coachModeEnabled = false;
const coachToggleBtn = document.getElementById('coachToggleBtn');
if (coachToggleBtn) {
    coachToggleBtn.addEventListener('change', (e) => {
        coachModeEnabled = e.target.checked;
        const hintDiv = document.getElementById('coachHintHud');
        if (!coachModeEnabled) {
            if (hintDiv) hintDiv.classList.remove('active');
            clearTheoryHighlights();
            engine.postMessage('stop');
        } else {
            if (hintDiv) hintDiv.classList.add('active');
            // Immediately request analysis if it's currently our turn
            if (mode === 'play' && chess.turn() !== aiColor && !chess.isGameOver()) {
                requestEngineAnalysis();
            }
        }
    });
}

// ═══════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════
initEngine();
buildBoard();
buildAcademyList();
updateClockDisplay();

