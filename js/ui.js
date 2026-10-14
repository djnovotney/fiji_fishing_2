const STATUS_TEXT = {
  IDLE: "Move the lure in front of a fish, then click to cast.",
  CASTING: "Casting the line...",
  FISH_INTERESTED: "A fish is curious... hold tight!",
  BITE: "A fish took the lure! Click the Fish-On circle above it.",
  REELING: "Turn the yellow handle clockwise: 40 RPM ideal, under 20 RPM too slow, over 60 RPM too fast. Three bad turns lose the fish.",
  LANDED: "Nice catch! Bringing it to the bucket...",
  ESCAPED: "The fish got away.",
  RESET: "Getting the line ready...",
};

export class GameUI {
  constructor(game) {
    this.game = game;
    this.startPanel = document.querySelector("#start-panel");
    this.startButton = document.querySelector("#start-button");
    this.biteButton = document.querySelector("#bite-button");
    this.status = document.querySelector("#status-label");
    this.debug = document.querySelector("#debug-panel");
    this.score = document.querySelector("#score");
    this.fishCount = document.querySelector("#fish-count");

    this.startButton.addEventListener("click", () => game.start());
    this.biteButton.addEventListener("click", () => {
      if (game.hookFish()) this.biteButton.hidden = true;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "d" && !event.repeat) {
        game.debugEnabled = !game.debugEnabled;
      }
    });
  }

  render() {
    const game = this.game;
    this.startPanel.hidden = game.started;
    this.biteButton.hidden = !game.started || game.state !== "BITE";
    if (game.state === "BITE" && game.targetFish) {
      this.biteButton.style.left = `${game.targetFish.x / 10}%`;
      this.biteButton.style.top = `${Math.max(5, game.targetFish.y - 28) / 6.4}%`;
    }
    const stateText = game.state === "IDLE" && game.hasCast
      ? "Waiting for a fish to notice the lure..."
      : STATUS_TEXT[game.state] || game.state;
    this.status.textContent = game.started ? stateText : "";
    this.score.textContent = `${game.totalWeightLb.toFixed(1)} lb`;
    this.fishCount.textContent = String(game.fishCaught);
    this.debug.hidden = !game.debugEnabled;
    if (game.debugEnabled) {
      const fish = game.targetFish || game.landedFish;
      this.debug.textContent = [
        `STATE: ${game.state}`,
        `LAST TURN RPM: ${game.reel.rpm.toFixed(1)}`,
        `SENSOR / REEL RPM: ${game.reel.pressureSensorRPM.toFixed(1)}`,
        `BAD TURNS: ${game.reel.badRotationStreak}/3 ${game.reel.badRotationZone || ""}`,
        `ANGULAR VELOCITY: ${game.reel.angularVelocity.toFixed(2)} rad/s`,
        `TENSION: ${game.tension.toFixed(1)}%`,
        `FISH DEPTH: ${game.fishDepth.toFixed(2)} m`,
        `LINE LENGTH: ${game.lineLength.toFixed(2)} m`,
        `HOOKED FISH: ${fish ? fish.id : "none"}`,
      ].join("\n");
    }
  }
}
