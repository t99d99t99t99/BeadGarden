const IDLE_RESET_SECOND = 120;
const IDLE_RESET_WARNING_SECOND = 30;
const IDLE_RESET_WARNING_ANIMATION_MS = 800;

class IdleResetTimer {
    constructor() {
        this.enabled = true;
        this.lastInputTime = Date.now();
        this.warningAnimationStartedAt = null;
        this.warningAnimationPlayed = false;
    }

    tryReset() {
        if (!this.enabled || !this.#isIdle()) return;

        this.onInput();
        goTo(GAME_STATE.INTRO);
    }

    onInput() {
        this.lastInputTime = Date.now();
        this.warningAnimationStartedAt = null;
        this.warningAnimationPlayed = false;
    }

    showTimer() {
        if (!this.isEnabled()) return;

        let secondsLeft = this.#secondsLeft();
        if (secondsLeft <= IDLE_RESET_WARNING_SECOND &&
            !this.warningAnimationPlayed) {
            this.warningAnimationStartedAt = Date.now();
            this.warningAnimationPlayed = true;
        }

        let textColor = (secondsLeft <= IDLE_RESET_WARNING_SECOND) ? color(255, 0, 0) : color(155);
        textSize(this.#messageTextSize());
        textAlign(LEFT, BOTTOM); fill(textColor); noStroke();
        text(`${secondsLeft}초 간 입력이 없을 경우 게임이 재시작 됩니다`, 0, height);
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

    #secondsLeft() {
        return ceil(IDLE_RESET_SECOND - (Date.now() - this.lastInputTime) / 1000);
    }

    #messageTextSize() {
        const baseSize = 15;
        if (this.warningAnimationStartedAt === null) {
            return baseSize;
        }

        const progress = (Date.now() - this.warningAnimationStartedAt) /
            IDLE_RESET_WARNING_ANIMATION_MS;
        if (progress >= 1) {
            return baseSize;
        }

        const pulse = Math.abs(Math.sin(progress * Math.PI * 2));
        return baseSize + pulse * 4;
    }
}
