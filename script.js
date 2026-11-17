// ЗАМЕНИТЕ на свой номер WhatsApp: только цифры, с кодом страны, без «+»
const WHATSAPP_NUMBER = "77000000000";

const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

// Меню на телефоне
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
  })
);

// Кнопка «Заказать» у товара подставляет аромат в форму
const productField = document.getElementById("productField");
document.querySelectorAll("[data-product]").forEach((btn) =>
  btn.addEventListener("click", () => {
    productField.value = btn.dataset.product;
  })
);

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
