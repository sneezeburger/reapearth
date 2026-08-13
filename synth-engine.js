// TB-303 Synthesizer Engine
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function noteToFreq(note, octave) {
    const semitone = NOTES.indexOf(note);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

class SynthEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.waveform = 'sawtooth';
        this.cutoff = 800;
        this.resonance = 8;
        this.envMod = 3000;
        this.decay = 0.3;
        this.accentAmount = 60;
        this.volume = 0.75;

        this.pattern = Array.from({ length: 16 }, () => ({
            active: false, note: 'C', octave: 2, accent: false, slide: false
        }));

        // Default acid pattern
        this.pattern[0] = { active: true, note: 'C', octave: 2, accent: true, slide: false };
        this.pattern[2] = { active: true, note: 'C', octave: 2, accent: false, slide: false };
        this.pattern[3] = { active: true, note: 'D#', octave: 2, accent: false, slide: true };
        this.pattern[4] = { active: true, note: 'F', octave: 2, accent: true, slide: false };
        this.pattern[6] = { active: true, note: 'F', octave: 2, accent: false, slide: false };
        this.pattern[7] = { active: true, note: 'G', octave: 2, accent: false, slide: true };
        this.pattern[8] = { active: true, note: 'C', octave: 3, accent: true, slide: false };
        this.pattern[10] = { active: true, note: 'C', octave: 2, accent: false, slide: false };
        this.pattern[12] = { active: true, note: 'D#', octave: 2, accent: false, slide: true };
        this.pattern[13] = { active: true, note: 'F', octave: 2, accent: true, slide: false };
        this.pattern[15] = { active: true, note: 'G', octave: 2, accent: false, slide: false };

        this.activeOsc = null;
        this.activeFilter = null;
        this.activeGain = null;
    }

    init(ctx) {
        if (this.masterGain) return;
        this.ctx = ctx;
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
    }

    getOutput() {
        return this.masterGain;
    }

    setVolume(val) {
        this.volume = val;
        if (this.masterGain) this.masterGain.gain.value = val;
    }

    playStep(step, time) {
        const s = this.pattern[step];
        if (!s.active) {
            if (this.activeGain) {
                this.activeGain.gain.cancelScheduledValues(time);
                this.activeGain.gain.setValueAtTime(this.activeGain.gain.value, time);
                this.activeGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
            }
            return;
        }

        const freq = noteToFreq(s.note, s.octave);
        const isAccent = s.accent;
        const accentMul = isAccent ? (1 + this.accentAmount / 100) : 1;

        const prevStep = (step - 1 + 16) % 16;
        const prevSlide = this.pattern[prevStep].slide && this.pattern[prevStep].active;

        if (prevSlide && this.activeOsc) {
            this.activeOsc.frequency.cancelScheduledValues(time);
            this.activeOsc.frequency.setValueAtTime(this.activeOsc.frequency.value, time);
            this.activeOsc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);

            if (isAccent && this.activeFilter) {
                const envPeak = this.cutoff + this.envMod * accentMul;
                this.activeFilter.frequency.cancelScheduledValues(time);
                this.activeFilter.frequency.setValueAtTime(envPeak, time);
                this.activeFilter.frequency.exponentialRampToValueAtTime(
                    Math.max(this.cutoff, 20), time + this.decay * 0.7
                );
            }
        } else {
            this.killVoice(time);

            const osc = this.ctx.createOscillator();
            osc.type = this.waveform;
            osc.frequency.setValueAtTime(freq, time);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = this.resonance;

            const envPeak = this.cutoff + this.envMod * accentMul;
            filter.frequency.setValueAtTime(envPeak, time);
            filter.frequency.exponentialRampToValueAtTime(
                Math.max(this.cutoff, 20), time + this.decay
            );

            const vca = this.ctx.createGain();
            const noteVol = isAccent ? 0.9 : 0.6;
            vca.gain.setValueAtTime(noteVol, time);

            if (!s.slide) {
                vca.gain.setValueAtTime(noteVol, time + this.decay * 0.8);
                vca.gain.exponentialRampToValueAtTime(0.001, time + this.decay * 1.2 + 0.05);
            }

            osc.connect(filter);
            filter.connect(vca);
            vca.connect(this.masterGain);
            osc.start(time);

            this.activeOsc = osc;
            this.activeFilter = filter;
            this.activeGain = vca;
        }
    }

    killVoice(time) {
        if (this.activeOsc) {
            try { this.activeOsc.stop(time + 0.05); } catch (e) {}
            this.activeOsc = null;
        }
        this.activeFilter = null;
        this.activeGain = null;
    }

    stop(time) {
        this.killVoice(time);
    }
}

window.SynthEngine = SynthEngine;
window.NOTES = NOTES;
