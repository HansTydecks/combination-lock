// ===== Game Configuration =====
const ADMIN_PASSWORD = 'Admin123';

let gameConfig = {
    lockCount: 1,
    locks: [],
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

// Lock configuration template
function createLockConfig() {
    return {
        name: '',
        digitCount: 4,
        includeNumbers: true,
        includeLetters: false,
        includeSymbols: false,
        combination: '',
        isUnlocked: false,
        currentValues: [],
        availableChars: []
    };
}

// ===== Game State =====
let gameState = {
    attempts: 0,
    timeRemaining: 0,
    timerInterval: null,
    startTime: null,
    isRunning: false,
    allLocksUnlocked: false
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
    // Lock count dropdown
    const lockCountSelect = document.getElementById('lock-count');
    lockCountSelect.addEventListener('change', updateLockSettingsUI);
    
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
    
    // Initialize lock settings UI
    updateLockSettingsUI();
}

function updateLockSettingsUI() {
    const lockCount = parseInt(document.getElementById('lock-count').value);
    const container = document.getElementById('lock-settings-container');
    
    // Preserve existing settings
    const existingSettings = [];
    container.querySelectorAll('.lock-config-card').forEach((card, idx) => {
        existingSettings[idx] = {
            name: card.querySelector('.lock-name-input')?.value,
            digitCount: card.querySelector('.lock-digit-select')?.value,
            includeNumbers: card.querySelector('.lock-include-numbers')?.checked,
            includeLetters: card.querySelector('.lock-include-letters')?.checked,
            includeSymbols: card.querySelector('.lock-include-symbols')?.checked,
            combination: card.querySelector('.lock-combination-input')?.value
        };
    });
    
    container.innerHTML = '';
    
    for (let i = 0; i < lockCount; i++) {
        const card = createLockSettingsCard(i, existingSettings[i]);
        container.appendChild(card);
    }
}

function createLockSettingsCard(index, existingData) {
    const card = document.createElement('div');
    card.className = 'lock-config-card';
    card.dataset.lockIndex = index;
    
    const defaults = existingData || {
        name: `Schloss ${index + 1}`,
        digitCount: '4',
        includeNumbers: true,
        includeLetters: false,
        includeSymbols: false,
        combination: ''
    };
    
    card.innerHTML = `
        <div class="lock-config-header">
            <span class="lock-number">${index + 1}</span>
            <input type="text" class="lock-name-input" value="${defaults.name}" placeholder="Name des Schlosses">
        </div>
        
        <div class="lock-config-body">
            <div class="form-group">
                <label>Anzahl der Stellen:</label>
                <select class="form-select lock-digit-select">
                    <option value="2" ${defaults.digitCount === '2' ? 'selected' : ''}>2 Stellen</option>
                    <option value="3" ${defaults.digitCount === '3' ? 'selected' : ''}>3 Stellen</option>
                    <option value="4" ${defaults.digitCount === '4' ? 'selected' : ''}>4 Stellen</option>
                    <option value="5" ${defaults.digitCount === '5' ? 'selected' : ''}>5 Stellen</option>
                    <option value="6" ${defaults.digitCount === '6' ? 'selected' : ''}>6 Stellen</option>
                    <option value="7" ${defaults.digitCount === '7' ? 'selected' : ''}>7 Stellen</option>
                    <option value="8" ${defaults.digitCount === '8' ? 'selected' : ''}>8 Stellen</option>
                    <option value="9" ${defaults.digitCount === '9' ? 'selected' : ''}>9 Stellen</option>
                    <option value="10" ${defaults.digitCount === '10' ? 'selected' : ''}>10 Stellen</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Zeichentyp:</label>
                <div class="checkbox-group-compact">
                    <label class="checkbox-label-small">
                        <input type="checkbox" class="lock-include-numbers" ${defaults.includeNumbers ? 'checked' : ''}>
                        <span class="checkmark-small"></span>
                        0-9
                    </label>
                    <label class="checkbox-label-small">
                        <input type="checkbox" class="lock-include-letters" ${defaults.includeLetters ? 'checked' : ''}>
                        <span class="checkmark-small"></span>
                        A-Z
                    </label>
                    <label class="checkbox-label-small">
                        <input type="checkbox" class="lock-include-symbols" ${defaults.includeSymbols ? 'checked' : ''}>
                        <span class="checkmark-small"></span>
                        !@#$
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label>Geheimkombination:</label>
                <div class="combination-input-row">
                    <input type="text" class="lock-combination-input" value="${defaults.combination}" placeholder="Leer = Zufällig">
                    <button type="button" class="btn-small lock-random-btn">🎲</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const digitSelect = card.querySelector('.lock-digit-select');
    const comboInput = card.querySelector('.lock-combination-input');
    const randomBtn = card.querySelector('.lock-random-btn');
    
    digitSelect.addEventListener('change', () => {
        comboInput.maxLength = parseInt(digitSelect.value);
        if (comboInput.value.length > parseInt(digitSelect.value)) {
            comboInput.value = comboInput.value.substring(0, parseInt(digitSelect.value));
        }
    });
    
    randomBtn.addEventListener('click', () => {
        const chars = getAvailableCharsForCard(card);
        const count = parseInt(digitSelect.value);
        let combo = '';
        for (let i = 0; i < count; i++) {
            combo += chars[Math.floor(Math.random() * chars.length)];
        }
        comboInput.value = combo;
    });
    
    // Set initial maxLength
    comboInput.maxLength = parseInt(digitSelect.value);
    
    return card;
}

function getAvailableCharsForCard(card) {
    let chars = [];
    
    if (card.querySelector('.lock-include-numbers').checked) {
        chars = chars.concat(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    }
    if (card.querySelector('.lock-include-letters').checked) {
        chars = chars.concat(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
                            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
    }
    if (card.querySelector('.lock-include-symbols').checked) {
        chars = chars.concat(['!', '@', '#', '$', '%', '&', '*', '?', '+', '=']);
    }
    
    // Default to numbers if nothing selected
    if (chars.length === 0) {
        chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        card.querySelector('.lock-include-numbers').checked = true;
    }
    
    return chars;
}

function initEventListeners() {
    // Start button
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // Game controls
    document.getElementById('check-btn').addEventListener('click', checkAllCombinations);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('reset-btn').addEventListener('click', resetAllWheels);
    
    // Close welcome message
    document.getElementById('close-welcome').addEventListener('click', () => {
        document.getElementById('welcome-message').classList.add('hidden');
    });
    
    // Admin button - shows password modal first
    document.getElementById('admin-btn').addEventListener('click', () => {
        document.getElementById('admin-password-modal').classList.remove('hidden');
        document.getElementById('admin-password-input').value = '';
        document.getElementById('admin-password-error').classList.add('hidden');
        document.getElementById('admin-password-input').focus();
    });
    
    // Admin password handling
    document.getElementById('admin-password-submit').addEventListener('click', checkAdminPassword);
    document.getElementById('admin-password-cancel').addEventListener('click', () => {
        document.getElementById('admin-password-modal').classList.add('hidden');
    });
    
    document.getElementById('admin-password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAdminPassword();
        }
    });
    
    // Admin actions
    document.getElementById('admin-win').addEventListener('click', triggerWin);
    document.getElementById('admin-add-time').addEventListener('click', () => {
        gameState.timeRemaining += 300; // 5 minutes
        updateTimerDisplay();
        document.getElementById('admin-modal').classList.add('hidden');
    });
    document.getElementById('admin-show-solution').addEventListener('click', () => {
        let solutions = gameConfig.locks.map((lock, idx) => 
            `${lock.name}: ${lock.combination}`
        ).join('\n');
        alert('Lösungen:\n' + solutions);
    });
    document.getElementById('admin-end-game').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.add('hidden');
        showScreen('setup');
        stopTimer();
    });
    
    // Close modals - simple direct handlers
    const closeAdminBtn = document.getElementById('close-admin');
    const closeHintBtn = document.getElementById('close-hint');
    const adminModal = document.getElementById('admin-modal');
    const hintModal = document.getElementById('hint-modal');
    
    closeAdminBtn.onclick = function() {
        adminModal.classList.add('hidden');
    };
    
    closeHintBtn.onclick = function() {
        hintModal.classList.add('hidden');
    };
    
    // Also close when clicking modal background
    adminModal.onclick = function(e) {
        if (e.target === adminModal) {
            adminModal.classList.add('hidden');
        }
    };
    
    hintModal.onclick = function(e) {
        if (e.target === hintModal) {
            hintModal.classList.add('hidden');
        }
    };
    
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

function checkAdminPassword() {
    const input = document.getElementById('admin-password-input');
    const errorEl = document.getElementById('admin-password-error');
    
    if (input.value === ADMIN_PASSWORD) {
        document.getElementById('admin-password-modal').classList.add('hidden');
        showAdminModal();
    } else {
        errorEl.classList.remove('hidden');
        input.classList.add('shake-animation');
        setTimeout(() => input.classList.remove('shake-animation'), 500);
    }
}

function showAdminModal() {
    const locksInfoEl = document.getElementById('admin-locks-info');
    locksInfoEl.innerHTML = '';
    
    gameConfig.locks.forEach((lock, idx) => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${lock.name}:</strong> <span class="lock-solution">${lock.combination}</span> ${lock.isUnlocked ? '✅' : '🔒'}`;
        locksInfoEl.appendChild(p);
    });
    
    document.getElementById('admin-modal').classList.remove('hidden');
}

// ===== Game Functions =====
function startGame() {
    // Collect configuration
    const lockCount = parseInt(document.getElementById('lock-count').value);
    
    gameConfig.lockCount = lockCount;
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
    
    // Get lock configurations from individual cards
    const lockCards = document.querySelectorAll('.lock-config-card');
    gameConfig.locks = [];
    
    for (let i = 0; i < lockCount; i++) {
        const card = lockCards[i];
        if (!card) continue;
        
        const lock = createLockConfig();
        
        // Read settings from the card
        lock.name = card.querySelector('.lock-name-input').value || `Schloss ${i + 1}`;
        lock.digitCount = parseInt(card.querySelector('.lock-digit-select').value);
        lock.includeNumbers = card.querySelector('.lock-include-numbers').checked;
        lock.includeLetters = card.querySelector('.lock-include-letters').checked;
        lock.includeSymbols = card.querySelector('.lock-include-symbols').checked;
        lock.availableChars = getAvailableCharsForCard(card);
        lock.currentValues = new Array(lock.digitCount).fill(0);
        lock.isUnlocked = false;
        
        // Get or generate combination
        let combo = card.querySelector('.lock-combination-input').value.toUpperCase();
        
        if (!combo) {
            // Generate random combination
            combo = '';
            for (let j = 0; j < lock.digitCount; j++) {
                combo += lock.availableChars[Math.floor(Math.random() * lock.availableChars.length)];
            }
        }
        
        // Validate combination length
        if (combo.length !== lock.digitCount) {
            alert(`Schloss "${lock.name}": Bitte gib eine Kombination mit ${lock.digitCount} Zeichen ein.`);
            return;
        }
        
        // Validate combination characters
        for (let char of combo) {
            if (!lock.availableChars.includes(char)) {
                alert(`Schloss "${lock.name}": Die Kombination enthält ungültige Zeichen.`);
                return;
            }
        }
        
        lock.combination = combo;
        gameConfig.locks.push(lock);
    }
    
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
    gameState.allLocksUnlocked = false;
    
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
    
    // Create all locks
    createAllLocks();
}

function createAllLocks() {
    const wrapper = document.getElementById('locks-wrapper');
    wrapper.innerHTML = '';
    wrapper.className = `locks-wrapper locks-${gameConfig.lockCount}`;
    
    gameConfig.locks.forEach((lock, lockIndex) => {
        const lockContainer = createLockElement(lock, lockIndex);
        wrapper.appendChild(lockContainer);
    });
}

function createLockElement(lock, lockIndex) {
    const container = document.createElement('div');
    container.className = 'lock-container';
    container.dataset.lockIndex = lockIndex;
    
    // Lock name
    const nameEl = document.createElement('div');
    nameEl.className = 'lock-name';
    nameEl.textContent = lock.name;
    container.appendChild(nameEl);
    
    // Lock body
    const lockBody = document.createElement('div');
    lockBody.className = 'lock-body';
    lockBody.dataset.lockIndex = lockIndex;
    
    // Wheels container
    const wheelsContainer = document.createElement('div');
    wheelsContainer.className = 'combination-wheels';
    wheelsContainer.dataset.lockIndex = lockIndex;
    
    // Create wheels for this lock
    for (let i = 0; i < lock.digitCount; i++) {
        const wheelContainer = createWheel(lock, lockIndex, i);
        wheelsContainer.appendChild(wheelContainer);
    }
    
    lockBody.appendChild(wheelsContainer);
    
    // Keyhole
    const keyhole = document.createElement('div');
    keyhole.className = 'lock-keyhole';
    lockBody.appendChild(keyhole);
    
    container.appendChild(lockBody);
    
    // Status indicator
    const status = document.createElement('div');
    status.className = 'lock-status locked';
    status.textContent = '🔒 Gesperrt';
    status.dataset.lockIndex = lockIndex;
    container.appendChild(status);
    
    return container;
}

function createWheel(lock, lockIndex, wheelIndex) {
    const wheelContainer = document.createElement('div');
    wheelContainer.className = 'wheel-container';
    wheelContainer.dataset.lockIndex = lockIndex;
    wheelContainer.dataset.wheelIndex = wheelIndex;
    
    const indicator = document.createElement('div');
    indicator.className = 'wheel-indicator';
    
    const wheel = document.createElement('div');
    wheel.className = 'wheel';
    wheel.dataset.lockIndex = lockIndex;
    wheel.dataset.wheelIndex = wheelIndex;
    
    // Create wheel items (triple the chars for smooth scrolling)
    const chars = lock.availableChars;
    for (let j = 0; j < chars.length * 3; j++) {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.textContent = chars[j % chars.length];
        wheel.appendChild(item);
    }
    
    wheelContainer.appendChild(wheel);
    wheelContainer.appendChild(indicator);
    
    // Click to rotate
    wheelContainer.addEventListener('click', (e) => {
        if (gameConfig.locks[lockIndex].isUnlocked) return;
        if (e.target.closest('.wheel-indicator')) return;
        
        const rect = wheelContainer.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const halfHeight = rect.height / 2;
        
        if (clickY < halfHeight) {
            rotateWheel(lockIndex, wheelIndex, -1);
        } else {
            rotateWheel(lockIndex, wheelIndex, 1);
        }
    });
    
    // Mouse wheel support
    wheelContainer.addEventListener('wheel', (e) => {
        if (gameConfig.locks[lockIndex].isUnlocked) return;
        e.preventDefault();
        rotateWheel(lockIndex, wheelIndex, e.deltaY > 0 ? 1 : -1);
    });
    
    // Touch/drag support
    let startY = 0;
    let isDragging = false;
    
    wheelContainer.addEventListener('mousedown', (e) => {
        if (gameConfig.locks[lockIndex].isUnlocked) return;
        isDragging = true;
        startY = e.clientY;
        wheelContainer.dataset.dragging = 'true';
    });
    
    wheelContainer.addEventListener('touchstart', (e) => {
        if (gameConfig.locks[lockIndex].isUnlocked) return;
        isDragging = true;
        startY = e.touches[0].clientY;
        wheelContainer.dataset.dragging = 'true';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (wheelContainer.dataset.dragging !== 'true') return;
        const deltaY = startY - e.clientY;
        if (Math.abs(deltaY) > 30) {
            rotateWheel(lockIndex, wheelIndex, deltaY > 0 ? 1 : -1);
            startY = e.clientY;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (wheelContainer.dataset.dragging !== 'true') return;
        const deltaY = startY - e.touches[0].clientY;
        if (Math.abs(deltaY) > 30) {
            rotateWheel(lockIndex, wheelIndex, deltaY > 0 ? 1 : -1);
            startY = e.touches[0].clientY;
        }
    });
    
    document.addEventListener('mouseup', () => { 
        wheelContainer.dataset.dragging = 'false';
    });
    document.addEventListener('touchend', () => { 
        wheelContainer.dataset.dragging = 'false';
    });
    
    // Initial position
    setTimeout(() => updateWheelPosition(lockIndex, wheelIndex), 0);
    
    return wheelContainer;
}

function rotateWheel(lockIndex, wheelIndex, direction) {
    const lock = gameConfig.locks[lockIndex];
    if (lock.isUnlocked) return;
    
    const chars = lock.availableChars;
    lock.currentValues[wheelIndex] = (lock.currentValues[wheelIndex] + direction + chars.length) % chars.length;
    updateWheelPosition(lockIndex, wheelIndex);
    playSound('click');
}

function updateWheelPosition(lockIndex, wheelIndex) {
    const wheel = document.querySelector(`.wheel[data-lock-index="${lockIndex}"][data-wheel-index="${wheelIndex}"]`);
    if (!wheel) return;
    
    const lock = gameConfig.locks[lockIndex];
    const chars = lock.availableChars;
    const itemHeight = wheel.querySelector('.wheel-item')?.offsetHeight || 100;
    
    const offset = (chars.length + lock.currentValues[wheelIndex]) * itemHeight;
    wheel.style.transform = `translateY(-${offset}px)`;
}

function resetAllWheels() {
    gameConfig.locks.forEach((lock, lockIndex) => {
        if (!lock.isUnlocked) {
            for (let i = 0; i < lock.digitCount; i++) {
                lock.currentValues[i] = 0;
                updateWheelPosition(lockIndex, i);
            }
        }
    });
    playSound('click');
}

function getCurrentCombination(lockIndex) {
    const lock = gameConfig.locks[lockIndex];
    return lock.currentValues.map(idx => lock.availableChars[idx]).join('');
}

function checkAllCombinations() {
    gameState.attempts++;
    document.getElementById('attempts-count').textContent = gameState.attempts;
    
    let anyCorrect = false;
    let allUnlocked = true;
    
    gameConfig.locks.forEach((lock, lockIndex) => {
        if (lock.isUnlocked) return;
        
        const current = getCurrentCombination(lockIndex);
        
        if (current === lock.combination) {
            // This lock is now unlocked!
            lock.isUnlocked = true;
            anyCorrect = true;
            
            // Update lock visual
            const lockBody = document.querySelector(`.lock-body[data-lock-index="${lockIndex}"]`);
            const statusEl = document.querySelector(`.lock-status[data-lock-index="${lockIndex}"]`);
            
            if (lockBody) {
                lockBody.classList.add('lock-open');
            }
            if (statusEl) {
                statusEl.className = 'lock-status unlocked';
                statusEl.textContent = '✅ Geöffnet!';
            }
            
            playSound('win');
        } else {
            allUnlocked = false;
        }
    });
    
    // Check if all locks are unlocked
    const allLocksOpen = gameConfig.locks.every(lock => lock.isUnlocked);
    
    if (allLocksOpen) {
        triggerWin();
    } else if (!anyCorrect) {
        // Wrong combination
        playSound('wrong');
        
        // Shake animation for all locked locks
        document.querySelectorAll('.lock-body').forEach(lockBody => {
            const lockIndex = parseInt(lockBody.dataset.lockIndex);
            if (!gameConfig.locks[lockIndex].isUnlocked) {
                lockBody.classList.add('shake-animation');
                setTimeout(() => lockBody.classList.remove('shake-animation'), 500);
            }
        });
        
        // Check max attempts
        if (gameConfig.maxAttempts > 0 && gameState.attempts >= gameConfig.maxAttempts) {
            triggerLose('Maximale Versuche erreicht!');
        }
    }
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
    
    // Reset all locks
    gameConfig.locks.forEach((lock, lockIndex) => {
        lock.isUnlocked = false;
        lock.currentValues = new Array(lock.digitCount).fill(0);
    });
    
    // Rebuild locks
    createAllLocks();
    
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
    
    // Enter to check
    if (e.key === 'Enter') {
        checkAllCombinations();
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
