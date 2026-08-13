// TR-808 Drum Engine
class DrumEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.params = {
            kick: { tone: 50, decay: 60 },
            snare: { tone: 50, snappy: 60 },
            clap: { decay: 50 },
            rim: {},
            tom_low: { tone: 30 },
            tom_mid: { tone: 50 },
            tom_hi: { tone: 70 },
            hihat_closed: { decay: 30 },
            hihat_open: { decay: 60 },
            cymbal: { decay: 70 },
            cowbell: {},
            conga_hi: { tone: 70 },
            conga_mid: { tone: 50 },
            conga_low: { tone: 30 },
            maracas: {},
            claves: {}
        };

        this.instruments = [
            'kick', 'snare', 'clap', 'rim',
            'tom_low', 'tom_mid', 'tom_hi',
            'hihat_closed', 'hihat_open', 'cymbal',
            'cowbell', 'conga_hi', 'conga_mid', 'conga_low',
            'maracas', 'claves'
        ];

        this.currentPattern = 0;
        this.patterns = Array.from({ length: 4 }, () =>
            Object.fromEntries(this.instruments.map(inst => [inst, new Array(16).fill(false)]))
        );
    }

    get pattern() {
        return this.patterns[this.currentPattern];
    }

    init(ctx) {
        if (this.masterGain) return;
        this.ctx = ctx;
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
    }

    getOutput() {
        return this.masterGain;
    }

    setVolume(val) {
        if (this.masterGain) this.masterGain.gain.value = val;
    }

    setParam(instrument, param, value) {
        if (!this.params[instrument]) this.params[instrument] = {};
        this.params[instrument][param] = value;
    }

    playStep(step, time) {
        this.instruments.forEach(inst => {
            if (this.pattern[inst][step]) {
                this.play(inst, time);
            }
        });
    }

    play(instrument, time) {
        const t = time || this.ctx.currentTime;
        switch (instrument) {
            case 'kick': this.playKick(t); break;
            case 'snare': this.playSnare(t); break;
            case 'clap': this.playClap(t); break;
            case 'rim': this.playRim(t); break;
            case 'tom_low': this.playTom(t, 80); break;
            case 'tom_mid': this.playTom(t, 120); break;
            case 'tom_hi': this.playTom(t, 160); break;
            case 'hihat_closed': this.playHihat(t, false); break;
            case 'hihat_open': this.playHihat(t, true); break;
            case 'cymbal': this.playCymbal(t); break;
            case 'cowbell': this.playCowbell(t); break;
            case 'conga_hi': this.playConga(t, 420); break;
            case 'conga_mid': this.playConga(t, 340); break;
            case 'conga_low': this.playConga(t, 260); break;
            case 'maracas': this.playMaracas(t); break;
            case 'claves': this.playClaves(t); break;
        }
    }

    playKick(t) {
        const p = this.params.kick;
        const toneVal = 30 + (p.tone / 100) * 40;
        const decayVal = 0.1 + (p.decay / 100) * 0.6;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 + toneVal, t);
        osc.frequency.exponentialRampToValueAtTime(toneVal, t + 0.04);
        osc.frequency.exponentialRampToValueAtTime(20, t + decayVal);
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + decayVal);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(400, t);
        osc2.frequency.exponentialRampToValueAtTime(40, t + 0.02);
        gain2.gain.setValueAtTime(0.6, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        osc.connect(gain); osc2.connect(gain2);
        gain.connect(this.masterGain); gain2.connect(this.masterGain);
        osc.start(t); osc.stop(t + decayVal + 0.01);
        osc2.start(t); osc2.stop(t + 0.05);
    }

    playSnare(t) {
        const p = this.params.snare;
        const toneVal = 150 + (p.tone / 100) * 100;
        const snappy = (p.snappy || 60) / 100;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(toneVal, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        oscGain.gain.setValueAtTime(0.7, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(oscGain); oscGain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.2);
        const noise = this.createNoise(t, 0.2);
        const noiseGain = this.ctx.createGain();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000 + snappy * 4000;
        noiseGain.gain.setValueAtTime(snappy * 0.8, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.masterGain);
    }

    playClap(t) {
        const p = this.params.clap;
        const decayVal = 0.1 + (p.decay / 100) * 0.25;
        for (let i = 0; i < 3; i++) {
            const offset = t + i * 0.012;
            const noise = this.createNoise(offset, 0.04);
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass'; filter.frequency.value = 2500; filter.Q.value = 3;
            gain.gain.setValueAtTime(0.8, offset);
            gain.gain.exponentialRampToValueAtTime(0.01, offset + 0.03);
            noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        }
        const noiseTail = this.createNoise(t + 0.036, decayVal);
        const tailGain = this.ctx.createGain();
        const tailFilter = this.ctx.createBiquadFilter();
        tailFilter.type = 'bandpass'; tailFilter.frequency.value = 2500; tailFilter.Q.value = 2;
        tailGain.gain.setValueAtTime(0.6, t + 0.036);
        tailGain.gain.exponentialRampToValueAtTime(0.01, t + 0.036 + decayVal);
        noiseTail.connect(tailFilter); tailFilter.connect(tailGain); tailGain.connect(this.masterGain);
    }

    playRim(t) {
        const p = this.params.rim;
        const toneMul = 0.7 + ((p.tone || 50) / 100) * 0.6;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.value = 1700 * toneMul;
        osc2.type = 'square'; osc2.frequency.value = 900 * toneMul;
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.01);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 3000 * toneMul; filter.Q.value = 5;
        osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.02); osc2.start(t); osc2.stop(t + 0.02);
    }

    playTom(t, baseFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.5, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.04);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.35);
    }

    playHihat(t, open) {
        const p = open ? this.params.hihat_open : this.params.hihat_closed;
        const decayVal = open ? 0.15 + (p.decay / 100) * 0.5 : 0.02 + (p.decay / 100) * 0.08;
        const freqs = [2093, 2523, 3136, 4186, 5274, 6645];
        const merger = this.ctx.createGain(); merger.gain.value = 0.3;
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'square'; osc.frequency.value = f;
            osc.connect(merger); osc.start(t); osc.stop(t + decayVal + 0.01);
        });
        const hpFilter = this.ctx.createBiquadFilter();
        hpFilter.type = 'highpass'; hpFilter.frequency.value = 7000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + decayVal);
        merger.connect(hpFilter); hpFilter.connect(gain); gain.connect(this.masterGain);
    }

    playCymbal(t) {
        const p = this.params.cymbal;
        const decayVal = 0.4 + (p.decay / 100) * 1.0;
        const freqs = [2093, 2523, 3136, 4186, 5274, 6645, 8372];
        const merger = this.ctx.createGain(); merger.gain.value = 0.2;
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'square'; osc.frequency.value = f * (0.98 + Math.random() * 0.04);
            osc.connect(merger); osc.start(t); osc.stop(t + decayVal + 0.01);
        });
        const hpFilter = this.ctx.createBiquadFilter();
        hpFilter.type = 'highpass'; hpFilter.frequency.value = 5000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + decayVal);
        merger.connect(hpFilter); hpFilter.connect(gain); gain.connect(this.masterGain);
    }

    playCowbell(t) {
        const p = this.params.cowbell;
        const toneMul = 0.7 + ((p.tone || 50) / 100) * 0.6;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc1.type = 'square'; osc1.frequency.value = 560 * toneMul;
        osc2.type = 'square'; osc2.frequency.value = 845 * toneMul;
        filter.type = 'bandpass'; filter.frequency.value = 700 * toneMul; filter.Q.value = 3;
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        osc1.start(t); osc1.stop(t + 0.35); osc2.start(t); osc2.stop(t + 0.35);
    }

    playConga(t, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.2, t);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.2);
    }

    playMaracas(t) {
        const noise = this.createNoise(t, 0.05);
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        filter.type = 'highpass'; filter.frequency.value = 8000;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    }

    playClaves(t) {
        const p = this.params.claves;
        const toneFreq = 1800 + ((p.tone || 50) / 100) * 1400;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = toneFreq;
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = toneFreq; filter.Q.value = 20;
        osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.05);
    }

    createNoise(t, duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.start(t);
        return source;
    }
}

window.DrumEngine = DrumEngine;
