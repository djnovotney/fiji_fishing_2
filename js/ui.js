import { REEL } from "./constants.js";

const STATUS_TEXT = {
  IDLE: "Move the lure in front of a fish, then click to cast.",
  CASTING: "Casting the line...",
  FISH_INTERESTED: "A fish is curious... hold tight!",
  BITE: "A fish took the lure! Click the Fish-On circle beside the reel to set the hook.",
  REELING: "Turn the yellow handle clockwise. Average 50–65 RPM to stay in the green; below 40 or above 75 RPM loses the fish.",
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
    if (game.state === "BITE") {
      this.biteButton.style.left = `${(REEL.x - REEL.outerRadius) / 10}%`;
      this.biteButton.style.top = `${REEL.y / 6.4}%`;
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
        `LAST 15° RPM: ${game.reel.segmentRPM.toFixed(1)}`,
        `3-SEGMENT AVG RPM: ${game.reel.pressureSensorRPM.toFixed(1)}`,
        `ANGULAR VELOCITY: ${game.reel.angularVelocity.toFixed(2)} rad/s`,
        `TENSION: ${game.tension.toFixed(1)}%`,
        `FISH DEPTH: ${game.fishDepth.toFixed(2)} m`,
        `LINE LENGTH: ${game.lineLength.toFixed(2)} m`,
        `HOOKED FISH: ${fish ? fish.id : "none"}`,
      ].join("\n");
    }
  }
}
