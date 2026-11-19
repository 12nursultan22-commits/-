import { DEFAULT_PRODUCTS, DEFAULT_REVIEWS } from "./data.js";
import { firebaseConfig } from "./firebase-config.js";

// ЗАМЕНИТЕ на свой номер WhatsApp: только цифры, с кодом страны, без «+»
const WHATSAPP_NUMBER = "77758606286";

const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/ |,/g, " ") + " ₸";

// Разрешаем только картинки (сжатые в админке) или ссылки https
const safeImg = (src) => typeof src === "string" && /^(data:image\/(jpeg|png|webp);base64,|https:\/\/)/.test(src);

// Объёмы: «EDP · 100 мл» → на кнопке «100 мл»
const shortVolume = (v) => (String(v).match(/\d+[.,]?\d*\s*(мл|ml)/i) || [v])[0];
const hasTwo = (p) => p.volume2 && p.price2;
const orderName = (p, volume) => `${p.brand} ${p.name}${volume ? `, ${volume}` : ""}`;
function variantsHtml(p) {
  if (!hasTwo(p)) return `<p class="product__meta">${esc(p.volume)}</p>`;
  const opt = (v, price, on) =>
    `<button type="button" class="vol${on ? " active" : ""}" data-volume="${esc(v)}" data-price="${Number(price) || 0}">${esc(shortVolume(v))}</button>`;
  const ml = (v) => parseFloat(String(shortVolume(v)).replace(",", ".")) || 0;
  const a = opt(p.volume, p.price, true), b = opt(p.volume2, p.price2, false);
  // Меньший объём слева, выбран по умолчанию основной
  return `<div class="product__vols">${ml(p.volume2) < ml(p.volume) ? b + a : a + b}</div>`;
}

// ---------- Ароматы ----------
let products = DEFAULT_PRODUCTS;
let filter = "all";
let search = "";
const productsEl = document.getElementById("products");
const emptyEl = document.getElementById("emptyProducts");

function renderProducts() {
  const q = search.trim().toLowerCase();
  const shown = products.filter((p) =>
    (filter === "all" || (filter === "hit" ? p.hit : p.category === filter)) &&
    (!q || `${p.brand} ${p.name}`.toLowerCase().includes(q)));
  productsEl.innerHTML = shown.map((p) => `
    <article class="product${p.hit ? " product--hit" : ""}${p.inStock === false ? " product--out" : ""}">
      ${p.hit ? '<span class="product__hit">Хит продаж</span>' : ""}
      <div class="product__img">${safeImg(p.image)
        ? `<img src="${esc(p.image)}" alt="${esc(`${p.brand} ${p.name}`)}" loading="lazy">`
        : '<img class="product__ph" src="images/logo.png" alt="">'}</div>
      <p class="product__brand">${esc(p.brand)}</p>
      <h3 class="product__name">${esc(p.name)}</h3>
      ${variantsHtml(p)}
      <p class="product__price">${p.inStock === false ? "Нет в наличии" : money(p.price)}</p>
      <a href="#order" class="product__btn" data-product="${esc(orderName(p, p.volume))}">${p.inStock === false ? "Уточнить" : "Заказать"}</a>
    </article>`).join("");
  emptyEl.hidden = shown.length > 0;
}

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    document.querySelector(".chip.active")?.classList.remove("active");
    chip.classList.add("active");
    filter = chip.dataset.filter;
    renderProducts();
  }));
document.getElementById("search").addEventListener("input", (e) => {
  search = e.target.value;
  renderProducts();
});

// ---------- Отзывы ----------
let reviews = DEFAULT_REVIEWS;
function renderReviews() {
  const shown = reviews.filter((r) => r.visible !== false);
  // Нет опубликованных отзывов — прячем раздел и пункт меню
  document.getElementById("reviews").hidden = shown.length === 0;
  document.querySelector('.nav a[href="#reviews"]').hidden = shown.length === 0;
  document.getElementById("reviewsList").innerHTML = shown
    .map((r) => `
      <blockquote class="review">
        <p class="review__stars">★★★★★</p>
        <p>«${esc(r.text)}»</p>
        <cite>${esc(r.name)}${r.perfume ? `<span>${esc(r.perfume)}</span>` : ""}</cite>
      </blockquote>`).join("");
}

renderProducts();
renderReviews();

// Если подключена админ-панель — берём актуальные данные из базы
if (firebaseConfig.apiKey) {
  import("./firebase.js")
    .then(async ({ list }) => {
      const [p, r] = await Promise.all([list("products"), list("reviews")]);
      if (p.length) { products = p; renderProducts(); }
      if (r.length) { reviews = r; renderReviews(); }
    })
    .catch((err) => console.warn("Не удалось загрузить данные из Firebase:", err));
}

// ---------- Меню на телефоне ----------
const burger = document.querySelector(".burger");
const nav = document.querySelector(".nav");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }));

// Кнопка «Заказать» у товара подставляет аромат в форму
const productField = document.getElementById("productField");
productsEl.addEventListener("click", (e) => {
  const vol = e.target.closest(".vol");
  if (vol) {
    const card = vol.closest(".product");
    card.querySelector(".vol.active")?.classList.remove("active");
    vol.classList.add("active");
    const order = card.querySelector("[data-product]");
    order.dataset.product = order.dataset.product.replace(/, [^,]*$/, "") + ", " + vol.dataset.volume;
    if (!card.classList.contains("product--out"))
      card.querySelector(".product__price").textContent = money(vol.dataset.price);
    return;
  }
  const btn = e.target.closest("[data-product]");
  if (btn) productField.value = btn.dataset.product;
});

// Отправка заявки в WhatsApp
document.getElementById("orderForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const text = [
    "Здравствуйте! Заявка с сайта Royal Select:",
    `Имя: ${f.get("name")}`,
    `Телефон: ${f.get("phone")}`,
    f.get("product") && `Аромат: ${f.get("product")}`,
    f.get("comment") && `Комментарий: ${f.get("comment")}`,
  ].filter(Boolean).join("\n");
  window.open(waLink(text), "_blank");
});

// Плавающая кнопка WhatsApp
document.getElementById("waButton").href = waLink("Здравствуйте! Хочу проконсультироваться по ароматам.");

document.getElementById("year").textContent = new Date().getFullYear();
