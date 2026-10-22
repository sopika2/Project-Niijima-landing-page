import { PERSONAS, getPersona, onPersonaChange, setPersona, type Persona } from "@niijima/design";

/**
 * MAKOTO | SAE on the Network screen. The choice is shared with every Niijima subdomain
 * (Treasure, Calendar, Archive, Home…) through the nj_persona cookie, so picking a sister
 * here decides whose books, events and collections those open on.
 */
export function createPersonaSwitch(labels: Record<Persona, string>): HTMLElement {
  const box = document.createElement("div");
  box.className = "nj-persona";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Whose Network");
  const buttons = PERSONAS.map((persona) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nj-persona__opt";
    button.dataset.who = persona;
    button.textContent = labels[persona];
    button.addEventListener("click", () => {
      if (getPersona() === persona) return;
      window.Niijima.sfx.play("move");
      setPersona(persona);
    });
    box.append(button);
    return button;
  });
  const paint = (current: Persona) =>
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.who === current)));
  paint(getPersona());
  onPersonaChange(paint);
  return box;
}

/** A sister picked on the split screen becomes the persona, if she is one. */
export function pickPersona(id: string): void {
  if (PERSONAS.includes(id as Persona) && getPersona() !== id) setPersona(id as Persona);
}
