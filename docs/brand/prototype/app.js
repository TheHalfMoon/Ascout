const templates = {
  home: "homeTemplate",
  review: "reviewTemplate",
  test: "testTemplate",
  security: "securityTemplate",
  cyber: "cyberTemplate",
  assure: "assureTemplate",
  lab: "labTemplate"
};

const main = document.getElementById("mainView");
const navItems = [...document.querySelectorAll(".nav-item")];

function render(view) {
  const template = document.getElementById(templates[view] || templates.home);
  main.replaceChildren(template.content.cloneNode(true));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll("[data-view-card]").forEach((card) => {
    const open = () => render(card.dataset.viewCard);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
  main.focus({ preventScroll: true });
}

navItems.forEach((item) => item.addEventListener("click", () => render(item.dataset.view)));

document.getElementById("themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

const drawer = document.getElementById("timelineDrawer");
document.getElementById("timelineToggle").addEventListener("click", () => {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
});
document.getElementById("closeTimeline").addEventListener("click", () => {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
});

const shortcuts = {
  r: "review",
  t: "test",
  s: "security",
  c: "cyber",
  a: "assure",
  l: "lab"
};
let awaitingGo = false;
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "g" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    awaitingGo = true;
    setTimeout(() => (awaitingGo = false), 900);
    return;
  }
  if (awaitingGo && shortcuts[event.key.toLowerCase()]) {
    event.preventDefault();
    render(shortcuts[event.key.toLowerCase()]);
    awaitingGo = false;
  }
  if (event.key === "Escape") {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
});

render("home");
