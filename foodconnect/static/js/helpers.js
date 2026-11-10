/* FoodConnect: small helpers
   Short functions that the other JavaScript files use. */

function byId(id) {
  return document.getElementById(id);
}

// Makes text safe to put inside HTML, so nobody can add their own HTML through a form
function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A date as text like "2026-11-20", the same format as <input type="date">
function dayFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + month + '-' + day;
}

const TODAY = dayFromToday(0);

// How many days until a date. A negative number means the date has passed.
function daysLeft(date) {
  const ms = new Date(date + 'T00:00') - new Date(TODAY + 'T00:00');
  return Math.round(ms / 86400000);   // 86400000 milliseconds = 1 day
}

// A date like "18 Apr 2027"
function niceDate(date) {
  return new Date(date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysText(n) {
  if (n < 0) return 'past its date';
  if (n === 0) return 'last day today';
  if (n === 1) return '1 day left';
  return n + ' days left';
}

// "1 item" but "2 items"
function plural(n, one, many) {
  if (n === 1) return one;
  return many;
}

// A small label. color is 'grey', 'red' or 'orange'.
function tag(text, color) {
  return '<span class="tag tag-' + color + '">' + text + '</span>';
}

// A small picture from the static/icons folder
function icon(name) {
  return '<img class="icon" src="/static/icons/' + name + '.svg" alt="">';
}

function showMessage(id, text) {
  byId(id).textContent = text;
  byId(id).hidden = false;
}

function hideMessage(id) {
  byId(id).hidden = true;
}
