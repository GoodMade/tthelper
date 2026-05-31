(function () {
  const STORAGE_KEY_QUERY = 'tt_enhancer_layers_search_query';
  const STORAGE_KEY_SAVED = 'tt_enhancer_layers_saved_queries';
  const STORAGE_KEY_OPEN = 'tt_enhancer_layers_search_open';
  const SAVED_LIMIT = 10;

  const SELECTOR_LAYERS_PANEL = '.tt-layers';
  const SELECTOR_LAYERS_ROOT  = '.tt-layers__list';
  const SELECTOR_SCROLLER     = '.tt-scrollable__container';
  const SELECTOR_RIGHT_BLOCK  = '.tt-styles-block__right, .tt-styles-block__right--compact';

  const ITEM_SELECTOR  = '.tt-layers__item';
  const TEXT_SELECTOR  = '.tt-layers__item__text';

  const DEBOUNCE_MS = 140;
  const USER_SCROLL_GRACE = 900;

  let hits = [];
  let index = -1;
  let cache = [];
  let raf = 0;

  let searchInputEl = null;
  let currentQuery = '';
  let lastJumpQuery = '';
  let userScrollUntil = 0;
  let lastClickedTag = '';


  // Observer control
  let listRef = null;
  let mo = null;
  let moActive = false;
  const observeOn = () => { if (mo && listRef && !moActive) { mo.observe(listRef, { childList: true, subtree: true }); moActive = true; } };
  const observeOff = () => { if (mo && moActive) { mo.disconnect(); moActive = false; } };
  const withObserverPaused = (fn) => { observeOff(); try { fn(); } finally { observeOn(); } };

  const loadQuery = () => { try { return localStorage.getItem(STORAGE_KEY_QUERY) || ''; } catch { return ''; } };
  const saveQuery = (q) => { try { localStorage.setItem(STORAGE_KEY_QUERY, q || ''); } catch {} };
  const loadSearchOpen = () => { try { return localStorage.getItem(STORAGE_KEY_OPEN) === '1'; } catch { return false; } };
  const saveSearchOpen = (isOpen) => { try { localStorage.setItem(STORAGE_KEY_OPEN, isOpen ? '1' : '0'); } catch {} };
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]'); } catch { return []; } };
  const saveSaved = (arr) => { try { localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(arr || [])); } catch {} };
  const debounce = (fn, ms) => { let t=0; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function getRoots() {
	const panel = document.querySelector(SELECTOR_LAYERS_PANEL);
	const list  = panel?.querySelector(SELECTOR_LAYERS_ROOT) || document.querySelector(SELECTOR_LAYERS_ROOT);
	const scroller = list?.closest(SELECTOR_SCROLLER) || document.querySelector(SELECTOR_SCROLLER);
	return { panel, list, scroller };
  }

  function buildCache(list) {
	cache = Array.from(list.querySelectorAll(ITEM_SELECTOR)).map(el => {
	  const textEl = el.querySelector(TEXT_SELECTOR);
	  const textLower = (textEl ? textEl.textContent : '').toLowerCase();
	  // Сохраним исходный HTML один раз
	  if (textEl && textEl.dataset._origHtmlInit !== '1') {
		textEl.dataset._origHtml = textEl.innerHTML;
		textEl.dataset._origHtmlInit = '1';
	  }
	  return { el, textEl, textLower };
	});
  }

  function clearCurrentDecorations() {
	document.querySelectorAll('.tt-layers__item.tt-layers__item--hit-current')
	  .forEach(el => el.classList.remove('tt-layers__item--hit-current'));
	document.querySelectorAll('.tt-layers__item.tt-layers__item--hit')
	  .forEach(el => el.classList.remove('tt-layers__item--hit'));
	document.querySelectorAll(`${TEXT_SELECTOR}[data-_origHtml]`)
	  .forEach(t => { t.innerHTML = t.dataset._origHtml; });
	// selection/фокус не трогаем
  }

 function paintAllMatches(query) {
   const q = (query || '').trim().toLowerCase();
   withObserverPaused(() => {
	 if (!q) {
	   // снять любые следы подсветки
	   document.querySelectorAll('.tt-layers__item.tt-layers__item--hit, .tt-layers__item.tt-layers__item--hit-current')
		 .forEach(el => { el.classList.remove('tt-layers__item--hit', 'tt-layers__item--hit-current'); });
	   // восстановить оригинальный HTML в названиях
	   cache.forEach(({ textEl }) => {
		 if (textEl && textEl.dataset._origHtml != null && textEl.innerHTML !== textEl.dataset._origHtml) {
		   textEl.innerHTML = textEl.dataset._origHtml;
		 }
	   });
	   return;
	 }
	 const re = new RegExp(escRe(q), 'gi');
	 for (const { el, textEl, textLower } of cache) {
	   const match = textLower.includes(q);
	   if (match) el.classList.add('tt-layers__item--hit'); else el.classList.remove('tt-layers__item--hit');
	   if (!textEl) continue;
	   const orig = textEl.dataset._origHtml != null ? textEl.dataset._origHtml : textEl.innerHTML;
	   if (match) {
		 if (textEl.innerHTML !== orig) textEl.innerHTML = orig; // сбросить старые <mark>
		 textEl.innerHTML = orig.replace(re, (m) => `<mark>${m}</mark>`);
	   } else {
		 if (textEl.innerHTML !== orig) textEl.innerHTML = orig;
	   }
	 }
   });
 }


  function gotoHit(i, q, opts = {}) {
	const { forceScroll = false } = opts;
	if (!hits.length) return;
	if (i < 0) i = hits.length - 1;
	if (i >= hits.length) i = 0;
	index = i;

	const { scroller } = getRoots();
	const item = hits[index].el;

	const wasInput = (document.activeElement === searchInputEl);
	const sel = window.getSelection && window.getSelection();
	const hasUserSelection = sel && sel.toString().length > 0;
	const caret = wasInput && !hasUserSelection && searchInputEl && typeof searchInputEl.selectionStart === 'number'
	  ? searchInputEl.selectionStart : null;

	if (!raf) {
	  raf = requestAnimationFrame(() => {
		raf = 0;
		withObserverPaused(() => {
		  const prev = document.querySelector('.tt-layers__item.tt-layers__item--hit-current');
		  if (prev) prev.classList.remove('tt-layers__item--hit-current');
		  item.classList.add('tt-layers__item--hit-current');
		});

		const allowAuto = forceScroll || (Date.now() > userScrollUntil);
		if (allowAuto) {
		  if (!scroller) item.scrollIntoView({ block: 'center', behavior: 'auto' });
		  else {
			const s = scroller.getBoundingClientRect();
			const r = item.getBoundingClientRect();
			scroller.scrollTo({ top: r.top - s.top + scroller.scrollTop - 16, behavior: 'auto' });
		  }
		}

		if (wasInput && !hasUserSelection && searchInputEl) {
		  searchInputEl.focus({ preventScroll: true });
		  if (caret != null) { try { searchInputEl.setSelectionRange(caret, caret); } catch {} }
		}
	  });
	}
  }

  function collectHits(q) {
	if (!q) return [];
	const ql = q.toLowerCase();
	return cache.filter(n => n.textLower.includes(ql));
  }

  const runSearchNow = (q) => {
	const queryChanged = q !== currentQuery;
	const currentEl = hits[index]?.el;

	const newHits = collectHits(q);

	// Массовая подсветка всех совпадений (observer временно выключен внутри)
	paintAllMatches(q);

	if (!newHits.length) {
	  withObserverPaused(() => {
		const prev = document.querySelector('.tt-layers__item.tt-layers__item--hit-current');
		if (prev) prev.classList.remove('tt-layers__item--hit-current');
	  });
	  hits = [];
	  index = -1;
	  lastJumpQuery = '';
	  currentQuery = q;
	  return;
	}

	hits = newHits;

	if (queryChanged) {
	  index = -1;
	  currentQuery = q;
	  if (Date.now() > userScrollUntil) {
		lastJumpQuery = q;
		gotoHit(0, q, { forceScroll: false });
	  }
	  return;
	}

	if (currentEl) {
	  const newIdx = hits.findIndex(h => h.el === currentEl);
	  if (newIdx !== -1) index = newIdx;
	  else index = -1;
	}
  };

  function addSaved(saved, q) {
	const t = (q || '').trim();
	if (!t) return;
	const i = saved.indexOf(t);
	if (i !== -1) saved.splice(i, 1);
	saved.unshift(t);
	if (saved.length > SAVED_LIMIT) saved.length = SAVED_LIMIT;
	saveSaved(saved);
  }

  function buildSearchBar(saved) {
	const bar = document.createElement('div');
	bar.className = 'layers_search_area';

	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'layers_search_input';
	input.placeholder = 'Найти слой...';
	input.value = loadQuery();

	const clearBtn = document.createElement('button');
	clearBtn.type = 'button';
	clearBtn.className = 'layers_search_btn layers_search_clear';
	clearBtn.title = 'Сбросить';
	clearBtn.innerHTML = '×';

	const addBtn = document.createElement('button');
	addBtn.type = 'button';
	addBtn.className = 'layers_search_btn layers_search_add';
	addBtn.title = 'Добавить тег';
	addBtn.innerHTML = '+';

	bar.appendChild(input);
	bar.appendChild(clearBtn);
	bar.appendChild(addBtn);

	const savedWrap = document.createElement('div');
	savedWrap.className = 'layers_saved_queries';

	const renderSaved = () => {
	  savedWrap.innerHTML = '';
	  saved.forEach((q, idx) => {
		const chip = document.createElement('div');
		chip.className = 'layers_saved_chip';
		chip.textContent = q;

		const x = document.createElement('button');
		x.type = 'button';
		x.className = 'chip_remove';
		x.innerHTML = '×';
		x.title = 'Удалить';

chip.addEventListener('click', (e) => {
		  if (e.target === x) return; // удаление — отдельно
		
		  const tag = q; // значение чипа
		  const sameTag = (lastClickedTag === tag);
		  lastClickedTag = tag;
		
		  // если это первый клик по тегу (или клик по другому тегу) — применяем запрос
		  if (!sameTag || searchInputEl.value.trim() !== tag) {
			searchInputEl.value = tag;
			saveQuery(tag);
			currentQuery = '';      // заставим runSearchNow считать запрос «новым»
			lastJumpQuery = '';     // разрешим автопрыжок
			runSearchNow(tag);      // подсветка + установка hits
			// Переходим к первому совпадению сразу (как в VSCode «Find next»)
			if (hits.length) gotoHit(0, tag, { forceScroll: true });
			searchInputEl.focus({ preventScroll: true });
			try { searchInputEl.setSelectionRange(tag.length, tag.length); } catch {}
			setHasValue(bar, searchInputEl);
			return;
		  }
		
		  // последующие клики по тому же тегу — как Enter: следующий матч по кругу
		  if (hits.length) {
			gotoHit(index + 1, tag, { forceScroll: true });
		  }
		});
		
	chip.addEventListener('mousedown', (e) => {
	  if (e.button !== 0 || e.target.classList.contains('chip_remove')) return;
	  if (e.shiftKey) {
		e.preventDefault();
		const tag = q;
		lastClickedTag = tag;
		if (searchInputEl.value.trim() !== tag) {
		  searchInputEl.value = tag;
		  saveQuery(tag);
		  currentQuery = '';
		  lastJumpQuery = '';
		  runSearchNow(tag);
		}
		if (hits.length) gotoHit(index - 1, tag, { forceScroll: true });
	  }
	});


		x.addEventListener('click', (e) => {
		  lastClickedTag = '';
		  e.stopPropagation();
		  saved.splice(idx, 1);
		  saveSaved(saved);
		  renderSaved();
		});

		chip.appendChild(x);
		savedWrap.appendChild(chip);
	  });
	};

	renderSaved();
	return { bar, input, clearBtn, addBtn, savedWrap, renderSaved };
  }

  function setHasValue(bar, input) {
	if (input.value && input.value.trim().length) bar.classList.add('has-value');
	else bar.classList.remove('has-value');
  }

  function setSearchOpen(bar, savedWrap, toggleBtn, isOpen, opts = {}) {
	bar.hidden = !isOpen;
	savedWrap.hidden = !isOpen;
	if (toggleBtn) {
	  toggleBtn.classList.toggle('is-active', isOpen);
	  toggleBtn.setAttribute('aria-pressed', String(isOpen));
	}
	if (!opts.skipSave) saveSearchOpen(isOpen);
	if (isOpen && !opts.skipFocus) searchInputEl?.focus({ preventScroll: true });
  }

  let runSearch = () => {};

  function findRightBlock() {
	let right = document.querySelector(SELECTOR_RIGHT_BLOCK);
	if (right) return right;
	const hosts = document.querySelectorAll('*');
	for (const h of hosts) {
	  if (h.shadowRoot) {
		const r = h.shadowRoot.querySelector(SELECTOR_RIGHT_BLOCK);
		if (r) return r;
	  }
	}
	return null;
  }

  function mount() {
	const { panel, list, scroller } = getRoots();
	if (!panel || !list) return;
	if (panel.querySelector('.layers_search_area')) return;

	listRef = list;

	buildCache(list);

	const saved = loadSaved();
	const { bar, input, clearBtn, addBtn, savedWrap, renderSaved } = buildSearchBar(saved);
	searchInputEl = input;
	panel.prepend(bar);
	panel.insertBefore(savedWrap, bar.nextSibling);
	setSearchOpen(bar, savedWrap, null, loadSearchOpen(), { skipSave: true, skipFocus: true });

	const markUserScroll = () => { userScrollUntil = Date.now() + USER_SCROLL_GRACE; };
	if (scroller) {
	  scroller.addEventListener('wheel', markUserScroll, { passive: true });
	  scroller.addEventListener('touchstart', markUserScroll, { passive: true });
	  scroller.addEventListener('mousedown', markUserScroll, { passive: true });
	  scroller.addEventListener('keydown', (e) => {
		if (['PageUp','PageDown','ArrowUp','ArrowDown','Home','End','Space'].includes(e.key)) markUserScroll();
	  }, true);
	}

	const tryPlaceRightBtn = () => {
	  const r = findRightBlock();
	  if (r && !r.querySelector('.tt-layers-search-toggle')) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tt-layers-search-toggle';
		btn.title = 'Поиск по слоям';
		btn.setAttribute('aria-label', 'Поиск по слоям');
		btn.setAttribute('aria-pressed', 'false');
		btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>';
		btn.addEventListener('click', () => {
		  const isOpen = bar.hidden;
		  setSearchOpen(bar, savedWrap, btn, isOpen);
		  if (isOpen) panel.scrollIntoView({ block: 'nearest' });
		});
		r.prepend(btn);
		setSearchOpen(bar, savedWrap, btn, loadSearchOpen(), { skipSave: true, skipFocus: true });
		return true;
	  }
	  return false;
	};
	if (!tryPlaceRightBtn()) {
	  const moRight = new MutationObserver(() => { if (tryPlaceRightBtn()) moRight.disconnect(); });
	  moRight.observe(document.documentElement, { childList: true, subtree: true });
	}

	setHasValue(bar, input);
	runSearch = debounce((q) => { saveQuery(q); runSearchNow(q); }, DEBOUNCE_MS);

	input.addEventListener('input', () => {
	  setHasValue(bar, input);
	  runSearch(input.value);
	});

	input.addEventListener('keydown', (e) => {
	  if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		if (!hits.length) return;
		gotoHit(index + 1, input.value, { forceScroll: true });
	  } else if (e.key === 'Enter' && e.shiftKey) {
		e.preventDefault();
		if (!hits.length) return;
		gotoHit(index - 1, input.value, { forceScroll: true });
	  } else if (e.key === 'Escape') {
		input.value = '';
		saveQuery('');
		hits = []; index = -1; currentQuery = ''; lastJumpQuery = '';
		withObserverPaused(() => clearCurrentDecorations());
		setHasValue(bar, input);
	  }
	});

clearBtn.addEventListener('click', () => {
	  const q = '';
	  searchInputEl.value = q;
	  saveQuery(q);
	
	  // Сброс состояния
	  hits = [];
	  index = -1;
	  currentQuery = '';
	  lastJumpQuery = '';
	  lastClickedTag = ''; // если используешь навигацию по тегам
	
	  // Полная очистка подсветки и классов
	  paintAllMatches(''); // снимет .tt-layers__item--hit/--hit-current и восстановит innerHTML
	
	  // Обновить видимость кнопок и вернуть фокус
	  setHasValue(bar, searchInputEl);
	  searchInputEl.focus();
	});


	addBtn.addEventListener('click', () => {
	  const q = (input.value || '').trim();
	  if (!q) return;
	  addSaved(saved, q);
	  renderSaved();
	  setHasValue(bar, input);
	});

	// начальный поиск
	currentQuery = input.value || '';
	if (input.value) runSearchNow(input.value);

	// Observer перезапускаем только после полной инициализации
	mo = new MutationObserver(() => {
	  // пересбор кэша без петель
	  buildCache(listRef);
	  if (searchInputEl && searchInputEl.value) runSearchNow(searchInputEl.value);
	});
	observeOn();

	if (!bar.hidden) input.focus();
  }

  function boot() {
	const ready = () => document.querySelector(SELECTOR_LAYERS_PANEL) && document.querySelector(SELECTOR_LAYERS_ROOT);
	if (ready()) { setTimeout(mount, 30); return; }
	const mo2 = new MutationObserver(() => { if (ready()) { mo2.disconnect(); setTimeout(mount, 30); } });
	mo2.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
