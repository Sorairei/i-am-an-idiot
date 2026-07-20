export class AccessibilityController {
  constructor({ dialog, helpButton, liveRegion }) {
    this.dialog = dialog;
    this.helpButton = helpButton;
    this.liveRegion = liveRegion;
    this.bind();
  }

  bind() {
    this.helpButton.addEventListener("click", () => {
      if (typeof this.dialog.showModal === "function") this.dialog.showModal();
      else this.dialog.setAttribute("open", "");
    });
  }

  announce(text) {
    this.liveRegion.textContent = "";
    requestAnimationFrame(() => { this.liveRegion.textContent = text; });
  }
}
