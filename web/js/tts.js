/**
 * OjoVial — Text-to-Speech Audio Announcements
 * Announces detected traffic signs using the Web Speech API.
 * Features: voice selection, rate/pitch/volume, priority queue, localStorage persistence.
 */

class TrafficSignTTS {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = true;
        this.lang = 'es-ES';
        this.cooldownMs = 3000;
        this.lastSpoken = {};
        this.onAnnounce = null;
        this._unlocked = false;

        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.voiceName = '';
        this._voices = [];
        this._queue = [];
        this._speaking = false;

        this.priority = { pare: 3, ceda_el_paso: 3, prohibido_girar_derecha: 2, prohibido_girar_izquierda: 2, siga_de_frente: 1, velocidad_maxima_40: 1, velocidad_maxima_60: 1, prohibido_estacionar: 1 };

        this.announcements = {
            'es-ES': {
                pare: 'Alto. Se\u00f1al de pare detectada.',
                ceda_el_paso: 'Ceda el paso detectado.',
                prohibido_girar_derecha: 'Prohibido girar a la derecha.',
                prohibido_girar_izquierda: 'Prohibido girar a la izquierda.',
                siga_de_frente: 'Siga de frente.',
                velocidad_maxima_40: 'Velocidad m\u00e1xima, cuarenta kil\u00f3metros por hora.',
                velocidad_maxima_60: 'Velocidad m\u00e1xima, sesenta kil\u00f3metros por hora.',
                prohibido_estacionar: 'Prohibido estacionar.',
            },
            'en-US': {
                pare: 'Stop. Stop sign detected.',
                ceda_el_paso: 'Yield. Yield sign detected.',
                prohibido_girar_derecha: 'No right turn.',
                prohibido_girar_izquierda: 'No left turn.',
                siga_de_frente: 'Go straight ahead.',
                velocidad_maxima_40: 'Speed limit, forty kilometers per hour.',
                velocidad_maxima_60: 'Speed limit, sixty kilometers per hour.',
                prohibido_estacionar: 'No parking.',
            },
        };

        this._loadSettings();
        this._loadVoices();
        if (this.synth) {
            this.synth.onvoiceschanged = () => this._loadVoices();
        }
    }

    _loadVoices() {
        if (!this.synth) return;
        this._voices = this.synth.getVoices();
    }

    getVoices(lang) {
        const target = lang || this.lang;
        const base = target.split('-')[0];
        return this._voices.filter(v => v.lang === target || v.lang.startsWith(base));
    }

    setVoice(voiceName) {
        this.voiceName = voiceName;
        this._saveSettings();
    }

    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2.0, rate));
        this._saveSettings();
    }

    setPitch(pitch) {
        this.pitch = Math.max(0.5, Math.min(2.0, pitch));
        this._saveSettings();
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1.0, vol));
        this._saveSettings();
    }

    _loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem('ovial_tts_settings'));
            if (s) {
                this.rate = s.rate || 1.0;
                this.pitch = s.pitch || 1.0;
                this.volume = s.volume || 1.0;
                this.voiceName = s.voiceName || '';
                this.cooldownMs = s.cooldownMs || 3000;
                this.lang = s.lang || 'es-ES';
                this.enabled = s.enabled !== false;
            }
        } catch (_) {}
    }

    _saveSettings() {
        try {
            localStorage.setItem('ovial_tts_settings', JSON.stringify({
                rate: this.rate, pitch: this.pitch, volume: this.volume,
                voiceName: this.voiceName, cooldownMs: this.cooldownMs,
                lang: this.lang, enabled: this.enabled,
            }));
        } catch (_) {}
    }

    _getSelectedVoice() {
        if (!this.voiceName) return null;
        return this._voices.find(v => v.name === this.voiceName) || null;
    }

    _speak(text, className) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.lang;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.volume = this.volume;

        const voice = this._getSelectedVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            this._speaking = false;
            this._processQueue();
        };
        utterance.onerror = () => {
            this._speaking = false;
            this._processQueue();
        };

        if (this._speaking && this.priority[className] !== undefined) {
            const currentPriority = this._currentPriority || 0;
            const newPriority = this.priority[className] || 0;
            if (newPriority >= currentPriority) {
                this.synth.cancel();
                this._queue = [];
                this._speaking = false;
            } else {
                this._queue.push({ utterance, className, priority: newPriority });
                return;
            }
        }

        this._currentPriority = this.priority[className] || 0;
        this._speaking = true;
        this.synth.speak(utterance);
    }

    _processQueue() {
        if (this._queue.length === 0) return;
        const next = this._queue.shift();
        this._currentPriority = next.priority;
        this._speaking = true;
        this.synth.speak(next.utterance);
    }

    unlock() {
        if (this._unlocked) return;
        if (!this.synth) return;
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        this.synth.speak(utterance);
        this._unlocked = true;
    }

    announce(className, confidence) {
        if (!this.enabled || !this.synth) return false;
        if (!this._unlocked) return false;
        if (confidence < 0.60) return false;

        const now = Date.now();
        const last = this.lastSpoken[className] || 0;
        if ((now - last) < this.cooldownMs) return false;

        const msg = (this.announcements[this.lang] || this.announcements['es-ES'])[className];
        if (!msg) return false;

        this.lastSpoken[className] = now;
        this._speak(msg, className);

        if (this.onAnnounce) {
            this.onAnnounce(className, confidence, msg);
        }
        return true;
    }

    processDetections(detections) {
        for (const det of detections) {
            this.announce(det.className, det.confidence);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.synth.cancel();
            this._queue = [];
            this._speaking = false;
        }
        this._saveSettings();
        return this.enabled;
    }

    setLanguage(lang) {
        this.lang = lang;
        this._saveSettings();
    }

    setCooldown(ms) {
        this.cooldownMs = Math.max(1000, Math.min(10000, ms));
        this._saveSettings();
    }

    isSupported() { return 'speechSynthesis' in window; }
    isUnlocked() { return this._unlocked; }

    getStatusText() {
        if (!this.isSupported()) return 'TTS not supported in this browser';
        if (!this.enabled) return 'Audio muted';
        if (!this._unlocked) return 'Click to enable audio';
        return `Audio enabled \u2014 ${this.cooldownMs / 1000}s cooldown`;
    }
}
