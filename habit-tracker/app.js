(() => {
  const KEY = 'habit-tracker-v1';
  const EMOJIS = ['💧','📚','🏃','🧘','🍎','💤','✍️','🎸','🧹','💊','🚭','🌿','💪','🧠','☀️','💰'];
  const COLORS = ['#ff7a00','#ffb020','#ff4d4f','#f5f5f5','#22c55e','#3b82f6','#a855f7','#ec4899'];
  const LANG_KEY = 'habit-tracker-lang';

  const I18N = {
    ru: {
      switchTo: 'ҚАЗ',
      title: 'Трекер привычек', new: '＋ Новая', today: 'сегодня', best: 'лучшая серия', week: 'за неделю',
      empty: 'Пока нет привычек.<br>Добавьте первую — например, «Пить воду» или «Читать 20 минут».',
      addHabit: 'Добавить привычку', export: 'Экспорт', import: 'Импорт',
      newHabit: 'Новая привычка', editHabit: 'Изменить привычку',
      name: 'Название', namePh: 'Например, утренняя зарядка', icon: 'Иконка', color: 'Цвет',
      goal: 'Цель: дней в неделю', del: 'Удалить', cancel: 'Отмена', save: 'Сохранить',
      dow: ['вс','пн','вт','ср','чт','пт','сб'],
      days: (n) => plural(n, 'день', 'дня', 'дней'),
      fmtDate: (d) => d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }), weekShort: 'неделя',
      markToday: 'Отметить сегодня', edit: 'Изменить', done: 'выполнено', notDone: 'не выполнено',
      confirmDel: (n) => `Удалить привычку «${n}»? История отметок тоже будет удалена.`,
      confirmImport: 'Заменить текущие данные импортированными?', importFail: 'Не удалось прочитать файл.',
    },
    kk: {
      switchTo: 'РУС',
      title: 'Әдеттер трекері', new: '＋ Жаңа', today: 'бүгін', best: 'үздік серия', week: 'аптада',
      empty: 'Әзірге әдеттер жоқ.<br>Алғашқысын қосыңыз — мысалы, «Су ішу» немесе «20 минут кітап оқу».',
      addHabit: 'Әдет қосу', export: 'Экспорт', import: 'Импорт',
      newHabit: 'Жаңа әдет', editHabit: 'Әдетті өзгерту',
      name: 'Атауы', namePh: 'Мысалы, таңғы жаттығу', icon: 'Белгіше', color: 'Түсі',
      goal: 'Мақсат: аптасына неше күн', del: 'Жою', cancel: 'Болдырмау', save: 'Сақтау',
      dow: ['жс','дс','сс','ср','бс','жм','сб'],
      days: () => 'күн',
      fmtDate: (d) => `${d.getDate()} ${['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'][d.getMonth()]}, ${['жексенбі','дүйсенбі','сейсенбі','сәрсенбі','бейсенбі','жұма','сенбі'][d.getDay()]}`, weekShort: 'апта',
      markToday: 'Бүгінді белгілеу', edit: 'Өзгерту', done: 'орындалды', notDone: 'орындалмады',
      confirmDel: (n) => `«${n}» әдетін жою керек пе? Белгілер тарихы да жойылады.`,
      confirmImport: 'Ағымдағы деректерді импортталған деректермен ауыстыру керек пе?', importFail: 'Файлды оқу мүмкін болмады.',
    },
  };
  let lang = 'ru';
  try { const l = localStorage.getItem(LANG_KEY); if (I18N[l]) lang = l; } catch (e) {}
  const t = (k) => I18N[lang][k];

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $('langBtn').textContent = t('switchTo');
  }

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => key(new Date());

  let state = load();
  let editingId = null;
  let form = { emoji: EMOJIS[0], color: COLORS[0] };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.habits)) return s;
    } catch (e) {}
    return { habits: [] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function streak(h) {
    // Текущая серия: считаем подряд с сегодня (или со вчера, если сегодня ещё не отмечено)
    let d = new Date();
    if (!h.done[key(d)]) d = addDays(d, -1);
    let n = 0;
    while (h.done[key(d)]) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestStreak(h) {
    const days = Object.keys(h.done).filter((k) => h.done[k]).sort();
    let best = 0, cur = 0, prev = null;
    for (const k of days) {
      const d = new Date(k + 'T00:00:00');
      cur = prev && key(addDays(prev, 1)) === k ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }
  function weekCount(h) {
    let n = 0;
    for (let i = 0; i < 7; i++) if (h.done[key(addDays(new Date(), -i))]) n++;
    return n;
  }
  const plural = (n, a, b, c) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
    return c;
  };

  function toggle(id, k) {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return;
    if (h.done[k]) delete h.done[k]; else h.done[k] = true;
    save(); render();
    if (k === todayKey() && h.done[k] && navigator.vibrate) navigator.vibrate(15);
  }

  function render() {
    const now = new Date();
    $('today').textContent = t('fmtDate')(now);

    const list = $('list');
    list.innerHTML = '';
    $('empty').hidden = state.habits.length > 0;
    $('summary').style.display = state.habits.length ? '' : 'none';
    document.querySelector('.progress').style.display = state.habits.length ? '' : 'none';

    const tk = todayKey();
    let doneToday = 0, best = 0, weekDone = 0, weekGoal = 0;

    for (const h of state.habits) {
      const on = !!h.done[tk];
      if (on) doneToday++;
      const s = streak(h);
      best = Math.max(best, bestStreak(h));
      const wc = weekCount(h);
      weekDone += Math.min(wc, h.goal);
      weekGoal += h.goal;

      const el = document.createElement('article');
      el.className = 'habit';
      el.style.setProperty('--c', h.color);

      const head = document.createElement('div');
      head.className = 'habit-head';
      head.innerHTML = `
        <div class="habit-icon"></div>
        <div class="habit-info" title="${t('edit')}">
          <div class="habit-name"></div>
          <div class="habit-meta"></div>
        </div>
        <button class="check ${on ? 'on' : ''}" aria-pressed="${on}" aria-label="${t('markToday')}">${on ? '✓' : ''}</button>`;
      head.querySelector('.habit-icon').textContent = h.emoji;
      head.querySelector('.habit-name').textContent = h.name;
      head.querySelector('.habit-meta').textContent =
        `🔥 ${s} ${t('days')(s)} · ${t('weekShort')} ${wc}/${h.goal}`;
      head.querySelector('.habit-info').onclick = () => openDialog(h.id);
      head.querySelector('.check').onclick = () => toggle(h.id, tk);
      el.appendChild(head);

      const week = document.createElement('div');
      week.className = 'week';
      for (let i = 6; i >= 0; i--) {
        const d = addDays(now, -i);
        const k = key(d);
        const day = document.createElement('div');
        day.className = 'day';
        const lbl = document.createElement('span');
        lbl.className = 'day-lbl';
        lbl.textContent = t('dow')[d.getDay()];
        const cell = document.createElement('button');
        cell.className = 'day-cell' + (h.done[k] ? ' on' : '') + (i === 0 ? ' is-today' : '');
        cell.textContent = d.getDate();
        cell.setAttribute('aria-label', `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}: ${h.done[k] ? t('done') : t('notDone')}`);
        cell.onclick = () => toggle(h.id, k);
        day.append(lbl, cell);
        week.appendChild(day);
      }
      el.appendChild(week);
      list.appendChild(el);
    }

    const total = state.habits.length;
    $('statDone').textContent = `${doneToday}/${total}`;
    $('statBest').textContent = best;
    $('statWeek').textContent = weekGoal ? Math.round((weekDone / weekGoal) * 100) + '%' : '0%';
    $('progressBar').style.width = total ? (doneToday / total) * 100 + '%' : '0';
  }

  // ---------- Диалог ----------
  function renderChoices() {
    const ec = $('emojiChoices'); ec.innerHTML = '';
    for (const e of EMOJIS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice' + (form.emoji === e ? ' sel' : '');
      b.textContent = e;
      b.onclick = () => { form.emoji = e; renderChoices(); };
      ec.appendChild(b);
    }
    const cc = $('colorChoices'); cc.innerHTML = '';
    for (const c of COLORS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice color' + (form.color === c ? ' sel' : '');
      b.style.background = c; b.setAttribute('aria-label', c);
      b.onclick = () => { form.color = c; renderChoices(); };
      cc.appendChild(b);
    }
  }

  function openDialog(id = null) {
    editingId = id;
    const h = id && state.habits.find((x) => x.id === id);
    $('dlgTitle').textContent = h ? t('editHabit') : t('newHabit');
    $('fName').value = h ? h.name : '';
    $('fGoal').value = h ? h.goal : 7;
    $('goalOut').textContent = $('fGoal').value;
    form = { emoji: h ? h.emoji : EMOJIS[state.habits.length % EMOJIS.length], color: h ? h.color : COLORS[state.habits.length % COLORS.length] };
    $('delBtn').hidden = !h;
    renderChoices();
    $('dlg').showModal();
    setTimeout(() => $('fName').focus(), 50);
  }

  $('form').onsubmit = (e) => {
    const name = $('fName').value.trim();
    if (!name) { e.preventDefault(); return; }
    const goal = +$('fGoal').value;
    if (editingId) {
      Object.assign(state.habits.find((x) => x.id === editingId), { name, goal, emoji: form.emoji, color: form.color });
    } else {
      state.habits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, goal, emoji: form.emoji, color: form.color, done: {}, created: todayKey() });
    }
    save(); render();
  };
  $('fGoal').oninput = () => { $('goalOut').textContent = $('fGoal').value; };
  $('cancelBtn').onclick = () => $('dlg').close();
  $('delBtn').onclick = () => {
    const h = state.habits.find((x) => x.id === editingId);
    if (h && confirm(t('confirmDel')(h.name))) {
      state.habits = state.habits.filter((x) => x.id !== editingId);
      save(); render(); $('dlg').close();
    }
  };
  $('addBtn').onclick = () => openDialog();
  $('emptyAdd').onclick = () => openDialog();

  // ---------- Экспорт / импорт ----------
  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `habits-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.habits)) throw new Error();
      if (confirm(t('confirmImport'))) { state = data; save(); render(); }
    } catch { alert(t('importFail')); }
    e.target.value = '';
  };

  // Перерисовка при смене дня, если вкладка открыта долго
  let lastDay = todayKey();
  setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); render(); } }, 60000);

  $('langBtn').onclick = () => {
    lang = lang === 'ru' ? 'kk' : 'ru';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang(); render();
  };

  applyLang();
  render();
})();
