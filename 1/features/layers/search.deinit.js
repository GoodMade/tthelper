(function () {
  try {
	document.querySelectorAll('.tt-layers-search-toggle').forEach(el => el.remove());
	document.querySelectorAll('.layers_search_area').forEach(el => el.remove());
	document.querySelectorAll('.layers_saved_queries').forEach(el => el.remove());
	// Снять подсветку и фокус
	document.querySelectorAll('.tt-layers__item.tt-layers__item--hit-current')
	  .forEach(el => el.classList.remove('tt-layers__item--hit-current'));
	document.querySelectorAll('.tt-layers__item__text').forEach(t => {
	  if (t.dataset._origHtml) {
		t.innerHTML = t.dataset._origHtml;
		t.removeAttribute('data-_orig-html');
	  }
	});
  } catch (e) {}
})();
