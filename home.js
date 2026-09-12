const languages = {
  zh: {
    lang: "zh-CN",
    title: "LALABEAR · 理解、连接、促成",
    description: "这里是 LALABEAR。理解不同的人，理清复杂的事，把想法变成有用的小工具。",
    switchLabel: "Switch to English",
    switchText: "EN ↗",
  },
  en: {
    lang: "en",
    title: "LALABEAR · Understand, connect, make",
    description: "LALABEAR: understanding people, untangling ideas, and making useful things from everyday needs.",
    switchLabel: "切换到中文",
    switchText: "中文 ↗",
  },
};

const button = document.querySelector(".language-button");

function renderLanguage() {
  const code = new URL(location.href).searchParams.get("lang") === "en" ? "en" : "zh";
  const language = languages[code];
  document.documentElement.lang = language.lang;
  document.title = language.title;
  document.querySelector('meta[name="description"]').content = language.description;
  document.querySelectorAll("[data-label-zh]").forEach(element => {
    element.setAttribute("aria-label", element.dataset[code === "en" ? "labelEn" : "labelZh"]);
  });
  button.textContent = language.switchText;
  button.setAttribute("aria-label", language.switchLabel);
  button.lang = code === "en" ? "zh-CN" : "en";
  button.hidden = false;
}

button.addEventListener("click", () => {
  const url = new URL(location.href);
  url.searchParams.set("lang", document.documentElement.lang === "en" ? "zh" : "en");
  history.replaceState(null, "", url);
  renderLanguage();
});
window.addEventListener("popstate", renderLanguage);
renderLanguage();
