export function setPlaybackState(id: string, playing: boolean) {
    const button = document.getElementById(id)!;
    button.textContent = playing ? '일시정지' : '실험 재생';
    button.setAttribute('aria-pressed', String(playing));
}

interface PlaybackOptions {
    playId?: string;
    stepId?: string;
    resetId?: string;
    interval?: number;
    advance: () => boolean | void;
}

export function createPlayback({
    playId = 'play', stepId = 'step', resetId = 'reset', interval = 160, advance,
}: PlaybackOptions) {
    let timer: ReturnType<typeof setInterval> | undefined;
    function pause() {
        clearInterval(timer);
        timer = undefined;
        setPlaybackState(playId, false);
    }
    function tick() {
        if (advance() === false) pause();
    }
    document.getElementById(playId)!.addEventListener('click', () => {
        if (timer !== undefined) {
            pause();
            return;
        }
        timer = setInterval(tick, interval);
        setPlaybackState(playId, true);
        tick();
    });
    document.getElementById(stepId)!.addEventListener('click', () => {
        pause();
        tick();
    });
    document.getElementById(resetId)!.addEventListener('click', pause);
    window.addEventListener('pagehide', pause);
    setPlaybackState(playId, false);
    return { pause };
}
