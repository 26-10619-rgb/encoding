const startOverlay = document.getElementById('start-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const gridBoard = document.getElementById('grid-board');
const selectionBox = document.getElementById('selection-box');
const boardContainer = document.getElementById('board-container');

let score = 0;
let timeLeft = 120;
let timerInterval;
const COLS = 17;
const ROWS = 10;
let apples = [];
let isDragging = false;
let startX, startY;
let boardBounds;
let appleBounds = [];

// Initialize board styling
gridBoard.style.gridTemplateColumns = `repeat(${COLS}, auto)`;
gridBoard.style.gridTemplateRows = `repeat(${ROWS}, auto)`;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function generateBoard() {
    gridBoard.innerHTML = '';
    apples = [];
    
    for (let i = 0; i < ROWS * COLS; i++) {
        const apple = document.createElement('div');
        apple.className = 'apple';
        const num = Math.floor(Math.random() * 9) + 1; // 1 ~ 9
        apple.textContent = num;
        apple.dataset.value = num;
        apple.dataset.index = i;
        gridBoard.appendChild(apple);
        apples.push(apple);
    }
}

function startGame() {
    startOverlay.classList.remove('active');
    gameoverOverlay.classList.remove('active');
    
    score = 0;
    scoreDisplay.textContent = score;
    timeLeft = 120;
    timerDisplay.textContent = formatTime(timeLeft);
    
    generateBoard();
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = formatTime(timeLeft);
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    clearInterval(timerInterval);
    finalScoreDisplay.textContent = score;
    
    // Process ranking logic
    setTimeout(() => {
        handleRanking();
        gameoverOverlay.classList.add('active');
    }, 100);
}

function handleRanking() {
    let rankings = JSON.parse(localStorage.getItem('appleGameRankings')) || [];
    
    if (score > 0) {
        const isQualified = rankings.length < 5 || score > rankings[rankings.length - 1].score;
        if (isQualified) {
            let name = prompt("축하합니다! 최고 랭킹 점수를 달성했습니다.\\n랭킹에 등록할 이름을 입력하세요:", "Player");
            if (!name || name.trim() === '') name = "Player";
            
            rankings.push({ name: name.substring(0, 8), score: score });
            rankings.sort((a, b) => b.score - a.score);
            if (rankings.length > 5) rankings.pop();
            
            localStorage.setItem('appleGameRankings', JSON.stringify(rankings));
        }
    }
    
    renderRankingList(rankings);
}

function renderRankingList(rankings) {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '';
    
    if (rankings.length === 0) {
        rankingList.innerHTML = '<li style="justify-content:center;color:#a4b0be">등록된 랭킹이 없습니다.</li>';
        return;
    }
    
    rankings.forEach((rank, index) => {
        const li = document.createElement('li');
        const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        li.innerHTML = `<span>${badge} ${rank.name}</span> <span>${rank.score}점</span>`;
        rankingList.appendChild(li);
    });
}

// Event Listeners for Game
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function onPointerDown(e) {
    if (startOverlay.classList.contains('active') || gameoverOverlay.classList.contains('active')) return;
    
    // Only accept left mouse button or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isDragging = true;
    boardBounds = boardContainer.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    startX = clientX - boardBounds.left;
    startY = clientY - boardBounds.top;
    
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = `0px`;
    selectionBox.style.height = `0px`;
    
    // Cache apple bounds for performance
    appleBounds = apples.map(apple => {
        if (apple.classList.contains('apple-empty')) return null;
        const rect = apple.getBoundingClientRect();
        return {
            element: apple,
            val: parseInt(apple.dataset.value),
            left: rect.left - boardBounds.left,
            right: rect.right - boardBounds.left,
            top: rect.top - boardBounds.top,
            bottom: rect.bottom - boardBounds.top,
            cx: rect.left - boardBounds.left + rect.width / 2,
            cy: rect.top - boardBounds.top + rect.height / 2
        };
    });

    updateSelection(clientX, clientY);
    boardContainer.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : null);
    if (clientX == null || clientY == null) return;
    
    updateSelection(clientX, clientY);
}

function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    selectionBox.style.display = 'none';
    boardContainer.releasePointerCapture(e.pointerId);
    
    // Evaluate selected apples
    let sum = 0;
    const selectedApples = [];
    
    apples.forEach(apple => {
        if (apple.classList.contains('selected')) {
            sum += parseInt(apple.dataset.value);
            selectedApples.push(apple);
            apple.classList.remove('selected');
        }
    });
    
    if (sum === 10) {
        let sc = selectedApples.length;
        score += sc; 
        scoreDisplay.textContent = score;
        
        let minX1 = Infinity, minY1 = Infinity, maxX1 = -Infinity, maxY1 = -Infinity;

        selectedApples.forEach(apple => {
            const rect = apple.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            
            minX1 = Math.min(minX1, cx);
            maxX1 = Math.max(maxX1, cx);
            minY1 = Math.min(minY1, cy);
            maxY1 = Math.max(maxY1, cy);
            
            spawnParticles(cx, cy);

            apple.classList.add('pop');
            // Wait for animation
            setTimeout(() => {
                apple.classList.remove('pop');
                apple.classList.add('apple-empty');
            }, 300);
        });
        
        spawnFloatingScore((minX1 + maxX1) / 2, (minY1 + maxY1) / 2, sc);
    }
}

function updateSelection(clientX, clientY) {
    let currentX = clientX - boardBounds.left;
    let currentY = clientY - boardBounds.top;
    
    // Constrain to board
    currentX = Math.max(0, Math.min(currentX, boardBounds.width));
    currentY = Math.max(0, Math.min(currentY, boardBounds.height));

    const minX = Math.min(startX, currentX);
    const maxX = Math.max(startX, currentX);
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    
    selectionBox.style.left = `${minX}px`;
    selectionBox.style.top = `${minY}px`;
    selectionBox.style.width = `${maxX - minX}px`;
    selectionBox.style.height = `${maxY - minY}px`;
    
    // Check intersections (we'll consider if the center of apple is within box)
    appleBounds.forEach(item => {
        if (!item) return;
        
        // Use center of the apple to check if it's inside the selection box to make it feel natural
        if (item.cx >= minX && item.cx <= maxX && item.cy >= minY && item.cy <= maxY) {
            item.element.classList.add('selected');
        } else {
            item.element.classList.remove('selected');
        }
    });
}

function spawnFloatingScore(x, y, scoreAdded) {
    const el = document.createElement('div');
    el.className = 'floating-score';
    el.textContent = `+${scoreAdded}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    
    setTimeout(() => {
        el.remove();
    }, 1000);
}

function spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Random spread
        const tx = (Math.random() - 0.5) * 80;
        const ty = (Math.random() - 0.5) * 80;
        
        // Random colors
        const colors = ['#ff4757', '#ffa502', '#2ed573', '#ffffff'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 600);
    }
}

// Add event listeners (Pointer events cover mouse, touch, stylis)
boardContainer.addEventListener('pointerdown', onPointerDown);
boardContainer.addEventListener('pointermove', onPointerMove);
boardContainer.addEventListener('pointerup', onPointerUp);
boardContainer.addEventListener('pointercancel', onPointerUp);

// Prevent default drag behaviors just in case
document.addEventListener('dragstart', (e) => e.preventDefault());
