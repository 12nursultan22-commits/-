// Запасные данные: показываются, пока не подключена админ-панель (Firebase),
// и загружаются в базу кнопкой «Загрузить начальные данные» в админке.
// category: "women" — женский, "men" — мужской, "unisex" — унисекс

export const DEFAULT_PRODUCTS = [
  { brand: "Chanel", name: "Coco Mademoiselle", volume: "EDP · 100 мл", price: 85000, category: "women", hit: true, inStock: true, sort: 10 },
  { brand: "Dior", name: "Sauvage", volume: "EDP · 100 мл", price: 72000, category: "men", hit: true, inStock: true, sort: 20 },
  { brand: "Tom Ford", name: "Lost Cherry", volume: "EDP · 50 мл", price: 160000, category: "unisex", hit: false, inStock: true, sort: 30 },
  { brand: "Maison Francis Kurkdjian", name: "Baccarat Rouge 540", volume: "EDP · 70 мл", price: 175000, category: "unisex", hit: false, inStock: true, sort: 40 },
  { brand: "Creed", name: "Aventus", volume: "EDP · 100 мл", price: 190000, category: "men", hit: false, inStock: true, sort: 50 },
  { brand: "Yves Saint Laurent", name: "Libre", volume: "EDP · 90 мл", price: 68000, category: "women", hit: false, inStock: true, sort: 60 },
];

// ЧЕРНОВИК: придуманные отзывы для пробной версии.
// Перед запуском замените их настоящими отзывами клиентов (в админке).
export const DEFAULT_REVIEWS = [
  { name: "Айгерим", perfume: "Coco Mademoiselle", text: "Давно искала оригинальный Chanel и боялась нарваться на подделку. Здесь показали коробку, коды, всё объяснили. Аромат держится весь день!", visible: true, sort: 10 },
  { name: "Данияр", perfume: "Dior Sauvage", text: "Брал в подарок брату. Помогли выбрать, красиво упаковали, ещё и в рассрочку через Kaspi Red. Брат в восторге.", visible: true, sort: 20 },
  { name: "Мадина", perfume: "Baccarat Rouge 540", text: "Пришла на Сауран базар просто понюхать, ушла с флаконом 😊 Девушка-консультант очень приятная, подобрала аромат под меня.", visible: true, sort: 30 },
  { name: "Ерлан", perfume: "Creed Aventus", text: "Цены ниже, чем в Актобе, а качество то же — оригинал. Заказал через WhatsApp, всё быстро и без лишних вопросов.", visible: true, sort: 40 },
  { name: "Асель", perfume: "YSL Libre", text: "Покупаю здесь уже третий раз. Всегда честно, всегда оригинал. Теперь советую всем подругам.", visible: true, sort: 50 },
  { name: "Нурлан", perfume: "Tom Ford Lost Cherry", text: "Жене на день рождения. Сначала сомневался из-за цены, но аромат того стоит — шлейф шикарный. Спасибо Royal Select!", visible: true, sort: 60 },
];
