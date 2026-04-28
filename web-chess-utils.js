/* ═══════════════════════════════════════════════════
   Web Chess Utilities — Pure Functions Module
   ═══════════════════════════════════════════════════ */

// ── FEN Parser ──
export function parseFEN(fen) {
    if (!fen || typeof fen !== 'string') return null;
    const parts = fen.split(' ');
    if (parts.length < 4) return null;
    const rows = parts[0].split('/');
    if (rows.length !== 8) return null;
    return { position: parts[0], turn: parts[1] || 'w', castling: parts[2] || '-', enPassant: parts[3] || '-',
        halfmove: parseInt(parts[4]) || 0, fullmove: parseInt(parts[5]) || 1 };
}

// ── Opening Detection ──
export const OPENINGS_DB = {
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR': 'King\'s Pawn Opening',
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR': 'Queen\'s Pawn Opening',
    'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR': 'English Opening',
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR': 'Open Game',
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R': 'King\'s Knight Opening',
    'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR': 'Alekhine\'s Defense',
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR': 'Sicilian Defense',
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR': 'French Defense',
    'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR': 'Pirc Defense',
};

export function detectOpening(fen) {
    if (!fen) return null;
    const position = fen.split(' ')[0];
    return OPENINGS_DB[position] || null;
}

// ── Move Classification ──
export function classifyEvalDiff(diff) {
    const abs = Math.abs(diff);
    if (abs >= 3.0) return { type: 'blunder', icon: '??', color: '#ef4444' };
    if (abs >= 1.5) return { type: 'mistake', icon: '?', color: '#f97316' };
    if (abs >= 0.5) return { type: 'inaccuracy', icon: '?!', color: '#eab308' };
    if (abs <= 0.1) return { type: 'best', icon: '!', color: '#22c55e' };
    return { type: 'good', icon: '', color: '#94a3b8' };
}

// ── Accuracy Calculation ──
export function calcAccuracy(moves) {
    if (!moves || moves.length === 0) return 100;
    const weights = { best: 1.0, good: 0.8, inaccuracy: 0.5, mistake: 0.2, blunder: 0.0 };
    const total = moves.reduce((s, m) => s + (weights[m.type] ?? 0.5), 0);
    return Math.round((total / moves.length) * 100);
}

// ── ELO Rating Estimation ──
export function estimateElo(accuracy) {
    if (accuracy >= 95) return '2200+';
    if (accuracy >= 85) return '1800-2200';
    if (accuracy >= 70) return '1400-1800';
    if (accuracy >= 50) return '1000-1400';
    return 'Below 1000';
}

// ── Board Coordinate Helpers ──
export function algebraicToIndex(sq) {
    if (!sq || sq.length !== 2) return null;
    const file = sq.charCodeAt(0) - 97; // a=0, h=7
    const rank = parseInt(sq[1]) - 1;   // 1=0, 8=7
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { file, rank };
}

export function indexToAlgebraic(file, rank) {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
}

export function squareColor(file, rank) {
    return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

// ── Clock Time Formatting ──
export function formatClockTime(totalSeconds) {
    if (totalSeconds <= 0) return '0:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Puzzle Validation ──
export function validatePuzzleMove(userMove, expectedMove) {
    if (!userMove || !expectedMove) return false;
    return userMove.from === expectedMove.from && userMove.to === expectedMove.to &&
           (!expectedMove.promotion || userMove.promotion === expectedMove.promotion);
}

// ── Academy XP Calculation ──
export function calcXP(hintsUsed, timeSeconds, difficulty) {
    const base = { easy: 10, medium: 20, hard: 40, expert: 80 }[difficulty] || 20;
    const hintPenalty = hintsUsed * 5;
    const timeBonus = Math.max(0, 30 - timeSeconds) * 0.5;
    return Math.max(1, Math.round(base - hintPenalty + timeBonus));
}
