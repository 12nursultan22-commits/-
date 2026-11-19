import { firebaseConfig } from "./firebase-config.js";
import { DEFAULT_PRODUCTS, DEFAULT_REVIEWS } from "./data.js";

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => { el.hidden = !on; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/ |,/g, " ") + " ₸";
const CATEGORY = { women: "Женский", men: "Мужской", unisex: "Унисекс" };

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  show(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => show(t, false), 2500);
}

function errorText(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found") || code.includes("invalid-email"))
    return "Неверный логин или пароль.";
  if (code.includes("too-many-requests")) return "Слишком много попыток. Подождите пару минут.";
  if (code.includes("permission-denied")) return "Нет прав на изменение. Проверьте правила базы (АДМИНКА.md, шаг 5).";
  if (code.includes("network")) return "Нет связи с интернетом.";
  return "Ошибка: " + (err?.message || err);
}

if (!firebaseConfig.apiKey) {
  show($("noConfig"));
} else {
  start();
}

async function start() {
  const fb = await import("./firebase.js");
  let products = [];
  let reviews = [];
  let editing = null; // id редактируемой записи или null для новой
  let photo = "";     // фото аромата (сжатая картинка) или ""

  // ---------- Вход / выход ----------
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    show($("loginError"), false);
    try {
      await fb.login(f.get("email").trim(), f.get("password"));
    } catch (err) {
      $("loginError").textContent = errorText(err);
      show($("loginError"));
    } finally {
      btn.disabled = false;
    }
  });
  $("logoutBtn").addEventListener("click", () => fb.logout());

  fb.onUser(async (user) => {
    show($("loginView"), !user);
    show($("panel"), !!user);
    if (user) await reload();
  });

  // ---------- Вкладки ----------
  document.querySelectorAll(".a-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      document.querySelector(".a-tab.active").classList.remove("active");
      tab.classList.add("active");
      show($("tab-products"), tab.dataset.tab === "products");
      show($("tab-reviews"), tab.dataset.tab === "reviews");
    }));

  // ---------- Загрузка ----------
  async function reload() {
    try {
      [products, reviews] = await Promise.all([fb.list("products"), fb.list("reviews")]);
    } catch (err) {
      toast(errorText(err));
    }
    renderProducts();
    renderReviews();
  }

  // ---------- Ароматы ----------
  function renderProducts() {
    const q = $("aSearch").value.trim().toLowerCase();
    $("countProducts").textContent = products.length ? `(${products.length})` : "";
    show($("seedProducts"), products.length === 0);
    $("productList").innerHTML = products
      .filter((p) => !q || `${p.brand} ${p.name}`.toLowerCase().includes(q))
      .map((p) => `
        <li class="a-item">
          <div>
            ${p.image ? `<img class="a-item__thumb" src="${esc(p.image)}" alt="">` : ""}
            <div class="a-item__title">${esc(p.brand)} — ${esc(p.name)}</div>
            <div class="a-item__sub">${esc(p.volume)} · ${CATEGORY[p.category] || ""}</div>
          </div>
          <div class="a-item__price">${money(p.price)}${p.price2 ? `<br><small>${esc(p.volume2)}: ${money(p.price2)}</small>` : ""}</div>
          <div class="a-item__tags">
            ${p.hit ? '<span class="a-tag">Хит продаж</span>' : ""}
            ${p.inStock === false ? '<span class="a-tag a-tag--off">Нет в наличии</span>' : ""}
          </div>
          <div class="a-item__actions">
            <button class="a-btn" data-edit="${p.id}">Изменить</button>
            <button class="a-btn a-btn--danger" data-del="${p.id}">Удалить</button>
          </div>
        </li>`).join("");
  }
  $("aSearch").addEventListener("input", renderProducts);

  const pDialog = $("productDialog");
  const pForm = $("productForm");
  function openProduct(p) {
    editing = p?.id || null;
    $("productDialogTitle").textContent = p ? "Изменить аромат" : "Новый аромат";
    pForm.reset();
    const d = p || { sort: (Math.max(0, ...products.map((x) => x.sort || 0)) + 10), inStock: true, category: "women" };
    for (const el of pForm.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") el.checked = !!d[el.name] || (el.name === "inStock" && d.inStock !== false);
      else el.value = d[el.name] ?? "";
    }
    setPhoto(p?.image || "");
    pDialog.returnValue = "";
    pDialog.showModal();
  }
  $("addProduct").addEventListener("click", () => openProduct(null));

  // ---------- Фото ----------
  function setPhoto(src) {
    photo = src;
    $("photoPreview").src = src || "";
    show($("photoPreview"), !!src);
    show($("photoEmpty"), !src);
    show($("photoRemove"), !!src);
  }
  $("photoRemove").addEventListener("click", () => setPhoto(""));
  $("photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch {
      toast("Не удалось открыть фото. Попробуйте другое (JPG или PNG).");
    }
  });
  $("productList").addEventListener("click", async (e) => {
    const editId = e.target.dataset.edit;
    const delId = e.target.dataset.del;
    if (editId) openProduct(products.find((p) => p.id === editId));
    if (delId) {
      const p = products.find((x) => x.id === delId);
      if (!confirm(`Удалить «${p.brand} ${p.name}»?`)) return;
      try { await fb.remove("products", delId); toast("Удалено"); await reload(); }
      catch (err) { toast(errorText(err)); }
    }
  });
  // Второй объём: если заполнено одно поле, нужно и второе
  pForm.querySelector('[value="save"]').addEventListener("click", () => {
    const v2 = pForm.elements.volume2, p2 = pForm.elements.price2;
    const half = !!v2.value.trim() !== !!p2.value;
    p2.setCustomValidity(half && !p2.value ? "Укажите цену второго объёма" : "");
    v2.setCustomValidity(half && !v2.value.trim() ? "Укажите второй объём" : "");
  });
  pDialog.addEventListener("close", async () => {
    if (pDialog.returnValue !== "save") return;
    const f = new FormData(pForm);
    const data = {
      brand: f.get("brand").trim(),
      name: f.get("name").trim(),
      volume: f.get("volume").trim(),
      price: Number(f.get("price")) || 0,
      volume2: f.get("volume2").trim(),
      price2: Number(f.get("price2")) || 0,
      category: f.get("category"),
      sort: Number(f.get("sort")) || 0,
      hit: f.has("hit"),
      inStock: f.has("inStock"),
      image: photo,
    };
    try {
      if (editing) await fb.update("products", editing, data);
      else await fb.create("products", data);
      toast("Сохранено");
      await reload();
    } catch (err) { toast(errorText(err)); }
  });

  // ---------- Отзывы ----------
  function renderReviews() {
    $("countReviews").textContent = reviews.length ? `(${reviews.length})` : "";
    show($("seedReviews"), reviews.length === 0);
    $("reviewList").innerHTML = reviews.map((r) => `
      <li class="a-item">
        <div>
          <div class="a-item__title">${esc(r.name)}</div>
          <div class="a-item__sub">${esc(r.perfume)}</div>
        </div>
        <div class="a-item__tags">${r.visible === false ? '<span class="a-tag a-tag--off">Скрыт</span>' : ""}</div>
        <p class="a-item__text">«${esc(r.text)}»</p>
        <div class="a-item__actions">
          <button class="a-btn" data-edit="${r.id}">Изменить</button>
          <button class="a-btn a-btn--danger" data-del="${r.id}">Удалить</button>
        </div>
      </li>`).join("");
  }

  const rDialog = $("reviewDialog");
  const rForm = $("reviewForm");
  function openReview(r) {
    editing = r?.id || null;
    $("reviewDialogTitle").textContent = r ? "Изменить отзыв" : "Новый отзыв";
    rForm.reset();
    const d = r || { sort: (Math.max(0, ...reviews.map((x) => x.sort || 0)) + 10), visible: true };
    for (const el of rForm.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") el.checked = d.visible !== false;
      else el.value = d[el.name] ?? "";
    }
    rDialog.returnValue = "";
    rDialog.showModal();
  }
  $("addReview").addEventListener("click", () => openReview(null));
  $("reviewList").addEventListener("click", async (e) => {
    const editId = e.target.dataset.edit;
    const delId = e.target.dataset.del;
    if (editId) openReview(reviews.find((r) => r.id === editId));
    if (delId) {
      const r = reviews.find((x) => x.id === delId);
      if (!confirm(`Удалить отзыв от «${r.name}»?`)) return;
      try { await fb.remove("reviews", delId); toast("Удалено"); await reload(); }
      catch (err) { toast(errorText(err)); }
    }
  });
  rDialog.addEventListener("close", async () => {
    if (rDialog.returnValue !== "save") return;
    const f = new FormData(rForm);
    const data = {
      name: f.get("name").trim(),
      perfume: f.get("perfume").trim(),
      text: f.get("text").trim(),
      sort: Number(f.get("sort")) || 0,
      visible: f.has("visible"),
    };
    try {
      if (editing) await fb.update("reviews", editing, data);
      else await fb.create("reviews", data);
      toast("Сохранено");
      await reload();
    } catch (err) { toast(errorText(err)); }
  });

  // ---------- Начальные данные ----------
  document.querySelectorAll("[data-seed]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const name = btn.dataset.seed;
      btn.disabled = true;
      try {
        await fb.seed(name, name === "products" ? DEFAULT_PRODUCTS : DEFAULT_REVIEWS);
        toast("Загружено");
        await reload();
      } catch (err) { toast(errorText(err)); }
      finally { btn.disabled = false; }
    }));
}

// Уменьшает фото до 600 px и сжимает в JPEG (~30–60 КБ), чтобы хранить его в базе.
async function compressImage(file, max = 600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // прозрачный фон PNG → белый
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let q = 0.82;
    let data = canvas.toDataURL("image/jpeg", q);
    while (data.length > 250000 && q > 0.4) { // держим запись в базе небольшой
      q -= 0.1;
      data = canvas.toDataURL("image/jpeg", q);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
