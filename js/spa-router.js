/* GitHub Pages-compatible single-page router. */
(() => {
  window.LGCSinglePageApp = true;

  const routes = new Set([
    "index.html",
    "about.html",
    "academics.html",
    "admissions.html",
    "news.html",
    "contact.html",
  ]);

  const isGitHubPages =
    window.location.hostname.endsWith("github.io");

  // Your repository is named LGCWEB.
  const basePath = isGitHubPages ? "/LGCWEB/" : "/";

  const routeFromPath = (pathname) => {
    const filename = pathname.split("/").pop() || "";
    return routes.has(filename) ? filename : "index.html";
  };

  const routeFromUrl = (url) => {
    const queryRoute = url.searchParams.get("page");

    if (queryRoute && routes.has(queryRoute)) {
      return queryRoute;
    }

    return routeFromPath(url.pathname);
  };

  const currentRoute = () =>
    routeFromUrl(new URL(window.location.href));

  const getRouteUrl = (route, hash = "") => {
    if (isGitHubPages) {
      if (route === "index.html") {
        return `${basePath}${hash}`;
      }

      return `${basePath}?page=${encodeURIComponent(route)}${hash}`;
    }

    const path =
      route === "index.html" ? "/" : `/${route}`;

    return `${path}${hash}`;
  };

  const hero = document.querySelector("#introStage");
  const heroContent =
    document.querySelector("#routeHeroContent");
  const heroSideNote =
    document.querySelector("#routeHeroSideNote");
  const sharedVideo =
    document.querySelector("#sharedHeroVideo");
  const routeContent =
    document.querySelector("#routeContent");

  const cache = new Map();
  let loadingRoute = "";

  const fetchTemplate = async (route) => {
    if (cache.has(route)) {
      return cache.get(route);
    }

    // Loads static files from public/data/pages.
    const templateUrl =
      `${basePath}data/pages/${encodeURIComponent(route)}`;

    const response = await fetch(templateUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `The selected page could not be loaded. Error ${response.status}.`
      );
    }

    // Static page files return HTML, not JSON.
    const html = await response.text();

    const documentNode =
      new DOMParser().parseFromString(html, "text/html");

    cache.set(route, documentNode);
    return documentNode;
  };

  const setActiveNavigation = (route) => {
    document
      .querySelectorAll("[data-route]")
      .forEach((link) => {
        link.classList.toggle(
          "active",
          link.dataset.route === route
        );
      });
  };

  const initialiseReveal = (root) => {
    const revealElements =
      root.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach((element) => {
      observer.observe(element);
    });
  };

  const initialiseCourseCards = (root) => {
    const modal = root.querySelector("#courseModal");

    if (!modal) return;

    const title =
      modal.querySelector("#courseModalTitle");
    const tag =
      modal.querySelector("#courseModalTag");
    const description =
      modal.querySelector("#courseModalDescription");

    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    };

    root
      .querySelectorAll(".program-card")
      .forEach((card) => {
        const openModal = () => {
          const cardTitle = card
            .querySelector("h3")
            ?.textContent.replace(/\s+/g, " ")
            .trim();

          const cardTag = card
            .querySelector(".tag")
            ?.textContent.trim();

          const summary = card
            .querySelector("p")
            ?.textContent.trim();

          if (title) {
            title.textContent =
              cardTitle || "Program details";
          }

          if (tag) {
            tag.textContent =
              cardTag || "Program details";
          }

          if (description) {
            description.textContent =
              summary && summary !== "description??"
                ? summary
                : "Please contact admissions for the latest course description, requirements, and enrollment information.";
          }

          modal.classList.add("is-open");
          modal.setAttribute("aria-hidden", "false");
          document.body.classList.add("modal-open");
        };

        card.addEventListener("click", openModal);

        card.addEventListener("keydown", (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openModal();
          }
        });
      });

    modal
      .querySelectorAll("[data-modal-close]")
      .forEach((button) => {
        button.addEventListener("click", closeModal);
      });
  };

  const initialiseContactForm = (root) => {
    root
      .querySelectorAll("form[action*='formspree']")
      .forEach((form) => {
        form.addEventListener(
          "submit",
          async (event) => {
            event.preventDefault();

            const button = form.querySelector(
              "button[type='submit']"
            );

            if (button) button.disabled = true;

            try {
              const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: {
                  Accept: "application/json",
                },
              });

              if (!response.ok) {
                throw new Error(
                  "The message could not be sent."
                );
              }

              form.reset();
              alert("Your message was sent successfully.");
            } catch (error) {
              console.error(error);
              alert(
                "Your message could not be sent. Please try again."
              );
            } finally {
              if (button) button.disabled = false;
            }
          }
        );
      });
  };

  const renderRoute = async (
    route,
    { preserveScroll = false } = {}
  ) => {
    if (
      !routes.has(route) ||
      loadingRoute === route ||
      !routeContent
    ) {
      return;
    }

    loadingRoute = route;
    routeContent.classList.add("is-changing");

    try {
      const page = await fetchTemplate(route);

      const templateHero =
        page.querySelector("#introStage");

      const templateVideo =
        templateHero?.querySelector("video");

      const poster =
        templateVideo?.getAttribute("poster");

      if (poster && sharedVideo) {
        sharedVideo.setAttribute("poster", poster);
      }

      if (hero) {
        hero.className =
          templateHero?.className || "intro-stage";

        hero.setAttribute(
          "aria-label",
          templateHero?.getAttribute("aria-label") ||
            "Luna Goco Colleges, Inc."
        );
      }

      if (heroContent) {
        heroContent.innerHTML =
          templateHero?.querySelector(
            ".intro-stage__content"
          )?.innerHTML || "";
      }

      if (heroSideNote) {
        heroSideNote.innerHTML =
          templateHero?.querySelector(
            ".intro-stage__side-note"
          )?.innerHTML || "";
      }

      const announcement =
        page.querySelector("#announcementMarquee");

      const contentNodes =
        [...page.body.children].filter((node) => {
          return (
            !node.matches(
              "header, footer, #introStage, script"
            ) &&
            node.id !== "announcementMarquee"
          );
        });

      routeContent.innerHTML = `
        ${announcement?.outerHTML || ""}
        ${contentNodes
          .map((node) => node.outerHTML)
          .join("")}
      `;

      document.title =
        page.title ||
        "LGC — Luna Goco Colleges, Inc.";

      document.body.className = `${
        route === "index.html"
          ? "home-page"
          : "media-page"
      } spa-page page-ready`;

      setActiveNavigation(route);
      initialiseReveal(routeContent);
      initialiseCourseCards(routeContent);
      initialiseContactForm(routeContent);

      window.LGCLocalNews?.init(routeContent);

      if (sharedVideo) {
        sharedVideo.play().catch(() => {
          // Browser may prevent automatic playback.
        });
      }

      if (!preserveScroll) {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      }

      const hash = window.location.hash.slice(1);

      if (hash) {
        requestAnimationFrame(() => {
          document
            .getElementById(hash)
            ?.scrollIntoView({
              behavior: "smooth",
            });
        });
      }
    } catch (error) {
      console.error("Page loading error:", error);

      routeContent.innerHTML = `
        <section class="section">
          <div class="wrap">
            <h2>Page unavailable</h2>
            <p>${error.message}</p>
          </div>
        </section>
      `;
    } finally {
      routeContent.classList.remove("is-changing");
      loadingRoute = "";
    }
  };

  const navigate = (route, hash = "") => {
    history.pushState(
      { route },
      "",
      getRouteUrl(route, hash)
    );

    renderRoute(route);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");

    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.href.includes("/admin")
    ) {
      return;
    }

    const url = new URL(
      link.href,
      window.location.href
    );

    if (url.origin !== window.location.origin) {
      return;
    }
    if (isGitHubPages) {
  document
    .querySelectorAll(
      'a[href="/admin"], a[href="admin"], a[href$="/admin"]'
    )
    .forEach((link) => {
      link.style.display = "none";
    });
}

    const filename =
      url.pathname.split("/").pop() || "";

    const queryRoute =
      url.searchParams.get("page");

    const isPublicRoute =
      routes.has(filename) ||
      (queryRoute && routes.has(queryRoute)) ||
      url.pathname === "/" ||
      url.pathname === basePath;

    if (!isPublicRoute) return;

    event.preventDefault();

    const route = routeFromUrl(url);

    document
      .querySelector(".nav-links")
      ?.classList.remove("open");

    document
      .querySelector(".nav-toggle")
      ?.setAttribute("aria-expanded", "false");

    if (
      route === currentRoute() &&
      url.hash
    ) {
      document
        .getElementById(url.hash.slice(1))
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    navigate(route, url.hash);
  });

  window.addEventListener("popstate", () => {
    renderRoute(currentRoute(), {
      preserveScroll: true,
    });
  });

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      renderRoute(currentRoute());
    }
  );
})();