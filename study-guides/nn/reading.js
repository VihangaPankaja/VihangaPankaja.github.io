(() => {
  'use strict';
  let cleanups = [];
  const scrollToSection = section => {
    const target = document.getElementById(decodeURIComponent(section));
    if (!target) return;
    let parent = target.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    target.scrollIntoView({behavior:'instant'});
  };

  const initializeMain = root => {
  initializeExplorers(root);
  const mathHints = new WeakMap();
  const repairMath = () => {
    root.querySelectorAll('math,.walk code').forEach(expression => {
      if (expression.closest('.equation,.math-scroll,.table-scroll,pre')) return;
      const scope = expression.closest('.example-input,.step') || expression.closest('p,li,summary,figcaption,h2,h3,h4');
      if (!scope) return;
      const style = getComputedStyle(scope);
      const available = scope.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const box = expression.getBoundingClientRect(), bounds = scope.getBoundingClientRect();
      if (available <= 0 || !box.width) return;
      if (Math.max(box.width, expression.scrollWidth) <= available && box.right <= bounds.right - parseFloat(style.paddingRight) + 1
          && box.left >= bounds.left + parseFloat(style.paddingLeft) - 1) return;
      const region = document.createElement('span');
      region.className = 'math-scroll';
      expression.before(region); region.append(expression);
    });
    root.querySelectorAll('.equation,.math-scroll').forEach(region => {
      if (!region.getClientRects().length) return;
      const pannable = region.scrollWidth > region.clientWidth + 2;
      let hint = mathHints.get(region);
      if (!hint && pannable) {
        hint = document.createElement('span'); hint.className = 'math-hint';
        hint.textContent = 'Scroll within the formula to read the complete expression.';
        region.after(hint); mathHints.set(region, hint);
      }
      if (hint) hint.hidden = !pannable;
      if (pannable) {
        region.tabIndex = 0; region.setAttribute('role','region');
        region.setAttribute('aria-label','Mathematical expression, scroll horizontally');
      }
    });
  };
  const panFocusedRegion = event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const region = event.target.closest('.math-scroll,.equation,.table-scroll,.diagram-frame');
    if (!region || event.target !== region || region.scrollWidth <= region.clientWidth + 1) return;
    event.preventDefault();
    region.scrollLeft += event.key === 'ArrowRight' ? 40 : -40;
  };
  root.addEventListener('keydown', panFocusedRegion);
  cleanups.push(() => root.removeEventListener('keydown', panFocusedRegion));
  root.querySelectorAll('table').forEach(table => {
    let region = table.parentElement;
    if (!region.classList.contains('table-scroll')) {
      region = document.createElement('div'); region.className = 'table-scroll';
      table.before(region); region.append(table);
    }
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Scrollable comparison table');
    const hint = document.createElement('p');
    hint.className = 'table-hint'; hint.textContent = 'Scroll sideways to see all columns →';
    region.before(hint);
    const updateHint = () => { hint.hidden = table.scrollWidth <= region.clientWidth + 1; };
    const observer = new ResizeObserver(updateHint); observer.observe(region); cleanups.push(() => observer.disconnect()); updateHint();
  });
  root.querySelectorAll('.diagram-frame').forEach(frame => {
    frame.tabIndex = 0;
    frame.setAttribute('role','region'); frame.setAttribute('aria-label','Neural network and fuzzy-system diagram, scroll to inspect wider states');
    const hint = document.createElement('p'); hint.className = 'diagram-hint';
    hint.textContent = 'Scroll within the diagram to inspect all labels.'; frame.after(hint);
    const update = () => {
      const pannable = frame.scrollWidth > frame.clientWidth + 1 || frame.scrollHeight > frame.clientHeight + 1;
      hint.hidden = !pannable;
      frame.classList.toggle('is-pannable', pannable);
    };
    const observer = new ResizeObserver(update); observer.observe(frame); cleanups.push(() => observer.disconnect()); update();
  });
  root.querySelectorAll('.walk').forEach(walk => {
    const steps = [...walk.querySelectorAll(':scope > .step')];
    let current = 0, timer = null;
    const prev = walk.querySelector('[data-action=prev]');
    const next = walk.querySelector('[data-action=next]');
    const play = walk.querySelector('[data-action=play]');
    const stop = () => { clearInterval(timer); timer = null; play.textContent = 'Play'; play.setAttribute('aria-pressed','false'); };
    const show = index => {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach((step, i) => { step.classList.toggle('active', i === current); step.setAttribute('aria-hidden', walk.dataset.view === 'all' || i === current ? 'false' : 'true'); });
      walk.querySelector('output').textContent = walk.dataset.view === 'all' ? `All ${steps.length} steps` : `Step ${current + 1} of ${steps.length}`;
      prev.disabled = current === 0; next.disabled = current === steps.length - 1;
      repairMath();
      if (next.disabled) stop();
    };
    const all = document.createElement('button');
    all.type = 'button'; all.dataset.action = 'all'; all.textContent = 'Show all steps';
    all.setAttribute('aria-pressed', 'false');
    walk.querySelector('.walk-controls').append(all);
    const setView = expanded => {
      walk.dataset.view = expanded ? 'all' : 'single';
      all.textContent = expanded ? 'One step at a time' : 'Show all steps';
      all.setAttribute('aria-pressed', String(expanded));
      walk.querySelector('output').textContent = expanded ? `All ${steps.length} steps` : `Step ${current + 1} of ${steps.length}`;
      steps.forEach((step, i) => step.setAttribute('aria-hidden', expanded || walk.dataset.view === 'all' || i === current ? 'false' : 'true'));
      repairMath();
    };
    all.addEventListener('click', () => { stop(); setView(walk.dataset.view !== 'all'); });
    walk.dataset.ready = 'true'; show(0);
    prev.addEventListener('click', () => { stop(); show(current - 1); });
    next.addEventListener('click', () => { stop(); show(current + 1); });
    walk.querySelector('[data-action=reset]').addEventListener('click', () => { stop(); show(0); });
    play.addEventListener('click', () => {
      if (timer) { stop(); return; }
      if (current === steps.length - 1) show(0);
      play.textContent = 'Pause'; play.setAttribute('aria-pressed','true');
      timer = setInterval(() => show(current + 1), 1700);
    });
    walk.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target.closest('.math-scroll,.equation,.table-scroll,.diagram-frame')) return;
      event.preventDefault(); stop(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    cleanups.push(stop);
  });
  const mathObserver = new ResizeObserver(repairMath); mathObserver.observe(root);
  root.addEventListener('toggle', repairMath, true);
  cleanups.push(() => { mathObserver.disconnect(); root.removeEventListener('toggle', repairMath, true); });
  repairMath();
  };
  initializeMain(document.querySelector('main') || document);
  const menu = document.querySelector('.menu'), sidebar = document.querySelector('#sidebar');
  menu?.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open));
    if (open) document.querySelector('#topic-filter').focus();
  });
  const filter = document.querySelector('#topic-filter');
  const aliases = {'short note':'revision recap summary cheat sheet',neuron:'activation threshold weighted sum bias',perceptron:'threshold logic decision boundary learning',adaline:'lms least mean squares madaline widrow hoff',backpropagation:'gradient chain rule delta multilayer',pnn:'probabilistic pattern classification radial basis',fuzzy:'membership set relation composition fuzzification defuzzification',membership:'fuzzification defuzzification centroid',logic:'linguistic variable rule inference',anfis:'mamdani sugeno tsukamoto adaptive neuro fuzzy'};
  filter?.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase(); let total = 0;
    document.querySelectorAll('.nav-group').forEach(group => {
      let count = 0;
      group.querySelectorAll('.nav-entry').forEach(link => {
        const title = link.textContent.toLowerCase();
        const extra = Object.entries(aliases).filter(([key]) => title.includes(key)).map(([,value]) => value).join(' ');
        const match = (title + ' ' + extra).includes(query); link.hidden = !match;
        if (match) { count++; total++; }
      }); group.hidden = count === 0;
    }); document.querySelector('#no-topics').hidden = total > 0;
  });
  const expand = document.querySelector('#examples');
  if (expand) expand.hidden = document.querySelectorAll('details').length === 0;
  expand?.addEventListener('click', () => {
    const details = [...document.querySelectorAll('details')];
    const open = details.some(item => !item.open);
    details.forEach(item => { item.open = open; });
    expand.textContent = open ? 'Collapse all' : 'Expand all';
  });
  const theme = document.querySelector('#theme');
  const themeOptions = document.querySelector('#theme-options');
  const system = matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = document.documentElement.dataset.themeChoice || 'system';
  const applyTheme = choice => {
    themeChoice = choice;
    document.documentElement.dataset.themeChoice = choice;
    document.documentElement.dataset.theme = choice === 'system' ? (system.matches ? 'dark' : 'light') : choice;
    const label = choice[0].toUpperCase() + choice.slice(1);
    const current = document.querySelector('#theme-current');
    if (current) current.textContent = label;
    theme?.setAttribute('aria-label', 'Color theme: ' + label);
    themeOptions?.querySelectorAll('[data-theme-value]').forEach(option => {
      option.setAttribute('aria-checked', String(option.dataset.themeValue === choice));
    });
  };
  if (theme && themeOptions) {
    const options = [...themeOptions.querySelectorAll('[data-theme-value]')];
    const closeTheme = focus => {
      themeOptions.hidden = true; theme.setAttribute('aria-expanded', 'false');
      if (focus) theme.focus({preventScroll:true});
    };
    const openTheme = () => {
      themeOptions.hidden = false; theme.setAttribute('aria-expanded', 'true');
      options.find(option => option.dataset.themeValue === themeChoice)?.focus({preventScroll:true});
    };
    // Native focus on a sticky header control scrolls Chrome's document toward it.
    theme.parentElement.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      const button = event.target.closest('button');
      if (button) { event.preventDefault(); button.focus({preventScroll:true}); }
    });
    theme.addEventListener('click', () => themeOptions.hidden ? openTheme() : closeTheme(true));
    theme.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openTheme(); }
    });
    options.forEach(option => option.addEventListener('click', () => {
      applyTheme(option.dataset.themeValue);
      try { localStorage.setItem('nn-theme', themeChoice); } catch {}
      closeTheme(true);
    }));
    themeOptions.addEventListener('keydown', event => {
      const index = options.indexOf(document.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % options.length;
      if (event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = options.length - 1;
      if (next !== undefined) { event.preventDefault(); options[next].focus({preventScroll:true}); }
      if (event.key === 'Escape') { event.preventDefault(); closeTheme(true); }
      if (event.key === 'Tab') closeTheme(true);
    });
    document.addEventListener('click', event => {
      if (!theme.parentElement.contains(event.target)) closeTheme(false);
    });
    applyTheme(themeChoice);
    system.addEventListener('change', () => {
      if (themeChoice === 'system') applyTheme('system');
    });
  }
  const pages = window.NN_PAGES;
  const baseSlug = () => decodeURIComponent(location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  const currentSlug = () => new URLSearchParams(location.hash.slice(1)).get('topic') || baseSlug();
  const sectionFromHash = hash => new URLSearchParams(hash.slice(1)).get('section') || (hash.startsWith('#topic=') ? '' : hash.slice(1));
  let displayed = baseSlug();
  const navigate = (url, push, requestedSlug) => {
    const slug = requestedSlug || decodeURIComponent(url.pathname.split('/').pop()).replace(/\.html$/, '');
    const page = pages?.[slug];
    if (!page) return false;
    const railScroll = sidebar?.scrollTop || 0;
    cleanups.forEach(cleanup => cleanup()); cleanups = [];
    const main = document.querySelector('main');
    main.innerHTML = page.content;
    document.title = page.title;
    document.querySelector('meta[name=description]')?.setAttribute('content', page.description);
    document.querySelectorAll('#sidebar a').forEach(link => {
      if (link.getAttribute('href') === slug + '.html') link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    initializeMain(main);
    if (expand) { expand.textContent = 'Expand all'; expand.hidden = main.querySelectorAll('details').length === 0; }
    const section = sectionFromHash(url.hash);
    if (push) {
      if (location.protocol === 'file:') {
        const route = new URLSearchParams({topic:slug});
        if (section) route.set('section',section);
        history.pushState({slug}, '', '#' + route.toString());
      } else history.pushState({slug}, '', url.href);
    }
    displayed = slug;
    sidebar?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false');
    if (sidebar) sidebar.scrollTop = railScroll;
    window.scrollTo({top:0, behavior:'instant'});
    if (section) {
      scrollToSection(section);
    }
    return true;
  };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (location.protocol === 'file:' && link.getAttribute('href').startsWith('#')) {
      const section = link.getAttribute('href').slice(1);
      const route = new URLSearchParams({topic:displayed,section});
      event.preventDefault(); history.pushState({slug:displayed}, '', '#' + route.toString());
      scrollToSection(section);
      return;
    }
    const url = new URL(link.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host || url.pathname.slice(0,url.pathname.lastIndexOf('/')) !== location.pathname.slice(0,location.pathname.lastIndexOf('/'))) return;
    if (!url.pathname.endsWith('.html')) return;
    const slug = decodeURIComponent(url.pathname.split('/').pop()).replace(/\.html$/, '');
    if (!pages?.[slug]) return;
    event.preventDefault(); navigate(url, true);
  });
  window.addEventListener('popstate', () => {
    if (currentSlug() !== displayed) navigate(new URL(location.href), false, currentSlug());
    else {
      const section = sectionFromHash(location.hash);
      if (section) scrollToSection(section);
      else window.scrollTo({top:0,behavior:'instant'});
    }
  });
  if (currentSlug() !== displayed) navigate(new URL(location.href), false, currentSlug());
  else {
    const section = sectionFromHash(location.hash);
    if (section) scrollToSection(section);
  }
})();
