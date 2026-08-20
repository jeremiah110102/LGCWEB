/* One local browser document: public navigation swaps content but keeps the hero video node alive. */
(() => {
  window.LGCSinglePageApp = true;
  const routes = new Set(["index.html", "about.html", "academics.html", "admissions.html", "news.html", "contact.html"]);
  const routeForPath = (pathname = location.pathname) => {
    const match = pathname.split("/").pop() || "";
    return routes.has(match) ? match : "index.html";
  };
  const getRoutePath = (route) => route === "index.html" ? "/" : `/${route}`;
  const hero = document.querySelector("#introStage");
  const heroContent = document.querySelector("#routeHeroContent");
  const heroSideNote = document.querySelector("#routeHeroSideNote");
  const sharedVideo = document.querySelector("#sharedHeroVideo");
  const routeContent = document.querySelector("#routeContent");
  const cache = new Map();
  let loadingRoute = "";

  const fetchTemplate = async (route) => {
    if (cache.has(route)) return cache.get(route);
    const response = await fetch(`/api/public/page/${encodeURIComponent(route)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("The selected local page could not be loaded.");
    const payload = await response.json();
    const documentNode = new DOMParser().parseFromString(payload.html, "text/html");
    cache.set(route, documentNode);
    return documentNode;
  };

  const setActiveNavigation = (route) => {
    document.querySelectorAll("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  };

  const initialiseReveal = (root) => {
    const reveal = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return reveal.forEach((node) => node.classList.add("is-visible"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveal.forEach((node) => observer.observe(node));
  };

  const initialiseCourseCards = (root) => {
    const modal = root.querySelector("#courseModal");
    if (!modal) return;
    const title = modal.querySelector("#courseModalTitle");
    const tag = modal.querySelector("#courseModalTag");
    const description = modal.querySelector("#courseModalDescription");
    const close = () => { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("modal-open"); };
    root.querySelectorAll(".program-card").forEach((card) => {
      const open = () => {
        title.textContent = card.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "Program details";
        tag.textContent = card.querySelector(".tag")?.textContent.trim() || "Program details";
        const summary = card.querySelector("p")?.textContent.trim();
        description.textContent = summary && summary !== "description??" ? summary : "Please contact admissions for the latest course description, requirements, and enrollment information.";
        modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open");
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    });
    modal.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", close));
  };

  const initialiseContactForm = (root) => {
    root.querySelectorAll("form[action*='formspree']").forEach((form) => form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try { await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } }); form.reset(); }
      finally { if (button) button.disabled = false; }
    }));
  };

  const renderRoute = async (route, { preserveScroll = false } = {}) => {
    if (!routes.has(route) || loadingRoute === route) return;
    loadingRoute = route;
    routeContent.classList.add("is-changing");
    try {
      const page = await fetchTemplate(route);
      const templateHero = page.querySelector("#introStage");
      const templateVideo = templateHero?.querySelector("video");
      const poster = templateVideo?.getAttribute("poster");
      if (poster) sharedVideo.setAttribute("poster", poster);
      hero.className = templateHero?.className || "intro-stage";
      hero.setAttribute("aria-label", templateHero?.getAttribute("aria-label") || "Luna Goco Colleges, Inc.");
      heroContent.innerHTML = templateHero?.querySelector(".intro-stage__content")?.innerHTML || "";
      heroSideNote.innerHTML = templateHero?.querySelector(".intro-stage__side-note")?.innerHTML || "";
      const preHero = page.querySelector("#announcementMarquee");
      const nodes = [...page.body.children].filter((node) => !node.matches("header, footer, #introStage, script") && node.id !== "announcementMarquee");
      routeContent.innerHTML = `${preHero?.outerHTML || ""}${nodes.map((node) => node.outerHTML).join("")}`;
      document.title = page.title || "LGC — Luna Goco Colleges, Inc.";
      document.body.className = `${route === "index.html" ? "home-page" : "media-page"} spa-page page-ready`;
      setActiveNavigation(route);
      initialiseReveal(routeContent);
      initialiseCourseCards(routeContent);
      initialiseContactForm(routeContent);
      window.LGCLocalNews?.init(routeContent);
      sharedVideo.play().catch(() => {});
      if (!preserveScroll) window.scrollTo({ top: 0, behavior: "instant" });
      const hash = location.hash.slice(1);
      if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      routeContent.innerHTML = `<section class="section"><div class="wrap"><h2>Page unavailable</h2><p>${error.message}</p></div></section>`;
    } finally { routeContent.classList.remove("is-changing"); loadingRoute = ""; }
  };

  const navigate = (route, hash = "") => {
    history.pushState({ route }, "", `${getRoutePath(route)}${hash}`);
    renderRoute(route);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || link.target === "_blank" || link.href.includes("/admin")) return;
    const url = new URL(link.href, location.href);
    const route = routeForPath(url.pathname);
    const isPublicRoute = routes.has(url.pathname.split("/").pop()) || url.pathname === "/";
    if (!isPublicRoute || url.origin !== location.origin) return;
    event.preventDefault();
    document.querySelector(".nav-links")?.classList.remove("open");
    document.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
    if (route === routeForPath() && url.hash) { document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }); return; }
    navigate(route, url.hash);
  });
  window.addEventListener("popstate", () => renderRoute(routeForPath(), { preserveScroll: true }));
  document.addEventListener("DOMContentLoaded", () => renderRoute(routeForPath()));
})();
