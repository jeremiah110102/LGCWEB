(function () {
  function init(root = document) {
  const listEl = root.querySelector("#newsList");
  const marquee = root.querySelector("#announcementMarquee");
  const marqueeText = root.querySelector("#marqueeText");
  const marqueeTextDuplicate = root.querySelector("#marqueeTextDuplicate");
  if (!listEl || !marquee || !marqueeText || !marqueeTextDuplicate) return;

  function formatDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  function render(items, tickerSettings = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      listEl.textContent = "No announcements have been added yet.";
      return;
    }
    const ordered = [...items].sort((a, b) => String(b.showDate).localeCompare(String(a.showDate)));
    const latestThree = ordered.slice(0, 3);
    const latestTicker = latestThree.map((item) => `LGC ${item.type || "announcement"}: ${item.title || "Untitled announcement"}`).join("  •  ");
    const announcement = tickerSettings.mode === "custom" && tickerSettings.customMessage ? `LGC announcement: ${tickerSettings.customMessage}` : latestTicker;
    const tickerLine = `${announcement}  •  `.repeat(5);
    marqueeText.textContent = tickerLine;
    marqueeTextDuplicate.textContent = tickerLine;
    marquee.hidden = false;
    listEl.innerHTML = "";
    ordered.forEach((item) => {
      const date = formatDate(item.showDate);
      const card = document.createElement("article");
      card.className = "news-card";
      const dateBlock = document.createElement("div");
      dateBlock.className = "news-date";
      const day = document.createElement("b");
      day.textContent = String(date.getDate()).padStart(2, "0");
      const month = document.createElement("span");
      month.textContent = date.toLocaleDateString("en-US", { month: "short" });
      dateBlock.append(day, month);
      const details = document.createElement("div");
      const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = item.type || "Announcement";
      const title = document.createElement("h3"); title.textContent = item.title || "Untitled announcement";
      const message = document.createElement("p"); message.textContent = item.message || "";
      details.append(tag, title, message);
      card.append(dateBlock, details);
      listEl.append(card);
    });
  }

  Promise.all([
    fetch("/data/news.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load local news."))),
    fetch("/api/public/ticker-settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : { mode: "latest", customMessage: "" }).catch(() => ({ mode: "latest", customMessage: "" }))
  ])
    .then(([items, tickerSettings]) => render(items, tickerSettings))
    .catch(() => { listEl.textContent = "Announcements could not be loaded from the local website folder."; });
  }
  window.LGCLocalNews = { init };
  document.addEventListener("DOMContentLoaded", () => init(document));
})();
