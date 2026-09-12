export function highlightTarget(elementId: string, flashSelector?: string): void {
  const target = document.getElementById(elementId);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  const flashEl = flashSelector ? target.querySelector(flashSelector) : target;
  if (!flashEl) return;

  flashEl.classList.add("bg-primary/20");
  setTimeout(() => flashEl.classList.remove("bg-primary/20"), 1500);
}
