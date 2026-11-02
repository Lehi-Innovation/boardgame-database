/**
 * Notion-style composable filter bar.
 * Self-contained vanilla JS — no dependencies beyond common.css classes.
 *
 * Usage:
 *   const fb = new FilterBar(document.getElementById('filter-bar'));
 *   fb.on('change', (filters) => fetchGames(filters));
 */

/* global history, URLSearchParams */

(function () {
  'use strict';

  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  // ============ Filter Type Definitions ============

  const FILTER_TYPES = {
    q:                { label: 'Text Search',      group: 0, kind: 'text',       color: 'var(--text-muted)' },
    possible_counts:  { label: 'Supports Your Group', group: 1, kind: 'toggles', color: 'var(--accent)' },
    true_counts:      { label: 'Suggested Group Sizes', group: 1, kind: 'toggles', color: 'var(--accent)' },
    year:             { label: 'Year Range',        group: 1, kind: 'range',      color: 'var(--accent)' },
    playtime:         { label: 'Playtime Range',    group: 1, kind: 'range',      color: 'var(--accent)', suffix: 'min' },
    mechanics:        { label: 'Mechanics',         group: 2, kind: 'multiselect',color: 'var(--chip-mechanic-text)' },
    styles:           { label: 'Styles',            group: 2, kind: 'multiselect',color: 'var(--chip-style-text)' },
    themes:           { label: 'Themes',            group: 2, kind: 'multiselect',color: 'var(--chip-theme-text)' },
    evokes:           { label: 'Evokes',            group: 3, kind: 'multiselect',color: 'var(--chip-evoke-text)' },
    rules_complexity: { label: 'Rules Complexity',  group: 4, kind: 'rating',     color: 'var(--dot-objective)' },
    strategic_depth:  { label: 'Strategic Depth',   group: 4, kind: 'rating',     color: 'var(--dot-objective)' },
    length:           { label: 'Length',             group: 4, kind: 'rating',     color: 'var(--dot-objective)' },
    feel:             { label: 'Feel',              group: 4, kind: 'rating',     color: 'var(--dot-objective)' },
    value:            { label: 'Value',             group: 4, kind: 'rating',     color: 'var(--dot-objective)' },
    designer:         { label: 'Designer',          group: 5, kind: 'searchselect',color:'var(--chip-designer-text)' },
    publisher:        { label: 'Publisher',         group: 5, kind: 'searchselect',color:'var(--chip-publisher-text)' },
  };

  const GROUP_LABELS = ['', 'Range Filters', 'Categories', 'Feelings', 'Ratings', 'People'];

  // ============ FilterBar Class ============

  class FilterBar {
    constructor(containerEl) {
      this.container = containerEl;
      this.filters = {};          // { filterId: value }
      this.options = null;        // fetched from /api/filter-options
      this.listeners = [];
      this.debounceTimer = null;
      this.openDropdown = null;   // currently open dropdown element

      this._injectStyles();
      this._render();
      this._loadFromURL();
      this._fetchOptions();

      // Close dropdowns on outside click
      document.addEventListener('click', (e) => {
        if (!this.container.contains(e.target)) this._closeDropdown();
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this._closeDropdown();
      });
    }

    on(event, fn) { this.listeners.push({ event, fn }); }

    getFilters() { return { ...this.filters }; }

    _emit() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._saveToURL();
        const filters = this._buildAPIFilters();
        this.listeners.forEach(l => { if (l.event === 'change') l.fn(filters); });
      }, 200);
    }

    // Convert internal state to API query params format
    _buildAPIFilters() {
      const f = {};
      for (const [key, val] of Object.entries(this.filters)) {
        if (val === null || val === undefined) continue;
        if (key === 'q') { if (val) f.q = val; }
        else if (key === 'true_counts' || key === 'possible_counts') { if (val.length) f[key] = val; }
        else if (key === 'year') { if (val.min != null) f.year_min = val.min; if (val.max != null) f.year_max = val.max; }
        else if (key === 'playtime') { if (val.min != null) f.playtime_min = val.min; if (val.max != null) f.playtime_max = val.max; }
        else if (key === 'mechanics' || key === 'styles' || key === 'themes') {
          if (val.length) f.categories = (f.categories || []).concat(val);
        }
        else if (key === 'evokes') { if (val.length) f.evokes = val; }
        else if (['rules_complexity','strategic_depth','length','feel','value'].includes(key)) {
          if (val.min != null) f[`${key}_min`] = val.min;
          if (val.max != null) f[`${key}_max`] = val.max;
        }
        else if (key === 'designer' || key === 'publisher') { if (val) f[key] = val; }
      }
      return f;
    }

    _saveToURL() {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(this.filters)) {
        if (val === null || val === undefined) continue;
        if (key === 'q' && val) params.set('q', val);
        else if ((key === 'true_counts' || key === 'possible_counts') && val.length) params.set(key, val.join(','));
        else if ((key === 'year' || key === 'playtime') && (val.min != null || val.max != null)) {
          if (val.min != null) params.set(`${key}_min`, val.min);
          if (val.max != null) params.set(`${key}_max`, val.max);
        }
        else if (['mechanics','styles','themes','evokes'].includes(key) && val.length) {
          params.set(key, val.join(','));
        }
        else if (['rules_complexity','strategic_depth','length','feel','value'].includes(key)) {
          if (val.min != null) params.set(`${key}_min`, val.min);
          if (val.max != null) params.set(`${key}_max`, val.max);
        }
        else if ((key === 'designer' || key === 'publisher') && val) params.set(key, val);
      }
      // Preserve sort/view params
      const current = new URLSearchParams(window.location.search);
      for (const p of ['sort', 'dir', 'view', 'page']) {
        if (current.has(p)) params.set(p, current.get(p));
      }
      const qs = params.toString();
      history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    }

    _loadFromURL() {
      const params = new URLSearchParams(window.location.search);
      if (params.has('q')) this.filters.q = params.get('q');
      if (params.has('true_counts')) this.filters.true_counts = params.get('true_counts').split(',');
      if (params.has('possible_counts')) this.filters.possible_counts = params.get('possible_counts').split(',');
      for (const key of ['year', 'playtime']) {
        const min = params.get(`${key}_min`);
        const max = params.get(`${key}_max`);
        if (min != null || max != null) {
          this.filters[key] = { min: min ? parseInt(min) : null, max: max ? parseInt(max) : null };
        }
      }
      for (const key of ['mechanics','styles','themes','evokes']) {
        if (params.has(key)) this.filters[key] = params.get(key).split(',');
      }
      for (const key of ['rules_complexity','strategic_depth','length','feel','value']) {
        const min = params.get(`${key}_min`);
        const max = params.get(`${key}_max`);
        if (min != null || max != null) {
          this.filters[key] = { min: min != null ? parseInt(min) : null, max: max != null ? parseInt(max) : null };
        }
      }
      for (const key of ['designer','publisher']) {
        if (params.has(key)) this.filters[key] = params.get(key);
      }
    }

    async _fetchOptions() {
      try {
        const res = await fetch('/api/filter-options');
        if (res.ok) {
          this.options = await res.json();
          this._renderChips();
          // Initial emit if filters were loaded from URL
          if (Object.keys(this.filters).length > 0) this._emit();
        }
      } catch (e) {
        console.warn('Failed to load filter options:', e);
      }
    }

    _render() {
      this.container.innerHTML = '';
      this.container.className = 'filter-bar-container';

      this.chipsEl = document.createElement('div');
      this.chipsEl.className = 'fb-chips';

      this.addBtn = document.createElement('button');
      this.addBtn.className = 'btn btn-ghost btn-sm fb-add-btn';
      this.addBtn.textContent = '+ Add Filter';
      this.addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleFilterMenu();
      });

      this.container.appendChild(this.chipsEl);
      this.container.appendChild(this.addBtn);
    }

    _renderChips() {
      this.chipsEl.innerHTML = '';
      for (const [key, val] of Object.entries(this.filters)) {
        if (val === null || val === undefined) continue;
        const def = FILTER_TYPES[key];
        if (!def) continue;
        const summary = this._chipSummary(key, val);
        if (!summary) continue;

        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
          <span class="filter-chip-color" style="background:${def.color}"></span>
          <span class="filter-chip-label">${def.label}:</span>
          <span class="filter-chip-value">${escapeHTML(summary)}</span>
          <button class="filter-chip-remove" data-key="${key}">&times;</button>
        `;

        chip.querySelector('.filter-chip-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          delete this.filters[key];
          this._renderChips();
          this._emit();
        });

        chip.addEventListener('click', (e) => {
          if (e.target.closest('.filter-chip-remove')) return;
          e.stopPropagation();
          this._openEditor(key, chip);
        });

        this.chipsEl.appendChild(chip);
      }
    }

    _chipSummary(key, val) {
      const def = FILTER_TYPES[key];
      if (!def) return null;
      if (def.kind === 'text') return val || null;
      if (def.kind === 'multiselect' || def.kind === 'toggles') {
        if (!val || !val.length) return null;
        if (val.length === 1) return val[0];
        return `${val[0]} +${val.length - 1}`;
      }
      if (def.kind === 'range') {
        if (val.min != null && val.max != null) return `${val.min}\u2013${val.max}${def.suffix ? ' ' + def.suffix : ''}`;
        if (val.min != null) return `${val.min}+${def.suffix ? ' ' + def.suffix : ''}`;
        if (val.max != null) return `\u2264${val.max}${def.suffix ? ' ' + def.suffix : ''}`;
        return null;
      }
      if (def.kind === 'rating') {
        if (val.min != null && val.max != null) return `${val.min}\u2013${val.max}`;
        if (val.min != null) return `${val.min}+`;
        if (val.max != null) return `\u2264${val.max}`;
        return null;
      }
      if (def.kind === 'searchselect') return val || null;
      return null;
    }

    // ============ Filter Menu ============

    _toggleFilterMenu() {
      if (this.openDropdown) { this._closeDropdown(); return; }

      const menu = document.createElement('div');
      menu.className = 'fb-dropdown fb-menu';

      let lastGroup = -1;
      for (const [key, def] of Object.entries(FILTER_TYPES)) {
        if (def.group !== lastGroup) {
          if (lastGroup >= 0) {
            const sep = document.createElement('div');
            sep.className = 'fb-sep';
            menu.appendChild(sep);
          }
          lastGroup = def.group;
        }
        const item = document.createElement('div');
        item.className = 'fb-menu-item';
        if (this.filters[key] !== undefined) item.classList.add('active');
        item.textContent = def.label;
        item.dataset.key = key;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this._closeDropdown();
          this._addFilter(key);
        });
        menu.appendChild(item);
      }

      this._showDropdown(menu, this.addBtn);
    }

    _addFilter(key) {
      const def = FILTER_TYPES[key];
      if (!def) return;

      // Initialize default value if not present
      if (this.filters[key] === undefined) {
        if (def.kind === 'text') this.filters[key] = '';
        else if (def.kind === 'multiselect' || def.kind === 'toggles') this.filters[key] = [];
        else if (def.kind === 'range' || def.kind === 'rating') this.filters[key] = { min: null, max: null };
        else if (def.kind === 'searchselect') this.filters[key] = '';
      }

      this._renderChips();

      // Open the editor for the newly added filter
      requestAnimationFrame(() => {
        const chip = this.chipsEl.querySelector(`[data-key="${key}"]`)?.closest('.filter-chip');
        // If chip exists, anchor to it; otherwise anchor to the add button
        this._openEditor(key, chip || this.addBtn);
      });
    }

    // ============ Filter Editors ============

    _openEditor(key, anchorEl) {
      this._closeDropdown();
      const def = FILTER_TYPES[key];
      if (!def) return;

      let editor;
      if (def.kind === 'text') editor = this._buildTextEditor(key);
      else if (def.kind === 'multiselect') editor = this._buildMultiSelectEditor(key);
      else if (def.kind === 'toggles') editor = this._buildTogglesEditor(key);
      else if (def.kind === 'range') editor = this._buildRangeEditor(key);
      else if (def.kind === 'rating') editor = this._buildRatingEditor(key);
      else if (def.kind === 'searchselect') editor = this._buildSearchSelectEditor(key);
      else return;

      this._showDropdown(editor, anchorEl);
    }

    _buildTextEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Search...';
      input.value = this.filters[key] || '';
      input.addEventListener('input', () => {
        this.filters[key] = input.value;
        this._renderChips();
        this._emit();
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._closeDropdown(); });
      div.appendChild(input);
      setTimeout(() => input.focus(), 50);
      return div;
    }

    _buildMultiSelectEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor fb-multiselect';

      const search = document.createElement('input');
      search.type = 'text';
      search.placeholder = 'Search...';
      search.className = 'fb-editor-search';
      div.appendChild(search);

      const listEl = document.createElement('div');
      listEl.className = 'fb-checklist';

      const items = this._getOptionsForKey(key);
      const selected = new Set(this.filters[key] || []);

      const renderList = (filter) => {
        listEl.innerHTML = '';
        const f = filter ? filter.toLowerCase() : '';
        const filtered = f ? items.filter(i => i.toLowerCase().includes(f)) : items;
        for (const item of filtered) {
          const row = document.createElement('label');
          row.className = 'fb-check-item' + (selected.has(item) ? ' checked' : '');
          row.innerHTML = `<span class="fb-checkbox">${selected.has(item) ? '\u2713' : ''}</span><span>${item}</span>`;
          row.addEventListener('click', (e) => {
            e.preventDefault();
            if (selected.has(item)) selected.delete(item);
            else selected.add(item);
            this.filters[key] = [...selected];
            this._renderChips();
            this._emit();
            renderList(search.value);
          });
          listEl.appendChild(row);
        }
      };

      search.addEventListener('input', () => renderList(search.value));
      renderList('');

      div.appendChild(listEl);

      if (selected.size > 0) {
        const clear = document.createElement('button');
        clear.className = 'btn btn-ghost btn-sm';
        clear.style.cssText = 'margin-top:8px;width:100%';
        clear.textContent = 'Clear all';
        clear.addEventListener('click', () => {
          this.filters[key] = [];
          this._renderChips();
          this._emit();
          this._closeDropdown();
        });
        div.appendChild(clear);
      }

      setTimeout(() => search.focus(), 50);
      return div;
    }

    _buildTogglesEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor';
      const label = document.createElement('div');
      label.className = 'fb-editor-label';
      label.textContent = key === 'possible_counts' ? 'Supported player counts' : 'Suggested counts (estimates)';
      div.appendChild(label);

      const row = document.createElement('div');
      row.className = 'fb-toggle-row';

      const counts = this.options ? (key === 'possible_counts' ? this.options.supported_player_counts : this.options.player_counts) : [];
      const selected = new Set(this.filters[key] || []);

      for (const c of counts) {
        const btn = document.createElement('button');
        btn.className = 'fb-toggle-btn' + (selected.has(c) ? ' active' : '');
        btn.textContent = c;
        btn.addEventListener('click', () => {
          if (selected.has(c)) selected.delete(c);
          else selected.add(c);
          this.filters[key] = [...selected];
          btn.classList.toggle('active');
          this._renderChips();
          this._emit();
        });
        row.appendChild(btn);
      }
      div.appendChild(row);
      return div;
    }

    _buildRangeEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor';
      const val = this.filters[key] || { min: null, max: null };
      const def = FILTER_TYPES[key];

      const row = document.createElement('div');
      row.className = 'fb-range-row';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.placeholder = 'Min';
      minInput.value = val.min ?? '';
      minInput.style.width = '80px';

      const sep = document.createElement('span');
      sep.textContent = '\u2013';
      sep.style.cssText = 'color:var(--text-muted);margin:0 8px';

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.placeholder = 'Max';
      maxInput.value = val.max ?? '';
      maxInput.style.width = '80px';

      if (def.suffix) {
        const suf = document.createElement('span');
        suf.textContent = def.suffix;
        suf.style.cssText = 'color:var(--text-muted);margin-left:6px;font-size:13px';
        row.appendChild(minInput);
        row.appendChild(sep);
        row.appendChild(maxInput);
        row.appendChild(suf);
      } else {
        row.appendChild(minInput);
        row.appendChild(sep);
        row.appendChild(maxInput);
      }

      const update = () => {
        const min = minInput.value ? parseInt(minInput.value) : null;
        const max = maxInput.value ? parseInt(maxInput.value) : null;
        this.filters[key] = { min, max };
        this._renderChips();
        this._emit();
      };

      minInput.addEventListener('input', update);
      maxInput.addEventListener('input', update);

      div.appendChild(row);
      setTimeout(() => minInput.focus(), 50);
      return div;
    }

    _buildRatingEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor';
      const val = this.filters[key] || { min: null, max: null };

      const makeRow = (label, current, onSelect) => {
        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px';
        const lbl = document.createElement('div');
        lbl.className = 'fb-editor-label';
        lbl.textContent = label;
        row.appendChild(lbl);

        const btns = document.createElement('div');
        btns.className = 'fb-toggle-row';
        for (const [raw, description] of Object.entries(this.options?.schema?.ratings?.[key]?.values || CatalogSchema.ratings[key].values)) {
          const i = Number(raw);
          const btn = document.createElement('button');
          btn.className = 'fb-toggle-btn' + (current === i ? ' active' : '');
          btn.textContent = i;
          btn.title = description;
          btn.setAttribute('aria-label', `${i}: ${description}`);
          btn.addEventListener('click', () => {
            // Toggle off if same value
            const newVal = current === i ? null : i;
            onSelect(newVal);
            btns.querySelectorAll('.fb-toggle-btn').forEach((b, idx) => {
              b.classList.toggle('active', idx === newVal);
            });
          });
          btns.appendChild(btn);
        }
        row.appendChild(btns);
        return row;
      };

      div.appendChild(makeRow('Min', val.min, (v) => {
        this.filters[key] = { ...this.filters[key], min: v };
        this._renderChips();
        this._emit();
      }));

      div.appendChild(makeRow('Max', val.max, (v) => {
        this.filters[key] = { ...this.filters[key], max: v };
        this._renderChips();
        this._emit();
      }));

      return div;
    }

    _buildSearchSelectEditor(key) {
      const div = document.createElement('div');
      div.className = 'fb-dropdown fb-editor fb-multiselect';

      const search = document.createElement('input');
      search.type = 'text';
      search.placeholder = `Search ${FILTER_TYPES[key].label.toLowerCase()}s...`;
      search.className = 'fb-editor-search';
      search.value = this.filters[key] || '';
      div.appendChild(search);

      const listEl = document.createElement('div');
      listEl.className = 'fb-checklist';

      const items = this._getOptionsForKey(key);
      const currentVal = this.filters[key] || '';

      const renderList = (filter) => {
        listEl.innerHTML = '';
        const f = filter ? filter.toLowerCase() : '';
        const filtered = f ? items.filter(i => i.toLowerCase().includes(f)) : items.slice(0, 50);
        for (const item of filtered) {
          const row = document.createElement('div');
          row.className = 'fb-check-item' + (item === currentVal ? ' checked' : '');
          row.textContent = item;
          row.addEventListener('click', () => {
            this.filters[key] = item === this.filters[key] ? '' : item;
            this._renderChips();
            this._emit();
            this._closeDropdown();
          });
          listEl.appendChild(row);
        }
      };

      search.addEventListener('input', () => {
        this.filters[key] = search.value;
        this._renderChips();
        this._emit();
        renderList(search.value);
      });
      renderList('');

      div.appendChild(listEl);
      setTimeout(() => search.focus(), 50);
      return div;
    }

    _getOptionsForKey(key) {
      if (!this.options) return [];
      if (key === 'mechanics') return this.options.mechanics || [];
      if (key === 'styles') return this.options.styles || [];
      if (key === 'themes') return this.options.themes || [];
      if (key === 'evokes') return this.options.evokes || [];
      if (key === 'designer') return this.options.designers || [];
      if (key === 'publisher') return this.options.publishers || [];
      return [];
    }

    // ============ Dropdown Positioning ============

    _showDropdown(el, anchor) {
      this._closeDropdown();
      el.style.position = 'absolute';
      this.container.style.position = 'relative';
      this.container.appendChild(el);

      // Position below anchor
      const anchorRect = anchor.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      el.style.top = (anchorRect.bottom - containerRect.top + 4) + 'px';
      el.style.left = Math.max(0, anchorRect.left - containerRect.left) + 'px';

      // Ensure it doesn't go off-screen right
      requestAnimationFrame(() => {
        const elRect = el.getBoundingClientRect();
        if (elRect.right > window.innerWidth - 16) {
          el.style.left = 'auto';
          el.style.right = '0';
        }
      });

      this.openDropdown = el;
    }

    _closeDropdown() {
      if (this.openDropdown) {
        this.openDropdown.remove();
        this.openDropdown = null;
      }
    }

    // ============ Injected Styles ============

    _injectStyles() {
      if (document.getElementById('fb-styles')) return;
      const style = document.createElement('style');
      style.id = 'fb-styles';
      style.textContent = `
        .filter-bar-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          position: relative;
        }
        .fb-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .fb-dropdown {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 500;
          min-width: 200px;
          max-width: 300px;
          padding: 8px;
          animation: fadeIn 0.15s ease-out;
        }
        .fb-menu { padding: 4px; }
        .fb-menu-item {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          color: var(--text);
          transition: background 0.1s;
        }
        .fb-menu-item:hover { background: var(--elevated); }
        .fb-menu-item.active { color: var(--accent); }
        .fb-sep {
          height: 1px;
          background: var(--border);
          margin: 4px 8px;
        }
        .fb-editor { padding: 12px; }
        .fb-editor input[type="text"],
        .fb-editor input[type="number"] {
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          padding: 6px 10px;
          font-size: 13px;
          outline: none;
          width: 100%;
        }
        .fb-editor input:focus {
          border-color: var(--accent);
        }
        .fb-editor-search {
          margin-bottom: 8px;
        }
        .fb-editor-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .fb-checklist {
          max-height: 240px;
          overflow-y: auto;
          margin: 0 -4px;
        }
        .fb-check-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          color: var(--text);
          transition: background 0.1s;
        }
        .fb-check-item:hover { background: var(--elevated); }
        .fb-check-item.checked { color: var(--accent); }
        .fb-checkbox {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border: 1px solid var(--border);
          border-radius: 3px;
          font-size: 11px;
          color: var(--accent);
          flex-shrink: 0;
        }
        .fb-check-item.checked .fb-checkbox {
          background: rgba(230,184,79,0.2);
          border-color: var(--accent);
        }
        .fb-toggle-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .fb-toggle-btn {
          padding: 6px 12px;
          border: 1px solid var(--border);
          background: var(--elevated);
          color: var(--text-muted);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.1s;
        }
        .fb-toggle-btn:hover { border-color: var(--text-muted); color: var(--text); }
        .fb-toggle-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: var(--bg);
        }
        .fb-range-row {
          display: flex;
          align-items: center;
        }
        .fb-range-row input { width: 80px !important; }
        .fb-multiselect { min-width: 240px; }
      `;
      document.head.appendChild(style);
    }
  }

  // Expose globally
  window.FilterBar = FilterBar;
})();
