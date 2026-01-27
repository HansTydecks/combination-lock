// ===== Game Configuration =====
let gameConfig = {
    digitCount: 4,
    includeNumbers: true,
    includeLetters: false,
    includeSymbols: false,
    combination: '',
    timerMinutes: 15,
    timerEnabled: true,
    timerWarning: true,
    welcomeText: '',
    winText: '',
    loseText: '',
    hintText: '',
    theme: 'classic',
    primaryColor: '#00d4ff',
    accentColor: '#ff006e',
    showHintBtn: true,
    soundEnabled: true,
    maxAttempts: 0,
    showAttempts: false,
    fullscreenMode: false
};

// ===== Game State =====
let gameState = {
    currentValues: [],
    attempts: 0,
    timeRemaining: 0,
    timerInterval: null,
    startTime: null,
    isRunning: false,
    availableChars: []
};

// ===== Audio Context for Sound Effects =====
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!gameConfig.soundEnabled) return;
    
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'click':
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'win':
            oscillator.frequency.value = 523.25; // C5
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            oscillator.start(audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.3); // C6
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'lose':
            oscillator.frequency.value = 200;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'tick':
            oscillator.frequency.value = 1000;
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
            break;
        case 'wrong':
            oscillator.frequency.value = 150;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

// ===== DOM Elements =====
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    win: document.getElementById('win-screen'),
    lose: document.getElementById('lose-screen')
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initSetupScreen();
    initEventListeners();
});

function initSetupScreen() {
    // Digit count slider
    const digitSlider = document.getElementById('digit-count');
    const digitDisplay = document.getElementById('digit-count-display');
    
    digitSlider.addEventListener('input', () => {
        digitDisplay.textContent = digitSlider.value;
        updateCombinationInput();
    });
    
    // Character type checkboxes
    ['include-numbers', 'include-letters', 'include-symbols'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateCombinationInput);
    });
    
    // Random combination button
    document.getElementById('random-combo-btn').addEventListener('click', generateRandomCombination);
    
    // Color theme buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameConfig.theme = btn.dataset.theme;
            document.body.setAttribute('data-theme', gameConfig.theme);
        });
    });
    
    // Custom colors
    document.getElementById('custom-primary').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--accent-primary', e.target.value);
    });
    
    document.getElementById('custom-accent').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--accent-secondary', e.target.value);
    });
}

function initEventListeners() {
    // Start button
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // Game controls
    document.getElementById('check-btn').addEventListener('click', checkCombination);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('reset-btn').addEventListener('click', resetWheels);
    
    // Close welcome message
    document.getElementById('close-welcome').addEventListener('click', () => {
        document.getElementById('welcome-message').classList.add('hidden');
    });
    
    // Admin button
    document.getElementById('admin-btn').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.remove('hidden');
        document.getElementById('admin-solution').textContent = gameConfig.combination;
    });
    
    // Admin actions
    document.getElementById('admin-win').addEventListener('click', triggerWin);
    document.getElementById('admin-add-time').addEventListener('click', () => {
        gameState.timeRemaining += 300; // 5 minutes
        updateTimerDisplay();
        document.getElementById('admin-modal').classList.add('hidden');
    });
    document.getElementById('admin-show-solution').addEventListener('click', () => {
        alert('Lösung: ' + gameConfig.combination);
    });
    document.getElementById('admin-end-game').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.add('hidden');
        showScreen('setup');
        stopTimer();
    });
    
    // Close modals
    document.getElementById('close-admin').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.add('hidden');
    });
    document.getElementById('close-hint').addEventListener('click', () => {
        document.getElementById('hint-modal').classList.add('hidden');
    });
    
    // Result screen buttons
    document.getElementById('play-again-btn').addEventListener('click', () => {
        showScreen('game');
        resetGame();
    });
    document.getElementById('new-game-btn').addEventListener('click', () => {
        showScreen('setup');
    });
    document.getElementById('retry-btn').addEventListener('click', () => {
        showScreen('game');
        resetGame();
    });
    document.getElementById('new-game-btn-lose').addEventListener('click', () => {
        showScreen('setup');
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

function updateCombinationInput() {
    const digitCount = parseInt(document.getElementById('digit-count').value);
    const input = document.getElementById('combination-input');
    input.maxLength = digitCount;
    input.placeholder = `${digitCount} Zeichen eingeben`;
}

function getAvailableChars() {
    let chars = [];
    
    if (document.getElementById('include-numbers').checked) {
        chars = chars.concat(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    }
    if (document.getElementById('include-letters').checked) {
        chars = chars.concat(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
                            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
    }
    if (document.getElementById('include-symbols').checked) {
        chars = chars.concat(['!', '@', '#', '$', '%', '&', '*', '?', '+', '=']);
    }
    
    // Default to numbers if nothing selected
    if (chars.length === 0) {
        chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        document.getElementById('include-numbers').checked = true;
    }
    
    return chars;
}

function generateRandomCombination() {
    const chars = getAvailableChars();
    const digitCount = parseInt(document.getElementById('digit-count').value);
    let combo = '';
    
    for (let i = 0; i < digitCount; i++) {
        combo += chars[Math.floor(Math.random() * chars.length)];
    }
    
    document.getElementById('combination-input').value = combo;
}

function validateCombination(combo) {
    const chars = getAvailableChars();
    for (let char of combo.toUpperCase()) {
        if (!chars.includes(char)) {
            return false;
        }
    }
    return true;
}

// ===== Game Functions =====
function startGame() {
    // Collect configuration
    gameConfig.digitCount = parseInt(document.getElementById('digit-count').value);
    gameConfig.includeNumbers = document.getElementById('include-numbers').checked;
    gameConfig.includeLetters = document.getElementById('include-letters').checked;
    gameConfig.includeSymbols = document.getElementById('include-symbols').checked;
    gameConfig.timerMinutes = parseInt(document.getElementById('timer-minutes').value);
    gameConfig.timerEnabled = document.getElementById('timer-enabled').checked;
    gameConfig.timerWarning = document.getElementById('timer-warning').checked;
    gameConfig.welcomeText = document.getElementById('welcome-text').value;
    gameConfig.winText = document.getElementById('win-text').value;
    gameConfig.loseText = document.getElementById('lose-text').value;
    gameConfig.hintText = document.getElementById('hint-text').value;
    gameConfig.showHintBtn = document.getElementById('show-hint-btn').checked;
    gameConfig.soundEnabled = document.getElementById('sound-enabled').checked;
    gameConfig.maxAttempts = parseInt(document.getElementById('max-attempts').value);
    gameConfig.showAttempts = document.getElementById('show-attempts').checked;
    gameConfig.fullscreenMode = document.getElementById('fullscreen-mode').checked;
    
    // Get combination
    let combo = document.getElementById('combination-input').value.toUpperCase();
    
    if (!combo) {
        generateRandomCombination();
        combo = document.getElementById('combination-input').value.toUpperCase();
    }
    
    if (combo.length !== gameConfig.digitCount) {
        alert(`Bitte gib eine Kombination mit ${gameConfig.digitCount} Zeichen ein.`);
        return;
    }
    
    if (!validateCombination(combo)) {
        alert('Die Kombination enthält ungültige Zeichen. Bitte nur die ausgewählten Zeichentypen verwenden.');
        return;
    }
    
    gameConfig.combination = combo;
    gameState.availableChars = getAvailableChars();
    
    // Setup game screen
    setupGameScreen();
    
    // Fullscreen mode
    if (gameConfig.fullscreenMode) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    
    showScreen('game');
    startTimer();
}

function setupGameScreen() {
    // Reset game state
    gameState.attempts = 0;
    gameState.currentValues = new Array(gameConfig.digitCount).fill(0);
    
    // Show/hide elements based on config
    document.getElementById('hint-btn').style.display = gameConfig.showHintBtn ? 'inline-block' : 'none';
    
    if (gameConfig.showAttempts) {
        document.getElementById('attempts-display').classList.remove('hidden');
        document.getElementById('max-attempts-display').textContent = 
            gameConfig.maxAttempts > 0 ? ` / ${gameConfig.maxAttempts}` : '';
    } else {
        document.getElementById('attempts-display').classList.add('hidden');
    }
    
    document.getElementById('attempts-count').textContent = '0';
    
    // Set welcome message
    document.getElementById('welcome-text-display').textContent = gameConfig.welcomeText;
    document.getElementById('welcome-message').classList.remove('hidden');
    
    // Timer display
    document.getElementById('timer-display').style.display = gameConfig.timerEnabled ? 'flex' : 'none';
    
    // Create combination wheels
    createWheels();
}

function createWheels() {
    const container = document.getElementById('combination-wheels');
    container.innerHTML = '';
    
    for (let i = 0; i < gameConfig.digitCount; i++) {
        const wheelContainer = document.createElement('div');
        wheelContainer.className = 'wheel-container';
        wheelContainer.dataset.index = i;
        
        const indicator = document.createElement('div');
        indicator.className = 'wheel-indicator';
        
        const wheel = document.createElement('div');
        wheel.className = 'wheel';
        wheel.dataset.index = i;
        
        // Create wheel items (triple the chars for smooth scrolling)
        const chars = gameState.availableChars;
        for (let j = 0; j < chars.length * 3; j++) {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.textContent = chars[j % chars.length];
            wheel.appendChild(item);
        }
        
        wheelContainer.appendChild(wheel);
        wheelContainer.appendChild(indicator);
        container.appendChild(wheelContainer);
        
        // Event listeners for wheel interaction
        let startY = 0;
        let currentOffset = chars.length; // Start in middle set
        
        // Click to rotate
        wheelContainer.addEventListener('click', (e) => {
            if (e.target.closest('.wheel-indicator')) return;
            
            const rect = wheelContainer.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const halfHeight = rect.height / 2;
            
            if (clickY < halfHeight) {
                // Click on top half - go up (previous)
                rotateWheel(i, -1);
            } else {
                // Click on bottom half - go down (next)
                rotateWheel(i, 1);
            }
        });
        
        // Touch/drag support
        let isDragging = false;
        
        wheelContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
        });
        
        wheelContainer.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY;
            if (Math.abs(deltaY) > 30) {
                rotateWheel(i, deltaY > 0 ? 1 : -1);
                startY = e.clientY;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.touches[0].clientY;
            if (Math.abs(deltaY) > 30) {
                rotateWheel(i, deltaY > 0 ? 1 : -1);
                startY = e.touches[0].clientY;
            }
        });
        
        document.addEventListener('mouseup', () => { isDragging = false; });
        document.addEventListener('touchend', () => { isDragging = false; });
        
        // Mouse wheel support
        wheelContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            rotateWheel(i, e.deltaY > 0 ? 1 : -1);
        });
        
        // Initial position
        updateWheelPosition(i);
    }
}

function rotateWheel(index, direction) {
    const chars = gameState.availableChars;
    gameState.currentValues[index] = (gameState.currentValues[index] + direction + chars.length) % chars.length;
    updateWheelPosition(index);
    playSound('click');
}

function updateWheelPosition(index) {
    const wheel = document.querySelector(`.wheel[data-index="${index}"]`);
    const chars = gameState.availableChars;
    const itemHeight = wheel.querySelector('.wheel-item').offsetHeight;
    
    // Calculate offset to show the current value in the center
    const offset = (chars.length + gameState.currentValues[index]) * itemHeight;
    wheel.style.transform = `translateY(-${offset}px)`;
}

function resetWheels() {
    for (let i = 0; i < gameConfig.digitCount; i++) {
        gameState.currentValues[i] = 0;
        updateWheelPosition(i);
    }
    playSound('click');
}

function getCurrentCombination() {
    return gameState.currentValues.map(idx => gameState.availableChars[idx]).join('');
}

function checkCombination() {
    gameState.attempts++;
    document.getElementById('attempts-count').textContent = gameState.attempts;
    
    const current = getCurrentCombination();
    
    if (current === gameConfig.combination) {
        triggerWin();
    } else {
        // Wrong combination
        playSound('wrong');
        
        // Shake animation
        const lockBody = document.querySelector('.lock-body');
        lockBody.classList.add('shake-animation');
        setTimeout(() => lockBody.classList.remove('shake-animation'), 500);
        
        // Check max attempts
        if (gameConfig.maxAttempts > 0 && gameState.attempts >= gameConfig.maxAttempts) {
            triggerLose('Maximale Versuche erreicht!');
        }
    }
}

function triggerWin() {
    stopTimer();
    playSound('win');
    
    // Calculate time taken
    const totalSeconds = (gameConfig.timerMinutes * 60) - gameState.timeRemaining;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Update win screen
    document.getElementById('win-message').textContent = gameConfig.winText;
    document.getElementById('time-taken').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('final-attempts').textContent = gameState.attempts;
    
    // Open lock animation
    document.querySelector('.lock-body').classList.add('lock-open');
    
    // Create confetti
    createConfetti();
    
    setTimeout(() => {
        showScreen('win');
        document.querySelector('.lock-body').classList.remove('lock-open');
    }, 800);
}

function triggerLose(customMessage) {
    stopTimer();
    playSound('lose');
    
    document.getElementById('lose-message').textContent = customMessage || gameConfig.loseText;
    document.getElementById('solution-display').textContent = gameConfig.combination;
    
    showScreen('lose');
}

function createConfetti() {
    const container = document.getElementById('confetti');
    container.innerHTML = '';
    
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        
        if (Math.random() > 0.5) {
            confetti.style.borderRadius = '50%';
        }
        
        container.appendChild(confetti);
    }
}

// ===== Timer Functions =====
function startTimer() {
    if (!gameConfig.timerEnabled) return;
    
    gameState.timeRemaining = gameConfig.timerMinutes * 60;
    gameState.startTime = Date.now();
    gameState.isRunning = true;
    
    updateTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();
        
        // Warning at 1 minute
        if (gameConfig.timerWarning && gameState.timeRemaining === 60) {
            document.getElementById('timer-display').classList.add('warning');
            playSound('tick');
        }
        
        // Danger at 10 seconds
        if (gameState.timeRemaining === 10) {
            document.getElementById('timer-display').classList.remove('warning');
            document.getElementById('timer-display').classList.add('danger');
        }
        
        // Time's up
        if (gameState.timeRemaining <= 0) {
            triggerLose();
        }
    }, 1000);
}

function stopTimer() {
    gameState.isRunning = false;
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    
    document.getElementById('time-remaining').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function resetGame() {
    stopTimer();
    document.getElementById('timer-display').classList.remove('warning', 'danger');
    gameState.attempts = 0;
    document.getElementById('attempts-count').textContent = '0';
    resetWheels();
    document.getElementById('welcome-message').classList.remove('hidden');
    startTimer();
}

// ===== Utility Functions =====
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    
    if (screenName === 'setup') {
        screens.setup.classList.add('active');
        stopTimer();
    } else if (screenName === 'game') {
        screens.game.classList.add('active');
        screens.win.classList.remove('active');
        screens.lose.classList.remove('active');
    } else if (screenName === 'win') {
        screens.game.classList.add('active');
        screens.win.classList.add('active');
    } else if (screenName === 'lose') {
        screens.game.classList.add('active');
        screens.lose.classList.add('active');
    }
}

function showHint() {
    document.getElementById('hint-text-display').textContent = gameConfig.hintText;
    document.getElementById('hint-modal').classList.remove('hidden');
}

// ===== Keyboard Support =====
document.addEventListener('keydown', (e) => {
    if (!screens.game.classList.contains('active')) return;
    
    // Number keys 1-9 for wheel selection
    if (e.key >= '1' && e.key <= '9') {
        const wheelIndex = parseInt(e.key) - 1;
        if (wheelIndex < gameConfig.digitCount) {
            rotateWheel(wheelIndex, 1);
        }
    }
    
    // Enter to check
    if (e.key === 'Enter') {
        checkCombination();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }
});

// ===== Prevent accidental page close =====
window.addEventListener('beforeunload', (e) => {
    if (gameState.isRunning) {
        e.preventDefault();
        e.returnValue = '';
    }
});
