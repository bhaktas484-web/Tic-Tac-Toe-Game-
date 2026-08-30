document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let board = Array(9).fill(null);
    let currentPlayer = 'X';
    let gameMode = 'pvp'; // 'pvp' or 'ai'
    let userSymbol = 'X';
    let aiSymbol = 'O';
    let aiDifficulty = 'hard'; // 'easy', 'medium', 'hard'
    let gameActive = true;
    let soundEnabled = true;

    const scores = {
        X: 0,
        O: 0,
        ties: 0
    };

    const WINNING_COMBINATIONS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // DOM Elements
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status-text');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const aiOptions = document.getElementById('ai-options');
    const aiDifficultySelect = document.getElementById('ai-difficulty');
    const symbolBtns = document.querySelectorAll('.symbol-btn');
    
    const cardXEl = document.getElementById('card-x');
    const cardOEl = document.getElementById('card-o');
    const cardTiesEl = document.getElementById('card-ties');
    
    const scoreXEl = document.getElementById('score-x');
    const scoreOEl = document.getElementById('score-o');
    const scoreTiesEl = document.getElementById('score-ties');
    const labelXEl = document.getElementById('label-x');
    const labelOEl = document.getElementById('label-o');
    
    const resetGameBtn = document.getElementById('reset-game-btn');
    const resetScoresBtn = document.getElementById('reset-scores-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const soundIcon = document.getElementById('sound-icon');
    
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const winnerIcon = document.getElementById('winner-icon');
    const modalPlayAgainBtn = document.getElementById('modal-play-again-btn');

    const gameBoard = document.getElementById('game-board');
    const winningLine = document.getElementById('winning-line');

    // Confetti Engine
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    let confettiParticles = [];
    let confettiAnimationId = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function launchConfetti() {
        confettiParticles = [];
        const colors = ['#38bdf8', '#f43f5e', '#fbbf24', '#8b5cf6', '#34d399'];
        for (let i = 0; i < 120; i++) {
            confettiParticles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.7) * 16,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
        updateConfetti();
    }

    function updateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        confettiParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // Gravity
            p.rotation += p.vRot;
            p.opacity -= 0.008;

            if (p.opacity > 0) {
                active = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
        });

        if (active) {
            confettiAnimationId = requestAnimationFrame(updateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Web Audio Synthesizer
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSound(type) {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'move') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'win') {
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const noteOsc = audioCtx.createOscillator();
                    const noteGain = audioCtx.createGain();
                    noteOsc.connect(noteGain);
                    noteGain.connect(audioCtx.destination);
                    noteOsc.frequency.setValueAtTime(freq, now + i * 0.08);
                    noteGain.gain.setValueAtTime(0.15, now + i * 0.08);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);
                    noteOsc.start(now + i * 0.08);
                    noteOsc.stop(now + i * 0.08 + 0.3);
                });
            } else if (type === 'draw') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.25);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // LocalStorage Scores
    function loadScores() {
        const savedScores = localStorage.getItem('tictactoe_scores');
        if (savedScores) {
            const parsed = JSON.parse(savedScores);
            scores.X = parsed.X || 0;
            scores.O = parsed.O || 0;
            scores.ties = parsed.ties || 0;
        }
        updateScoreboardDisplay();
    }

    function saveScores() {
        localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
    }

    function updateScoreboardDisplay(bumpWinner = null) {
        scoreXEl.textContent = scores.X;
        scoreOEl.textContent = scores.O;
        scoreTiesEl.textContent = scores.ties;

        if (bumpWinner === 'X') {
            cardXEl.classList.remove('bump');
            void cardXEl.offsetWidth;
            cardXEl.classList.add('bump');
        } else if (bumpWinner === 'O') {
            cardOEl.classList.remove('bump');
            void cardOEl.offsetWidth;
            cardOEl.classList.add('bump');
        } else if (bumpWinner === 'ties') {
            cardTiesEl.classList.remove('bump');
            void cardTiesEl.offsetWidth;
            cardTiesEl.classList.add('bump');
        }

        if (gameMode === 'pvp') {
            labelXEl.textContent = 'Player X';
            labelOEl.textContent = 'Player O';
        } else {
            labelXEl.textContent = userSymbol === 'X' ? 'You (X)' : 'AI (X)';
            labelOEl.textContent = userSymbol === 'O' ? 'You (O)' : 'AI (O)';
        }
    }

    // Initialize Game
    function init() {
        loadScores();
        setupEventListeners();
        resetBoard();
    }

    function setupEventListeners() {
        cells.forEach(cell => {
            cell.addEventListener('click', handleCellClick);

            // Ghost Preview on Hover
            cell.addEventListener('mouseenter', (e) => {
                const idx = parseInt(cell.dataset.index);
                if (board[idx] === null && gameActive) {
                    if (gameMode === 'pvp' || currentPlayer === userSymbol) {
                        cell.classList.add(currentPlayer === 'X' ? 'ghost-x' : 'ghost-o');
                    }
                }
            });

            cell.addEventListener('mouseleave', () => {
                cell.classList.remove('ghost-x', 'ghost-o');
            });
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                gameMode = btn.dataset.mode;

                if (gameMode === 'ai') {
                    aiOptions.classList.remove('hidden');
                } else {
                    aiOptions.classList.add('hidden');
                }

                updateScoreboardDisplay();
                resetBoard();
            });
        });

        aiDifficultySelect.addEventListener('change', (e) => {
            playSound('click');
            aiDifficulty = e.target.value;
            resetBoard();
        });

        symbolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                symbolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                userSymbol = btn.dataset.symbol;
                aiSymbol = userSymbol === 'X' ? 'O' : 'X';
                updateScoreboardDisplay();
                resetBoard();
            });
        });

        resetGameBtn.addEventListener('click', () => {
            playSound('click');
            resetBoard();
        });

        resetScoresBtn.addEventListener('click', () => {
            playSound('click');
            scores.X = 0;
            scores.O = 0;
            scores.ties = 0;
            saveScores();
            updateScoreboardDisplay();
        });

        soundToggleBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
            if (soundEnabled) playSound('click');
        });

        modalPlayAgainBtn.addEventListener('click', () => {
            playSound('click');
            hideModal();
            resetBoard();
        });
    }

    function resetBoard() {
        board.fill(null);
        gameActive = true;
        currentPlayer = 'X';

        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'cell';
        });

        // Reset SVG Strike Line
        winningLine.classList.remove('animate-line');
        winningLine.setAttribute('x1', '0');
        winningLine.setAttribute('y1', '0');
        winningLine.setAttribute('x2', '0');
        winningLine.setAttribute('y2', '0');

        updateStatusText();
        hideModal();

        // If AI plays first (as X)
        if (gameMode === 'ai' && currentPlayer === aiSymbol) {
            setTimeout(makeAIMove, 450);
        }
    }

    function updateStatusText() {
        if (!gameActive) return;

        if (gameMode === 'pvp') {
            const colorClass = currentPlayer === 'X' ? 'x-color' : 'o-color';
            statusText.innerHTML = `Player <span class="turn-highlight ${colorClass}">${currentPlayer}</span>'s Turn`;
        } else {
            if (currentPlayer === userSymbol) {
                const colorClass = userSymbol === 'X' ? 'x-color' : 'o-color';
                statusText.innerHTML = `Your Turn (<span class="turn-highlight ${colorClass}">${userSymbol}</span>)`;
            } else {
                const colorClass = aiSymbol === 'X' ? 'x-color' : 'o-color';
                statusText.innerHTML = `AI is thinking... (<span class="turn-highlight ${colorClass}">${aiSymbol}</span>)`;
            }
        }
    }

    function handleCellClick(e) {
        const cell = e.currentTarget;
        const cellIndex = parseInt(cell.dataset.index);

        if (board[cellIndex] !== null || !gameActive) return;
        if (gameMode === 'ai' && currentPlayer !== userSymbol) return;

        cell.classList.remove('ghost-x', 'ghost-o');
        makeMove(cellIndex, currentPlayer);
    }

    function renderSymbolSVG(player) {
        if (player === 'X') {
            return `
                <svg class="symbol-svg" viewBox="0 0 100 100">
                    <line class="line-1" x1="15" y1="15" x2="85" y2="85" />
                    <line class="line-2" x1="85" y1="15" x2="15" y2="85" />
                </svg>
            `;
        } else {
            return `
                <svg class="symbol-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" />
                </svg>
            `;
        }
    }

    function makeMove(index, player) {
        board[index] = player;
        const cell = cells[index];
        cell.innerHTML = renderSymbolSVG(player);
        cell.classList.add(player.toLowerCase());
        playSound('move');

        const winInfo = checkWin(board);

        if (winInfo) {
            endGame(winInfo);
        } else if (checkDraw(board)) {
            endGame(null);
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateStatusText();

            if (gameActive && gameMode === 'ai' && currentPlayer === aiSymbol) {
                setTimeout(makeAIMove, 450);
            }
        }
    }

    function checkWin(currentBoard) {
        for (const combo of WINNING_COMBINATIONS) {
            const [a, b, c] = combo;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return { winner: currentBoard[a], combo };
            }
        }
        return null;
    }

    function checkDraw(currentBoard) {
        return currentBoard.every(cell => cell !== null);
    }

    function drawWinningLine(combo, winner) {
        const startCell = cells[combo[0]];
        const endCell = cells[combo[2]];

        const boardRect = gameBoard.getBoundingClientRect();
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();

        const x1 = startRect.left + startRect.width / 2 - boardRect.left;
        const y1 = startRect.top + startRect.height / 2 - boardRect.top;
        const x2 = endRect.left + endRect.width / 2 - boardRect.left;
        const y2 = endRect.top + endRect.height / 2 - boardRect.top;

        winningLine.setAttribute('x1', x1);
        winningLine.setAttribute('y1', y1);
        winningLine.setAttribute('x2', x2);
        winningLine.setAttribute('y2', y2);

        winningLine.style.stroke = winner === 'X' ? '#38bdf8' : '#f43f5e';
        winningLine.style.filter = `drop-shadow(0 0 12px ${winner === 'X' ? '#38bdf8' : '#f43f5e'})`;

        winningLine.classList.remove('animate-line');
        void winningLine.offsetWidth; // Trigger reflow
        winningLine.classList.add('animate-line');
    }

    function endGame(winInfo) {
        gameActive = false;

        if (winInfo) {
            const { winner, combo } = winInfo;
            combo.forEach(idx => {
                cells[idx].classList.add('winner');
            });

            drawWinningLine(combo, winner);

            scores[winner]++;
            saveScores();
            updateScoreboardDisplay(winner);

            playSound('win');
            launchConfetti();

            let winnerName = '';
            if (gameMode === 'pvp') {
                winnerName = `Player ${winner}`;
            } else {
                winnerName = winner === userSymbol ? 'You Win!' : 'AI Wins!';
            }

            setTimeout(() => {
                showModal(
                    winner === userSymbol || (gameMode === 'pvp') ? '🏆' : '🤖',
                    'Victory!',
                    `${winnerName}`
                );
            }, 700);
        } else {
            scores.ties++;
            saveScores();
            updateScoreboardDisplay('ties');
            playSound('draw');

            setTimeout(() => {
                showModal('🤝', "It's a Draw!", 'No winner this round');
            }, 600);
        }
    }

    function showModal(icon, title, message) {
        winnerIcon.textContent = icon;
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
    }

    // AI Logic
    function makeAIMove() {
        if (!gameActive) return;

        let moveIndex;

        if (aiDifficulty === 'easy') {
            moveIndex = getRandomMove();
        } else if (aiDifficulty === 'medium') {
            moveIndex = getMediumMove();
        } else {
            moveIndex = getBestMinimaxMove();
        }

        if (moveIndex !== null && moveIndex !== undefined) {
            makeMove(moveIndex, aiSymbol);
        }
    }

    function getRandomMove() {
        const available = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    function getMediumMove() {
        // 1. Can AI win in 1 move?
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                const tempBoard = [...board];
                tempBoard[i] = aiSymbol;
                if (checkWin(tempBoard)) return i;
            }
        }

        // 2. Can Opponent win in 1 move? Block them.
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                const tempBoard = [...board];
                tempBoard[i] = userSymbol;
                if (checkWin(tempBoard)) return i;
            }
        }

        // 3. Center
        if (board[4] === null) return 4;

        // 4. Random fallback
        return getRandomMove();
    }

    function getBestMinimaxMove() {
        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = aiSymbol;
                let score = minimax(board, 0, false);
                board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }

        return bestMove;
    }

    function minimax(currentBoard, depth, isMaximizing) {
        const winInfo = checkWin(currentBoard);
        if (winInfo) {
            if (winInfo.winner === aiSymbol) return 10 - depth;
            if (winInfo.winner === userSymbol) return depth - 10;
        }

        if (checkDraw(currentBoard)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = aiSymbol;
                    let score = minimax(currentBoard, depth + 1, false);
                    currentBoard[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = userSymbol;
                    let score = minimax(currentBoard, depth + 1, true);
                    currentBoard[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    // Start App
    init();
});
