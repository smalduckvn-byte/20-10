(() => {
    const soundtrack = document.getElementById('tiny-soundtrack');
    const effectZone = document.getElementById('tiny-lyric-zone');
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!soundtrack || !effectZone) {
        console.error('Music effects could not find the soundtrack or effect zone.');
        return;
    }

    if (!AudioContextConstructor) {
        console.warn('Audio-reactive effects are unavailable because Web Audio is unsupported.');
        return;
    }

    let audioContext;
    let analyser;
    let frequencyData;
    let animationFrame = 0;
    let sceneActive = false;
    let smoothedBeat = 0;

    function stopEffectLoop() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
        smoothedBeat = 0;
        effectZone.style.setProperty('--music-beat', '0');
    }

    function updateEffect() {
        animationFrame = 0;
        if (!sceneActive || soundtrack.paused || !analyser || audioContext.state !== 'running') {
            stopEffectLoop();
            return;
        }

        analyser.getByteFrequencyData(frequencyData);
        const bandEnd = Math.min(9, frequencyData.length);
        let energy = 0;
        for (let i = 1; i < bandEnd; i++) {
            energy += frequencyData[i] / 255;
        }

        const averageEnergy = energy / (bandEnd - 1);
        const targetBeat = Math.min(1, Math.max(0, (averageEnergy - .035) * 3.2));
        smoothedBeat += (targetBeat - smoothedBeat) * (targetBeat > smoothedBeat ? .46 : .14);
        effectZone.style.setProperty('--music-beat', smoothedBeat.toFixed(3));
        animationFrame = requestAnimationFrame(updateEffect);
    }

    function startEffectLoop() {
        if (!animationFrame && sceneActive && !soundtrack.paused && analyser && audioContext.state === 'running') {
            animationFrame = requestAnimationFrame(updateEffect);
        }
    }

    function initializeAudioGraph() {
        if (!audioContext) {
            audioContext = new AudioContextConstructor();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = .72;

            const source = audioContext.createMediaElementSource(soundtrack);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            frequencyData = new Uint8Array(analyser.frequencyBinCount);
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume().then(startEffectLoop).catch(error => {
                console.error('Could not resume audio-reactive effects.', error);
            });
        } else {
            startEffectLoop();
        }
    }

    function updateSceneState() {
        sceneActive = effectZone.classList.contains('hien-thi');
        effectZone.classList.toggle('music-effects-active', sceneActive);
        if (sceneActive) {
            initializeAudioGraph();
            startEffectLoop();
        } else {
            stopEffectLoop();
        }
    }

    const sceneObserver = new MutationObserver(updateSceneState);
    sceneObserver.observe(effectZone, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('pointerdown', initializeAudioGraph, { once: true, passive: true });
    document.addEventListener('keydown', initializeAudioGraph, { once: true });
    soundtrack.addEventListener('play', startEffectLoop);
    soundtrack.addEventListener('pause', stopEffectLoop);
    soundtrack.addEventListener('ended', stopEffectLoop);
    updateSceneState();
})();
