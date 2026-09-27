const compact = window.matchMedia('(max-width: 800px)');
let resetSettingsScroll = false;

export function syncViewControls() {
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view-select]')) {
        const select = document.getElementById(button.dataset.viewSelect!) as HTMLSelectElement;
        button.setAttribute('aria-pressed', String(select.value === button.dataset.viewValue));
    }
}

export function setSettingsOpen(open: boolean, focus = true) {
    const shell = document.querySelector<HTMLElement>('[data-experiment-layout]')!;
    const settings = shell.querySelector<HTMLElement>('[data-experiment-region="settings"]')!;
    const toggle = shell.querySelector<HTMLButtonElement>('[data-settings-toggle]')!;
    const overlay = open && compact.matches;
    settings.hidden = !open;
    if (open && resetSettingsScroll) {
        shell.querySelector<HTMLElement>('.experiment-settings-content')!.scrollTop = 0;
        resetSettingsScroll = false;
    }
    shell.toggleAttribute('data-settings-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '설정 메뉴 접기' : '설정 메뉴 열기');
    shell.querySelector<HTMLElement>('[data-settings-backdrop]')!.hidden = !overlay;
    settings.setAttribute('role', overlay ? 'dialog' : 'complementary');
    if (overlay) settings.setAttribute('aria-modal', 'true');
    else settings.removeAttribute('aria-modal');
    for (const region of shell.querySelectorAll<HTMLElement>('.experiment-content, .app-header-actions, .app-brand')) {
        region.inert = overlay;
    }
    if (focus) (open ? shell.querySelector<HTMLButtonElement>('[data-settings-close]')! : toggle).focus();
    document.dispatchEvent(new CustomEvent('experiment:layoutchange', { detail: { open, overlay } }));
}

const shell = document.querySelector<HTMLElement>('[data-experiment-layout]');
if (shell) {
    shell.querySelector('[data-experiment-help]')!.addEventListener('click', () => {
        const play = shell.querySelector<HTMLButtonElement>('[data-experiment-play]')!;
        if (play.getAttribute('aria-pressed') === 'true') play.click();
    }, { capture: true });
    shell.querySelector('[data-experiment-reset-all]')!.addEventListener('click', () => {
        resetSettingsScroll = true;
        const event = new CustomEvent('experiment:reset-all', { cancelable: true });
        const reload = document.dispatchEvent(event);
        if (!shell.querySelector<HTMLElement>('[data-experiment-region="settings"]')!.hidden) {
            shell.querySelector<HTMLElement>('.experiment-settings-content')!.scrollTop = 0;
            resetSettingsScroll = false;
        }
        if (reload) {
            shell.querySelector<HTMLButtonElement>('[data-playback-reset]')!.click();
            window.location.reload();
        }
    });
    for (const button of shell.querySelectorAll<HTMLButtonElement>('[data-view-select]')) {
        button.addEventListener('click', () => {
            const select = document.getElementById(button.dataset.viewSelect!) as HTMLSelectElement;
            if (select.value !== button.dataset.viewValue) {
                select.value = button.dataset.viewValue!;
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            syncViewControls();
        });
    }
    syncViewControls();
    const settings = shell.querySelector<HTMLElement>('[data-experiment-region="settings"]')!;
    const toggle = shell.querySelector<HTMLButtonElement>('[data-settings-toggle]')!;
    toggle.addEventListener('click', () => setSettingsOpen(Boolean(settings.hidden)));
    shell.querySelector('[data-settings-close]')!.addEventListener('click', () => setSettingsOpen(false));
    shell.querySelector('[data-settings-backdrop]')!.addEventListener('click', () => setSettingsOpen(false));
    compact.addEventListener('change', () => setSettingsOpen(!compact.matches, settings.contains(document.activeElement)));
    document.addEventListener('keydown', (event) => {
        if (settings.hidden || document.querySelector('dialog[open]')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            setSettingsOpen(false);
        }
        if (event.key === 'Tab' && compact.matches) {
            const controls = [toggle, ...settings.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary')]
                .filter((control) => control.getClientRects().length > 0 && !control.closest('details:not([open]) > :not(summary)'));
            const first = controls[0]!;
            const last = controls[controls.length - 1]!;
            if (!controls.includes(document.activeElement as HTMLElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
    setSettingsOpen(!compact.matches, false);
}
