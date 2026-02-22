/**
 * VSC4T Password Protection Enhancement
 * Provides i18n support, show/hide password toggle, improved UX
 * Works with hexo-blog-encrypt plugin
 * 
 * FEATURES:
 * - Correct event dispatching for hbe.js integration
 * - Proper integration with hbe.js decrypt flow
 * - Enhanced user experience with better feedback
 * - i18n support for multi-language blogs
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('hexo-blog-encrypt');
  if (!container) return;

  const i18n = window.HEXO_CONFIG || {};
  const getText = (key, fallback) => i18n[key] || fallback;

  let input = null;
  let button = null;
  let message = null;
  let reEncrypt = null;
  let togglePassword = null;
  let label = null;
  let arrow = null;
  let spinner = null;

  let unlocked = false;
  let loadingTimer = null;
  let passwordVisible = false;
  let isProcessing = false; // Prevent double submission

  const ensureFormMarkup = () => {
    const hasHeader = !!container.querySelector('.hbe-header');
    const hasForm = !!container.querySelector('.hbe-content-wrapper');
    const hbeData = container.querySelector('#hbeData');
    if (hasHeader && hasForm) return;

    // Grace period: wait for hbe.js to render its template to avoid duplicates
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const observer = new MutationObserver(() => {
      if (container.querySelector('.hbe-header') && container.querySelector('.hbe-content-wrapper')) {
        cancel();
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      if (cancelled) return;
      const formFragment = document.createElement('div');
      formFragment.innerHTML =
      '<div class="hbe-header">' +
        '<div class="hbe-header-left">' +
          '<div class="hbe-icon hbe-lock-icon">' +
            '<svg class="hbe-lock-closed" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
            '<svg class="hbe-lock-open" style="display:none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>' +
          '</div>' +
          '<div class="hbe-header-copy">' +
            '<p class="hbe-badge" data-i18n="encrypt_badge">Protected</p>' +
            '<h3 class="hbe-title" data-i18n="encrypt_title">受保护的内容</h3>' +
            '<p class="hbe-description" data-i18n="encrypt_description">请输入密码以解锁本文，密码会在本页面本地保存，直到你选择重新加密。</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hbe-content-wrapper">' +
        '<label class="hbe-label" for="hbePass" data-i18n="encrypt_label">Password</label>' +
        '<div class="hbe-input-container">' +
          '<div class="hbe-input-wrapper">' +
            '<input type="password" id="hbePass" class="hbe-input" placeholder="输入密码解锁内容" autocomplete="off" aria-describedby="hbe-hint hbe-message" />' +
            '<button type="button" id="hbe-toggle-password" class="hbe-toggle-password" aria-label="Show password" title="Show password">' +
              '<svg class="hbe-eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
              '<svg class="hbe-eye-off-icon" style="display:none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' +
            '</button>' +
          '</div>' +
          '<button id="hbe-button" class="hbe-button" type="button">' +
            '<span data-i18n="encrypt_button">解锁</span>' +
            '<svg class="hbe-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>' +
            '<svg class="hbe-spinner" style="display:none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>' +
          '</button>' +
        '</div>' +
        '<p class="hbe-hint" id="hbe-hint" data-i18n="encrypt_hint">按 Enter 提交，密码会在本页记住。</p>' +
        '<div id="hbe-message" class="hbe-message" role="status" aria-live="polite"></div>' +
      '</div>' +
      '<div class="hbe-actions" id="hbe-actions">' +
        '<div class="hbe-success-note">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>' +
          '<span data-i18n="encrypt_unlocked_note">内容已解锁，可随时重新加密。</span>' +
        '</div>' +
        '<button id="hbe-encrypt-again" class="hbe-ghost-button" type="button"><span data-i18n="encrypt_again">重新加密</span><svg class="hbe-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></button>' +
      '</div>';
      if (hbeData) {
        const after = hbeData.nextSibling;
        if (after) container.insertBefore(formFragment, after);
        else container.appendChild(formFragment);
      } else {
        container.appendChild(formFragment);
      }
    }, 350);
  };

  const deduplicateControls = () => {
    // Keep only one toggle button
    const toggles = Array.from(container.querySelectorAll('#hbe-toggle-password'));
    if (toggles.length > 1) {
      const preferred = toggles.find(t => t.closest('.hbe-input-wrapper')) || toggles[0];
      toggles.forEach(t => { if (t !== preferred) t.remove(); });
    }
    // Ensure only one unlock button
    const unlocks = Array.from(container.querySelectorAll('#hbe-button'));
    if (unlocks.length > 1) {
      // Prefer the visible button closest to the input
      let preferredBtn = unlocks.find(b => b.offsetParent !== null);
      if (!preferredBtn && typeof unlocks[0] !== 'undefined') preferredBtn = unlocks[0];
      unlocks.slice(1).forEach(b => b.remove());
    }
  };
  const queryRefs = () => {
    input = document.getElementById('hbePass') || document.getElementById('hbe-password');
    button = document.getElementById('hbe-button');
    message = document.getElementById('hbe-message');
    reEncrypt = document.getElementById('hbe-encrypt-again');
    togglePassword = document.getElementById('hbe-toggle-password');
    label = button ? button.querySelector('span[data-i18n="encrypt_button"]') || button.querySelector('span') : null;
    arrow = button ? button.querySelector('.hbe-arrow') : null;
    spinner = button ? button.querySelector('.hbe-spinner') : null;
  };

  const ensureToggleInsideWrapper = () => {
    if (!input) return;
    let wrapper = input.closest('.hbe-input-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'hbe-input-wrapper';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }
    const toggle = container.querySelector('#hbe-toggle-password');
    if (toggle && toggle.parentElement !== wrapper) {
      wrapper.appendChild(toggle);
    }
  };

  const syncControlHeights = () => {
    if (!input) return;
    const h = input.offsetHeight || 44;
    if (button) {
      button.style.height = h + 'px';
      button.style.lineHeight = h + 'px';
      button.style.alignSelf = 'center';
      button.style.boxSizing = 'border-box';
      button.style.marginTop = '0';
      button.style.marginBottom = '0';
    }
    const toggle = container.querySelector('#hbe-toggle-password');
    if (toggle) {
      const tw = Math.round(h * 0.72);
      toggle.style.height = tw + 'px';
      toggle.style.width = tw + 'px';
      toggle.style.top = '50%';
      toggle.style.transform = 'translateY(-50%)';
      toggle.style.right = '1.1rem';
      if (input) {
        // Keep enough padding so text doesn't overlap the toggle
        input.style.paddingRight = Math.max(tw + 20, 48) + 'px';
      }
    }
  };

  const applyI18n = () => {
    container.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const translation = getText(key, null);
      if (translation) el.textContent = translation;
    });
    if (input) {
      const placeholder = getText('encrypt_placeholder', null);
      if (placeholder) input.placeholder = placeholder;
      else input.placeholder = '输入密码解锁内容';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
    }
  };

  const setMessage = (text, mode) => {
    if (!message) return;
    message.textContent = text || '';
    message.classList.remove('hbe-error', 'hbe-success', 'hbe-fade-in');
    if (mode === 'error') message.classList.add('hbe-error', 'hbe-fade-in');
    else if (mode === 'success') message.classList.add('hbe-success', 'hbe-fade-in');
  };

  const setLoading = (isLoading) => {
    if (!button) return;
    container.classList.toggle('hbe-decrypting', isLoading);
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
    if (label) {
      label.textContent = isLoading ? getText('encrypt_button_loading', '解锁中…') : getText('encrypt_button', '解锁');
    }
    if (arrow) arrow.style.display = isLoading ? 'none' : '';
    if (spinner) spinner.style.display = isLoading ? 'inline' : 'none';
    clearTimeout(loadingTimer);
    if (isLoading) {
      // Timeout for error handling - if decrypt doesn't respond
      loadingTimer = setTimeout(() => {
        isProcessing = false;
        setLoading(false);
        // Do NOT assume wrong password here; mark as timeout to avoid misleading feedback
        setMessage(getText('encrypt_error_timeout', 'Decryption timed out. Please try again.'), 'error');
        if (input) { input.focus(); input.select(); }
        setTimeout(() => { if (input) input.classList.remove('shake'); }, 500);
      }, 5000);
    }
  };

  // Trigger the hexo-blog-encrypt library's decrypt function
  // Dispatch event directly on the container (mainElement) where hbe.js listens
  const triggerDecrypt = () => {
    if (isProcessing) return; // Prevent double submission
    
    if (!input || !input.value.trim()) {
      setMessage(getText('encrypt_wrong_password', 'Please enter a password.'), 'error');
      if (input) input.focus();
      return;
    }
    
    isProcessing = true;
    setLoading(true);
    setMessage('', null);
    
    // Create a proper KeyboardEvent and dispatch on input, container and document (bubbling)
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    try { input.dispatchEvent(enterEvent); } catch (e) {}
    try { container.dispatchEvent(enterEvent); } catch (e) {}
    try { document.dispatchEvent(enterEvent); } catch (e) {}
  };

  const togglePasswordVisibility = () => {
    if (!input || !togglePassword) return;
    passwordVisible = !passwordVisible;
    input.type = passwordVisible ? 'text' : 'password';
    const eyeIcon = togglePassword.querySelector('.hbe-eye-icon');
    const eyeOffIcon = togglePassword.querySelector('.hbe-eye-off-icon');
    if (eyeIcon) eyeIcon.style.display = passwordVisible ? 'none' : '';
    if (eyeOffIcon) eyeOffIcon.style.display = passwordVisible ? '' : 'none';
    togglePassword.setAttribute('aria-label', passwordVisible ? getText('encrypt_hide_password', 'Hide password') : getText('encrypt_show_password', 'Show password'));
    togglePassword.setAttribute('title', togglePassword.getAttribute('aria-label'));
    input.focus();
  };

  const styleEncryptAgainButtons = () => {
    const candidates = Array.from(container.querySelectorAll('button')).filter((btn) => {
      if (btn.id === 'hbe-button' || btn.id === 'hbe-encrypt-again' || btn.id === 'hbe-toggle-password') return false;
      if (btn.dataset.vscStyled === 'true') return false;
      return btn.textContent && btn.textContent.trim().toLowerCase().includes('encrypt again');
    });
    candidates.forEach((btn) => {
      btn.dataset.vscStyled = 'true';
      btn.classList.add('hbe-ghost-button', 'hbe-hide-btn', 'hbe-floating');
      btn.innerHTML = '<span>' + getText('encrypt_again', 'Re-encrypt') + '</span><svg class="hbe-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>';
    });
  };

  const removeDefaultPrompt = () => {
    const phrases = [
      'hey, password is required here.',
      'password is required',
      'hey，password is required here.',
      'hey，密码',
      '密码是必须的'
    ];
    const nodes = Array.from(container.querySelectorAll('p,div,span,small,em,strong'));
    nodes.forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (!t) return;
      // 保护核心结构，避免误删界面容器
      if (el === container) return;
      if (el.closest('.hbe-content-wrapper') === el) return;
      if (el.closest('.hbe-header') === el) return;
      if (t && phrases.some(p => t.includes(p))) {
        el.remove();
      }
    });
  };

  const rerunDecorators = () => {
    // Re-run code enhancement to apply VSC4T theme styling to decrypted code blocks
    if (typeof window.enhanceCodeBlocks === 'function') {
      window.enhanceCodeBlocks();
    }
    if (typeof window.enhancePlainCodeBlocks === 'function') {
      window.enhancePlainCodeBlocks();
    }
    if (typeof window.addScrollIndicators === 'function') {
      window.addScrollIndicators();
    }
    if (typeof window.renderMermaidDiagrams === 'function') {
      window.renderMermaidDiagrams();
    }
    // Fallback: if code-enhance.js functions are not exposed globally, try hljs
    if (window.hljs) {
      document.querySelectorAll('pre code:not(.hljs)').forEach((block) => window.hljs.highlightElement(block));
    }
    if (window.mermaid && typeof window.mermaid.init === 'function') {
      window.mermaid.init(undefined, document.querySelectorAll('.mermaid:not([data-processed])'));
    }
  };

  const handleUnlocked = () => {
    if (unlocked) { styleEncryptAgainButtons(); rerunDecorators(); setLoading(false); return; }
    unlocked = true;
    isProcessing = false;
    clearTimeout(loadingTimer);
    setLoading(false);
    // 不再强制添加 hbe-unlocked，避免误隐藏表单和标题
    setMessage(getText('encrypt_success', 'Content unlocked successfully!'), 'success');
    // Smoothly swap form -> actions
    const header = container.querySelector('.hbe-header');
    const form = container.querySelector('.hbe-content-wrapper');
    [header, form].forEach((el) => {
      if (!el) return;
      el.classList.add('hbe-anim', 'hbe-fade-out');
      el.addEventListener('transitionend', () => { el.style.display = 'none'; }, { once: true });
    });

    // 显示“重新加密”区域（避免样式默认隐藏）
    const actions = document.getElementById('hbe-actions');
    if (actions) {
      actions.style.display = 'flex';
      actions.classList.remove('hbe-hide', 'hidden', 'is-hidden');
      actions.classList.add('hbe-anim', 'hbe-fade-in');
      requestAnimationFrame(() => actions.classList.add('is-visible'));
    }

    styleEncryptAgainButtons();

    const scheduleEnhance = () => {
      try {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => rerunDecorators(), { timeout: 500 });
        } else {
          setTimeout(() => rerunDecorators(), 0);
        }
      } catch (_) {
        setTimeout(() => rerunDecorators(), 0);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(scheduleEnhance));

    // 解密完成后平滑滚动到文章开头
    const findScrollTarget = () => {
      const candidates = [
        container.nextElementSibling,
        document.querySelector('.post-body .vscode-markdown'),
        document.querySelector('.post-body'),
        document.querySelector('.post-content'),
        document.querySelector('.content-area')
      ];
      return candidates.find(el => el && el.offsetParent !== null) || null;
    };
    setTimeout(() => {
      const target = findScrollTarget();
      if (target && typeof target.scrollIntoView === 'function') {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 8;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    }, 50);
  };

  ensureFormMarkup();
  queryRefs();
  applyI18n();
  removeDefaultPrompt();
  deduplicateControls();
  ensureToggleInsideWrapper();
  syncControlHeights();
  window.addEventListener('resize', () => {
    clearTimeout(window.__hbeResizeTimer);
    window.__hbeResizeTimer = setTimeout(syncControlHeights, 100);
  });

  // Listen for the hexo-blog-decrypt event from hbe.js library
  window.addEventListener('hexo-blog-decrypt', () => {
    handleUnlocked();
  });

  // Also listen for wrong password alert - hbe.js uses native alert()
  // We intercept it to provide better UX
  const originalAlert = window.alert;
  window.alert = function(msg) {
    // Check if this is a wrong password message from hbe.js
    const wrongPassMsg = container.dataset['wpm'] || 'invalid password';
    const wrongHashMsg = container.dataset['whm'] || 'cannot be verified';
    
    if (msg && (msg.toLowerCase().includes('password') || 
                msg.toLowerCase().includes(wrongPassMsg.toLowerCase()) ||
                msg.toLowerCase().includes(wrongHashMsg.toLowerCase()))) {
      // It's a password error - show our custom message instead
      isProcessing = false;
      clearTimeout(loadingTimer);
      setLoading(false);
      setMessage(getText('encrypt_wrong_password', msg), 'error');
      if (input) { 
        input.classList.add('shake'); 
        input.focus(); 
        input.select(); 
      }
      setTimeout(() => { if (input) input.classList.remove('shake'); }, 500);
      return; // Don't show native alert
    }
    
    // For other alerts, use original
    originalAlert.call(window, msg);
  };

  // Auto-decrypt if hbe.js stored password in localStorage (uses different key format)
  // hbe.js uses 'hexo-blog-encrypt:#/path' format
  if (input) {
    setTimeout(() => input.focus(), 200);
  }

  // Watch for container changes that indicate successful decryption
  // hbe.js replaces container innerHTML on success
  const containerObserver = new MutationObserver(() => {
    // 仅清除默认提示，避免因误判而提前隐藏界面
    removeDefaultPrompt();
    deduplicateControls();
    queryRefs();
    ensureToggleInsideWrapper();
    syncControlHeights();
  });
  containerObserver.observe(container, { childList: true, subtree: true });

  // Handle Enter key on input - let native keydown bubble to hbe.js
  // We just set our loading state, hbe.js will handle the actual decryption
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !button?.disabled && !isProcessing) {
        // For native Enter key presses (e.isTrusted === true),
        // hbe.js will receive the event via bubbling
        // We just need to set our loading state
        // Accept both trusted and synthetic events to ensure compatibility
        
        isProcessing = true;
        setLoading(true);
        setMessage('', null);
        
        // Don't prevent default or stop propagation - let hbe.js handle it
      }
    });
  }

  // Handle button click - trigger decrypt
  if (button) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      triggerDecrypt();
    });
  }

  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      togglePasswordVisibility();
    });
  }

  if (reEncrypt) {
    reEncrypt.addEventListener('click', () => window.location.reload());
  }

  // Event delegation to handle dynamically swapped/replaced controls
  container.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const btnUnlock = t.closest('#hbe-button');
    const btnToggle = t.closest('#hbe-toggle-password');
    const btnReEncrypt = t.closest('#hbe-encrypt-again');
    if (btnUnlock) {
      e.preventDefault();
      triggerDecrypt();
      return;
    }
    if (btnToggle) {
      e.preventDefault();
      togglePasswordVisibility();
      return;
    }
    if (btnReEncrypt) {
      e.preventDefault();
      window.location.reload();
      return;
    }
  });
});
