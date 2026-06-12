(function () {
  const REQUEST_SOURCE = 'tt-enhancer-ai-panel-puter-sandbox-request';
  const RESPONSE_SOURCE = 'tt-enhancer-ai-panel-puter-sandbox-response';
  const MODEL_MODES = {
    text: 'text',
    image: 'image'
  };
  let puterSdkLoadPromise = null;

  try {
    if (window.puter) window.puter.quiet = true;
  } catch {}

  function installStorageShims(snapshot = {}) {
    const createStorage = (initialItems = {}) => {
      const items = new Map(Object.entries(initialItems || {}).map(([key, value]) => [
        String(key),
        String(value ?? '')
      ]));
      return {
        get length() {
          return items.size;
        },
        key(index) {
          return Array.from(items.keys())[Number(index) || 0] || null;
        },
        getItem(key) {
          const normalizedKey = String(key || '');
          return items.has(normalizedKey) ? items.get(normalizedKey) : null;
        },
        setItem(key, value) {
          items.set(String(key || ''), String(value ?? ''));
        },
        removeItem(key) {
          items.delete(String(key || ''));
        },
        clear() {
          items.clear();
        }
      };
    };

    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: createStorage(snapshot.local)
      });
    } catch {}

    try {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: createStorage(snapshot.session)
      });
    } catch {}

    try {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: undefined
      });
    } catch {}
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function withTimeout(promise, timeoutMs, message) {
    let timer = 0;
    return new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      Promise.resolve(promise)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  async function loadPuterSdk(sdkCode, sourceUrl, storageSnapshot) {
    if (window.puter?.ai?.chat) return window.puter;
    if (!puterSdkLoadPromise) {
      puterSdkLoadPromise = (async () => {
        const code = String(sdkCode || '');
        if (!code) throw new Error('Пустой Puter SDK');
        installStorageShims(storageSnapshot);
        (0, eval)(code + '\n//# sourceURL=' + (sourceUrl || 'https://js.puter.com/v2/'));
        try {
          if (window.puter) window.puter.quiet = true;
        } catch {}
        return window.puter;
      })();
    }
    return puterSdkLoadPromise;
  }

  async function ensurePuter(sdkCode, sourceUrl, storageSnapshot, timeoutMs = 20000) {
    await loadPuterSdk(sdkCode, sourceUrl, storageSnapshot);
    const startedAt = Date.now();
    while (!window.puter?.ai?.chat && Date.now() - startedAt < timeoutMs) {
      await wait(80);
    }
    if (!window.puter?.ai?.chat) {
      throw new Error('Puter SDK не загрузился в sandbox');
    }
    try {
      window.puter.quiet = true;
    } catch {}
    return window.puter;
  }

  async function ensureAuth(puter) {
    if (!puter?.auth?.isSignedIn) return;
    let signedIn = false;
    try {
      signedIn = !!puter.auth.isSignedIn();
    } catch {}
    if (signedIn) return;

    // The hidden extension sandbox cannot reliably open the Puter auth popup.
    // If the user is already signed in, the SDK can use the existing browser session.
  }

  function textFromParts(parts) {
    return (Array.isArray(parts) ? parts : [])
      .map((part) => String(part?.text || '').trim())
      .filter(Boolean)
      .join('\n');
  }

  function promptFromPayload(payload) {
    const parts = [];
    const systemText = String(payload?.systemInstruction || '').trim();
    if (systemText) parts.push(systemText);
    (Array.isArray(payload?.contents) ? payload.contents : []).forEach((item) => {
      const text = textFromParts(item?.parts);
      if (text) parts.push(text);
    });
    return parts.join('\n\n').trim();
  }

  function inlineMediaFromPayload(payload) {
    const contents = Array.isArray(payload?.contents) ? payload.contents : [];
    for (const item of contents) {
      const parts = Array.isArray(item?.parts) ? item.parts : [];
      for (const part of parts) {
        const inlineData = part?.inlineData || part?.inline_data;
        const mimeType = String(inlineData?.mimeType || inlineData?.mime_type || '').trim();
        const data = String(inlineData?.data || '').trim();
        if (!mimeType.startsWith('image/') || !data) continue;
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const extension = mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
        return new File([bytes], `taptop-image.${extension}`, { type: mimeType });
      }
    }
    return null;
  }

  function contentToText(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).filter(Boolean).join('\n');
  }

  function extractText(response) {
    if (typeof response === 'string') return response.trim();
    const values = [
      response?.text,
      response?.message?.text,
      contentToText(response?.message?.content),
      contentToText(response?.content),
      response?.answer
    ];
    return values
      .map((value) => String(value || '').trim())
      .find(Boolean) || '';
  }

  function addImage(images, image) {
    const url = String(
      image?.image_url?.url ||
      image?.imageUrl?.url ||
      image?.url ||
      image?.src ||
      ''
    ).trim();
    if (!/^data:image\//i.test(url)) return;
    const mimeType = url.split(';')[0].replace(/^data:/i, '') || 'image/png';
    const data = url.includes(',') ? url.split(',').slice(1).join(',') : '';
    images.push({
      mimeType,
      data,
      dataUrl: url
    });
  }

  function extractImages(response) {
    const images = [];
    [response?.images, response?.message?.images].forEach((items) => {
      (Array.isArray(items) ? items : []).forEach((image) => addImage(images, image));
    });
    [
      ...(Array.isArray(response?.content) ? response.content : []),
      ...(Array.isArray(response?.message?.content) ? response.message.content : [])
    ].forEach((part) => addImage(images, part?.image || part));
    return images;
  }

  async function generate(payload, sdkCode, sdkSourceUrl, storageSnapshot) {
    const puter = await ensurePuter(sdkCode, sdkSourceUrl, storageSnapshot);
    await ensureAuth(puter);

    const model = String(payload?.model || 'gemini-2.5-flash').trim() || 'gemini-2.5-flash';
    const options = { model };
    const maxTokens = Number(payload?.maxTokens ?? payload?.max_tokens);
    if (Number.isFinite(maxTokens) && maxTokens > 0) {
      const normalizedMaxTokens = Math.min(65536, Math.max(1, Math.round(maxTokens)));
      options.max_tokens = normalizedMaxTokens;
      options.maxTokens = normalizedMaxTokens;
    }
    const prompt = promptFromPayload(payload);
    const media = inlineMediaFromPayload(payload);
    const timeoutMs = Math.min(120000, Math.max(10000, Number(payload?.timeoutMs || 70000) || 70000));
    const mode = Array.isArray(payload?.modalities) && payload.modalities.includes('image') ? MODEL_MODES.image : MODEL_MODES.text;
    const request = media
      ? puter.ai.chat(prompt, media, false, options)
      : puter.ai.chat(prompt, options);
    const response = await withTimeout(
      request,
      timeoutMs,
      'Puter.js не ответил за отведённое время. Модель: ' + model
    );

    return {
      model,
      mode,
      text: extractText(response),
      images: extractImages(response)
    };
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== parent) return;
    const message = event.data;
    if (!message || message.source !== REQUEST_SOURCE || !message.id) return;

    try {
      const result = await generate(
        message.payload || {},
        message.sdkCode || '',
        message.sdkSourceUrl || '',
        message.storageSnapshot || null
      );
      parent.postMessage({
        source: RESPONSE_SOURCE,
        id: message.id,
        ok: true,
        result
      }, '*');
    } catch (error) {
      parent.postMessage({
        source: RESPONSE_SOURCE,
        id: message.id,
        ok: false,
        error: error?.message || String(error)
      }, '*');
    }
  });
})();
