import { initNavigation, initChapterTheme } from "./js/navigation.js";
import { initChapters } from "./js/chapters.js";
import { initMediaLifecycle } from "./js/media.js";
import { initContactForms } from "./js/contact.js";
import { initCharacterPrism } from "./js/prism.js";

const initialize = (name, callback) => {
  try {
    callback();
  } catch (error) {
    console.error(`[site:${name}]`, error);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  initialize("navigation", () => initNavigation());
  initialize("themes", () => initChapterTheme());
  initialize("chapters", () => initChapters());
  initialize("media", () => initMediaLifecycle());
  initialize("character-prism", () => initCharacterPrism());
  initialize("contact", () => initContactForms());

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
});
