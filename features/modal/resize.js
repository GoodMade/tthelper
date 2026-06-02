(function () {
  const STORAGE_KEY    = 'tt_enhancer_modal_code_editor';
  const SELECTOR_MODAL = '.tt-popup.tt-universal-modal.tt-popup-code-editor__modal';
  const SELECTOR_TITLE = '.tt-popup__title';
  const MINI_BROWSER_SELECTOR = '#tt-enhancer-mini-browser-panel, #tt-enhancer-mini-browser-button, #tt-enhancer-side-browser-button, #tt-enhancer-open-site-button';
  const STACK_ACTIVE_CLASS = 'tt-enhancer--stack-active';
  const STACK_BACKGROUND_CLASS = 'tt-enhancer--stack-background';
  const MINI_BROWSER_STACK_ACTIVE_CLASS = 'is-stack-active';
  const MIN_MODAL_HEIGHT = 560;
  const DEFAULT_MODAL_HEIGHT = 720;

  try {
	const prevObserver = window.__ttEnhancerModalObserver;
	if (prevObserver?.disconnect) prevObserver.disconnect();
	if (window.__ttEnhancerModalResizeHandler) {
	  window.removeEventListener('resize', window.__ttEnhancerModalResizeHandler);
	}
	if (window.__ttEnhancerModalStackHandler) {
	  document.removeEventListener('pointerdown', window.__ttEnhancerModalStackHandler, true);
	  window.__ttEnhancerModalStackHandler = null;
	}
  } catch {}

  // ---- persist ----
  function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
  function saveState(s)  { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
  const state = Object.assign({ fullHeight: false, width: null, height: null }, loadState());

  // ---- helpers ----
  const px = n => Math.max(0, Math.round(n) || 0);
  function find(modal, sel) { return modal.querySelector(sel); }
  function findAce(modal)   { return modal.querySelector('#ace-editor.ace_editor') || modal.querySelector('.ace_editor'); }
  function getDefaultModalHeight() {
	return Math.max(MIN_MODAL_HEIGHT, Math.min(DEFAULT_MODAL_HEIGHT, window.innerHeight - 120));
  }
  function fitAce(modal) {
	const aceRoot = findAce(modal);
	const codeBox = modal.querySelector('.tt-popup-code-editor-code__code');
	const codeEditor = modal.querySelector('.tt-code-editor');
	if (!aceRoot || !codeEditor) return;

	const rect = modal.getBoundingClientRect();
	const codeRect = (codeBox || codeEditor).getBoundingClientRect();
	const footer = modal.querySelector('.tt-popup-code-editor-footer');
	const footerH = footer ? footer.getBoundingClientRect().height : 0;
	const notesH = Array.from(modal.querySelectorAll('.tt-popup-code-editor-note'))
	  .reduce((sum, el) => {
		const r = el.getBoundingClientRect();
		const visible = r.height > 0 && getComputedStyle(el).display !== 'none';
		return visible ? sum + r.height : sum;
	  }, 0);
	const bottomGap = 42;
	const nextH = Math.max(320, Math.floor(rect.bottom - codeRect.top - footerH - notesH - bottomGap));

	if (codeBox) {
	  codeBox.style.height = nextH + 'px';
	  codeBox.style.minHeight = '0';
	}
	codeEditor.style.height = nextH + 'px';
	codeEditor.style.minHeight = '0';
	aceRoot.style.height = nextH + 'px';
	aceRoot.style.minHeight = '0';
	aceRoot.style.width = '100%';
  }
  function resizeAce(modal) {
	const aceRoot = findAce(modal);
	if (!aceRoot) return;
	fitAce(modal);
	try { ace.edit(aceRoot).resize(true); } catch {}
  }
  function ensureCtx(modal) {
	if (modal.__ttCtx) return modal.__ttCtx;
	modal.__ttCtx = { raf: 0, dragging: false, dragCleanup: null, modeObserver: null };
	return modal.__ttCtx;
  }
  function scheduleResize(modal) {
	const ctx = ensureCtx(modal);
	if (ctx.raf) return;
	ctx.raf = requestAnimationFrame(() => {
	  ctx.raf = 0;
	  resizeAce(modal);
	});
  }
  function scheduleResizeBurst(modal) {
	[0, 80, 180, 360].forEach((delay) => {
	  window.setTimeout(() => scheduleResize(modal), delay);
	});
  }
  function shouldReactToClassChange(target) {
	return target instanceof HTMLElement && (
	  target.classList.contains('tt-popup-code-editor__body') ||
	  target.classList.contains('tt-popup-code-editor-code') ||
	  target.classList.contains('tt-popup-code-editor-ai') ||
	  target.classList.contains('tt-popup-code-editor-note')
	);
  }
  function getMiniBrowserPanel() {
	return document.getElementById('tt-enhancer-mini-browser-panel');
  }
  function bringCodeEditorToFront(modal) {
	if (!(modal instanceof HTMLElement)) return;
	modal.classList.add(STACK_ACTIVE_CLASS);
	modal.classList.remove(STACK_BACKGROUND_CLASS);
	getMiniBrowserPanel()?.classList.remove(MINI_BROWSER_STACK_ACTIVE_CLASS);
  }
  function bringMiniBrowserToFront() {
	getMiniBrowserPanel()?.classList.add(MINI_BROWSER_STACK_ACTIVE_CLASS);
	document.querySelectorAll(SELECTOR_MODAL).forEach((modal) => {
	  modal.classList.remove(STACK_ACTIVE_CLASS);
	  modal.classList.add(STACK_BACKGROUND_CLASS);
	});
  }
  function handleStackPointerDown(event) {
	const target = event.target;
	if (!(target instanceof Element)) return;
	const modal = target.closest(SELECTOR_MODAL);
	if (modal) {
	  bringCodeEditorToFront(modal);
	  return;
	}
	if (target.closest(MINI_BROWSER_SELECTOR)) {
	  bringMiniBrowserToFront();
	}
  }
  function bindCodeEditorStack(modal) {
	const ctx = ensureCtx(modal);
	bringCodeEditorToFront(modal);
	if (!ctx.stackFocusListener) {
	  ctx.stackFocusListener = () => bringCodeEditorToFront(modal);
	  modal.addEventListener('focusin', ctx.stackFocusListener, true);
	}
  }
  function observeEditorMode(modal) {
	const ctx = ensureCtx(modal);
	if (ctx.modeObserver?.disconnect) ctx.modeObserver.disconnect();

	let lastMode = '';
	const getMode = () => [
	  modal.querySelector('.tt-popup-code-editor__body')?.className || '',
	  modal.querySelector('.tt-popup-code-editor-code')?.className || '',
	  modal.querySelector('.tt-popup-code-editor-ai') ? 'ai-present' : 'ai-missing'
	].join('|');

	const observer = new MutationObserver((mutations) => {
	  let changed = false;
	  for (const mutation of mutations) {
		if (mutation.type === 'attributes' && shouldReactToClassChange(mutation.target)) {
		  changed = true;
		  break;
		}
	  }
	  if (!changed) return;

	  const nextMode = getMode();
	  if (nextMode === lastMode) return;
	  lastMode = nextMode;
	  scheduleResizeBurst(modal);
	});

	lastMode = getMode();
	observer.observe(modal, { attributes: true, attributeFilter: ['class'], subtree: true });
	ctx.modeObserver = observer;
  }

  // ---- apply state ----
  function applyFullHeight(modal) {
	// Сбросить инлайн ширину к дефолтной
	modal.style.removeProperty('width');
	modal.classList.add('tt-enhancer--fullheight');
	modal.style.height = 'calc(100vh - 72px)';
	scheduleResizeBurst(modal);
  }
  function applyCustomSize(modal) {
	modal.classList.remove('tt-enhancer--fullheight');
	scheduleResizeBurst(modal);
  }
  function applyDefaultSize(modal) {
	modal.classList.remove('tt-enhancer--fullheight');
	modal.style.removeProperty('width');
	modal.style.height = getDefaultModalHeight() + 'px';
	scheduleResizeBurst(modal);
  }
  function applyState(modal) {
	if (state.fullHeight) {
	  applyFullHeight(modal);
	} else {
	  if (state.width)  modal.style.width  = Math.max(960, state.width) + 'px';
	  if (state.height) modal.style.height = state.height + 'px';
	  else modal.style.removeProperty('height');
	  applyCustomSize(modal);
	}
  }

  // ---- enhance ----
  function enhance(modal) {
	if (!(modal instanceof HTMLElement)) return;
	if (modal.dataset.ttEnhancer) {
	  bindCodeEditorStack(modal);
	  return;
	}
	modal.dataset.ttEnhancer = '1';
	const ctx = ensureCtx(modal);

	// Кнопка в заголовке
	const title = find(modal, SELECTOR_TITLE);
	if (title && !title.querySelector('.tt-enhancer-controls')) {
	  const controls = document.createElement('div');
	  controls.className = 'tt-enhancer-controls';

	  const btn = document.createElement('button');
	  btn.type = 'button';
	  btn.className = 'tt-enhancer-btn';
	  btn.title = 'Во весь экран по высоте';
	  btn.textContent = '↕';

	  btn.addEventListener('click', () => {
		if (ctx.dragging) return;
		state.fullHeight = !state.fullHeight;
		if (state.fullHeight) {
		  applyFullHeight(modal);
		} else {
		  // Кнопка работает в двух режимах: по высоте <-> дефолтная геометрия.
		  state.width = null;
		  state.height = getDefaultModalHeight();
		  applyDefaultSize(modal);
		}
		saveState(state);
	  });

	  controls.appendChild(btn);
	  title.style.position = 'relative';
	  title.appendChild(controls);
	  title.addEventListener('dblclick', () => btn.click());
	}

	// Ручка ресайза
	if (!modal.querySelector('.tt-enhancer-resizer')) {
	  const handle = document.createElement('div');
	  handle.className = 'tt-enhancer-resizer';
	  modal.appendChild(handle);

	  let startX, startY, startW, startH, nextW, nextH, moveRaf = 0;

	  const applyPendingSize = () => {
		moveRaf = 0;
		if (!ctx.dragging) return;
		modal.classList.remove('tt-enhancer--fullheight');
		modal.style.width = nextW + 'px';
		modal.style.height = nextH + 'px';
	  };

	  const onMove = (e) => {
		if (!ctx.dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		nextW = Math.max(960, Math.round(startW + dx));
		nextH = Math.max(300, Math.round(startH + dy));
		if (!moveRaf) moveRaf = requestAnimationFrame(applyPendingSize);
	  };

	  const cleanupDrag = () => {
		window.removeEventListener('mousemove', onMove, true);
		window.removeEventListener('mouseup', onUp, true);
		window.removeEventListener('blur', onUp, true);
		ctx.dragCleanup = null;
	  };

	  const onUp = () => {
		if (!ctx.dragging) {
		  cleanupDrag();
		  return;
		}
		cleanupDrag();
		ctx.dragging = false;
		if (moveRaf) {
		  cancelAnimationFrame(moveRaf);
		  moveRaf = 0;
		  modal.style.width = nextW + 'px';
		  modal.style.height = nextH + 'px';
		}

		const rect = modal.getBoundingClientRect();
		state.width  = Math.round(rect.width);
		state.height = Math.round(rect.height);
		state.fullHeight = false;
		saveState(state);

		applyCustomSize(modal);
	  };

	  handle.addEventListener('mousedown', (e) => {
		e.preventDefault();
		if (ctx.dragCleanup) ctx.dragCleanup();
		const rect = modal.getBoundingClientRect();
		startX = e.clientX; startY = e.clientY;
		startW = rect.width; startH = rect.height;
		nextW = startW; nextH = startH;
		ctx.dragging = true;
		ctx.dragCleanup = cleanupDrag;
		window.addEventListener('mousemove', onMove, true);
		window.addEventListener('mouseup', onUp, true);
		window.addEventListener('blur', onUp, true);
	  });
	}

	// Применяем сохранённое
	applyState(modal);
	observeEditorMode(modal);
	bindCodeEditorStack(modal);

	// Подстраховка после монтирования: Ace часто меряется до финальной высоты контейнера.
	scheduleResizeBurst(modal);
  }

  // Отслеживаем появление модалки
  const domObs = new MutationObserver((mutations) => {
	for (const m of mutations) {
	  for (const node of m.addedNodes) {
		if (!(node instanceof HTMLElement)) continue;
		if (node.matches && node.matches(SELECTOR_MODAL)) enhance(node);
		else if (node.querySelector) {
		  const found = node.querySelector(SELECTOR_MODAL);
		  if (found) enhance(found);
		}
	  }
	}
  });
  domObs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  window.__ttEnhancerModalObserver = domObs;

  // Если модалка уже есть
  document.querySelectorAll(SELECTOR_MODAL).forEach(enhance);

  // Ресайз окна — просто уведомляем Ace
  const onWindowResize = () => {
	const modal = document.querySelector(SELECTOR_MODAL + '[data-tt-enhancer="1"]');
	if (!modal) return;
	scheduleResize(modal);
  };
  window.__ttEnhancerModalResizeHandler = onWindowResize;
  window.addEventListener('resize', onWindowResize);

  window.__ttEnhancerModalStackHandler = handleStackPointerDown;
  document.addEventListener('pointerdown', handleStackPointerDown, true);
})();
