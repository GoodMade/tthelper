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
  const EXPAND_WAIT_MS = 90;

  let hits = [];
  let index = -1;
  let cache = [];
  let raf = 0;
  let navigationBusy = false;

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
		  scrollHitIntoView(item, scroller);
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

  function scrollHitIntoView(item, scroller) {
	if (!scroller) {
	  item.scrollIntoView({ block: 'center', behavior: 'auto' });
	  return;
	}

	const scrollerRect = scroller.getBoundingClientRect();
	const itemRect = item.getBoundingClientRect();
	const itemTop = scroller.scrollTop + itemRect.top - scrollerRect.top;
	const targetTop = itemTop - ((scrollerRect.height - itemRect.height) / 2);

	scroller.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
  }

  function getItemIndent(entryOrEl) {
	const el = entryOrEl?.el || entryOrEl;
	const textEl = entryOrEl?.textEl || el?.querySelector?.(TEXT_SELECTOR);
	const rect = (textEl || el)?.getBoundingClientRect?.();
	return rect ? rect.left : 0;
  }

  function getCacheIndex(el) {
	return cache.findIndex((entry) => entry.el === el);
  }

  function itemHasVisibleDescendants(item) {
	const parentIndex = getCacheIndex(item);
	if (parentIndex === -1) return false;
	const next = cache[parentIndex + 1];
	if (!next) return false;
	return item.contains(next.el) || getItemIndent(next) > getItemIndent(cache[parentIndex]) + 4;
  }

  function isVisibleElement(el) {
	if (!(el instanceof Element)) return false;
	const rect = el.getBoundingClientRect();
	const style = getComputedStyle(el);
	return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function classText(el) {
	return String(el?.getAttribute?.('class') || '').toLowerCase();
  }

  function isExpandedByState(el) {
	if (!el) return false;
	if (el.getAttribute?.('aria-expanded') === 'true') return true;
	const text = classText(el);
	return /\b(is-|_)?(open|opened|expanded)\b/.test(text);
  }

  function findLayerToggle(item, opts = {}) {
	const { collapsedOnly = true } = opts;
	if (!(item instanceof Element)) return null;
	if (collapsedOnly && itemHasVisibleDescendants(item)) return null;

	const ownExpanded = item.getAttribute?.('aria-expanded');
	if (ownExpanded === 'false') return item;
	if (collapsedOnly && ownExpanded === 'true') return null;

	const explicit = item.querySelector('[aria-expanded], [data-state="closed"], [data-open="false"], [data-collapsed="true"]');
	if (explicit) {
	  if (!collapsedOnly || explicit.getAttribute?.('aria-expanded') !== 'true') return explicit;
	}
	if (collapsedOnly && isExpandedByState(item)) return null;

	const textEl = item.querySelector(TEXT_SELECTOR);
	if (!textEl) return null;
	const textRect = textEl.getBoundingClientRect();
	const rowCenter = textRect.top + (textRect.height / 2);
	const expectedX = textRect.left - 58;
	const elements = Array.from(item.querySelectorAll('button, [role="button"], svg, span, i, div'));

	const candidates = elements
	  .filter((el) => el !== textEl && !textEl.contains(el) && isVisibleElement(el))
	  .filter((el) => {
		const rect = el.getBoundingClientRect();
		const centerY = rect.top + (rect.height / 2);
		return Math.abs(centerY - rowCenter) <= 18
		  && rect.right <= textRect.left - 20
		  && rect.width <= 28
		  && rect.height <= 28;
	  })
	  .sort((a, b) => {
		const aClass = /arrow|chevron|caret|toggle|expand|collapse/.test(classText(a)) ? -100 : 0;
		const bClass = /arrow|chevron|caret|toggle|expand|collapse/.test(classText(b)) ? -100 : 0;
		const aRect = a.getBoundingClientRect();
		const bRect = b.getBoundingClientRect();
		const aDist = Math.abs((aRect.left + aRect.width / 2) - expectedX) + aClass;
		const bDist = Math.abs((bRect.left + bRect.width / 2) - expectedX) + bClass;
		return aDist - bDist;
	  });

	const candidate = candidates[0];
	if (candidate) return candidate.closest('button, [role="button"], [aria-expanded]') || candidate;

	const pointTarget = document.elementFromPoint(expectedX, rowCenter);
	if (!pointTarget || !item.contains(pointTarget) || pointTarget === item || pointTarget === textEl || textEl.contains(pointTarget)) return null;
	const rect = pointTarget.getBoundingClientRect();
	if (rect.width > 28 || rect.height > 28 || rect.right > textRect.left - 20) return null;
	return pointTarget.closest('button, [role="button"], [aria-expanded]') || pointTarget;
  }

  function clickLayerToggle(toggle) {
	if (!(toggle instanceof Element)) return;
	toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  function waitForLayerTreeUpdate() {
	return new Promise((resolve) => {
	  requestAnimationFrame(() => setTimeout(resolve, EXPAND_WAIT_MS));
	});
  }

  function refreshSearchState(q) {
	const { list } = getRoots();
	if (list) {
	  listRef = list;
	  buildCache(list);
	}
	runSearchNow(q);
  }

  function makeItemSnapshot(item) {
	const entry = cache.find((node) => node.el === item);
	return {
	  index: entry ? cache.indexOf(entry) : -1,
	  indent: getItemIndent(entry || item),
	  textLower: entry?.textLower || item.querySelector?.(TEXT_SELECTOR)?.textContent?.toLowerCase?.() || ''
	};
  }

  function findRefreshedItem(snapshot) {
	if (!snapshot?.textLower) return null;
	let best = null;
	let bestScore = Infinity;
	cache.forEach((entry, entryIndex) => {
	  if (entry.textLower !== snapshot.textLower) return;
	  const score = Math.abs(entryIndex - snapshot.index) + (Math.abs(getItemIndent(entry) - snapshot.indent) / 24);
	  if (score < bestScore) {
		best = entry.el;
		bestScore = score;
	  }
	});
	return best;
  }

  function findFirstMatchingDescendant(parent, q) {
	const parentIndex = getCacheIndex(parent);
	if (parentIndex === -1) return null;
	const ql = (q || '').trim().toLowerCase();
	if (!ql) return null;

	const parentIndent = getItemIndent(cache[parentIndex]);
	for (let i = parentIndex + 1; i < cache.length; i += 1) {
	  const entry = cache[i];
	  const isNested = parent.contains(entry.el);
	  const isIndented = getItemIndent(entry) > parentIndent + 4;
	  if (!isNested && !isIndented) break;
	  if (entry.textLower.includes(ql)) return entry.el;
	}
	return null;
  }

  function gotoElementHit(el, fallbackIndex, q) {
	const hitIndex = hits.findIndex((hit) => hit.el === el);
	gotoHit(hitIndex === -1 ? fallbackIndex : hitIndex, q, { forceScroll: true });
  }

  async function navigateForward(q) {
	if (navigationBusy || !hits.length) return;
	navigationBusy = true;
	try {
	  const current = hits[index]?.el || hits[0]?.el;
	  const toggle = findLayerToggle(current, { collapsedOnly: true });

	  if (current && toggle) {
		const snapshot = makeItemSnapshot(current);
		const beforeCount = cache.length;

		clickLayerToggle(toggle);
		await waitForLayerTreeUpdate();
		refreshSearchState(q);

		const parent = current.isConnected ? current : findRefreshedItem(snapshot);
		const parentHitIndex = parent ? hits.findIndex((hit) => hit.el === parent) : -1;
		if (parentHitIndex !== -1) index = parentHitIndex;
		const child = parent ? findFirstMatchingDescendant(parent, q) : null;
		if (child) {
		  gotoElementHit(child, index + 1, q);
		  searchInputEl?.focus({ preventScroll: true });
		  return;
		}

		if (parent && cache.length > beforeCount) {
		  const restoreToggle = findLayerToggle(parent, { collapsedOnly: false });
		  clickLayerToggle(restoreToggle);
		  await waitForLayerTreeUpdate();
		  refreshSearchState(q);
		  const restoredParentHitIndex = hits.findIndex((hit) => hit.el === parent);
		  if (restoredParentHitIndex !== -1) index = restoredParentHitIndex;
		}
	  }

	  gotoHit(index + 1, q, { forceScroll: true });
	  searchInputEl?.focus({ preventScroll: true });
	} finally {
	  navigationBusy = false;
	}
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
			navigateForward(tag);
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
		navigateForward(input.value);
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
