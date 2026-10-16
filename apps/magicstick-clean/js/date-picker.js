// A small custom calendar dropdown, used instead of the bare native
// <input type="date"> on the quote and booking forms — consistent styling
// across browsers/desktop OSes, and every past day is greyed out
// automatically (computed from "today" on open, never hardcoded).
//
// Usage: pair a visible readonly text input with a hidden input that holds
// the real yyyy-mm-dd value everything else reads/submits, then call
// MagicstickDatePicker.attach(displayInput, hiddenInput).
(function () {
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
  const locale = () => (lang() === 'fr' ? 'fr-CA' : 'en-CA');

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function attach(displayInput, hiddenInput, options) {
    options = options || {};
    const today = startOfDay(new Date());
    const minDate = options.minDate ? startOfDay(options.minDate) : today;

    let panel = null;
    let viewYear = minDate.getFullYear();
    let viewMonth = minDate.getMonth();
    let selected = hiddenInput.value ? startOfDay(new Date(hiddenInput.value + 'T00:00:00')) : null;
    if (selected) {
      viewYear = selected.getFullYear();
      viewMonth = selected.getMonth();
    }

    function formatDisplay(date) {
      return new Intl.DateTimeFormat(locale(), { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    }

    function monthLabel(year, month) {
      return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
    }

    function weekdayLabels() {
      const base = new Date(2023, 0, 1); // a Sunday
      const fmt = new Intl.DateTimeFormat(locale(), { weekday: 'narrow' });
      const labels = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        labels.push(fmt.format(d));
      }
      return labels;
    }

    function render() {
      if (!panel) return;
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
      const isFirstNavigableMonth = viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth();

      let cells = '';
      for (let i = 0; i < startWeekday; i++) {
        cells += `<span class="dp-cell dp-cell-muted">${daysInPrevMonth - startWeekday + 1 + i}</span>`;
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(viewYear, viewMonth, day);
        const iso = toISODate(cellDate);
        const disabled = cellDate < minDate;
        const isToday = cellDate.getTime() === today.getTime();
        const isSelected = Boolean(selected && cellDate.getTime() === selected.getTime());
        cells += `<button type="button" class="dp-cell${isToday ? ' dp-today' : ''}${isSelected ? ' dp-selected' : ''}" data-date="${iso}"${disabled ? ' disabled' : ''}>${day}</button>`;
      }

      panel.innerHTML = `
        <div class="dp-header">
          <button type="button" class="dp-nav" data-nav="-1"${isFirstNavigableMonth ? ' disabled' : ''} aria-label="Previous month">&lsaquo;</button>
          <span class="dp-month">${monthLabel(viewYear, viewMonth)}</span>
          <button type="button" class="dp-nav" data-nav="1" aria-label="Next month">&rsaquo;</button>
        </div>
        <div class="dp-weekdays">${weekdayLabels().map((l) => `<span>${l}</span>`).join('')}</div>
        <div class="dp-grid">${cells}</div>
      `;

      panel.querySelectorAll('.dp-nav').forEach((btn) => {
        btn.addEventListener('click', () => {
          viewMonth += Number(btn.dataset.nav);
          if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
          if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
          render();
        });
      });
      panel.querySelectorAll('.dp-cell[data-date]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selected = startOfDay(new Date(btn.dataset.date + 'T00:00:00'));
          hiddenInput.value = btn.dataset.date;
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          displayInput.value = formatDisplay(selected);
          const field = displayInput.closest('.field');
          if (field) field.classList.remove('invalid');
          close();
        });
      });
    }

    function position() {
      const rect = displayInput.getBoundingClientRect();
      panel.style.top = `${rect.bottom + window.scrollY + 6}px`;
      panel.style.left = `${rect.left + window.scrollX}px`;
      const maxLeft = window.scrollX + document.documentElement.clientWidth - panel.offsetWidth - 12;
      if (parseFloat(panel.style.left) > maxLeft) panel.style.left = `${Math.max(12, maxLeft)}px`;
    }

    function onOutsideClick(e) {
      if (panel && !panel.contains(e.target) && e.target !== displayInput) close();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    function open() {
      if (panel) return;
      panel = document.createElement('div');
      panel.className = 'dp-panel';
      document.body.appendChild(panel);
      render();
      position();
      document.addEventListener('mousedown', onOutsideClick, true);
      document.addEventListener('keydown', onKeydown, true);
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);
    }

    function close() {
      if (!panel) return;
      panel.remove();
      panel = null;
      document.removeEventListener('mousedown', onOutsideClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    }

    displayInput.addEventListener('click', open);
    displayInput.addEventListener('focus', open);

    if (selected) displayInput.value = formatDisplay(selected);

    document.addEventListener('magicstick:langchange', () => {
      if (selected) displayInput.value = formatDisplay(selected);
      render();
    });
  }

  window.MagicstickDatePicker = { attach };
})();
