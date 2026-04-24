(() => {
  const $ = id => document.getElementById(id);

  const submitBtn     = $('submitBtn');
  const clearBtn      = $('clearBtn');
  const dataInput     = $('dataInput');
  const errorBanner   = $('errorBanner');
  const errorText     = $('errorText');
  const resultsSection= $('results');
  const footerInfo    = $('footerInfo');
  const mainApp       = $('mainApp');

  // ═══ Hero → App transition ═══
  function leaveHero() {
    document.body.classList.remove('on-hero');
    mainApp.classList.remove('hidden');
    setTimeout(() => dataInput.focus(), 400);
  }

  $('ctaStart')?.addEventListener('click', leaveHero);
  $('ctaHow')?.addEventListener('click', leaveHero);
  $('scrollToInput')?.addEventListener('click', leaveHero);
  $('navExplorer')?.addEventListener('click', leaveHero);
  $('navResults')?.addEventListener('click', leaveHero);

  // ═══ Clear ═══
  clearBtn.addEventListener('click', () => {
    dataInput.value = '';
    dataInput.focus();
    resultsSection.classList.add('hidden');
    errorBanner.classList.add('hidden');
    footerInfo.classList.add('hidden');
    resetStats();
  });

  // ═══ Submit ═══
  submitBtn.addEventListener('click', async () => {
    errorBanner.classList.add('hidden');
    resultsSection.classList.add('hidden');
    footerInfo.classList.add('hidden');
    resetStats();
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const raw = dataInput.value.trim();
      if (!raw) throw new Error('Please enter nodes (e.g. A->B, C->D) or a JSON object.');

      let payload;
      if (raw.startsWith('{')) {
        try {
          payload = JSON.parse(raw);
          if (!payload.data || !Array.isArray(payload.data)) {
            throw new Error('JSON must contain a "data" array.');
          }
        } catch (e) {
          throw new Error('Invalid JSON format. Check your syntax or use raw text.');
        }
      } else {
        // Assume raw comma-separated list
        const items = raw.split(',').map(s => s.trim()).filter(Boolean);
        payload = { data: items };
      }

      const res = await fetch('/bfhl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      const data = await res.json();
      render(data);

    } catch (err) {
      errorText.textContent = err.message || 'Unexpected error.';
      errorBanner.classList.remove('hidden');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  function resetStats() {
    $('statTrees').textContent = '—';
    $('statCycles').textContent = '—';
    $('statLargest').textContent = '—';
  }

  function render(data) {
    // Hero stats bar
    $('statTrees').textContent  = data.summary.total_trees;
    $('statCycles').textContent = data.summary.total_cycles;
    $('statLargest').textContent = data.summary.largest_tree_root || '—';

    // Tags
    fillTags($('invalidEntries'), data.invalid_entries, 't-inv');
    fillTags($('duplicateEdges'), data.duplicate_edges, 't-dup');

    // Hierarchies
    const grid = $('hierGrid');
    grid.innerHTML = '';
    (data.hierarchies || []).forEach(h => grid.appendChild(buildCard(h)));

    // Footer
    $('fUser').textContent  = `👤 ${data.user_id}`;
    $('fEmail').textContent = `✉ ${data.email_id}`;
    $('fRoll').textContent  = `# ${data.college_roll_number}`;
    footerInfo.classList.remove('hidden');

    resultsSection.classList.remove('hidden');

    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  function fillTags(container, list, cls) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.innerHTML = '<span class="tag-empty">None — all clear ✓</span>';
      return;
    }
    list.forEach(item => {
      const el = document.createElement('span');
      el.className = `tag ${cls}`;
      el.textContent = item;
      container.appendChild(el);
    });
  }

  function buildCard(h) {
    const isCycle = !!h.has_cycle;
    const card = document.createElement('div');
    card.className = 'hc';
    card.dataset.cycle = isCycle;

    const bar = document.createElement('div');
    bar.className = 'hc-bar';
    card.appendChild(bar);

    const head = document.createElement('div');
    head.className = 'hc-head';

    const root = document.createElement('div');
    root.className = 'hc-root';
    root.innerHTML = `<span class="hc-letter">${h.root}</span> Root: ${h.root}`;

    const badges = document.createElement('div');
    badges.className = 'hc-badges';
    if (isCycle) {
      badges.innerHTML = '<span class="hc-badge hc-badge-cycle">⟳ CYCLE</span>';
    } else {
      badges.innerHTML = `<span class="hc-badge hc-badge-depth">↕ Depth ${h.depth}</span>`;
    }

    head.appendChild(root);
    head.appendChild(badges);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'hc-body';

    if (isCycle) {
      body.innerHTML = `<p class="cycle-msg">Cyclic dependency group — no valid tree can be formed from node ${h.root}.</p>`;
    } else {
      const box = document.createElement('div');
      box.className = 'tree-box';
      let out = `<span class="n">${h.root}</span>\n`;
      branches(h.tree[h.root], '', (line) => { out += line; });
      box.innerHTML = out;
      body.appendChild(box);
    }

    card.appendChild(body);
    return card;
  }

  function branches(obj, prefix, emit) {
    const keys = Object.keys(obj);
    keys.forEach((key, i) => {
      const last = i === keys.length - 1;
      const conn = last ? '└── ' : '├── ';
      const ext  = last ? '    ' : '│   ';
      emit(`<span class="b">${prefix}${conn}</span><span class="n">${key}</span>\n`);
      branches(obj[key], prefix + ext, emit);
    });
  }
})();
