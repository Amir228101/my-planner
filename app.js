/***********************
 * STORAGE KEYS
 ***********************/
const STORAGE_KEY_ITEMS = "planner_items_v1";
const STORAGE_KEY_PROFILE = "planner_profile_v1";
const STORAGE_KEY_THEME = "planner_theme_v1";
const STORAGE_KEY_FINANCE = "planner_finance_v1";
const STORAGE_KEY_WEATHER = "planner_weather_v1";
const STORAGE_KEY_BG = "planner_bg_image_v1";

/***********************
 * DATA
 ***********************/
let items = [];
let reminders = [];
let profile = null;
let financeEntries = [];
let weatherSettings = { city: "", apiKey: "" };
let pendingAttachment = null; // holds file data while editing/creating




// Turn a Date into "YYYY-MM-DD" in LOCAL time (no timezone problems)
function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Turn "YYYY-MM-DD" into a Date in LOCAL time
function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}


/***********************
 * UTIL
 ***********************/
function formatDate(d) {
  // local date -> YYYY-MM-DD (no UTC shift)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(dateStr) {
  // "2025-11-23" -> local Date
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayString() {
  return formatDate(new Date());
}

function compareDateTime(a, b) {
  return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/***********************
 * LOAD / SAVE
 ***********************/
function loadItems() {
  const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
  items = raw ? JSON.parse(raw) : [];

  // migration: ensure status + endTime exist
  items.forEach((it) => {
    if (!it.status) {
      it.status = it.completed ? "done" : "todo";
    }
    if (!it.endTime) {
      const [h, m] = (it.time || "09:00").split(":").map(Number);
      const d = new Date();
      d.setHours(h + 1, m || 0, 0, 0);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      it.endTime = `${hh}:${mm}`;
    }
  });
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

function loadProfile() {
  const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
  return raw ? JSON.parse(raw) : { name: "Username", image: null };
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
}

function loadTheme() {
  return localStorage.getItem(STORAGE_KEY_THEME) || "green";
}

function saveTheme(name) {
  localStorage.setItem(STORAGE_KEY_THEME, name);
}

function loadFinance() {
  const raw = localStorage.getItem(STORAGE_KEY_FINANCE);
  financeEntries = raw ? JSON.parse(raw) : [];
}

function saveFinance() {
  localStorage.setItem(STORAGE_KEY_FINANCE, JSON.stringify(financeEntries));
}

function loadWeatherSettings() {
  const raw = localStorage.getItem(STORAGE_KEY_WEATHER);
  weatherSettings = raw ? JSON.parse(raw) : { city: "", apiKey: "" };
}

function saveWeatherSettings() {
  localStorage.setItem(STORAGE_KEY_WEATHER, JSON.stringify(weatherSettings));
}

function loadBgImage() {
  return localStorage.getItem(STORAGE_KEY_BG);
}

function saveBgImage(dataUrl) {
  if (dataUrl) localStorage.setItem(STORAGE_KEY_BG, dataUrl);
  else localStorage.removeItem(STORAGE_KEY_BG);
}

function applyBgImage() {
  const img = loadBgImage();
  if (img) {
    document.body.style.backgroundImage = `url(${img})`;
  } else {
    document.body.style.backgroundImage = "none";
  }
}

/***********************
 * DOM REFERENCES
 ***********************/
// header
const greetingEl = document.getElementById("greeting");
const todayTextEl = document.getElementById("today-text");
const avatar = document.getElementById("avatar");
const avatarInitial = document.getElementById("avatar-initial");
const avatarBig = document.getElementById("avatar-big");
const avatarBigInitial = document.getElementById("avatar-big-initial");
const profileShortcutBtn = document.getElementById("profile-tab-shortcut");

// home stats
const homeCountTodo = document.getElementById("home-count-todo");
const homeCountInProgress = document.getElementById("home-count-inprogress");
const homeCountDone = document.getElementById("home-count-done");
const statOpenTasks = document.getElementById("stat-open-tasks");
const statMeetingsToday = document.getElementById("stat-meetings-today");
const statCompletedToday = document.getElementById("stat-completed-today");
const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const todayListEl = document.getElementById("today-list");

// tabs
const tabs = document.querySelectorAll(".tab-btn");
const panes = document.querySelectorAll(".tab-pane");

// calendar
const monthLabel = document.getElementById("month-label");
const calendarGrid = document.getElementById("calendar-grid");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const selectedDayLabel = document.getElementById("selected-day-label");
const dayItemsEl = document.getElementById("day-items");
const addItemTodayBtn = document.getElementById("add-item-today");

// week
const weekLabelEl = document.getElementById("week-label");
const weekContainerEl = document.getElementById("week-container");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const weekBarGridEl = document.getElementById("week-bar-grid");


// task form
const itemForm = document.getElementById("item-form");
const itemIdInput = document.getElementById("item-id");
const itemTitleInput = document.getElementById("item-title");
const itemDateInput = document.getElementById("item-date");
const itemTimeInput = document.getElementById("item-time");
const itemEndTimeInput = document.getElementById("item-endtime");
const itemStatusInput = document.getElementById("item-status");
const itemTypeInput = document.getElementById("item-type");
const itemPriorityInput = document.getElementById("item-priority");
const itemCategoryInput = document.getElementById("item-category");
const itemReminderInput = document.getElementById("item-reminder");
const itemLocationInput = document.getElementById("item-location");
const itemNotesInput = document.getElementById("item-notes");
const itemAttachmentInput = document.getElementById("item-attachment");
const itemSaveBtn = document.getElementById("item-save-btn");
const allItemsList = document.getElementById("all-items-list");
const filterPriority = document.getElementById("filter-priority");
const filterCategory = document.getElementById("filter-category");

// profile tab
const profileNameInput = document.getElementById("profile-name");
const profileImageInput = document.getElementById("profile-image-input");
const profileRemoveImageBtn = document.getElementById("profile-remove-image");

// weather
const weatherLocationEl = document.getElementById("weather-location");
const weatherDaysEl = document.getElementById("weather-days");
const settingsCityInput = document.getElementById("settings-city");
const settingsWeatherKeyInput = document.getElementById("settings-weather-key");
const settingsSaveWeatherBtn = document.getElementById("settings-save-weather");

// theme & background
const themeButtons = document.querySelectorAll(".theme-btn");
const settingsBgInput = document.getElementById("settings-bg-image");
const settingsBgClear = document.getElementById("settings-bg-clear");

// finance
const financeForm = document.getElementById("finance-form");
const financeIdInput = document.getElementById("finance-id");
const financeTitleInput = document.getElementById("finance-title");
const financeAmountInput = document.getElementById("finance-amount");
const financeDateInput = document.getElementById("finance-date");
const financeKindInput = document.getElementById("finance-kind");
const financeCategoryInput = document.getElementById("finance-category");
const financeNotesInput = document.getElementById("finance-notes");
const financeTotalEl = document.getElementById("finance-total");
const financePlannedCountEl = document.getElementById("finance-planned-count");
const financeListEl = document.getElementById("finance-list");

// image modal
const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalBackdrop = document.querySelector(".image-modal-backdrop");

/***********************
 * THEMES
 ***********************/
const themes = {
  green: {
    accent: "#16a34a",
    accentSoft: "#dcfce7",
    bgPage: "#22c55e",
    bgMain: "#fdfdfb",
  },
  blue: {
    accent: "#2563eb",
    accentSoft: "#dbeafe",
    bgPage: "#1d4ed8",
    bgMain: "#f3f4ff",
  },
  purple: {
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    bgPage: "#5b21b6",
    bgMain: "#f5f3ff",
  },
  light: {
    accent: "#2563eb",
    accentSoft: "#e5edff",
    bgPage: "#e5edf7",
    bgMain: "#ffffff",
  },
  dark: {
    accent: "#22c55e",
    accentSoft: "#064e3b",
    bgPage: "#020617",
    bgMain: "#020617",
  },
};

function applyTheme(name) {
  const t = themes[name] || themes.green;
  document.documentElement.style.setProperty("--accent", t.accent);
  document.documentElement.style.setProperty("--accent-soft", t.accentSoft);
  document.documentElement.style.setProperty("--bg-page", t.bgPage);
  document.documentElement.style.setProperty("--bg-main", t.bgMain);
  themeButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.theme === name)
  );
}

/***********************
 * PROFILE
 ***********************/
profile = loadProfile();
profileNameInput.value = profile.name;

function updateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let part = "Good evening";
  if (hour < 12) part = "Good morning";
  else if (hour < 18) part = "Good afternoon";
  greetingEl.textContent = `${part}, ${profile.name}`;
}

function updateTodayText() {
  const now = new Date();
  const opt = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  todayTextEl.textContent = now.toLocaleDateString(undefined, opt);
}

function updateAvatarImages() {
  const initial = profile.name ? profile.name.trim()[0].toUpperCase() : "?";
  avatarInitial.textContent = initial;
  avatarBigInitial.textContent = initial;

  function setAvatarImage(el, initialEl) {
    if (profile.image) {
      el.style.backgroundImage = `url(${profile.image})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      initialEl.style.display = "none";
    } else {
      el.style.backgroundImage = "none";
      initialEl.style.display = "flex";
    }
  }

  setAvatarImage(avatar, avatarInitial);
  setAvatarImage(avatarBig, avatarBigInitial);
}

updateGreeting();
updateTodayText();
updateAvatarImages();

profileNameInput.addEventListener("input", () => {
  profile.name = profileNameInput.value || "You";
  saveProfile();
  updateGreeting();
  updateAvatarImages();
});

profileImageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profile.image = reader.result;
    saveProfile();
    updateAvatarImages();
  };
  reader.readAsDataURL(file);
});

profileRemoveImageBtn.addEventListener("click", () => {
  profile.image = null;
  saveProfile();
  updateAvatarImages();
});

/***********************
 * TABS
 ***********************/
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabs.forEach((b) => b.classList.remove("active"));
    panes.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");
  });
});

profileShortcutBtn.addEventListener("click", () => {
  document.querySelector('.tab-btn[data-tab="profile"]').click();
});

/***********************
 * CALENDAR
 ***********************/
let currentMonthDate = new Date();
let selectedDay = todayString();

function renderCalendar() {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  monthLabel.textContent = currentMonthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = startDay;
  const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;
  const todayStr = todayString();

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.classList.add("calendar-cell");

    const dayNum = i - prevMonthDays + 1;
    let cellDate;

    if (dayNum <= 0) {
      const d = new Date(year, month, 0);
      d.setDate(d.getDate() + dayNum);
      cellDate = d;
      cell.classList.add("other-month");
    } else if (dayNum > daysInMonth) {
      const d = new Date(year, month + 1, dayNum - daysInMonth);
      cellDate = d;
      cell.classList.add("other-month");
    } else {
      cellDate = new Date(year, month, dayNum);
    }

    const dateStr = formatDate(cellDate);
    cell.textContent = cellDate.getDate();

    // meeting coloring
    const hasItems = items.some((it) => it.date === dateStr);
    const hasWorkMeeting = items.some(
      (it) =>
        it.date === dateStr &&
        it.type === "meeting" &&
        it.category === "work"
    );
    const hasPrivateMeeting = items.some(
      (it) =>
        it.date === dateStr &&
        it.type === "meeting" &&
        it.category === "private"
    );

    if (hasWorkMeeting) {
      cell.classList.add("meeting-work");
    } else if (hasPrivateMeeting) {
      cell.classList.add("meeting-private");
    } else if (hasItems) {
      cell.classList.add("has-items");
    }

    if (dateStr === selectedDay) cell.classList.add("selected");
    if (dateStr === todayStr) {
      // you could highlight today differently if you like
    }

    cell.addEventListener("click", () => {
      selectedDay = dateStr;
      renderCalendar();
      renderDayItems();
    });

    calendarGrid.appendChild(cell);
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  renderCalendar();
});

addItemTodayBtn.addEventListener("click", () => {
  document.querySelector('.tab-btn[data-tab="tasks"]').click();
  itemDateInput.value = selectedDay;
});

/***********************
 * WEEK VIEW
 ***********************/
let currentWeekStart = getMonday(new Date());

function renderWeek() {
  const start = new Date(currentWeekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const optShort = { month: "short", day: "numeric" };
  weekLabelEl.textContent =
    start.toLocaleDateString(undefined, optShort) +
    " – " +
    end.toLocaleDateString(undefined, optShort);

  weekContainerEl.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const dateStr = formatDate(dayDate);

    const dayItems = items
      .filter((it) => it.date === dateStr)
      .sort(compareDateTime);

    const card = document.createElement("div");
    card.classList.add("week-day-card");

    const header = document.createElement("div");
    header.classList.add("week-day-header");
    header.innerHTML =
      `<span>${dayDate.toLocaleDateString(undefined, {
        weekday: "short",
      })}</span>` + `<span>${dayDate.getDate()}</span>`;
    card.appendChild(header);

    const ul = document.createElement("ul");
    ul.classList.add("week-day-list");

    if (dayItems.length === 0) {
      const li = document.createElement("li");
      li.textContent = "—";
      ul.appendChild(li);
    } else {
      dayItems.forEach((it) => {
        const li = document.createElement("li");
        li.textContent = `${it.time} · ${it.title}`;
        ul.appendChild(li);
      });
    }

    card.appendChild(ul);
    weekContainerEl.appendChild(card);
  }
}


function renderWeekBar() {
  if (!weekBarGridEl) return;

  weekBarGridEl.innerHTML = "";

  const start = new Date(currentWeekStart);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  // --- header row (row 1) ---
  // empty cell (top-left)
  const emptyHeader = document.createElement("div");
  emptyHeader.style.gridColumn = "1";
  emptyHeader.style.gridRow = "1";
  weekBarGridEl.appendChild(emptyHeader);

  // day labels
  days.forEach((d, idx) => {
    const cell = document.createElement("div");
    cell.classList.add("week-bar-day-label");
    cell.style.gridColumn = String(idx + 2); // columns 2..8
    cell.style.gridRow = "1";
    cell.textContent = d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
    });
    weekBarGridEl.appendChild(cell);
  });

  // --- hour labels + background slots (rows 2..25) ---
  for (let hour = 0; hour < 24; hour++) {
    const row = hour + 2; // row 2 = 00:00–01:00

    // hour label column
    const hourCell = document.createElement("div");
    hourCell.classList.add("week-bar-hour");
    hourCell.style.gridColumn = "1";
    hourCell.style.gridRow = String(row);
    hourCell.textContent = `${String(hour).padStart(2, "0")}:00`;
    weekBarGridEl.appendChild(hourCell);

    // background cells for each day
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const slot = document.createElement("div");
      slot.classList.add("week-bar-slot");
      slot.style.gridColumn = String(dayIdx + 2);
      slot.style.gridRow = String(row);
      weekBarGridEl.appendChild(slot);
    }
  }

  // --- event blocks ---
  const weekStartStr = formatDate(start);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const weekEndStr = formatDate(end);

  const weekItems = items.filter(
    (it) => it.date >= weekStartStr && it.date <= weekEndStr
  );

  weekItems.forEach((it) => {
    const d = new Date(it.date);
    const dayIndex = Math.floor(
      (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayIndex < 0 || dayIndex > 6) return;

    const [sh, sm] = (it.time || "00:00").split(":").map(Number);
    const [eh, em] = (it.endTime || it.time || "01:00")
      .split(":")
      .map(Number);

    const startHour = sh + (sm || 0) / 60;
    const endHour = Math.max(startHour + 0.5, eh + (em || 0) / 60); // min 30 min

    const rowStart = Math.floor(startHour) + 2;
    const rowEnd = Math.ceil(endHour) + 2;

    const div = document.createElement("div");
    div.classList.add("week-bar-event");

    if (it.category === "work") div.classList.add("work");
    else if (it.category === "private") div.classList.add("private");
    else div.classList.add("other");

    div.style.gridColumn = String(dayIndex + 2);
    div.style.gridRow = `${rowStart} / ${rowEnd}`;

    div.textContent = `${it.time} ${it.title}`;

    weekBarGridEl.appendChild(div);
  });
}

prevWeekBtn.addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderWeek();
  renderWeekBar();
});

nextWeekBtn.addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderWeek();
  renderWeekBar();
});


/***********************
 * DAY ITEMS
 ***********************/
function renderDayItems() {
  const d = parseDate(selectedDay);
  selectedDayLabel.textContent = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const dayItems = items
    .filter((it) => it.date === selectedDay)
    .sort(compareDateTime);

  dayItemsEl.innerHTML = "";
  dayItems.forEach((it) => dayItemsEl.appendChild(renderItemRow(it)));
}

/***********************
 * HOME
 ***********************/
function renderHome() {
  const today = todayString();
  const todaysItems = items.filter((it) => it.date === today).sort(compareDateTime);

  // overall status counts
  const todoCount = items.filter((it) => it.status === "todo").length;
  const inProgressCount = items.filter((it) => it.status === "inprogress").length;
  const doneCount = items.filter((it) => it.status === "done").length;

  homeCountTodo.textContent = todoCount;
  homeCountInProgress.textContent = inProgressCount;
  homeCountDone.textContent = doneCount;

  const openTasks = todaysItems.filter((it) => it.status !== "done").length;
  const meetings = todaysItems.filter((it) => it.type === "meeting").length;
  const completed = todaysItems.filter((it) => it.status === "done").length;

  statOpenTasks.textContent = openTasks;
  statMeetingsToday.textContent = meetings;
  statCompletedToday.textContent = completed;

  let percent = 0;
  if (todaysItems.length > 0) {
    percent = Math.round((completed / todaysItems.length) * 100);
  }
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;

  todayListEl.innerHTML = "";
  todaysItems.forEach((it) => todayListEl.appendChild(renderItemRow(it)));
}

/***********************
 * ALL ITEMS LIST
 ***********************/
function renderAllItems() {
  const priFilter = filterPriority.value;
  const catFilter = filterCategory.value;

  let filtered = [...items];
  if (priFilter !== "all")
    filtered = filtered.filter((it) => it.priority === priFilter);
  if (catFilter !== "all")
    filtered = filtered.filter((it) => it.category === catFilter);

  filtered.sort(compareDateTime);
  allItemsList.innerHTML = "";
  filtered.forEach((it) => allItemsList.appendChild(renderItemRow(it)));
}

filterPriority.addEventListener("change", renderAllItems);
filterCategory.addEventListener("change", renderAllItems);

/***********************
 * IMAGE MODAL
 ***********************/
function openImageModal(src) {
  imageModalImg.src = src;
  imageModal.classList.remove("hidden");
}

function closeImageModal() {
  imageModal.classList.add("hidden");
  imageModalImg.src = "";
}

imageModalBackdrop.addEventListener("click", closeImageModal);
imageModalImg.addEventListener("click", closeImageModal);

/***********************
 * RENDER SINGLE ITEM
 ***********************/
function renderItemRow(it) {
  const li = document.createElement("li");
  li.classList.add("item");

  const main = document.createElement("div");
  main.classList.add("item-main");

  const title = document.createElement("div");
  title.classList.add("item-title");
  if (it.status === "done") title.style.textDecoration = "line-through";
  title.textContent = it.title;

  const meta = document.createElement("div");
  meta.classList.add("item-meta");
  meta.textContent = `${it.date} • ${it.time}–${it.endTime || it.time}`;

  const badges = document.createElement("div");
  badges.classList.add("badges");

  const priBadge = document.createElement("span");
  priBadge.classList.add("badge", `priority-${it.priority}`);
  priBadge.textContent = it.priority.toUpperCase();
  badges.appendChild(priBadge);

  const catBadge = document.createElement("span");
  catBadge.classList.add("badge", `cat-${it.category}`);
  catBadge.textContent = it.category;
  badges.appendChild(catBadge);

  if (it.type === "meeting") {
    const mBadge = document.createElement("span");
    mBadge.classList.add("badge", "type-meeting");
    mBadge.textContent = "MEETING";
    badges.appendChild(mBadge);
  } else {
    const tBadge = document.createElement("span");
    tBadge.classList.add("badge");
    tBadge.textContent = it.type;
    badges.appendChild(tBadge);
  }

  const statusBadge = document.createElement("span");
  statusBadge.classList.add("badge");
  statusBadge.textContent =
    it.status === "todo"
      ? "TO DO"
      : it.status === "inprogress"
      ? "IN PROGRESS"
      : "DONE";
  badges.appendChild(statusBadge);

  main.appendChild(title);
  main.appendChild(meta);

  if (it.location) {
    const loc = document.createElement("div");
    loc.classList.add("item-meta");
    loc.textContent = `📍 ${it.location}`;
    main.appendChild(loc);
  }

  main.appendChild(badges);

  // attachment
  if (it.attachment) {
    if (it.attachment.type === "image") {
      const img = document.createElement("img");
      img.src = it.attachment.dataUrl;
      img.alt = it.attachment.name || "Attachment";
      img.classList.add("item-thumb");
      img.addEventListener("click", () => openImageModal(img.src));
      main.appendChild(img);
    } else {
      const att = document.createElement("div");
      att.classList.add("item-meta");
      att.textContent = `🎞 ${it.attachment.name || "Video"}`;
      att.style.cursor = "pointer";
      att.addEventListener("click", () => {
        window.open(it.attachment.dataUrl, "_blank");
      });
      main.appendChild(att);
    }
  }

  const actions = document.createElement("div");
  actions.classList.add("item-actions");

  const completeBtn = document.createElement("button");
  completeBtn.classList.add("small-btn", "complete");
  completeBtn.textContent = it.status === "done" ? "Undo" : "Done";
  completeBtn.addEventListener("click", () => {
    if (it.status === "done") {
      it.status = "todo";
      it.completed = false;
    } else {
      it.status = "done";
      it.completed = true;
    }
    saveItems();
    scheduleReminders();
    fullRender();
  });
  actions.appendChild(completeBtn);

  const editBtn = document.createElement("button");
  editBtn.classList.add("small-btn", "edit");
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => {
    document.querySelector('.tab-btn[data-tab="tasks"]').click();
    fillFormForEdit(it);
  });
  actions.appendChild(editBtn);

  const postponeBtn = document.createElement("button");
  postponeBtn.classList.add("small-btn", "postpone");
  postponeBtn.textContent = "+1 day";
  postponeBtn.addEventListener("click", () => {
    const d = new Date(it.date);
    d.setDate(d.getDate() + 1);
    it.date = formatDate(d);
    saveItems();
    scheduleReminders();
    fullRender();
  });
  actions.appendChild(postponeBtn);

  if (it.location) {
    const mapsBtn = document.createElement("button");
    mapsBtn.classList.add("small-btn", "maps");
    mapsBtn.textContent = "Map";
    mapsBtn.addEventListener("click", () => {
      const url =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(it.location);
      window.open(url, "_blank");
    });
    actions.appendChild(mapsBtn);
  }

  if (it.type === "meeting") {
    const emailBtn = document.createElement("button");
    emailBtn.classList.add("small-btn", "email");
    emailBtn.textContent = "Email";
    emailBtn.addEventListener("click", () => {
      const subject = encodeURIComponent("Meeting: " + it.title);
      const body = encodeURIComponent(
        `Hi,\n\nI'd like to invite you to this meeting:\n\n` +
          `Title: ${it.title}\n` +
          `Date: ${it.date}\n` +
          `Time: ${it.time} – ${it.endTime}\n` +
          (it.location ? `Location: ${it.location}\n` : "") +
          (it.notes ? `Notes: ${it.notes}\n\n` : "\n") +
          `Best regards,\n${profile.name}`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
    actions.appendChild(emailBtn);
  }

  const delBtn = document.createElement("button");
  delBtn.classList.add("small-btn", "delete");
  delBtn.textContent = "Del";
  delBtn.addEventListener("click", () => {
    items = items.filter((x) => x.id !== it.id);
    saveItems();
    scheduleReminders();
    fullRender();
  });
  actions.appendChild(delBtn);

  li.appendChild(main);
  li.appendChild(actions);
  return li;
}

/***********************
 * ATTACHMENT INPUT
 ***********************/
itemAttachmentInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    pendingAttachment = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingAttachment = {
      name: file.name,
      type: file.type.startsWith("video") ? "video" : "image",
      dataUrl: reader.result,
    };
  };
  reader.readAsDataURL(file);
});

/***********************
 * TASK FORM
 ***********************/
function clearForm() {
  itemIdInput.value = "";
  itemTitleInput.value = "";
  const today = todayString();
  itemDateInput.value = today;
  itemTimeInput.value = "09:00";
  itemEndTimeInput.value = "10:00";
  itemStatusInput.value = "todo";
  itemTypeInput.value = "task";
  itemPriorityInput.value = "normal";
  itemCategoryInput.value = "private";
  itemReminderInput.checked = true;
  itemLocationInput.value = "";
  itemNotesInput.value = "";
  itemAttachmentInput.value = "";
  pendingAttachment = null;
  itemSaveBtn.textContent = "Save item";
}

function fillFormForEdit(it) {
  itemIdInput.value = it.id;
  itemTitleInput.value = it.title;
  itemDateInput.value = it.date;
  itemTimeInput.value = it.time;
  itemEndTimeInput.value = it.endTime || it.time;
  itemStatusInput.value = it.status || (it.completed ? "done" : "todo");
  itemTypeInput.value = it.type;
  itemPriorityInput.value = it.priority;
  itemCategoryInput.value = it.category;
  itemReminderInput.checked = !!it.reminder;
  itemLocationInput.value = it.location || "";
  itemNotesInput.value = it.notes || "";
  pendingAttachment = it.attachment || null;
  itemAttachmentInput.value = "";
  itemSaveBtn.textContent = "Update item";
}

itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = itemIdInput.value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  const idx = items.findIndex((it) => it.id === id);

  const newItem = {
    id,
    title: itemTitleInput.value.trim(),
    date: itemDateInput.value,
    time: itemTimeInput.value,
    endTime: itemEndTimeInput.value,
    status: itemStatusInput.value,
    type: itemTypeInput.value,
    priority: itemPriorityInput.value,
    category: itemCategoryInput.value,
    reminder: itemReminderInput.checked,
    location: itemLocationInput.value.trim(),
    notes: itemNotesInput.value.trim(),
    attachment: pendingAttachment || (idx >= 0 ? items[idx].attachment : null),
    completed:
      itemStatusInput.value === "done" ||
      (idx >= 0 ? items[idx].completed : false),
  };

  if (idx >= 0) items[idx] = newItem;
  else items.push(newItem);

  saveItems();
  scheduleReminders();
  clearForm();
  fullRender();
});

/***********************
 * REMINDERS (30 min)
 ***********************/
function scheduleReminders() {
  reminders.forEach((r) => clearTimeout(r));
  reminders = [];

  const now = new Date();
  items.forEach((it) => {
    if (!it.reminder || it.status === "done") return;
    const dt = new Date(`${it.date}T${it.time}`);
    const reminderTime = new Date(dt.getTime() - 30 * 60000);
    const diff = reminderTime.getTime() - now.getTime();
    if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
      const id = setTimeout(() => {
        alert(`Reminder: "${it.title}" at ${it.time} (in 30 minutes).`);
      }, diff);
      reminders.push(id);
    }
  });
}

/***********************
 * FINANCE
 ***********************/
function clearFinanceForm() {
  financeIdInput.value = "";
  financeTitleInput.value = "";
  financeAmountInput.value = "";
  financeDateInput.value = todayString();
  financeKindInput.value = "expense";
  financeCategoryInput.value = "other";
  financeNotesInput.value = "";
}

function renderFinance() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let total = 0;
  let plannedCount = 0;

  financeEntries.forEach((e) => {
    const d = new Date(e.date);
    if (
      e.kind === "expense" &&
      d.getFullYear() === year &&
      d.getMonth() === month
    ) {
      total += Number(e.amount) || 0;
    }
    if (e.kind === "planned") plannedCount += 1;
  });

  financeTotalEl.textContent = total.toFixed(2) + " €";
  financePlannedCountEl.textContent = String(plannedCount);

  financeListEl.innerHTML = "";
  const sorted = [...financeEntries].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((e) => {
    const li = document.createElement("li");
    li.classList.add("item");

    const main = document.createElement("div");
    main.classList.add("item-main");

    const title = document.createElement("div");
    title.classList.add("item-title");
    title.textContent = `${e.title} (${e.amount} €)`;
    main.appendChild(title);

    const meta = document.createElement("div");
    meta.classList.add("item-meta");
    meta.textContent = `${e.date} • ${
      e.kind === "expense" ? "Paid" : "Planned"
    } • ${e.category}`;
    main.appendChild(meta);

    if (e.notes) {
      const notes = document.createElement("div");
      notes.classList.add("item-meta");
      notes.textContent = e.notes;
      main.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.classList.add("item-actions");

    const del = document.createElement("button");
    del.classList.add("small-btn", "delete");
    del.textContent = "Del";
    del.addEventListener("click", () => {
      financeEntries = financeEntries.filter((x) => x.id !== e.id);
      saveFinance();
      renderFinance();
    });
    actions.appendChild(del);

    li.appendChild(main);
    li.appendChild(actions);
    financeListEl.appendChild(li);
  });
}

financeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = financeIdInput.value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  const idx = financeEntries.findIndex((x) => x.id === id);

  const entry = {
    id,
    title: financeTitleInput.value.trim(),
    amount: Number(financeAmountInput.value) || 0,
    date: financeDateInput.value,
    kind: financeKindInput.value,
    category: financeCategoryInput.value,
    notes: financeNotesInput.value.trim(),
  };

  if (idx >= 0) financeEntries[idx] = entry;
  else financeEntries.push(entry);

  saveFinance();
  clearFinanceForm();
  renderFinance();
});

/***********************
 * WEATHER — WeatherAPI
 ***********************/
loadWeatherSettings();
settingsCityInput.value = weatherSettings.city;
settingsWeatherKeyInput.value = weatherSettings.apiKey;

async function updateWeather() {
  if (!weatherSettings.city || !weatherSettings.apiKey) {
    weatherLocationEl.textContent = "Set city and API key in Settings.";
    weatherDaysEl.innerHTML = "";
    return;
  }

  weatherLocationEl.textContent = weatherSettings.city;
  weatherDaysEl.innerHTML = "Loading...";

  try {
    const url =
      "https://api.weatherapi.com/v1/forecast.json?key=" +
      encodeURIComponent(weatherSettings.apiKey) +
      "&q=" +
      encodeURIComponent(weatherSettings.city) +
      "&days=3&aqi=no&alerts=no";

    const res = await fetch(url);
    if (!res.ok) {
      weatherDaysEl.innerHTML = "Could not load weather.";
      return;
    }
    const data = await res.json();
    const forecastDays = data.forecast.forecastday;

    weatherDaysEl.innerHTML = "";
    forecastDays.slice(0, 3).forEach((day, idx) => {
      const avgTemp = Math.round(day.day.avgtemp_c);
      const condition = day.day.condition.text.toLowerCase();

      let icon = "☁️";
      if (condition.includes("rain")) icon = "🌧️";
      else if (condition.includes("snow")) icon = "❄️";
      else if (condition.includes("sun") || condition.includes("clear"))
        icon = "☀️";
      else if (condition.includes("cloud")) icon = "☁️";

      const div = document.createElement("div");
      div.classList.add("weather-day");

      const label = document.createElement("div");
      label.textContent = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : "Day +2";

      const iconEl = document.createElement("div");
      iconEl.classList.add("icon");
      iconEl.textContent = icon;

      const tempEl = document.createElement("div");
      tempEl.classList.add("temp");
      tempEl.textContent = `${avgTemp}°C`;

      div.appendChild(label);
      div.appendChild(iconEl);
      div.appendChild(tempEl);

      weatherDaysEl.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    weatherDaysEl.innerHTML = "Error loading weather.";
  }
}

settingsSaveWeatherBtn.addEventListener("click", () => {
  weatherSettings.city = settingsCityInput.value.trim();
  weatherSettings.apiKey = settingsWeatherKeyInput.value.trim();
  saveWeatherSettings();
  updateWeather();
});

/***********************
 * THEME & BACKGROUND
 ***********************/
const savedThemeName = loadTheme();
applyTheme(savedThemeName);

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.theme;
    applyTheme(name);
    saveTheme(name);
  });
});

settingsBgInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    saveBgImage(reader.result);
    applyBgImage();
  };
  reader.readAsDataURL(file);
});

settingsBgClear.addEventListener("click", () => {
  saveBgImage(null);
  applyBgImage();
});

/***********************
 * INITIAL LOAD & RENDER
 ***********************/
loadItems();
loadFinance();
applyBgImage();

// set default dates
itemDateInput.value = todayString();
itemTimeInput.value = "09:00";
itemEndTimeInput.value = "10:00";
financeDateInput.value = todayString();

function fullRender() {
  renderCalendar();
  renderDayItems();
  renderHome();
  renderAllItems();
  renderFinance();
  updateWeather();
  renderWeek();
  renderWeekBar();
}


scheduleReminders();
fullRender();
