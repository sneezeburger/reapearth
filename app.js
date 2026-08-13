// TB-808 App - UI wiring
document.addEventListener('DOMContentLoaded', () => {
    const synth = new SynthEngine();
    const drums = new DrumEngine();
    const transport = new Transport(synth, drums);

    // === Step display callback ===
    transport.onStep = (step) => {
        requestAnimationFrame(() => {
            // Synth step indicators
            document.querySelectorAll('.note-btn').forEach((btn, i) => {
                btn.classList.toggle('current', i === step);
            });
            // Drum step indicators
            document.querySelectorAll('.step.current').forEach(s => s.classList.remove('current'));
            if (step >= 0) {
                document.querySelectorAll(`.step[data-step="${step}"]`).forEach(s => s.classList.add('current'));
            }
        });
    };

    // === Transport Controls ===
    document.getElementById('play-btn').addEventListener('click', () => {
        transport.start();
        document.getElementById('play-btn').classList.add('active');
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
        transport.stop();
        document.getElementById('play-btn').classList.remove('active');
    });

    const tempoSlider = document.getElementById('tempo');
    const tempoDisplay = document.getElementById('tempo-display');
    tempoSlider.addEventListener('input', (e) => {
        transport.tempo = parseInt(e.target.value);
        tempoDisplay.textContent = transport.tempo;
    });

    document.getElementById('swing').addEventListener('input', (e) => {
        transport.swing = parseInt(e.target.value) / 100;
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (transport.playing) {
                transport.stop();
                document.getElementById('play-btn').classList.remove('active');
            } else {
                transport.start();
                document.getElementById('play-btn').classList.add('active');
            }
        }
    });

    // === Synth UI ===
    const noteRow = document.getElementById('note-row');
    const pitchRow = document.getElementById('pitch-row');
    const octRow = document.getElementById('oct-row');
    const accentRow = document.getElementById('accent-row');
    const slideRow = document.getElementById('slide-row');

    for (let i = 0; i < 16; i++) {
        const noteBtn = document.createElement('div');
        noteBtn.className = 'note-btn' + (synth.pattern[i].active ? ' active' : '');
        noteBtn.dataset.step = i;
        noteBtn.textContent = i + 1;
        noteBtn.addEventListener('click', () => {
            synth.pattern[i].active = !synth.pattern[i].active;
            noteBtn.classList.toggle('active');
        });
        noteRow.appendChild(noteBtn);

        const pitchDisp = document.createElement('div');
        pitchDisp.className = 'note-display';
        pitchDisp.textContent = synth.pattern[i].note;
        pitchDisp.addEventListener('click', () => {
            const idx = NOTES.indexOf(synth.pattern[i].note);
            synth.pattern[i].note = NOTES[(idx + 1) % 12];
            pitchDisp.textContent = synth.pattern[i].note;
        });
        pitchDisp.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const idx = NOTES.indexOf(synth.pattern[i].note);
            synth.pattern[i].note = NOTES[(idx - 1 + 12) % 12];
            pitchDisp.textContent = synth.pattern[i].note;
        });
        pitchRow.appendChild(pitchDisp);

        const octDisp = document.createElement('div');
        octDisp.className = 'oct-btn';
        octDisp.textContent = synth.pattern[i].octave;
        octDisp.addEventListener('click', () => {
            synth.pattern[i].octave = (synth.pattern[i].octave % 4) + 1;
            octDisp.textContent = synth.pattern[i].octave;
        });
        octDisp.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            synth.pattern[i].octave = synth.pattern[i].octave <= 1 ? 4 : synth.pattern[i].octave - 1;
            octDisp.textContent = synth.pattern[i].octave;
        });
        octRow.appendChild(octDisp);

        const accBtn = document.createElement('div');
        accBtn.className = 'toggle-btn' + (synth.pattern[i].accent ? ' active' : '');
        accBtn.textContent = 'A';
        accBtn.addEventListener('click', () => {
            synth.pattern[i].accent = !synth.pattern[i].accent;
            accBtn.classList.toggle('active');
        });
        accentRow.appendChild(accBtn);

        const slideBtn = document.createElement('div');
        slideBtn.className = 'toggle-btn' + (synth.pattern[i].slide ? ' slide-active' : '');
        slideBtn.textContent = 'S';
        slideBtn.addEventListener('click', () => {
            synth.pattern[i].slide = !synth.pattern[i].slide;
            slideBtn.classList.toggle('slide-active');
        });
        slideRow.appendChild(slideBtn);
    }

    // Synth knobs
    const knobs = [
        ['k-cutoff', 'v-cutoff', 'cutoff', v => Math.round(v)],
        ['k-reso', 'v-reso', 'resonance', v => v.toFixed(1)],
        ['k-envmod', 'v-envmod', 'envMod', v => Math.round(v)],
        ['k-decay', 'v-decay', 'decay', v => v.toFixed(2)],
        ['k-accent', 'v-accent', 'accentAmount', v => Math.round(v)],
    ];

    for (const [sliderId, valId, prop, fmt] of knobs) {
        document.getElementById(sliderId).addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            synth[prop] = val;
            document.getElementById(valId).textContent = fmt(val);
        });
    }

    document.getElementById('synth-volume').addEventListener('input', (e) => {
        synth.setVolume(parseInt(e.target.value) / 100);
    });

    // Waveform
    document.querySelectorAll('.wave-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            synth.waveform = btn.dataset.wave;
            if (synth.activeOsc) synth.activeOsc.type = synth.waveform;
        });
    });

    // === Drum UI ===
    // Toggle collapsible per-drum params
    document.querySelectorAll('[data-toggle-params]').forEach(label => {
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            const wrapper = label.closest('.track-wrapper');
            const wasOpen = wrapper.classList.contains('open');
            wrapper.classList.toggle('open');
            // Update arrow indicator
            const name = label.textContent.replace(/\s*[▸▾]\s*$/, '');
            label.textContent = name + (wasOpen ? ' ▸' : ' ▾');
        });
    });

    const trackWrappers = document.querySelectorAll('.track-wrapper');
    trackWrappers.forEach(wrapper => {
        const inst = wrapper.dataset.instrument;
        const stepsRow = wrapper.querySelector('.steps-row');
        for (let i = 0; i < 16; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.step = i;
            step.dataset.instrument = inst;
            if (i % 4 === 0) step.classList.add('beat-1');
            step.addEventListener('click', () => {
                drums.pattern[inst][i] = !drums.pattern[inst][i];
                step.classList.toggle('active');
                if (drums.pattern[inst][i] && !transport.playing) {
                    transport.init();
                    drums.play(inst);
                }
            });
            stepsRow.appendChild(step);
        }

        // Per-drum param sliders
        wrapper.querySelectorAll('.track-params input[type="range"]').forEach(input => {
            input.addEventListener('input', (e) => {
                drums.setParam(inst, e.target.dataset.param, parseInt(e.target.value));
            });
        });
    });

    document.getElementById('drum-volume').addEventListener('input', (e) => {
        transport.init();
        drums.setVolume(parseInt(e.target.value) / 100);
    });

    // Pattern buttons
    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            drums.currentPattern = parseInt(btn.dataset.pattern);
            updateDrumGrid();
        });
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        drums.instruments.forEach(inst => drums.pattern[inst].fill(false));
        updateDrumGrid();
    });

    function updateDrumGrid() {
        document.querySelectorAll('.step').forEach(step => {
            const inst = step.dataset.instrument;
            const idx = parseInt(step.dataset.step);
            step.classList.toggle('active', drums.pattern[inst][idx]);
        });
    }

    // === Share / URL Serialization ===
    function serialize() {
        const params = new URLSearchParams();
        params.set('t', transport.tempo);
        params.set('sw', Math.round(transport.swing * 100));

        // Synth params
        params.set('w', synth.waveform === 'sawtooth' ? 's' : 'q');
        params.set('co', Math.round(synth.cutoff));
        params.set('re', synth.resonance);
        params.set('em', Math.round(synth.envMod));
        params.set('dc', synth.decay);
        params.set('ac', synth.accentAmount);
        params.set('sv', Math.round(synth.volume * 100));

        // Synth pattern
        let synthPat = '';
        for (let i = 0; i < 16; i++) {
            const s = synth.pattern[i];
            const noteIdx = NOTES.indexOf(s.note).toString(16);
            synthPat += (s.active ? '1' : '0') + noteIdx + s.octave + (s.accent ? '1' : '0') + (s.slide ? '1' : '0');
        }
        params.set('sp', synthPat);

        // Drum pattern (all 4)
        params.set('dp', drums.currentPattern);
        const patStrings = [];
        for (let p = 0; p < 4; p++) {
            const instBits = [];
            for (const inst of drums.instruments) {
                let bits = 0;
                for (let s = 0; s < 16; s++) {
                    if (drums.patterns[p][inst][s]) bits |= (1 << s);
                }
                instBits.push(bits.toString(16).padStart(4, '0'));
            }
            patStrings.push(instBits.join(''));
        }
        params.set('dr', patStrings.join('-'));

        const base = window.location.href.split('?')[0];
        return base + '?' + params.toString();
    }

    function loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('t') && !params.has('sp')) return;

        if (params.has('t')) { transport.tempo = parseInt(params.get('t')); tempoSlider.value = transport.tempo; tempoDisplay.textContent = transport.tempo; }
        if (params.has('sw')) { transport.swing = parseInt(params.get('sw')) / 100; document.getElementById('swing').value = parseInt(params.get('sw')); }

        if (params.has('w')) { synth.waveform = params.get('w') === 'q' ? 'square' : 'sawtooth'; document.querySelectorAll('.wave-btn').forEach(b => b.classList.toggle('active', b.dataset.wave === synth.waveform)); }
        if (params.has('co')) { synth.cutoff = parseInt(params.get('co')); document.getElementById('k-cutoff').value = synth.cutoff; document.getElementById('v-cutoff').textContent = synth.cutoff; }
        if (params.has('re')) { synth.resonance = parseFloat(params.get('re')); document.getElementById('k-reso').value = synth.resonance; document.getElementById('v-reso').textContent = synth.resonance.toFixed(1); }
        if (params.has('em')) { synth.envMod = parseInt(params.get('em')); document.getElementById('k-envmod').value = synth.envMod; document.getElementById('v-envmod').textContent = synth.envMod; }
        if (params.has('dc')) { synth.decay = parseFloat(params.get('dc')); document.getElementById('k-decay').value = synth.decay; document.getElementById('v-decay').textContent = synth.decay.toFixed(2); }
        if (params.has('ac')) { synth.accentAmount = parseInt(params.get('ac')); document.getElementById('k-accent').value = synth.accentAmount; document.getElementById('v-accent').textContent = synth.accentAmount; }
        if (params.has('sv')) { const v = parseInt(params.get('sv')); synth.setVolume(v / 100); document.getElementById('synth-volume').value = v; }

        if (params.has('sp')) {
            const pat = params.get('sp');
            for (let i = 0; i < 16; i++) {
                const base = i * 5;
                synth.pattern[i] = {
                    active: pat[base] === '1',
                    note: NOTES[parseInt(pat[base + 1], 16)],
                    octave: parseInt(pat[base + 2]),
                    accent: pat[base + 3] === '1',
                    slide: pat[base + 4] === '1'
                };
            }
            document.querySelectorAll('.note-btn').forEach((btn, i) => btn.classList.toggle('active', synth.pattern[i].active));
            document.querySelectorAll('.note-display').forEach((d, i) => d.textContent = synth.pattern[i].note);
            document.querySelectorAll('.oct-btn').forEach((d, i) => d.textContent = synth.pattern[i].octave);
            document.querySelectorAll('#accent-row .toggle-btn').forEach((b, i) => b.classList.toggle('active', synth.pattern[i].accent));
            document.querySelectorAll('#slide-row .toggle-btn').forEach((b, i) => b.classList.toggle('slide-active', synth.pattern[i].slide));
        }

        if (params.has('dp')) {
            drums.currentPattern = parseInt(params.get('dp'));
            document.querySelectorAll('.pattern-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.pattern) === drums.currentPattern));
        }

        if (params.has('dr')) {
            const patStrings = params.get('dr').split('-');
            for (let p = 0; p < Math.min(patStrings.length, 4); p++) {
                const hexStr = patStrings[p];
                for (let i = 0; i < drums.instruments.length; i++) {
                    const hex4 = hexStr.substring(i * 4, i * 4 + 4);
                    const bits = parseInt(hex4, 16);
                    for (let s = 0; s < 16; s++) {
                        drums.patterns[p][drums.instruments[i]][s] = !!(bits & (1 << s));
                    }
                }
            }
            updateDrumGrid();
        }
    }

    document.getElementById('copy-url-btn').addEventListener('click', () => {
        const url = serialize();
        navigator.clipboard.writeText(url).then(() => {
            const fb = document.getElementById('copy-feedback');
            fb.textContent = '✓ Copied!';
            fb.style.opacity = '1';
            setTimeout(() => { fb.style.opacity = '0'; }, 2000);
        }).catch(() => prompt('Copy this URL:', url));
    });

    loadFromURL();
});
