// Shared Transport - manages tempo, play/stop, and scheduling for both engines
class Transport {
    constructor(synthEngine, drumEngine) {
        this.synth = synthEngine;
        this.drums = drumEngine;
        this.ctx = null;
        this.compressor = null;
        this.playing = false;
        this.tempo = 128;
        this.swing = 0;
        this.currentStep = 0;
        this.nextNoteTime = 0;
        this.timerID = null;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25;
        this.onStep = null; // UI callback
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -6;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.1;
        this.compressor.connect(this.ctx.destination);

        this.synth.init(this.ctx);
        this.drums.init(this.ctx);

        this.synth.getOutput().connect(this.compressor);
        this.drums.getOutput().connect(this.compressor);
    }

    start() {
        if (this.playing) return;
        this.init();
        this.playing = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stop() {
        this.playing = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.synth.stop(this.ctx ? this.ctx.currentTime : 0);
        this.currentStep = 0;
        if (this.onStep) this.onStep(-1);
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextNoteTime);
            this.advanceStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    scheduleStep(step, time) {
        if (this.onStep) this.onStep(step);
        this.synth.playStep(step, time);
        this.drums.playStep(step, time);
    }

    advanceStep() {
        const secondsPerBeat = 60.0 / this.tempo;
        const secondsPer16th = secondsPerBeat / 4;

        let swingOffset = 0;
        if (this.swing > 0) {
            if (this.currentStep % 2 === 0) {
                swingOffset = -(this.swing * secondsPer16th * 0.5);
            } else {
                swingOffset = this.swing * secondsPer16th * 0.5;
            }
        }

        this.nextNoteTime += secondsPer16th + swingOffset;
        this.currentStep = (this.currentStep + 1) % 16;
    }
}

window.Transport = Transport;
