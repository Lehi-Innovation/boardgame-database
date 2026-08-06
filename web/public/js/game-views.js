/**
 * Game view renderers: card grid and table view.
 * Depends on common.css classes.
 */

(function () {
  'use strict';

  // Schema cross-reference (duplicated from server for client-side chip coloring)
  const MECHANICS = new Set([
    'Worker Placement','Deck Building','Engine Building','Area Control','Tile Placement',
    'Dice Rolling','Set Collection','Trick-taking','Auctions/Bidding','Cooperative',
    '1 vs Many','Teams','Real-time','Traitor','Social Deduction','Drafting',
    'Press Your Luck','Roll & Write','Hex Map','Campaign Mode','Legacy','Bag Building',
    'Hand Management','Modular Board','Variable Setup','Take That','Narrative Heavy',
    'Puzzle Solving','No Math','Word Play','Deduction','Racing','Economic','Action Points',
    'Route Building','Network Building','Pattern Building','Resource Management','Trading',
    'Negotiation','Bluffing','Hidden Movement','Programmed Movement','Simultaneous Action',
    'Card Drafting','Tableau Building','Tech Tree','Rondel','Mancala','Dexterity',
    'Asymmetric','Variable Player Powers','Events'
  ]);
  const STYLES = new Set(['Euro','Ameritrash','Abstract','Party','Family','Wargame','Filler','Gateway','Cult Classic','Dungeon Crawler','4X','Dudes on a Map','Role Playing']);
  const THEMES = new Set(['Fantasy','Sci-Fi','Horror','Historical','Western','Pirates','Zombies','Vampires','Cthulhu','Aliens','Post-Apocalyptic','Superheroes','Marvel','Disney','Lord of the Rings','Animals','Food Theme','Time Travel','Space','Medieval','Ancient','Mythology','Nature','City Building','Civilization','War','Survival','Mystery','Espionage','Steampunk','Cyberpunk','Aviation','Maritime','Trains','Agriculture']);

  function chipClass(cat) {
    if (MECHANICS.has(cat)) return 'chip chip-mechanic';
    if (STYLES.has(cat)) return 'chip chip-style';
    if (THEMES.has(cat)) return 'chip chip-theme';
    return 'chip chip-mechanic';
  }

  function dots(value, max, className) {
    if (value === null || value === undefined) return '<span style="color:var(--text-muted);font-size:12px">\u2014</span>';
    let html = '<span class="rating-dots">';
    for (let i = 0; i < max; i++) {
      html += `<span class="rating-dot${i < value ? ' filled' + (className ? ' ' + className : '') : ''}"></span>`;
    }
    html += '</span>';
    return html;
  }

  function playerBadge(counts) {
    if (!counts || !counts.length) return '';
    return `<span style="font-size:11px;color:var(--text-muted)">${counts.join(', ')}p</span>`;
  }

  // ============ Card View ============

  function renderCards(games, container, onGameClick) {
    container.innerHTML = '';
    container.className = 'game-card-grid';

    const fragment = document.createDocumentFragment();

    for (const game of games) {
      const card = document.createElement('div');
      card.className = 'card game-card-item';
      card.addEventListener('click', () => onGameClick(game));

      // Image / placeholder
      const imgWrap = document.createElement('div');
      imgWrap.className = 'gc-image';
      if (game.image_url) {
        const img = document.createElement('img');
        img.src = game.image_url;
        img.alt = game.name;
        img.loading = 'lazy';
        imgWrap.appendChild(img);
      } else {
        const initials = game.name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
          .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
        imgWrap.innerHTML = `<div class="gc-placeholder"><span>${initials}</span></div>`;
      }

      // Info
      const info = document.createElement('div');
      info.className = 'gc-info';

      const name = document.createElement('div');
      name.className = 'gc-name';
      name.textContent = game.name;

      const meta = document.createElement('div');
      meta.className = 'gc-meta';
      const designers = game.designers && game.designers.length ? game.designers.slice(0, 2).join(', ') : '';
      meta.textContent = `${game.year || ''}${designers ? ' \u00b7 ' + designers : ''}`;

      // Rating dots
      const ratings = document.createElement('div');
      ratings.className = 'gc-ratings';
      ratings.innerHTML = `
        <span title="Length">${dots(game.length, 4)}</span>
        <span title="Complexity">${dots(game.rules_complexity, 4)}</span>
        <span title="Depth">${dots(game.strategic_depth, 4)}</span>
      `;

      // Chips
      const chips = document.createElement('div');
      chips.className = 'gc-chips';
      const allCats = game.categories || [];
      allCats.slice(0, 3).forEach(cat => {
        const c = document.createElement('span');
        c.className = chipClass(cat);
        c.textContent = cat;
        chips.appendChild(c);
      });

      // Player count
      const footer = document.createElement('div');
      footer.className = 'gc-footer';
      footer.innerHTML = playerBadge(game.true_counts);

      info.appendChild(name);
      info.appendChild(meta);
      info.appendChild(ratings);
      info.appendChild(chips);
      info.appendChild(footer);
      card.appendChild(imgWrap);
      card.appendChild(info);
      fragment.appendChild(card);
    }

    container.appendChild(fragment);
  }

  // ============ Table View ============

  const TABLE_COLS = [
    { key: 'name',             label: 'Name',       sortable: true },
    { key: 'year',             label: 'Year',       sortable: true },
    { key: 'true_counts',     label: 'Players',    sortable: false },
    { key: 'playtime_minutes', label: 'Time',       sortable: true },
    { key: 'length',           label: 'Length',      sortable: true },
    { key: 'rules_complexity', label: 'Complexity', sortable: true },
    { key: 'strategic_depth',  label: 'Depth',      sortable: true },
    { key: 'feel',             label: 'Feel',       sortable: true },
    { key: 'value',            label: 'Value',      sortable: true },
  ];

  function renderTable(games, container, onGameClick, sortKey, sortDir, onSort) {
    container.innerHTML = '';
    container.className = 'game-table-wrap';

    const table = document.createElement('table');
    table.className = 'data-table';

    // Header
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    for (const col of TABLE_COLS) {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.sortable) {
        th.style.cursor = 'pointer';
        if (sortKey === col.key) {
          th.classList.add('sorted');
          th.innerHTML += `<span class="sort-arrow">${sortDir === 'asc' ? '\u25b2' : '\u25bc'}</span>`;
        }
        th.addEventListener('click', () => onSort(col.key));
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    for (const game of games) {
      const row = document.createElement('tr');
      row.addEventListener('click', () => onGameClick(game));

      row.innerHTML = `
        <td style="font-weight:600;color:var(--text)">${escHtml(game.name)}</td>
        <td style="color:var(--text-muted)">${game.year || '\u2014'}</td>
        <td style="color:var(--text-muted);font-size:13px">${(game.true_counts || []).join(', ') || '\u2014'}</td>
        <td style="color:var(--text-muted)">${game.playtime_minutes ? game.playtime_minutes + 'm' : '\u2014'}</td>
        <td>${dots(game.length, 4)}</td>
        <td>${dots(game.rules_complexity, 4)}</td>
        <td>${dots(game.strategic_depth, 4)}</td>
        <td>${dots(game.feel, 4)}</td>
        <td>${dots(game.value, 4)}</td>
      `;
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function escHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // ============ Card Grid Styles ============

  if (!document.getElementById('gv-styles')) {
    const style = document.createElement('style');
    style.id = 'gv-styles';
    style.textContent = `
      .game-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 18px;
      }
      .game-card-item {
        display: flex;
        flex-direction: column;
      }
      .gc-image {
        position: relative;
        width: 100%;
        padding-bottom: 75%;
        background: var(--elevated);
        border-bottom: 1px solid var(--border-soft);
        overflow: hidden;
      }
      .gc-image img {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        object-fit: cover;
        transition: transform 0.35s ease;
      }
      .game-card-item:hover .gc-image img { transform: scale(1.04); }
      .gc-placeholder {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(160px 130px at 50% 42%, rgba(230, 181, 78, 0.07), transparent 70%),
          var(--elevated);
      }
      .gc-placeholder span {
        font-family: var(--font-heading);
        font-size: 34px;
        color: var(--border);
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .gc-info { padding: 15px; flex: 1; display: flex; flex-direction: column; gap: 7px; }
      .gc-name {
        font-family: var(--font-heading);
        font-size: 17px;
        font-weight: 700;
        color: var(--text);
        line-height: 1.25;
        transition: color 0.15s;
      }
      .game-card-item:hover .gc-name { color: var(--accent); }
      .gc-meta { font-size: 12px; color: var(--text-muted); }
      .gc-ratings { display: flex; gap: 10px; align-items: center; }
      .gc-chips { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
      .gc-footer { margin-top: auto; }

      .game-table-wrap {
        overflow-x: auto;
        background: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-1);
      }
      .game-table-wrap .data-table th { position: sticky; top: 0; background: var(--surface); }

      @media (max-width: 768px) {
        .game-card-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
      }
      @media (max-width: 480px) {
        .game-card-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  // Expose
  window.GameViews = { renderCards, renderTable };
})();
