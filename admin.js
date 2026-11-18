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
            <div class="a-item__title">${esc(p.brand)} — ${esc(p.name)}</div>
            <div class="a-item__sub">${esc(p.volume)} · ${CATEGORY[p.category] || ""}</div>
          </div>
          <div class="a-item__price">${money(p.price)}</div>
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
    pDialog.returnValue = "";
    pDialog.showModal();
  }
  $("addProduct").addEventListener("click", () => openProduct(null));
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
  pDialog.addEventListener("close", async () => {
    if (pDialog.returnValue !== "save") return;
    const f = new FormData(pForm);
    const data = {
      brand: f.get("brand").trim(),
      name: f.get("name").trim(),
      volume: f.get("volume").trim(),
      price: Number(f.get("price")) || 0,
      category: f.get("category"),
      sort: Number(f.get("sort")) || 0,
      hit: f.has("hit"),
      inStock: f.has("inStock"),
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
