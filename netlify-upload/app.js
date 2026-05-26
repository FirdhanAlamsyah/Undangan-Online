const DEFAULT_GUEST = "Bapak/Ibu/Saudara/i";

const app = document.querySelector("#app");
const openButton = document.querySelector("#openInvite");
const invitationView = document.querySelector(".invitation-view");
const slideTrack = document.querySelector("#slideTrack");
const navTrack = document.querySelector(".nav-track");
const slides = Array.from(document.querySelectorAll(".invite-slide"));
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const slideVideos = Array.from(document.querySelectorAll(".slide-video"));
const musicButton = document.querySelector("[data-toggle-music]");
const weddingMusic = document.querySelector("#weddingMusic");
const slideProgress = document.querySelector("[data-slide-progress]");
const wishList = document.querySelector("[data-wish-list]");
const wishModal = document.querySelector("[data-wish-modal]");
const wishForm = document.querySelector("[data-wish-form]");
const openWishModalButton = document.querySelector("[data-open-wish-modal]");
const closeWishModalButton = document.querySelector("[data-close-wish-modal]");
const giftModal = document.querySelector("[data-gift-modal]");
const openGiftModalButton = document.querySelector("[data-open-gift-modal]");
const closeGiftModalButton = document.querySelector("[data-close-gift-modal]");
const copyStatus = document.querySelector("[data-copy-status]");
const WISH_STORAGE_KEY = "ira-yusup-ucapan-v2";
const WISH_API_URL = "/api/wishes";
const SLIDE_DURATION_MS = 10000;
const MUSIC_START_SECONDS = 12;
const defaultWishes = [];
const countdownTargets = {
  akad: new Date("2026-06-03T10:00:00+07:00").getTime(),
  resepsi: new Date("2026-06-03T11:30:00+07:00").getTime(),
};
let opened = false;
let activeSlideIndex = 0;
let slideTimerPaused = false;
let slideTimerFrame = 0;
let slideStartedAt = 0;
let slidePausedElapsed = 0;
let timerPausedByModal = false;
let musicEnabled = true;
let musicNeedsUserGesture = false;
let ignoreTimerTapUntil = 0;

function setViewportUnit() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}

function updateNavPosition(index = activeSlideIndex) {
  if (!navTrack || !invitationView || !navItems[index]) return;

  const item = navItems[index];
  const offset = invitationView.clientWidth / 2 - item.offsetLeft - item.offsetWidth / 2;
  navTrack.style.setProperty("--nav-offset", `${offset}px`);
}

function handleViewportChange() {
  setViewportUnit();
  updateNavPosition();
}

function updateMusicButton() {
  if (!musicButton || !weddingMusic) return;

  const isActive = musicEnabled && (!weddingMusic.paused || musicNeedsUserGesture);
  musicButton.classList.toggle("is-playing", isActive);
  musicButton.classList.toggle("is-muted", !isActive);
  musicButton.setAttribute("aria-pressed", String(isActive));
  musicButton.setAttribute("aria-label", isActive ? "Matikan lagu" : "Nyalakan lagu");
}

function setMusicStartPosition() {
  if (!weddingMusic) return;

  try {
    weddingMusic.currentTime = MUSIC_START_SECONDS;
  } catch {
    weddingMusic.addEventListener(
      "loadedmetadata",
      () => {
        weddingMusic.currentTime = MUSIC_START_SECONDS;
      },
      { once: true }
    );
  }
}

function playWeddingMusic({ fromStartPosition = false } = {}) {
  if (!weddingMusic) return;

  musicEnabled = true;
  musicNeedsUserGesture = false;
  if (fromStartPosition) setMusicStartPosition();
  weddingMusic.volume = 0.68;
  const playResult = weddingMusic.play();
  if (playResult?.then) {
    playResult
      .then(() => {
        musicNeedsUserGesture = false;
        updateMusicButton();
      })
      .catch(() => {
        musicNeedsUserGesture = musicEnabled;
        updateMusicButton();
      });
    return;
  }

  updateMusicButton();
}

function pauseWeddingMusic() {
  if (!weddingMusic) return;

  musicEnabled = false;
  musicNeedsUserGesture = false;
  weddingMusic.pause();
  updateMusicButton();
}

function toggleWeddingMusic(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!weddingMusic) return;

  if (weddingMusic.paused) {
    playWeddingMusic();
    return;
  }

  pauseWeddingMusic();
}

function startMusicFromOpenGesture() {
  if (opened || !musicEnabled) return;

  playWeddingMusic({ fromStartPosition: true });
}

function setSlideProgress(value) {
  if (!slideProgress) return;

  const normalizedValue = Math.max(0, Math.min(1, value));
  slideProgress.style.transform = `scaleX(${normalizedValue})`;
}

function cancelSlideTimerFrame() {
  if (!slideTimerFrame) return;

  window.cancelAnimationFrame(slideTimerFrame);
  slideTimerFrame = 0;
}

function setSlideTimerPausedState(isPaused) {
  slideTimerPaused = isPaused;
  invitationView?.classList.toggle("is-timer-paused", isPaused);
}

function goToNextSlide() {
  const nextIndex = (activeSlideIndex + 1) % slides.length;
  const nextTarget = slides[nextIndex]?.dataset.section;
  if (nextTarget) setActiveSlide(nextTarget);
}

function updateSlideTimer(timestamp) {
  if (!opened || slideTimerPaused) return;

  const elapsed = timestamp - slideStartedAt;
  const remaining = 1 - elapsed / SLIDE_DURATION_MS;
  setSlideProgress(remaining);

  if (elapsed >= SLIDE_DURATION_MS) {
    setSlideProgress(0);
    goToNextSlide();
    return;
  }

  slideTimerFrame = window.requestAnimationFrame(updateSlideTimer);
}

function restartSlideTimer() {
  cancelSlideTimerFrame();
  slidePausedElapsed = 0;
  setSlideProgress(1);

  if (!opened || slideTimerPaused) return;

  slideStartedAt = performance.now();
  slideTimerFrame = window.requestAnimationFrame(updateSlideTimer);
}

function pauseSlideTimer() {
  if (slideTimerPaused) return;

  slidePausedElapsed = opened
    ? Math.max(0, Math.min(SLIDE_DURATION_MS, performance.now() - slideStartedAt))
    : 0;
  cancelSlideTimerFrame();
  setSlideTimerPausedState(true);
}

function resumeSlideTimer() {
  if (!slideTimerPaused) return;

  setSlideTimerPausedState(false);
  if (!opened) return;

  slideStartedAt = performance.now() - slidePausedElapsed;
  cancelSlideTimerFrame();
  slideTimerFrame = window.requestAnimationFrame(updateSlideTimer);
}

function toggleSlideTimer() {
  if (slideTimerPaused) {
    resumeSlideTimer();
    return;
  }

  pauseSlideTimer();
}

function pauseTimerForModal() {
  timerPausedByModal = false;
  if (opened && !slideTimerPaused) {
    timerPausedByModal = true;
    pauseSlideTimer();
  }
}

function resumeTimerAfterModal() {
  if (!timerPausedByModal) return;

  timerPausedByModal = false;
  resumeSlideTimer();
}

function shouldIgnoreTimerToggle(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  return Boolean(
    target?.closest(
      "a, button, input, textarea, select, label, iframe, .bottom-nav, .music-badge, .wish-modal, .gift-modal"
    )
  );
}

function handleInvitationTap(event) {
  if (!opened || shouldIgnoreTimerToggle(event)) return;
  if (performance.now() < ignoreTimerTapUntil) return;

  if (musicNeedsUserGesture && musicEnabled && weddingMusic?.paused) {
    playWeddingMusic();
    return;
  }

  toggleSlideTimer();
}

function getGuestName() {
  const params = new URLSearchParams(window.location.search);
  const guest = params.get("to") || params.get("guest") || DEFAULT_GUEST;
  return guest.trim() || DEFAULT_GUEST;
}

function renderGuestName() {
  const guestName = getGuestName();

  document.querySelectorAll("[data-guest-name]").forEach((node) => {
    node.textContent = guestName;
  });
}

function getStoredWishes() {
  try {
    const saved = window.localStorage.getItem(WISH_STORAGE_KEY);
    if (!saved) return [...defaultWishes];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...defaultWishes];
  } catch {
    return [...defaultWishes];
  }
}

function saveWishes(wishes) {
  try {
    window.localStorage.setItem(WISH_STORAGE_KEY, JSON.stringify(wishes));
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

function normalizeWish(wish) {
  return {
    id: String(wish?.id || ""),
    name: String(wish?.name || "Tamu Undangan"),
    message: String(wish?.message || ""),
    time: String(wish?.time || "baru saja"),
  };
}

function renderWishes(wishes = getStoredWishes()) {
  if (!wishList) return;

  wishList.textContent = "";
  const normalizedWishes = Array.isArray(wishes) ? wishes.map(normalizeWish) : [];

  if (normalizedWishes.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "wish-card";
    const message = document.createElement("p");
    message.textContent = "Belum ada ucapan.";
    emptyCard.append(message);
    wishList.append(emptyCard);
    return;
  }

  normalizedWishes.forEach((wish) => {
    const card = document.createElement("article");
    card.className = "wish-card";

    const header = document.createElement("header");
    const name = document.createElement("strong");
    const time = document.createElement("span");
    const message = document.createElement("p");

    name.textContent = wish.name || "Tamu Undangan";
    time.textContent = wish.time || "baru saja";
    message.textContent = wish.message || "";

    header.append(name, time);
    card.append(header, message);
    wishList.append(card);
  });
}

async function fetchSharedWishes() {
  const response = await fetch(WISH_API_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil ucapan.");
  }

  const data = await response.json();
  return Array.isArray(data.wishes) ? data.wishes : [];
}

async function loadWishes() {
  const localWishes = getStoredWishes();
  renderWishes(localWishes);

  try {
    const sharedWishes = await fetchSharedWishes();
    saveWishes(sharedWishes);
    renderWishes(sharedWishes);
  } catch {
    renderWishes(localWishes);
  }
}

async function submitSharedWish(wish) {
  const response = await fetch(WISH_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wish),
  });

  if (!response.ok) {
    throw new Error("Gagal mengirim ucapan.");
  }

  const data = await response.json();
  return Array.isArray(data.wishes) ? data.wishes : [data.wish, ...getStoredWishes()].filter(Boolean);
}

function openWishModal() {
  if (!wishModal) return;

  pauseTimerForModal();
  wishModal.classList.add("is-open");
  wishModal.setAttribute("aria-hidden", "false");

  window.setTimeout(() => {
    wishForm?.elements.name?.focus();
  }, 120);
}

function closeWishModal() {
  if (!wishModal) return;

  const wasOpen = wishModal.classList.contains("is-open");
  wishModal.classList.remove("is-open");
  wishModal.setAttribute("aria-hidden", "true");
  if (wasOpen) resumeTimerAfterModal();
}

function openGiftModal() {
  if (!giftModal) return;

  pauseTimerForModal();
  giftModal.classList.add("is-open");
  giftModal.setAttribute("aria-hidden", "false");
  if (copyStatus) copyStatus.textContent = "";
}

function closeGiftModal() {
  if (!giftModal) return;

  const wasOpen = giftModal.classList.contains("is-open");
  giftModal.classList.remove("is-open");
  giftModal.setAttribute("aria-hidden", "true");
  if (wasOpen) resumeTimerAfterModal();
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const input = document.createElement("input");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function handleCopyAccount(event) {
  const button = event.target instanceof Element ? event.target.closest("[data-copy-account]") : null;
  if (!button) return;

  const value = button.getAttribute("data-copy-account");
  if (!value) return;

  copyText(value).then(() => {
    if (copyStatus) copyStatus.textContent = "Nomor rekening berhasil disalin.";
  });
}

async function handleWishSubmit(event) {
  event.preventDefault();
  if (!wishForm) return;

  const formData = new FormData(wishForm);
  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!name || !message) return;

  const submitButton = wishForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Mengirim...";
  }

  const wishes = getStoredWishes();
  const wish = { name, message };
  wishes.unshift({ ...wish, time: "baru saja" });
  saveWishes(wishes);
  renderWishes(wishes);

  try {
    const sharedWishes = await submitSharedWish(wish);
    saveWishes(sharedWishes);
    renderWishes(sharedWishes);
  } catch {
    renderWishes(wishes);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText || "Kirim";
    }
  }

  wishForm.reset();
  closeWishModal();
}

function updateCountdown() {
  document.querySelectorAll("[data-countdown-event]").forEach((node) => {
    const target = countdownTargets[node.dataset.countdownEvent];
    if (!target) return;

    const distance = Math.max(0, target - Date.now());
    const values = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance % 86400000) / 3600000),
      minutes: Math.floor((distance % 3600000) / 60000),
      seconds: Math.floor((distance % 60000) / 1000),
    };

    if (node.hasAttribute("data-countdown-days")) node.textContent = values.days;
    if (node.hasAttribute("data-countdown-hours")) node.textContent = values.hours;
    if (node.hasAttribute("data-countdown-minutes")) node.textContent = values.minutes;
    if (node.hasAttribute("data-countdown-seconds")) node.textContent = values.seconds;
  });
}

function requestFullscreenMode() {
  const target = document.documentElement;

  if (target.requestFullscreen) {
    target.requestFullscreen().catch(() => undefined);
    return;
  }

  if (target.webkitRequestFullscreen) {
    target.webkitRequestFullscreen();
  }
}

function loadSlideVideo(slide) {
  const video = slide?.querySelector(".slide-video");
  const source = video?.dataset.src;

  if (!video || !source || video.src) return;

  video.src = source;
  video.load();
  if (!video.dataset.playOnActive) {
    video.play().catch(() => undefined);
  }
}

function preloadPriorityVideos() {
  ["salam", "quote"].forEach((section) => {
    const slide = slides.find((item) => item.dataset.section === section);
    loadSlideVideo(slide);
  });
}

function syncSlideVideos() {
  slides.forEach((slide, index) => {
    const video = slide.querySelector(".slide-video");
    if (!video?.src || !video.dataset.playOnActive) return;

    if (index === activeSlideIndex) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
      return;
    }

    video.pause();
    video.currentTime = 0;
  });
}

function handleOpenClick() {
  if (opened) return;
  opened = true;

  if (openButton) {
    openButton.classList.add("is-pressed");
    openButton.textContent = "Membuka...";
  }

  if (app) {
    app.classList.add("is-opening");
  }

  if (invitationView) {
    invitationView.setAttribute("aria-hidden", "false");
  }

  ignoreTimerTapUntil = performance.now() + 900;
  loadSlideVideo(slides[activeSlideIndex]);
  preloadPriorityVideos();
  syncSlideVideos();
  setSlideTimerPausedState(false);
  restartSlideTimer();
  playWeddingMusic({ fromStartPosition: true });
  requestFullscreenMode();

  window.setTimeout(() => {
    if (openButton) {
      openButton.classList.remove("is-pressed");
    }
  }, 220);
}

function openInviteFromInteraction(event) {
  if (!openButton || opened) return;

  const rect = openButton.getBoundingClientRect();
  const point = "touches" in event && event.touches.length > 0 ? event.touches[0] : event;
  const x = point.clientX;
  const y = point.clientY;
  const padding = 18;
  const insideButton =
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding;

  if (!insideButton) return;

  event.preventDefault();
  window.location.hash = "invite";
  handleOpenClick();
}

function syncOpenStateFromHash() {
  if (window.location.hash === "#invite") {
    handleOpenClick();
  }
}

function exitFullscreenMode() {
  if (!document.fullscreenElement) return;

  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => undefined);
  }
}

function handleCloseClick() {
  if (!opened) return;
  opened = false;

  if (app) {
    app.classList.remove("is-opening");
  }

  if (invitationView) {
    invitationView.setAttribute("aria-hidden", "true");
  }

  if (openButton) {
    openButton.textContent = "Buka Undangan";
  }

  cancelSlideTimerFrame();
  setSlideProgress(1);
  pauseWeddingMusic();
  setActiveSlide("opening");
  exitFullscreenMode();
}

function setActiveSlide(target) {
  const index = slides.findIndex((slide) => slide.dataset.section === target);
  if (index < 0) return;

  activeSlideIndex = index;
  if (slideTrack) {
    slideTrack.style.setProperty("--active-slide", index);
  }
  loadSlideVideo(slides[index]);

  slides.forEach((slide, slideIndex) => {
    slide.classList.remove("is-entering");
    slide.classList.toggle("is-active", slideIndex === index);
  });
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.target === target);
  });

  updateNavPosition(index);
  syncSlideVideos();
  restartSlideTimer();

  window.requestAnimationFrame(() => {
    slides[index].classList.add("is-entering");
  });
}

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", handleViewportChange);
window.addEventListener("hashchange", syncOpenStateFromHash);
window.addEventListener("pointerup", openInviteFromInteraction, true);
invitationView?.addEventListener("pointerup", handleInvitationTap);
musicButton?.addEventListener("click", toggleWeddingMusic);
weddingMusic?.addEventListener("play", updateMusicButton);
weddingMusic?.addEventListener("pause", updateMusicButton);
if (openButton) {
  openButton.addEventListener("pointerdown", startMusicFromOpenGesture);
  openButton.addEventListener("click", (event) => {
    event.preventDefault();
    playWeddingMusic({ fromStartPosition: true });
    window.location.hash = "invite";
    handleOpenClick();
  });
}
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target.parentElement;

  if (target?.closest("#openInvite")) {
    handleOpenClick();
  }
});
navItems.forEach((item) => {
  item.addEventListener("click", () => setActiveSlide(item.dataset.target));
});
openWishModalButton?.addEventListener("click", openWishModal);
closeWishModalButton?.addEventListener("click", closeWishModal);
wishForm?.addEventListener("submit", handleWishSubmit);
openGiftModalButton?.addEventListener("click", openGiftModal);
closeGiftModalButton?.addEventListener("click", closeGiftModal);
giftModal?.addEventListener("click", handleCopyAccount);
wishModal?.addEventListener("click", (event) => {
  if (event.target === wishModal) {
    closeWishModal();
  }
});
giftModal?.addEventListener("click", (event) => {
  if (event.target === giftModal) {
    closeGiftModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWishModal();
    closeGiftModal();
  }
});
slideVideos.forEach((video) => {
  video.addEventListener("error", () => {
    video.classList.add("is-missing");
  });
});

handleViewportChange();
updateMusicButton();
setSlideProgress(1);
renderGuestName();
loadWishes();
updateCountdown();
setActiveSlide("opening");
window.openInvitation = handleOpenClick;
syncOpenStateFromHash();
preloadPriorityVideos();
window.setInterval(updateCountdown, 1000);
