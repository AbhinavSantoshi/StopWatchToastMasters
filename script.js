class Stopwatch {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isRunning = false;

        // Default to Ice Breaker (4-6 mins)
        this.currentPreset = {
            name: "Ice Breaker",
            green: 4 * 60,
            yellow: 5 * 60,
            red: 6 * 60
        };

        this.soundEnabled = false;
        this.audioContext = null;

        this.timerDisplay = document.getElementById('timer-display');
        this.statusText = document.querySelector('.status-text');
        this.startStopBtn = document.getElementById('start-stop-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.body = document.body;
        this.soundToggleBtn = document.getElementById('sound-toggle');

        this.setupEventListeners();
        this.updateDisplay(0);
        this.renderPresets();
    }

    setupEventListeners() {
        this.startStopBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());

        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('presets-panel').classList.add('active');
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('presets-panel').classList.remove('active');
            document.getElementById('custom-preset-form').style.display = 'none';
        });

        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());

        // Custom Preset Logic
        document.getElementById('apply-custom-btn').addEventListener('click', () => this.applyCustomPreset());
        document.getElementById('cancel-custom-btn').addEventListener('click', () => {
            document.getElementById('custom-preset-form').style.display = 'none';
        });
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundToggleBtn.innerHTML = this.soundEnabled
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

        if (this.soundEnabled && !this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playBeep(count = 1) {
        if (!this.soundEnabled || !this.audioContext) return;

        const playTone = (i) => {
            if (i >= count) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);

            setTimeout(() => playTone(i + 1), 600);
        };

        playTone(0);
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.soundEnabled && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateDisplay(this.elapsedTime);
            this.checkSignals(this.elapsedTime / 1000);
        }, 100);

        this.isRunning = true;
        this.startStopBtn.textContent = 'Stop';
        this.startStopBtn.classList.add('active');
        this.statusText.textContent = 'Timing...';
    }

    pauseTimer() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.startStopBtn.textContent = 'Start';
        this.startStopBtn.classList.remove('active');
        this.statusText.textContent = 'Paused';
    }

    resetTimer() {
        this.pauseTimer();
        this.elapsedTime = 0;
        this.updateDisplay(0);
        this.resetSignals();
        this.statusText.textContent = 'Ready';
    }

    updateDisplay(timeInMs) {
        const totalSeconds = Math.floor(timeInMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timerDisplay.textContent = formattedTime;
    }

    checkSignals(seconds) {
        // We need to check if we JUST crossed the threshold to play sound once
        // Using a small epsilon or state tracking would be better, but for now let's check integer seconds
        // Actually, better to track "last signal" state

        let newSignal = null;

        if (seconds >= this.currentPreset.red) {
            newSignal = 'red';
        } else if (seconds >= this.currentPreset.yellow) {
            newSignal = 'yellow';
        } else if (seconds >= this.currentPreset.green) {
            newSignal = 'green';
        }

        if (newSignal && newSignal !== this.currentSignal) {
            this.setSignal(newSignal);

            // Update status text for accessibility
            const signalName = newSignal.charAt(0).toUpperCase() + newSignal.slice(1);
            this.statusText.textContent = `${signalName} Signal`;

            // Play sounds based on signal
            if (newSignal === 'green') this.playBeep(1);
            if (newSignal === 'yellow') this.playBeep(2);
            if (newSignal === 'red') this.playBeep(3);
        }

        this.currentSignal = newSignal;
    }

    setSignal(color) {
        this.body.classList.remove('signal-green', 'signal-yellow', 'signal-red');
        this.body.classList.add(`signal-${color}`);
    }

    resetSignals() {
        this.body.classList.remove('signal-green', 'signal-yellow', 'signal-red');
        this.currentSignal = null;
    }

    setPreset(preset) {
        this.currentPreset = preset;
        this.resetTimer();
        document.getElementById('presets-panel').classList.remove('active');
        document.getElementById('custom-preset-form').style.display = 'none';
        this.statusText.textContent = `Selected: ${preset.name}`;
    }

    showCustomForm() {
        document.getElementById('custom-preset-form').style.display = 'block';
        // Scroll to form
        document.getElementById('custom-preset-form').scrollIntoView({ behavior: 'smooth' });
    }

    applyCustomPreset() {
        const gMin = parseInt(document.getElementById('custom-green-min').value) || 0;
        const gSec = parseInt(document.getElementById('custom-green-sec').value) || 0;
        const yMin = parseInt(document.getElementById('custom-yellow-min').value) || 0;
        const ySec = parseInt(document.getElementById('custom-yellow-sec').value) || 0;
        const rMin = parseInt(document.getElementById('custom-red-min').value) || 0;
        const rSec = parseInt(document.getElementById('custom-red-sec').value) || 0;

        // Validation: Non-negative and reasonable limits (e.g., max 99 minutes)
        if ([gMin, gSec, yMin, ySec, rMin, rSec].some(val => val < 0)) {
            alert("Time values cannot be negative.");
            return;
        }

        if ([gMin, yMin, rMin].some(val => val > 99)) {
            alert("Minutes cannot exceed 99.");
            return;
        }

        const green = gMin * 60 + gSec;
        const yellow = yMin * 60 + ySec;
        const red = rMin * 60 + rSec;

        if (green === 0 && yellow === 0 && red === 0) {
            alert("Please set at least one time value.");
            return;
        }

        if (green >= yellow || yellow >= red) {
            alert("Invalid times! Ensure Green < Yellow < Red.");
            return;
        }

        this.setPreset({
            name: "Custom",
            green,
            yellow,
            red
        });
    }

    renderPresets() {
        const presets = [
            { name: "Ice Breaker", green: 4 * 60, yellow: 5 * 60, red: 6 * 60 },
            { name: "Standard Speech", green: 5 * 60, yellow: 6 * 60, red: 7 * 60 },
            { name: "Table Topics", green: 1 * 60, yellow: 1.5 * 60, red: 2 * 60 },
            { name: "Evaluation", green: 2 * 60, yellow: 2.5 * 60, red: 3 * 60 },
            { name: "1 Minute", green: 0.5 * 60, yellow: 0.75 * 60, red: 1 * 60 }
        ];

        const grid = document.querySelector('.preset-grid');
        grid.innerHTML = '';

        presets.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.innerHTML = `
                <h3>${preset.name}</h3>
                <p>${this.formatTime(preset.green)} - ${this.formatTime(preset.yellow)} - ${this.formatTime(preset.red)}</p>
            `;
            card.addEventListener('click', () => this.setPreset(preset));
            grid.appendChild(card);
        });

        // Add Custom Button
        const customCard = document.createElement('div');
        customCard.className = 'preset-card';
        customCard.innerHTML = `
            <h3>Custom</h3>
            <p>Set your own times</p>
        `;
        customCard.addEventListener('click', () => this.showCustomForm());
        grid.appendChild(customCard);
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.stopwatch = new Stopwatch();
});
