import { initCanopyArtwork, refreshCanopyArtwork } from "./canopy/generateScene";

const PAGE_LOAD_EVENT = "xppel:page-load";
const PROJECT_INDEX_PATH = "/projects/";
const PROJECT_STATE_KEY = "xppel-project-index-state";
const PROJECT_INDEX_SIZES = ["s", "m", "l"] as const;
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

type ProjectIndexState = {
  q: string;
  view: "grid" | "list";
  size: typeof PROJECT_INDEX_SIZES[number];
  selectedTags: Set<string>;
};

type ProjectIndexBootstrapState = {
  view?: unknown;
  size?: unknown;
};

type ProjectIndexWindow = Window & {
  __xppelProjectIndexState?: ProjectIndexBootstrapState;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

let booted = false;
let menuInitialized = false;
let brandInitialized = false;
let logoFxInitialized = false;
let previewInitialized = false;
let galleryNavInitialized = false;
let homeLogoRefreshInitialized = false;
let lightboxShellInitialized = false;
let activeLightboxIndex = 0;
let lastLightboxTrigger: Element | null = null;
let lastTriggerRect: DOMRect | null = null;
let lightboxItems: HTMLAnchorElement[] = [];
let lightboxClosing = false;
let lightboxLoadToken = 0;
let photoRevealNextAt = 0;
const fetchedPages = new Map<string, Promise<string>>();
const decodedImages = new Map<string, Promise<HTMLImageElement>>();

function normalizePath(pathname: string) {
  if (pathname === "/projects") return PROJECT_INDEX_PATH;
  if (pathname.length > 1 && !pathname.endsWith("/")) return `${pathname}/`;
  return pathname;
}

function isProjectGalleryPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === PROJECT_INDEX_PATH || /^\/projects\/[^/]+\/$/.test(path);
}

function isAppPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/" ||
    path === "/about/" ||
    path === "/music/" ||
    path === "/photos/" ||
    path === PROJECT_INDEX_PATH ||
    /^\/projects\/[^/]+\/$/.test(path);
}

function dispatchPageLoad() {
  document.dispatchEvent(new CustomEvent(PAGE_LOAD_EVENT));
}

function shouldOpenInNewTab(anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href") || "";
  if (rawHref.startsWith("mailto:")) return false;
  if (/\.pdf($|\?)/i.test(rawHref)) return true;
  if (!rawHref.startsWith("http")) return false;

  const url = new URL(rawHref, window.location.href);
  if (url.hostname === window.location.hostname) return false;
  if (url.hostname === "xppel.com" || url.hostname.endsWith(".xppel.com")) return true;
  return true;
}

function initExternalLinks() {
  document.querySelectorAll("a[href]").forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement) || anchor.dataset.externalBound === "true") return;
    anchor.dataset.externalBound = "true";
    if (!shouldOpenInNewTab(anchor)) return;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
}

function initMobileMenu() {
  if (menuInitialized) return;
  menuInitialized = true;

  const toggles = document.querySelectorAll("[data-menu-toggle]");
  const menu = document.querySelector("#mobile-menu");

  function setMenu(open: boolean) {
    if (!(menu instanceof HTMLElement)) return;
    menu.hidden = !open;
    document.documentElement.classList.toggle("menu-open", open);
    toggles.forEach((toggle) => toggle.setAttribute("aria-expanded", String(open)));
  }

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const isOpen = document.documentElement.classList.contains("menu-open");
      setMenu(!isOpen);
    });
  });

  menu?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  document.addEventListener("xppel:close-menu", () => setMenu(false));

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.target || link.hasAttribute("download") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, window.location.href);
    const currentPath = normalizePath(window.location.pathname);
    const targetPath = normalizePath(url.pathname);
    const isSameUrl = url.origin === window.location.origin &&
      targetPath === currentPath &&
      url.search === window.location.search &&
      url.hash === window.location.hash;
    if (isSameUrl || isCurrentHomePathNavigation(url)) {
      event.preventDefault();
    }
  }, { capture: true });
}

function initBrandBouncers() {
  if (brandInitialized) return;
  brandInitialized = true;

  const brandBouncers = Array.from(document.querySelectorAll("[data-brand-bouncer]"));

  brandBouncers.forEach((brand) => {
    if (!(brand instanceof HTMLElement)) return;
    if (motionQuery.matches) {
      brand.classList.add("is-positioned", "is-ready");
      return;
    }
    const inner = brand.querySelector("span");
    if (!(inner instanceof HTMLElement)) return;

    let x = 0;
    let y = 0;
    const storageKey = brand.classList.contains("mobile-brand") ? "xppel-brand-state-mobile" : "xppel-brand-state-desktop";
    const baseSpeedX = 0.028;
    const baseSpeedY = 0.018;
    const maxSpeed = 0.16;
    let vx = baseSpeedX;
    let vy = baseSpeedY;
    let dragging = false;
    let moved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = performance.now();
    let initialized = false;

    function bounds() {
      const outer = brand.getBoundingClientRect();
      const content = inner.getBoundingClientRect();
      const verticalTravel = Math.max(14, outer.height - content.height);
      return {
        maxX: Math.max(0, outer.width - content.width),
        maxY: Math.min(verticalTravel, Math.max(0, outer.height - content.height + 6))
      };
    }

    function apply() {
      inner.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function markReady() {
      brand.classList.add("is-positioned");
      inner.getBoundingClientRect();
      requestAnimationFrame(() => brand.classList.add("is-ready"));
    }

    function clampSpeed(value: number, fallback: number) {
      const next = Number.isFinite(value) ? value : fallback;
      return Math.max(-maxSpeed, Math.min(maxSpeed, next));
    }

    function restoreState() {
      const limit = bounds();
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        try {
          const state = JSON.parse(stored);
          x = Math.max(0, Math.min(limit.maxX, Number(state.x) || 0));
          y = Math.max(0, Math.min(limit.maxY, Number(state.y) || 0));
          vx = clampSpeed(Number(state.vx), baseSpeedX);
          vy = clampSpeed(Number(state.vy), baseSpeedY);
          if (Math.abs(vx) < 0.006) vx = baseSpeedX;
          if (Math.abs(vy) < 0.006) vy = baseSpeedY;
          initialized = true;
          apply();
          markReady();
          return;
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }

      x = Math.random() * limit.maxX;
      y = Math.random() * limit.maxY;
      vx = baseSpeedX * (Math.random() > 0.5 ? 1 : -1);
      vy = baseSpeedY * (Math.random() > 0.5 ? 1 : -1);
      initialized = true;
      apply();
      markReady();
    }

    function saveState() {
      if (!initialized) return;
      sessionStorage.setItem(storageKey, JSON.stringify({
        x,
        y,
        vx: clampSpeed(vx, baseSpeedX),
        vy: clampSpeed(vy, baseSpeedY),
        timestamp: Date.now()
      }));
    }

    function tick() {
      if (!initialized) restoreState();
      const limit = bounds();
      if (!dragging) {
        x += vx;
        y += vy;
        if (x <= 0 || x >= limit.maxX) vx *= -1;
        if (y <= 0 || y >= limit.maxY) vy *= -1;
        x = Math.max(0, Math.min(limit.maxX, x));
        y = Math.max(0, Math.min(limit.maxY, y));
        const targetVx = Math.sign(vx || baseSpeedX) * baseSpeedX;
        const targetVy = Math.sign(vy || baseSpeedY) * baseSpeedY;
        vx += (targetVx - vx) * 0.035;
        vy += (targetVy - vy) * 0.035;
      }
      apply();
      requestAnimationFrame(tick);
    }

    function startDrag(event: MouseEvent | PointerEvent) {
      if (dragging) return;
      event.preventDefault();
      dragging = true;
      moved = false;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      pointerX = event.clientX - x;
      pointerY = event.clientY - y;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = performance.now();
    }

    function moveDrag(event: MouseEvent | PointerEvent) {
      if (!dragging) return;
      const limit = bounds();
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      x = Math.max(0, Math.min(limit.maxX, event.clientX - pointerX));
      y = Math.max(0, Math.min(limit.maxY, event.clientY - pointerY));
      vx = Math.max(-maxSpeed, Math.min(maxSpeed, ((event.clientX - lastX) / dt) * 0.18));
      vy = Math.max(-maxSpeed, Math.min(maxSpeed, ((event.clientY - lastY) / dt) * 0.18));
      moved ||= Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 4;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = now;
      apply();
    }

    function endDrag(event: MouseEvent | PointerEvent) {
      dragging = false;
      if (moved) event.preventDefault();
    }

    brand.addEventListener("pointerdown", (event) => {
      startDrag(event);
      brand.setPointerCapture(event.pointerId);
    });

    brand.addEventListener("pointermove", moveDrag);
    brand.addEventListener("pointerup", endDrag);
    brand.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("mouseup", endDrag);
    brand.addEventListener("dragstart", (event) => event.preventDefault());
    window.addEventListener("pagehide", saveState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveState();
    });

    brand.addEventListener("click", (event) => {
      if (!moved) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      moved = false;
    });

    tick();
  });
}

function initHomeLogoRefresh() {
  if (homeLogoRefreshInitialized) return;
  homeLogoRefreshInitialized = true;

  document.addEventListener("click", (event) => {
    if (!(event instanceof MouseEvent) || !isPlainLeftClick(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("[data-home-logo]");
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href, window.location.href);
    if (!isCurrentHomePathNavigation(url)) return;
    const canopy = document.querySelector("[data-canopy-art]");
    if (!(canopy instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    document.dispatchEvent(new CustomEvent("xppel:close-menu"));
    refreshCanopyArtwork(canopy);
  });
}

function initLogoFx() {
  if (logoFxInitialized) return;
  logoFxInitialized = true;

  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let dpr = 1;

  function ensureCanvas() {
    if (canvas && context) return { canvas, context };
    canvas = document.createElement("canvas");
    canvas.className = "logo-fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    context = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return context ? { canvas, context } : null;
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(window.innerWidth * dpr);
    canvas.height = Math.ceil(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  function burst(brand: HTMLElement, clientX?: number, clientY?: number) {
    if (motionQuery.matches) {
      brand.classList.add("is-clicked");
      window.setTimeout(() => brand.classList.remove("is-clicked"), 180);
      return;
    }

    const setup = ensureCanvas();
    if (!setup) return;
    const rect = brand.getBoundingClientRect();
    const cx = (clientX ?? rect.left + rect.width / 2) * dpr;
    const cy = (clientY ?? rect.top + rect.height / 2) * dpr;
    const seed = Math.random();
    const particles = Array.from({ length: 22 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 22 + seed;
      const speed = 0.6 + Math.random() * 1.45;
      return { angle, speed, size: 1 + Math.random() * 2.6 };
    });
    const start = performance.now();
    cancelAnimationFrame(raf);

    function draw(now: number) {
      if (!context || !canvas) return;
      const t = Math.min(1, (now - start) / 720);
      const ease = 1 - Math.pow(1 - t, 3);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.lineWidth = 1 * dpr;
      context.strokeStyle = `rgba(225, 225, 225, ${0.58 * (1 - t)})`;
      context.fillStyle = `rgba(245, 245, 245, ${0.72 * (1 - t)})`;

      particles.forEach((particle) => {
        const distance = ease * 84 * particle.speed * dpr;
        context.fillRect(
          cx + Math.cos(particle.angle) * distance,
          cy + Math.sin(particle.angle) * distance,
          particle.size * dpr,
          particle.size * dpr
        );
      });

      context.restore();
      if (t < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    raf = requestAnimationFrame(draw);
  }

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const brand = target.closest("[data-brand-bouncer]");
    if (brand instanceof HTMLElement) burst(brand, event.clientX, event.clientY);
  }, { passive: true });
}

function initNavPreview() {
  if (previewInitialized) return;
  previewInitialized = true;

  const preview = document.querySelector("[data-nav-preview]");
  const previewImage = document.querySelector("[data-nav-preview-img]");
  const previewLinks = Array.from(document.querySelectorAll("[data-project-preview]"));

  if (!(preview instanceof HTMLElement) || !(previewImage instanceof HTMLImageElement)) return;

  let visible = false;
  let loadToken = 0;
  let targetX = 0;
  let targetY = 0;
  let stringStartX = 0;
  let stringStartY = 0;
  let x = 0;
  let y = 0;
  const previewCache = new Map<string, Promise<HTMLImageElement>>();

  function previewSize() {
    return {
      width: preview.offsetWidth || 160,
      height: preview.offsetHeight || 106
    };
  }

  function clampToContent() {
    const navWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-width")) || 260;
    const siteLeft = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-left")) || 0;
    const size = previewSize();
    targetX = Math.max(siteLeft + navWidth + 16, Math.min(window.innerWidth - size.width - 16, targetX));
    targetY = Math.max(16, Math.min(window.innerHeight - size.height - 16, targetY));
  }

  function setPreviewTransform() {
    const size = previewSize();
    const anchorY = y + size.height / 2;
    const dx = Math.max(24, Math.min(320, x - stringStartX));
    const dy = Math.max(-140, Math.min(140, stringStartY - anchorY));
    const stringWidth = Math.max(28, Math.min(340, Math.hypot(dx, dy)));
    const stringAngle = Math.atan2(-dy, dx) * (180 / Math.PI);
    preview.style.setProperty("--string-width", `${stringWidth}px`);
    preview.style.setProperty("--string-angle", `${stringAngle}deg`);
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function animatePreview() {
    if (visible && !motionQuery.matches) {
      clampToContent();
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      setPreviewTransform();
    }
    requestAnimationFrame(animatePreview);
  }

  function preloadPreview(src: string) {
    const cached = previewCache.get(src);
    if (cached) return cached;

    const image = new Image();
    image.decoding = "async";
    const load = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onerror = () => reject(new Error("Preview image failed"));
      image.src = src;
      if (image.decode) {
        image.decode()
          .then(() => {
            if (image.naturalWidth > 0) {
              resolve(image);
            } else {
              reject(new Error("Preview image failed"));
            }
          })
          .catch(reject);
      } else if (image.complete && image.naturalWidth > 0) {
        resolve(image);
      } else {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Preview image failed"));
      }
    }).catch((error) => {
      previewCache.delete(src);
      throw error;
    });

    previewCache.set(src, load);
    return load;
  }

  function show(link: Element, event?: PointerEvent | MouseEvent | FocusEvent) {
    if (!(link instanceof HTMLElement)) return;
    const src = link.dataset.previewSrc ?? "";
    if (!src) return;

    const token = ++loadToken;
    const rect = link.getBoundingClientRect();
    const size = previewSize();
    const clientX = "clientX" in (event ?? {}) ? (event as PointerEvent | MouseEvent).clientX : rect.right + 18;
    const clientY = "clientY" in (event ?? {}) ? (event as PointerEvent | MouseEvent).clientY : rect.top + rect.height / 2;

    stringStartX = rect.right + 2;
    stringStartY = rect.top + rect.height / 2;
    targetX = Math.max(rect.right + 18, clientX + 18);
    targetY = clientY - size.height / 2;
    clampToContent();
    x = targetX;
    y = targetY;
    setPreviewTransform();
    visible = true;
    preview.classList.add("is-loading");
    preview.classList.remove("is-visible");
    previewImage.alt = "";

    preloadPreview(src)
      .then((image) => {
        if (!visible || token !== loadToken) return;
        previewImage.src = image.currentSrc || image.src || src;
        previewImage.alt = link.dataset.previewTitle ?? "";
        preview.classList.remove("is-loading");
        preview.classList.add("is-visible");
      })
      .catch(() => {
        if (token !== loadToken) return;
        visible = false;
        preview.classList.remove("is-loading", "is-visible");
        previewImage.alt = "";
      });
  }

  function move(link: Element, event: PointerEvent | MouseEvent) {
    if (!(link instanceof HTMLElement)) return;
    const rect = link.getBoundingClientRect();
    const size = previewSize();
    stringStartX = rect.right + 2;
    stringStartY = rect.top + rect.height / 2;
    targetX = event.clientX + 18;
    targetY = event.clientY - size.height / 2;
  }

  function hide() {
    visible = false;
    loadToken += 1;
    preview.classList.remove("is-loading", "is-visible");
    previewImage.alt = "";
  }

  previewLinks.forEach((link) => {
    const previewSrc = link instanceof HTMLElement ? link.dataset.previewSrc : "";
    if (previewSrc) preloadPreview(previewSrc).catch(() => undefined);

    if ("PointerEvent" in window) {
      link.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        show(link, event);
      });
      link.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        move(link, event);
      });
      link.addEventListener("pointerleave", hide);
    } else {
      link.addEventListener("mouseenter", (event) => show(link, event));
      link.addEventListener("mousemove", (event) => move(link, event));
      link.addEventListener("mouseleave", hide);
    }
    link.addEventListener("focus", (event) => show(link, event));
    link.addEventListener("blur", hide);
  });

  window.addEventListener("resize", hide);
  window.addEventListener("scroll", hide, { passive: true });
  animatePreview();
}

function updateActiveNavigation(url: URL) {
  const activePath = normalizePath(url.pathname);
  const links = document.querySelectorAll(".desktop-nav a[href], .mobile-header a[href], .mobile-menu a[href]");
  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    const linkUrl = new URL(link.href, window.location.href);
    link.classList.toggle("active", normalizePath(linkUrl.pathname) === activePath);
  });
}

function prefetchAppPage(url: URL) {
  const key = url.href;
  if (fetchedPages.has(key)) return;
  fetchedPages.set(key, fetch(key, { headers: { "X-Requested-With": "fetch" } }).then((response) => {
    if (!response.ok) throw new Error(`Failed to prefetch ${key}`);
    return response.text();
  }));
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function isSameAppUrl(left: URL, right: URL) {
  return left.origin === right.origin &&
    normalizePath(left.pathname) === normalizePath(right.pathname) &&
    left.search === right.search &&
    left.hash === right.hash;
}

function isCurrentHomePathNavigation(url: URL) {
  return url.origin === window.location.origin &&
    normalizePath(url.pathname) === "/" &&
    normalizePath(window.location.pathname) === "/";
}

async function getAppDocument(url: URL) {
  const key = url.href;
  const request = fetchedPages.get(key) ?? fetch(key, { headers: { "X-Requested-With": "fetch" } }).then((response) => {
    if (!response.ok) throw new Error(`Failed to fetch ${key}`);
    return response.text();
  });
  fetchedPages.set(key, request);
  const html = await request;
  return new DOMParser().parseFromString(html, "text/html");
}

async function navigateApp(url: URL, replace = false) {
  const currentMain = document.querySelector("#main");
  if (!(currentMain instanceof HTMLElement)) {
    window.location.href = url.href;
    return;
  }

  try {
    updateActiveNavigation(url);
    const nextDocument = await getAppDocument(url);
    const nextMain = nextDocument.querySelector("#main");
    if (!(nextMain instanceof HTMLElement)) throw new Error("Fetched page did not contain #main");

    const nextTitle = nextDocument.querySelector("title")?.textContent;
    const nextDescription = nextDocument.querySelector('meta[name="description"]')?.getAttribute("content");

    const swap = () => {
      const importedMain = document.importNode(nextMain, true);
      prepareImportedProjectIndex(importedMain, url);
      currentMain.replaceWith(importedMain);
      if (nextTitle) document.title = nextTitle;
      if (nextDescription) {
        document.querySelector('meta[name="description"]')?.setAttribute("content", nextDescription);
      }
      updateActiveNavigation(url);
      document.dispatchEvent(new CustomEvent("xppel:close-menu"));
      document.documentElement.classList.remove("lightbox-open");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    };

    const viewTransition = (document as ViewTransitionDocument).startViewTransition;
    if (viewTransition && !motionQuery.matches) {
      await viewTransition.call(document, swap).finished;
    } else {
      swap();
    }

    if (replace) {
      window.history.replaceState({ xppelProjectGallery: true }, "", url.href);
    } else {
      window.history.pushState({ xppelProjectGallery: true }, "", url.href);
    }
    dispatchPageLoad();
  } catch {
    window.location.href = url.href;
  }
}

function initPhotoReveals() {
  const images = Array.from(document.querySelectorAll("[data-photo-reveal] img"));
  if (!images.length) return;

  function queueReveal(image: HTMLImageElement) {
    const now = performance.now();
    const delay = Math.max(0, photoRevealNextAt - now);
    photoRevealNextAt = Math.max(photoRevealNextAt, now) + 85;
    window.setTimeout(() => {
      requestAnimationFrame(() => {
        image.classList.remove("photo-reveal-pending");
        image.classList.add("is-photo-revealed");
      });
    }, delay);
  }

  images.forEach((image) => {
    if (!(image instanceof HTMLImageElement) || image.dataset.photoRevealBound === "true") return;
    image.dataset.photoRevealBound = "true";

    if (motionQuery.matches) {
      image.classList.add("is-photo-revealed");
      return;
    }

    image.classList.add("photo-reveal-pending");
    const revealWhenDecoded = async () => {
      try {
        await image.decode();
      } catch {
        // Images that cannot be decoded still need to become visible after loading.
      }
      queueReveal(image);
    };

    if (image.complete) {
      void revealWhenDecoded();
    } else {
      image.addEventListener("load", () => void revealWhenDecoded(), { once: true });
      image.addEventListener("error", () => {
        image.classList.remove("photo-reveal-pending");
      }, { once: true });
    }
  });
}

function initHybridGalleryNavigation() {
  if (galleryNavInitialized) return;
  galleryNavInitialized = true;

  if (isAppPath(window.location.pathname)) {
    window.history.replaceState({ xppelProjectGallery: true }, "", window.location.href);
  }

  document.addEventListener("click", (event) => {
    if (!(event instanceof MouseEvent) || !isPlainLeftClick(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (!isAppPath(window.location.pathname) || !isAppPath(url.pathname)) return;
    if (isCurrentHomePathNavigation(url)) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("xppel:close-menu"));
      return;
    }
    if (isSameAppUrl(url, new URL(window.location.href))) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("xppel:close-menu"));
      return;
    }
    event.preventDefault();
    navigateApp(url);
  });

  document.addEventListener("pointerover", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && isAppPath(window.location.pathname) && isAppPath(url.pathname)) {
      prefetchAppPage(url);
    }
  }, true);

  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLAnchorElement)) return;
    const url = new URL(target.href, window.location.href);
    if (url.origin === window.location.origin && isAppPath(window.location.pathname) && isAppPath(url.pathname)) {
      prefetchAppPage(url);
    }
  });

  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    if (isAppPath(url.pathname)) {
      navigateApp(url, true);
    } else {
      window.location.href = url.href;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isTypingTarget(event.target)) return;
    if (document.documentElement.classList.contains("lightbox-open") || document.documentElement.classList.contains("menu-open")) return;
    if (!isProjectGalleryPath(window.location.pathname)) return;

    const direction = event.key === "ArrowLeft" ? "previous" : event.key === "ArrowRight" ? "next" : "";
    if (!direction) return;

    const target = document.querySelector(`[data-project-key-nav="${direction}"]`);
    if (!(target instanceof HTMLAnchorElement)) return;

    const url = new URL(target.href, window.location.href);
    if (url.origin !== window.location.origin || !isProjectGalleryPath(url.pathname)) return;

    event.preventDefault();
    navigateApp(url);
  });
}

function refreshLightboxItems() {
  lightboxItems = Array.from(document.querySelectorAll("[data-lightbox-item]"))
    .filter((item): item is HTMLAnchorElement => item instanceof HTMLAnchorElement)
    .sort((left, right) => Number(left.getAttribute("data-lightbox-index") ?? 0) - Number(right.getAttribute("data-lightbox-index") ?? 0));

  lightboxItems.forEach((item, index) => {
    if (item.dataset.lightboxBound === "true") return;
    item.dataset.lightboxBound = "true";
    item.addEventListener("click", (event) => {
      event.preventDefault();
      lastLightboxTrigger = item;
      lastTriggerRect = item.getBoundingClientRect();
      renderLightbox(index);
    });
  });
}

function animateLightbox(open: boolean) {
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  if (!(lightbox instanceof HTMLElement) || !(lightboxImage instanceof HTMLImageElement)) return undefined;
  if (motionQuery.matches || !lastTriggerRect) return undefined;
  lightboxImage.getAnimations().forEach((animation) => animation.cancel());
  const target = lightboxImage.getBoundingClientRect();
  if (!target.width || !target.height) return undefined;
  const dx = lastTriggerRect.left + lastTriggerRect.width / 2 - (target.left + target.width / 2);
  const dy = lastTriggerRect.top + lastTriggerRect.height / 2 - (target.top + target.height / 2);
  const scale = Math.max(0.04, Math.min(lastTriggerRect.width / target.width, lastTriggerRect.height / target.height));
  const keyframes = open
    ? [
        { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})` },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
      ]
    : [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})` }
      ];
  const animation = lightboxImage.animate(keyframes, {
    duration: open ? 420 : 360,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "both"
  });
  if (open) {
    animation.finished.then(() => animation.cancel()).catch(() => {});
  }
  return animation;
}

function decodeImage(src: string) {
  const cached = decodedImages.get(src);
  if (cached) return cached;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  const load = image.decode
    ? image.decode().then(() => image)
    : image.complete
      ? Promise.resolve(image)
      : new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
  });
  decodedImages.set(src, load);
  load.catch(() => decodedImages.delete(src));
  return load;
}

function waitForOpacityTransition(element: HTMLElement, fallbackMs = 340) {
  if (motionQuery.matches) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const timeout = window.setTimeout(finish, fallbackMs);
    function finish() {
      if (done) return;
      done = true;
      window.clearTimeout(timeout);
      element.removeEventListener("transitionend", onTransitionEnd);
      resolve();
    }
    function onTransitionEnd(event: TransitionEvent) {
      if (event.target === element && event.propertyName === "opacity") finish();
    }
    element.addEventListener("transitionend", onTransitionEnd);
  });
}

function setLightboxLoading(loading: boolean) {
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  if (!(lightboxImage instanceof HTMLImageElement)) return;
  lightboxImage.classList.toggle("is-loading", loading);
}

function getLightboxImageSize(item: HTMLAnchorElement, decoded?: HTMLImageElement) {
  const preview = item.querySelector("img");
  const width = decoded?.naturalWidth ||
    (preview instanceof HTMLImageElement ? preview.naturalWidth || Number(preview.getAttribute("width")) : 0);
  const height = decoded?.naturalHeight ||
    (preview instanceof HTMLImageElement ? preview.naturalHeight || Number(preview.getAttribute("height")) : 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  return { width, height };
}

function applyLightboxFrame(item: HTMLAnchorElement, decoded?: HTMLImageElement) {
  const frame = document.querySelector(".lightbox-frame");
  if (!(frame instanceof HTMLElement)) return;
  const size = getLightboxImageSize(item, decoded);
  if (!size) return;
  frame.style.setProperty("--lightbox-aspect", `${size.width} / ${size.height}`);
  frame.style.setProperty("--lightbox-ratio", String(size.width / size.height));
}

function preloadAdjacentLightboxImages(index: number) {
  if (lightboxItems.length < 2) return;
  const previous = lightboxItems[(index - 1 + lightboxItems.length) % lightboxItems.length];
  const next = lightboxItems[(index + 1) % lightboxItems.length];
  [previous, next].forEach((item) => {
    if (item instanceof HTMLAnchorElement) decodeImage(item.href).catch(() => {});
  });
}

async function swapLightboxImage(lightboxImage: HTMLImageElement, item: HTMLAnchorElement, token: number) {
  const decoded = await decodeImage(item.href);
  if (token !== lightboxLoadToken) return;
  if (motionQuery.matches) {
    applyLightboxFrame(item, decoded);
    lightboxImage.src = decoded.src;
    preloadAdjacentLightboxImages(activeLightboxIndex);
    return;
  }
  lightboxImage.classList.add("is-loading");
  await waitForOpacityTransition(lightboxImage, 180);
  if (token !== lightboxLoadToken) return;
  applyLightboxFrame(item, decoded);
  lightboxImage.src = decoded.src;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (token !== lightboxLoadToken) return;
  lightboxImage.classList.remove("is-loading");
  preloadAdjacentLightboxImages(activeLightboxIndex);
}

async function renderLightbox(index: number) {
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const lightboxPrevious = document.querySelector("[data-lightbox-prev]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");
  const item = lightboxItems[index];
  if (!(lightbox instanceof HTMLElement) || !(lightboxImage instanceof HTMLImageElement) || !(item instanceof HTMLAnchorElement)) return;
  const image = item.querySelector("img");
  const token = ++lightboxLoadToken;
  const fullSrc = item.href;
  lightboxClosing = false;
  activeLightboxIndex = index;
  lightboxPrevious?.toggleAttribute("hidden", lightboxItems.length < 2);
  lightboxNext?.toggleAttribute("hidden", lightboxItems.length < 2);
  lightboxImage.getAnimations().forEach((animation) => animation.cancel());
  lightboxImage.alt = image?.getAttribute("alt") || item.getAttribute("aria-label") || "";
  if (lightboxCaption) lightboxCaption.textContent = lightboxImage.alt;
  applyLightboxFrame(item);
  lightbox.classList.remove("is-closing");
  lightbox.hidden = false;
  lightbox.offsetHeight;
  lightbox.classList.add("is-active");
  document.documentElement.classList.add("lightbox-open");
  lightbox.focus({ preventScroll: true });
  setLightboxLoading(true);

  try {
    const decoded = await decodeImage(fullSrc);
    if (token !== lightboxLoadToken || lightbox.hidden) return;
    applyLightboxFrame(item, decoded);
    lightboxImage.src = decoded.src;
    setLightboxLoading(false);
    preloadAdjacentLightboxImages(index);
  } catch {
    if (token !== lightboxLoadToken || lightbox.hidden) return;
    const fallbackSrc = image instanceof HTMLImageElement ? image.currentSrc || image.src : fullSrc;
    applyLightboxFrame(item);
    lightboxImage.src = fallbackSrc;
    setLightboxLoading(false);
  }
}

function restoreLightboxFocus() {
  if (!(lastLightboxTrigger instanceof HTMLElement)) return;
  lastLightboxTrigger.classList.add("suppress-restored-focus");
  lastLightboxTrigger.focus({ preventScroll: true });
  window.setTimeout(() => {
    if (lastLightboxTrigger instanceof HTMLElement) {
      lastLightboxTrigger.classList.remove("suppress-restored-focus");
    }
  }, 120);
}

function closeLightbox() {
  const lightbox = document.querySelector("[data-lightbox]");
  if (!(lightbox instanceof HTMLElement) || lightbox.hidden || lightboxClosing) return;
  lightboxClosing = true;
  lightboxLoadToken += 1;
  setLightboxLoading(false);
  const animation = animateLightbox(false);
  lightbox.classList.add("is-closing");
  lightbox.classList.remove("is-active");

  function finish() {
    lightbox.hidden = true;
    lightboxClosing = false;
    lightbox.classList.remove("is-closing");
    document.documentElement.classList.remove("lightbox-open");
    restoreLightboxFocus();
  }

  Promise.allSettled([
    animation?.finished ?? Promise.resolve(),
    waitForOpacityTransition(lightbox)
  ]).then(finish);
}

function moveLightbox(delta: number) {
  if (lightboxItems.length < 2) return;
  lastTriggerRect = null;
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const item = lightboxItems[(activeLightboxIndex + delta + lightboxItems.length) % lightboxItems.length];
  if (!(lightbox instanceof HTMLElement) || lightbox.hidden || !(lightboxImage instanceof HTMLImageElement) || !(item instanceof HTMLAnchorElement)) {
    renderLightbox((activeLightboxIndex + delta + lightboxItems.length) % lightboxItems.length);
    return;
  }
  const index = (activeLightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
  const image = item.querySelector("img");
  const token = ++lightboxLoadToken;
  activeLightboxIndex = index;
  lightboxImage.alt = image?.getAttribute("alt") || item.getAttribute("aria-label") || "";
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  if (lightboxCaption) lightboxCaption.textContent = lightboxImage.alt;
  swapLightboxImage(lightboxImage, item, token).catch(() => {
    if (token !== lightboxLoadToken || lightbox.hidden) return;
    applyLightboxFrame(item);
    lightboxImage.classList.remove("is-loading");
  });
}

function initLightbox() {
  refreshLightboxItems();
  if (lightboxShellInitialized) return;
  lightboxShellInitialized = true;

  document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
  document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => moveLightbox(-1));
  document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => moveLightbox(1));
  document.querySelector("[data-lightbox]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeLightbox();
  });
  const lightbox = document.querySelector("[data-lightbox]");
  if (lightbox instanceof HTMLElement) {
    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let dragX = 0;
    let dragY = 0;
    let swiping = false;
    let suppressClick = false;

    function resetSwipe() {
      pointerId = -1;
      swiping = false;
    }

    lightbox.addEventListener("pointerdown", (event) => {
      if (lightboxItems.length < 2 || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button")) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragX = 0;
      dragY = 0;
      swiping = false;
      lightbox.setPointerCapture(pointerId);
    });

    lightbox.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      dragX = event.clientX - startX;
      dragY = event.clientY - startY;
      if (!swiping && Math.abs(dragX) > 12 && Math.abs(dragX) > Math.abs(dragY) * 1.25) {
        swiping = true;
      }
      if (swiping) event.preventDefault();
    });

    lightbox.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointerId) return;
      const threshold = Math.min(110, Math.max(44, lightbox.clientWidth * 0.12));
      if (swiping && Math.abs(dragX) > threshold) {
        suppressClick = true;
        moveLightbox(dragX < 0 ? 1 : -1);
      }
      resetSwipe();
    });

    lightbox.addEventListener("pointercancel", resetSwipe);
    lightbox.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
  }
  document.addEventListener("keydown", (event) => {
    const lightbox = document.querySelector("[data-lightbox]");
    if (!(lightbox instanceof HTMLElement) || lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") moveLightbox(-1);
    if (event.key === "ArrowRight") moveLightbox(1);
  });
}

function readProjectIndexStorage() {
  try {
    const stored = sessionStorage.getItem(PROJECT_STATE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    sessionStorage.removeItem(PROJECT_STATE_KEY);
    return {};
  }
}

function isProjectIndexView(value: unknown): value is ProjectIndexState["view"] {
  return value === "grid" || value === "list";
}

function isProjectIndexSize(value: unknown): value is ProjectIndexState["size"] {
  return PROJECT_INDEX_SIZES.includes(value as ProjectIndexState["size"]);
}

function defaultProjectIndexView() {
  return window.matchMedia("(max-width: 760px)").matches ? "list" : "grid";
}

function readProjectIndexBootstrap() {
  return (window as ProjectIndexWindow).__xppelProjectIndexState ?? {};
}

function getProjectIndexInitialShellState(root?: HTMLElement | null, pathname = window.location.pathname) {
  const stored = readProjectIndexStorage();
  const bootstrap = readProjectIndexBootstrap();
  const isProjectIndexPath = normalizePath(pathname) === PROJECT_INDEX_PATH;
  const rootView = isProjectIndexView(root?.getAttribute("data-view")) ? root?.getAttribute("data-view") as ProjectIndexState["view"] : undefined;
  const rootSize = isProjectIndexSize(root?.getAttribute("data-size")) ? root?.getAttribute("data-size") as ProjectIndexState["size"] : undefined;
  const bootstrapView = isProjectIndexView(bootstrap.view) ? bootstrap.view : undefined;
  const bootstrapSize = isProjectIndexSize(bootstrap.size) ? bootstrap.size : undefined;
  const storedView = isProjectIndexView(stored.view) ? stored.view : undefined;
  const storedSize = isProjectIndexSize(stored.size) ? stored.size : undefined;

  return {
    view: (isProjectIndexPath ? bootstrapView ?? storedView : undefined) ?? rootView ?? defaultProjectIndexView(),
    size: (isProjectIndexPath ? bootstrapSize ?? storedSize : undefined) ?? rootSize ?? "m"
  };
}

function syncProjectIndexShell(root: HTMLElement, state = getProjectIndexInitialShellState(root)) {
  root.setAttribute("data-view", state.view);
  root.setAttribute("data-size", state.size);
  document.documentElement.dataset.projectIndexView = state.view;
  document.documentElement.dataset.projectIndexSize = state.size;
  (window as ProjectIndexWindow).__xppelProjectIndexState = { view: state.view, size: state.size };
  root.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-view-mode") === state.view));
  });
}

function prepareImportedProjectIndex(main: HTMLElement, url = new URL(window.location.href)) {
  const root = main.querySelector("[data-projects-index]");
  if (root instanceof HTMLElement) syncProjectIndexShell(root, getProjectIndexInitialShellState(root, url.pathname));
}

function initProjectsIndex() {
  const root = document.querySelector("[data-projects-index]");
  if (!(root instanceof HTMLElement) || root.dataset.projectsIndexBound === "true") return;
  root.dataset.projectsIndexBound = "true";

  const searchInput = root.querySelector("[data-project-search]");
  const clearFilters = root.querySelector("[data-clear-filters]");
  const filterToggle = root.querySelector("[data-filter-toggle]");
  const filterPanel = root.querySelector("[data-filter-panel]");
  const filters = Array.from(root.querySelectorAll("[data-project-filter]"));
  const cards = Array.from(root.querySelectorAll("[data-project-card]"));
  const count = root.querySelector("[data-project-count]");
  const empty = root.querySelector("[data-project-empty]");
  const viewButtons = Array.from(root.querySelectorAll("[data-view-mode]"));
  const sizeButtons = Array.from(root.querySelectorAll("[data-size-step]"));

  function readParams(): ProjectIndexState {
    const params = new URLSearchParams(window.location.search);
    const stored = readProjectIndexStorage();
    const shellState = getProjectIndexInitialShellState(root);
    const selectedTags = new Set(params.getAll("tag"));
    const hasUrlFilters = params.has("q") || selectedTags.size > 0;
    const storedTags = Array.isArray(stored.selectedTags) ? stored.selectedTags : [];
    return {
      q: params.get("q") ?? (!hasUrlFilters ? String(stored.q ?? "") : ""),
      view: shellState.view,
      size: shellState.size,
      selectedTags: selectedTags.size ? selectedTags : new Set(!hasUrlFilters ? storedTags : [])
    };
  }

  function writeParams({ q, view, size, selectedTags }: ProjectIndexState) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    selectedTags.forEach((tag) => params.append("tag", tag));
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    sessionStorage.setItem(PROJECT_STATE_KEY, JSON.stringify({
      q,
      view,
      size,
      selectedTags: Array.from(selectedTags)
    }));
  }

  function getState(): ProjectIndexState {
    return {
      q: searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "",
      view: root.getAttribute("data-view") === "list" ? "list" : "grid",
      size: isProjectIndexSize(root.getAttribute("data-size")) ? root.getAttribute("data-size") as ProjectIndexState["size"] : "m",
      selectedTags: new Set(filters.filter((filter) => filter instanceof HTMLInputElement && filter.checked).map((filter) => filter.value))
    };
  }

  function applyState(state: ProjectIndexState, updateUrl = true) {
    root.setAttribute("data-view", state.view);
    root.setAttribute("data-size", state.size);
    document.documentElement.dataset.projectIndexView = state.view;
    document.documentElement.dataset.projectIndexSize = state.size;
    (window as ProjectIndexWindow).__xppelProjectIndexState = { view: state.view, size: state.size };
    if (searchInput instanceof HTMLInputElement) searchInput.value = state.q;
    filters.forEach((filter) => {
      if (filter instanceof HTMLInputElement) filter.checked = state.selectedTags.has(filter.value);
    });
    viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.getAttribute("data-view-mode") === state.view)));
    if (clearFilters instanceof HTMLButtonElement) {
      const hasTaxonomyFilters = state.selectedTags.size > 0;
      clearFilters.hidden = !hasTaxonomyFilters;
      clearFilters.disabled = !hasTaxonomyFilters;
    }

    let visible = 0;
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const textMatch = !state.q || (card.dataset.search ?? "").includes(state.q);
      const cardTags = new Set((card.dataset.tags ?? "").split(" ").filter(Boolean));
      const selected = Array.from(state.selectedTags);
      const tagMatch = !selected.length || selected.some((tag) => cardTags.has(tag));
      const show = textMatch && tagMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (count) count.textContent = `${visible} / ${cards.length} projects`;
    if (empty instanceof HTMLElement) empty.hidden = visible > 0;
    if (updateUrl) writeParams(state);
  }

  filterToggle?.addEventListener("click", () => {
    if (!(filterPanel instanceof HTMLElement) || !(filterToggle instanceof HTMLElement)) return;
    const open = filterPanel.hidden;
    filterPanel.hidden = !open;
    filterToggle.setAttribute("aria-expanded", String(open));
  });

  searchInput?.addEventListener("input", () => applyState(getState()));
  filters.forEach((filter) => filter.addEventListener("change", () => applyState(getState())));
  clearFilters?.addEventListener("click", () => {
    const state = getState();
    applyState({ ...state, selectedTags: new Set() });
  });
  viewButtons.forEach((button) => button.addEventListener("click", () => {
    const view = button.getAttribute("data-view-mode") === "list" ? "list" : "grid";
    applyState({ ...getState(), view });
  }));
  sizeButtons.forEach((button) => button.addEventListener("click", () => {
    const state = getState();
    const nextIndex = Math.max(0, Math.min(PROJECT_INDEX_SIZES.length - 1, PROJECT_INDEX_SIZES.indexOf(state.size) + Number(button.getAttribute("data-size-step"))));
    applyState({ ...state, size: PROJECT_INDEX_SIZES[nextIndex] });
  }));

  window.addEventListener("keydown", (event) => {
    if (!document.querySelector("[data-projects-index]")) return;
    const active = document.activeElement;
    const isTyping = active instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      if (searchInput instanceof HTMLInputElement) searchInput.focus();
    }
    if (isTyping) return;
    if (event.key.toLowerCase() === "g") applyState({ ...getState(), view: "grid" });
    if (event.key.toLowerCase() === "l") applyState({ ...getState(), view: "list" });
    if (event.key === "+" || event.key === "=") sizeButtons.find((button) => button.getAttribute("data-size-step") === "1")?.dispatchEvent(new MouseEvent("click"));
    if (event.key === "-") sizeButtons.find((button) => button.getAttribute("data-size-step") === "-1")?.dispatchEvent(new MouseEvent("click"));
  });

  applyState(readParams(), false);
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function initAudioPlayers() {
  const audioPlayers = Array.from(document.querySelectorAll("[data-audio-player]"));

  audioPlayers.forEach((player) => {
    if (!(player instanceof HTMLElement) || player.dataset.audioBound === "true") return;
    player.dataset.audioBound = "true";
    const audio = player.querySelector("[data-audio]");
    const toggle = player.querySelector("[data-audio-toggle]");
    const seek = player.querySelector("[data-audio-seek]");
    const time = player.querySelector("[data-audio-time]");
    const volume = player.querySelector("[data-audio-volume]");
    if (!(audio instanceof HTMLAudioElement) || !(toggle instanceof HTMLButtonElement) || !(seek instanceof HTMLInputElement)) return;

    function setProgress() {
      const duration = audio.duration || 0;
      const progress = duration ? audio.currentTime / duration : 0;
      seek.value = String(Math.round(progress * Number(seek.max)));
      seek.style.setProperty("--audio-progress", `${progress * 100}%`);
      if (time) time.textContent = formatAudioTime(audio.currentTime);
    }

    function setVolumeDisplay() {
      if (!(volume instanceof HTMLInputElement)) return;
      volume.style.setProperty("--audio-progress", `${Number(volume.value) * 100}%`);
    }

    function setPlayingState() {
      const isPlaying = !audio.paused;
      player.toggleAttribute("data-playing", isPlaying);
      player.removeAttribute("data-audio-error");
      toggle.textContent = isPlaying ? "Ⅱ" : "▶";
      toggle.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${audio.getAttribute("aria-label") ?? "track"}`);
    }

    toggle.addEventListener("click", async () => {
      if (audio.paused) {
        audioPlayers.forEach((otherPlayer) => {
          if (otherPlayer === player) return;
          const otherAudio = otherPlayer.querySelector("[data-audio]");
          if (otherAudio instanceof HTMLAudioElement) otherAudio.pause();
        });
        try {
          await audio.play();
        } catch {
          player.setAttribute("data-audio-error", "playback-blocked");
          setPlayingState();
        }
      } else {
        audio.pause();
      }
    });

    seek.addEventListener("input", () => {
      const duration = audio.duration || 0;
      if (!duration) return;
      audio.currentTime = (Number(seek.value) / Number(seek.max)) * duration;
      setProgress();
    });

    volume?.addEventListener("input", () => {
      if (!(volume instanceof HTMLInputElement)) return;
      audio.volume = Number(volume.value);
      setVolumeDisplay();
    });

    audio.addEventListener("loadedmetadata", setProgress);
    audio.addEventListener("timeupdate", setProgress);
    audio.addEventListener("play", setPlayingState);
    audio.addEventListener("pause", setPlayingState);
    audio.addEventListener("ended", () => {
      audio.currentTime = 0;
      setProgress();
      setPlayingState();
    });

    setProgress();
    setVolumeDisplay();
    setPlayingState();
  });
}

function initClock() {
  const clock = document.querySelector("[data-clock]");
  if (!(clock instanceof HTMLElement) || clock.dataset.clockBound === "true") return;
  clock.dataset.clockBound = "true";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  function updateClock() {
    clock.textContent = formatter.format(new Date());
  }

  updateClock();
  window.setInterval(updateClock, 1000);
}

function initPage() {
  initExternalLinks();
  initLightbox();
  initCanopyArtwork();
  initProjectsIndex();
  initPhotoReveals();
  initAudioPlayers();
  initClock();
}

function boot() {
  if (booted) return;
  booted = true;
  initMobileMenu();
  initBrandBouncers();
  initLogoFx();
  initHomeLogoRefresh();
  initNavPreview();
  initHybridGalleryNavigation();
  document.addEventListener(PAGE_LOAD_EVENT, initPage);
  dispatchPageLoad();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
