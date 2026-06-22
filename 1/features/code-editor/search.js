(function waitAce() {
  // Ждем, пока загрузится ace И модуль поиска
  if (!window.ace || !document.querySelector('.ace_editor')) {
    return setTimeout(waitAce, 100);
  }
  
  // Дополнительная проверка, что модуль поиска загружен
  if (!ace.require || !ace.require('ace/ext/searchbox')) {
    console.log('Ожидание загрузки модуля поиска...');
    return setTimeout(waitAce, 100);
  }

  const editor = ace.edit(document.querySelector('.ace_editor'));
  const textLayer = editor.renderer.scroller.querySelector('.ace_text-layer');
  let hover = false;
  
  textLayer.addEventListener('mouseenter', function() {
    hover = true;
  });
  
  textLayer.addEventListener('mouseleave', function() {
    hover = false;
  });

  document.addEventListener('keydown', function(e) {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const meta = isMac ? e.metaKey : e.ctrlKey;
    
    if (meta && e.key.toLowerCase() === 'f' && (hover || editor.isFocused())) {
      e.preventDefault();
      e.stopPropagation();
      editor.focus();
      editor.execCommand('find');
      console.log('Taptop Enhancer: поиск активирован');
    }
  }, true);
  
  console.log('Taptop Enhancer: модуль поиска инициализирован');
})();
