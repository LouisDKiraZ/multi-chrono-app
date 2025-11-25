class TimerApp {
    constructor() {
        // Configuration
        this.maxTimers = 5;
        this.defaultColor = '#ff0000ff';
        this.defaultSoundPath = 'assets/beep.mp3'; // Path to default asset
        
        this.timers = []; // Array of timer objects
        this.currentTimerIndex = 0;
        this.isRunning = false;
        this.isSoundEnabled = true;
        this.globalInterval = null;
        this.currentColor = this.defaultColor;

        // Rapid Scroll Variables
        this.adjustInterval = null;
        this.adjustTimeout = null;

        // DOM Elements
        this.container = document.getElementById('timers-container');
        this.btnAdd = document.getElementById('btn-add');
        this.btnRemove = document.getElementById('btn-remove');
        this.btnStartStop = document.getElementById('btn-start-stop');
        this.btnVolume = document.getElementById('btn-volume');
        this.iconVolume = document.getElementById('icon-volume');
        this.btnColor = document.getElementById('btn-color');
        this.colorPicker = document.getElementById('color-picker');
        this.globalSoundInput = document.getElementById('global-sound-input');

        this.tempSoundTargetIndex = null;

        this.init();
    }

    init() {
        // Initial Timer
        this.addTimer();

        // Event Listeners
        this.btnAdd.addEventListener('click', () => this.addTimer());
        this.btnRemove.addEventListener('click', () => this.removeTimer());
        this.btnStartStop.addEventListener('click', () => this.toggleStartStop());
        this.btnVolume.addEventListener('click', () => this.toggleVolume());
        
        // Color Picker
        this.btnColor.addEventListener('click', () => this.colorPicker.click());
        this.colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.btnColor.style.backgroundColor = this.currentColor;
            this.updateActiveTimerColor();
        });

        // Sound File Selection
        this.globalSoundInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0] && this.tempSoundTargetIndex !== null) {
                const file = e.target.files[0];
                const url = URL.createObjectURL(file);
                this.timers[this.tempSoundTargetIndex].soundSrc = url; // Store URL string
                // Reset
                this.globalSoundInput.value = ''; 
                this.tempSoundTargetIndex = null;
            }
        });

        // Global mouseup to stop any rapid scrolling if mouse leaves button
        document.addEventListener('mouseup', () => this.stopAdjusting());
    }

    addTimer() {
        if (this.timers.length >= this.maxTimers) return;

        // Determine Sound Source (Inherit or Default)
        let initialSound = this.defaultSoundPath;
        if (this.timers.length > 0) {
            // Inherit from the previous timer
            initialSound = this.timers[this.timers.length - 1].soundSrc;
        }

        const timerObj = {
            id: Date.now(),
            title: `Timer ${this.timers.length + 1}`,
            duration: 10, // default seconds
            remaining: 10,
            soundSrc: initialSound
        };

        this.timers.push(timerObj);
        this.renderTimers();
        this.updateUI();
    }

    removeTimer() {
        if (this.timers.length <= 0) return;
        this.timers.pop();
        
        // If we removed the currently running timer
        if (this.currentTimerIndex >= this.timers.length) {
            this.currentTimerIndex = 0;
            this.stop();
        }
        
        this.renderTimers();
        this.updateUI();
    }

    toggleStartStop() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (this.timers.length === 0) return;
        this.isRunning = true;
        this.btnStartStop.innerText = "STOP";
        this.updateActiveTimerColor();
        
        if (this.globalInterval) clearInterval(this.globalInterval);
        
        this.globalInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        this.btnStartStop.innerText = "START";
        clearInterval(this.globalInterval);
    }

    tick() {
        const currentTimer = this.timers[this.currentTimerIndex];
        
        if (currentTimer.remaining > 0) {
            currentTimer.remaining--;
            this.updateTimerDisplay(this.currentTimerIndex);
        } else {
            // Timer Finished
            this.playTimerSound(currentTimer);
            
            // Reset current timer
            currentTimer.remaining = currentTimer.duration; 
            this.updateTimerDisplay(this.currentTimerIndex);

            // Move to next
            this.currentTimerIndex++;
            if (this.currentTimerIndex >= this.timers.length) {
                this.currentTimerIndex = 0; 
            }
            
            this.updateActiveTimerColor();
            this.renderTimers(); 
        }
    }

    playTimerSound(timer) {
        if (!this.isSoundEnabled) return;
        
        const src = timer.soundSrc || this.defaultSoundPath;
        const audio = new Audio(src);
        audio.play().catch(e => console.log("Audio play blocked or missing", e));
    }

    toggleVolume() {
        this.isSoundEnabled = !this.isSoundEnabled;
        this.iconVolume.innerText = this.isSoundEnabled ? '🔊' : '🔇'; 
    }

    // --- TIME ADJUSTMENT LOGIC ---

    startAdjusting(index, amount) {
        // 1. Apply immediate change
        this.modifyTimerValue(index, amount);

        // 2. Wait a moment (500ms) before rapid scrolling
        this.adjustTimeout = setTimeout(() => {
            // 3. Start rapid scrolling (100ms interval)
            this.adjustInterval = setInterval(() => {
                this.modifyTimerValue(index, amount);
            }, 100);
        }, 500);
    }

    stopAdjusting() {
        clearTimeout(this.adjustTimeout);
        clearInterval(this.adjustInterval);
        this.adjustTimeout = null;
        this.adjustInterval = null;
    }

    modifyTimerValue(index, amount) {
        // Check if we need to stop the timer
        if (this.isRunning && this.currentTimerIndex === index) {
            this.stop();
        }

        const timer = this.timers[index];
        // Adjust Duration (and remaining if currently full/reset)
        // Requirement says "increase/decrease number". usually implies modifying the set duration AND current remaining
        // For simplicity in this UX, we modify 'remaining' directly, and update 'duration' to match
        // so next time it resets, it keeps this new value.
        
        let newVal = timer.remaining + amount;
        if (newVal < 1) newVal = 1; // Minimum 1 second
        
        timer.remaining = newVal;
        timer.duration = newVal; // Sync duration for next loop

        this.updateTimerDisplay(index);
    }

    updateActiveTimerColor() {
        document.documentElement.style.setProperty('--active-timer-base', this.currentColor);
        
        const panels = document.querySelectorAll('.timer-panel');
        panels.forEach((panel, idx) => {
            if (idx === this.currentTimerIndex) {
                panel.classList.add('active');
                panel.style.background = `radial-gradient(circle, ${this.currentColor} 0%, black 100%)`;
            } else {
                panel.classList.remove('active');
                panel.style.background = 'black';
            }
        });
    }

    renderTimers() {
        this.container.innerHTML = '';
        
        this.timers.forEach((timer, index) => {
            const el = document.createElement('div');
            el.className = 'timer-panel';
            if (index === this.currentTimerIndex) el.classList.add('active');

            // Title
            const titleInput = document.createElement('input');
            titleInput.className = 'timer-title';
            titleInput.value = timer.title;
            titleInput.addEventListener('input', (e) => timer.title = e.target.value);

            // Container for Display + Arrows
            const displayContainer = document.createElement('div');
            displayContainer.className = 'timer-display-container';

            // Number
            const display = document.createElement('div');
            display.className = 'timer-display';
            display.id = `display-${index}`;
            display.innerText = timer.remaining;

            // Arrows
            const controls = document.createElement('div');
            controls.className = 'timer-controls';
            
            const btnUp = document.createElement('button');
            btnUp.className = 'btn-adjust';
            btnUp.innerText = '▲';
            // Mouse/Touch events for Hold
            btnUp.addEventListener('mousedown', () => this.startAdjusting(index, 1));
            
            const btnDown = document.createElement('button');
            btnDown.className = 'btn-adjust';
            btnDown.innerText = '▼';
            btnDown.addEventListener('mousedown', () => this.startAdjusting(index, -1));

            controls.appendChild(btnUp);
            controls.appendChild(btnDown);

            displayContainer.appendChild(display);
            displayContainer.appendChild(controls);

            // Sound Button
            const btnSound = document.createElement('button');
            btnSound.className = 'btn-sound';
            btnSound.innerText = '🎵'; 
            btnSound.title = "Change Sound";
            btnSound.onclick = () => {
                this.tempSoundTargetIndex = index;
                this.globalSoundInput.click();
            };

            el.appendChild(titleInput);
            el.appendChild(displayContainer);
            el.appendChild(btnSound);

            this.container.appendChild(el);
        });

        this.updateActiveTimerColor();
    }

    updateTimerDisplay(index) {
        const el = document.getElementById(`display-${index}`);
        if (el) {
            el.innerText = this.timers[index].remaining;
        }
    }

    updateUI() {
        this.btnAdd.disabled = this.timers.length >= this.maxTimers;
        this.btnRemove.disabled = this.timers.length <= 0;
        
        this.btnAdd.style.backgroundColor = this.btnAdd.disabled ? 'grey' : 'white';
        this.btnRemove.style.backgroundColor = this.btnRemove.disabled ? 'grey' : 'white';
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    const app = new TimerApp();
});