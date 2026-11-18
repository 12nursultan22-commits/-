// Настройки Firebase. Как их получить — см. файл АДМИНКА.md, шаг 2.
// Пока apiKey пустой, сайт показывает ароматы и отзывы из data.js,
// а админ-панель не работает.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Только для локальной проверки разработчиком. На сайте всегда false.
export const USE_EMULATOR = false;
