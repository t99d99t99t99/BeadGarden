const IDLE_RESET_SECOND = 120;

class IdleResetTimer {
    constructor() {
        this.enabled = true;
        this.lastInputTime = Date.now();
    }

    tryReset() {
        if (!this.enabled || !this.#isIdle()) return;

        this.onInput();
        goTo(GAME_STATE.INTRO);
    }

    onInput() {
        this.lastInputTime = Date.now();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) this.onInput();
    }

    toggle() {
        this.setEnabled(!this.enabled);
    }

    isEnabled() {
        return this.enabled;
    }

    #isIdle() {
        return Date.now() - this.lastInputTime >= IDLE_RESET_SECOND * 1000;
    }
}
