/* FoodConnect demo
   Everything here runs in the browser with sample data, so you can click through the idea.
   In the real website, Flask and the database do the saving and the counting.
   Reload the page to start again. */

/* ---------- 1. Small helpers ---------- */

function byId(id) {
  return document.getElementById(id);
}

// Makes text safe to put inside HTML, so nobody can inject code through a form.
function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// Dates are stored as text like "2026-11-20", the same format as <input type="date">.
function dayFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + month + '-' + day;
}
const TODAY = dayFromToday(0);

function daysLeft(date) {
  const ms = new Date(date + 'T00:00') - new Date(TODAY + 'T00:00');
  return Math.round(ms / 86400000);   // 86400000 milliseconds = 1 day
}

function niceDate(date) {
  return new Date(date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysText(n) {
  if (n < 0) return 'past its date';
  if (n === 0) return 'last day today';
  if (n === 1) return '1 day left';
  return n + ' days left';
}

function clock(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60000);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// "1 item" but "2 items"
function plural(n, one, many) {
  return n === 1 ? one : many;
}

// A small coloured label. tone is bad, warn, ok, info or grey.
function tag(text, tone) {
  return '<span class="tag tag-' + tone + '">' + esc(text) + '</span>';
}

function showMessage(id, text) {
  byId(id).textContent = text;
  byId(id).hidden = false;
}

function hideMessage(id) {
  byId(id).hidden = true;
}

/* ---------- 2. Sample data ---------- */

// In the real system passwords are stored as a hash, never as plain text.
const users = [
  { email: 'sara@foodconnect.nl', password: 'demo1234', name: 'Sara de Vries', first: 'Sara', role: 'household', address: 'Lindelaan 14', area: 'Centre' },
  { email: 'tom@foodconnect.nl', password: 'demo1234', name: 'Tom Peeters', first: 'Tom', role: 'volunteer' },
  { email: 'lisa@foodconnect.nl', password: 'demo1234', name: 'Lisa van Dijk', first: 'Lisa', role: 'manager' },
];
const ROLE_NAME = { household: 'Household', volunteer: 'Volunteer', manager: 'Manager' };

// Each product has a barcode, a minimum stock, how many were handed out in each of the
// last 4 weeks, and batches: how many items on the shelf have which date on the package.
const products = [
  { barcode: '2001230000011', name: 'Wholegrain pasta', size: '500 g', minimum: 20, lastWeeks: [35, 37, 38, 41], batches: [{ qty: 17, date: dayFromToday(160) }] },
  { barcode: '2001230000028', name: 'Brown rice', size: '1 kg', minimum: 15, lastWeeks: [27, 24, 26, 25], batches: [{ qty: 46, date: dayFromToday(240) }] },
  { barcode: '2001230000035', name: 'Couscous', size: '500 g', minimum: 10, lastWeeks: [14, 13, 15, 14], batches: [{ qty: 22, date: dayFromToday(200) }] },
  { barcode: '2001230000042', name: 'Kidney beans', size: '400 g can', minimum: 20, lastWeeks: [20, 21, 23, 22], batches: [{ qty: 13, date: dayFromToday(350) }] },
  { barcode: '2001230000059', name: 'Chickpeas', size: '400 g jar', minimum: 15, lastWeeks: [15, 17, 16, 18], batches: [{ qty: 26, date: dayFromToday(320) }] },
  { barcode: '2001230000066', name: 'Mixed vegetables', size: '400 g can', minimum: 20, lastWeeks: [31, 32, 31, 34], batches: [{ qty: 10, date: dayFromToday(5) }, { qty: 32, date: dayFromToday(250) }] },
  { barcode: '2001230000073', name: 'Tomato passata', size: '500 g jar', minimum: 12, lastWeeks: [18, 17, 16, 19], batches: [{ qty: 15, date: dayFromToday(180) }] },
  { barcode: '2001230000080', name: 'Long-life milk', size: '1 litre', minimum: 24, lastWeeks: [33, 32, 34, 33], batches: [{ qty: 4, date: dayFromToday(2) }, { qty: 24, date: dayFromToday(60) }] },
  { barcode: '2001230000097', name: 'Plain yoghurt', size: '1 litre', minimum: 10, lastWeeks: [13, 15, 14, 15], batches: [{ qty: 2, date: dayFromToday(-1) }, { qty: 6, date: dayFromToday(3) }] },
  { barcode: '2001230000103', name: 'Sunflower oil', size: '1 litre', minimum: 8, lastWeeks: [12, 11, 12, 10], batches: [{ qty: 14, date: dayFromToday(270) }] },
  { barcode: '2001230000110', name: 'Peanut butter', size: '350 g jar', minimum: 10, lastWeeks: [12, 12, 13, 12], batches: [{ qty: 11, date: dayFromToday(200) }] },
  { barcode: '2001230000127', name: 'Tuna in water', size: '160 g can', minimum: 20, lastWeeks: [22, 24, 23, 26], batches: [{ qty: 3, date: dayFromToday(4) }, { qty: 40, date: dayFromToday(300) }] },
];
const UNKNOWN_BARCODE = '2001230099176';   // a barcode that is not registered yet

// Items per week. The last row is this week, and the scan station adds to it.
const weeks = [
  { label: '4 weeks ago', cameIn: 261, handedOut: 252, wasted: 11 },
  { label: '3 weeks ago', cameIn: 261, handedOut: 255, wasted: 6 },
  { label: '2 weeks ago', cameIn: 269, handedOut: 261, wasted: 9 },
  { label: 'Last week', cameIn: 268, handedOut: 269, wasted: 5 },
  { label: 'This week so far', cameIn: 12, handedOut: 2, wasted: 1 },
];
const thisWeek = weeks[weeks.length - 1];

// Newest scan first.
const scanLog = [
  { time: clock(12), mode: 'waste', name: 'Plain yoghurt', change: -1, left: 8 },
  { time: clock(33), mode: 'in', name: 'Brown rice', change: 12, left: 46 },
  { time: clock(62), mode: 'out', name: 'Wholegrain pasta', change: -1, left: 17 },
  { time: clock(77), mode: 'out', name: 'Tuna in water', change: -1, left: 43 },
];

// Donations from households. status: waiting, accepted, pickedup, received or cancelled.
const donations = [
  { id: 'D101', from: 'Sara', fullName: 'Sara de Vries', address: 'Lindelaan 14', area: 'Centre', item: 'Wholegrain pasta', qty: 4, date: dayFromToday(160), status: 'waiting', volunteer: null },
  { id: 'D102', from: 'Sara', fullName: 'Sara de Vries', address: 'Lindelaan 14', area: 'Centre', item: 'Mixed vegetables', qty: 6, date: dayFromToday(300), status: 'accepted', volunteer: 'Tom' },
  { id: 'D103', from: 'Sara', fullName: 'Sara de Vries', address: 'Lindelaan 14', area: 'Centre', item: 'Brown rice', qty: 2, date: dayFromToday(240), status: 'received', volunteer: 'Tom' },
  { id: 'D104', from: 'Fatima', fullName: 'Fatima El Amrani', address: 'Stationsstraat 21', area: 'Centre', item: 'Long-life milk', qty: 6, date: dayFromToday(25), status: 'waiting', volunteer: null },
  { id: 'D105', from: 'Daan', fullName: 'Daan Bakker', address: 'Kastanjelaan 3', area: 'North', item: 'Peanut butter', qty: 3, date: dayFromToday(200), status: 'waiting', volunteer: null },
  { id: 'D106', from: 'Fatima', fullName: 'Fatima El Amrani', address: 'Stationsstraat 21', area: 'Centre', item: 'Baby formula', qty: 2, date: dayFromToday(120), status: 'waiting', volunteer: null },
  { id: 'D107', from: 'Noor', fullName: 'Noor Jansen', address: 'Heuvelstraat 9', area: 'South', item: 'Kidney beans', qty: 8, date: dayFromToday(350), status: 'pickedup', volunteer: 'Tom' },
  { id: 'D108', from: 'Daan', fullName: 'Daan Bakker', address: 'Kastanjelaan 3', area: 'North', item: 'Sunflower oil', qty: 2, date: dayFromToday(4), status: 'waiting', volunteer: null },
];
let nextDonationNumber = 109;

/* ---------- 3. Stock and the prediction ---------- */

function stockOf(product) {
  let total = 0;
  for (const batch of product.batches) total += batch.qty;
  return total;
}

function statusOf(product) {
  const stock = stockOf(product);
  if (stock <= product.minimum) return { text: 'Low stock', tone: 'bad' };
  if (stock <= product.minimum * 1.5) return { text: 'Getting low', tone: 'warn' };
  return { text: 'In stock', tone: 'ok' };
}

// The prediction ("AI") for next week: the average of the last 4 weeks, called a moving average.
function predictionOf(product) {
  let total = 0;
  for (const handedOut of product.lastWeeks) total += handedOut;
  return Math.round(total / product.lastWeeks.length);
}

const EXTRA_PERCENT = 20;   // buy 20% more than predicted, to be safe

function extraOf(product) {
  return Math.ceil(predictionOf(product) * EXTRA_PERCENT / 100);
}

function toBuyOf(product) {
  const toBuy = predictionOf(product) + extraOf(product) - stockOf(product);
  return Math.max(0, toBuy);   // never below 0
}

/* ---------- 4. Log in and switching pages ---------- */

// The pages each role may see. The first one is where they start.
const MENU = {
  household: [{ page: 'donate', label: 'My donations' }],
  volunteer: [{ page: 'scan', label: 'Scan station' }, { page: 'pickups', label: 'Pickups' }],
  manager: [{ page: 'dashboard', label: 'Dashboard' }, { page: 'shopping', label: 'Shopping list' }],
};

let currentUser = null;

function logIn(user) {
  currentUser = user;
  const start = MENU[user.role][0].page;
  if (location.hash === '#' + start) showPage();
  else location.hash = start;   // changing the hash calls showPage()
}

function logOut() {
  currentUser = null;
  byId('login-form').reset();
  if (location.hash === '#login') showPage();
  else location.hash = 'login';
}

function showPage() {
  let page = location.hash.slice(1);
  if (!currentUser) {
    page = 'login';
  } else {
    const allowed = MENU[currentUser.role].map(item => item.page);
    if (!allowed.includes(page)) page = allowed[0];   // each role only sees its own pages
  }
  for (const section of document.querySelectorAll('.page')) {
    section.hidden = section.id !== 'page-' + page;
  }
  drawTopbar(page);
  if (page === 'donate') drawDonate();
  if (page === 'scan') drawScan();
  if (page === 'pickups') drawPickups();
  if (page === 'dashboard') drawDashboard();
  if (page === 'shopping') drawShopping();
}

function drawTopbar(page) {
  if (!currentUser) {
    byId('nav').innerHTML = '';
    byId('who').hidden = true;
    return;
  }
  let links = '';
  for (const item of MENU[currentUser.role]) {
    const current = item.page === page ? ' aria-current="page"' : '';
    links += '<a href="#' + item.page + '"' + current + '>' + item.label + '</a>';
  }
  byId('nav').innerHTML = links;
  byId('who-name').textContent = currentUser.name;
  byId('who-role').textContent = ROLE_NAME[currentUser.role];
  byId('who').hidden = false;
}

function drawDemoAccounts() {
  let html = '';
  users.forEach((user, index) => {
    html += `<li>
      <div><b>${esc(user.name)}</b><span class="muted small">${ROLE_NAME[user.role]}, ${esc(user.email)}</span></div>
      <button class="btn btn-small" type="button" data-user="${index}">Log in as ${esc(user.first)}</button>
    </li>`;
  });
  byId('demo-accounts').innerHTML = html;
}

byId('login-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = byId('login-email').value.trim().toLowerCase();
  const password = byId('login-password').value;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    // The same message for a wrong email and a wrong password, so nobody can guess accounts.
    showMessage('login-error', 'The email or password is wrong.');
    return;
  }
  hideMessage('login-error');
  logIn(user);
});

byId('demo-accounts').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) logIn(users[Number(button.dataset.user)]);
});

byId('logout').addEventListener('click', logOut);
window.addEventListener('hashchange', showPage);

/* ---------- 5. Household: offer food ---------- */

const STATUS = {
  waiting: { text: 'Waiting for a volunteer', tone: 'info' },
  accepted: { text: 'Accepted', tone: 'info' },
  pickedup: { text: 'Picked up', tone: 'info' },
  received: { text: 'Received', tone: 'ok' },
  cancelled: { text: 'Cancelled', tone: 'grey' },
};

function drawDonate() {
  byId('donate-address').textContent = 'Only the volunteer who accepts your donation sees your address (' + currentUser.address + ').';
  let html = '';
  let received = 0;
  for (const d of donations) {
    if (d.from !== currentUser.first) continue;   // a household only sees its own donations
    if (d.status === 'received') received++;
    let next = '';
    // The tag shows the status. A line is only added when it tells something new.
    if (d.status === 'waiting') next = `<div class="actions"><button class="btn btn-danger btn-small" type="button" data-cancel="${d.id}">Cancel donation</button></div>`;
    if (d.status === 'accepted') next = `<p>${esc(d.volunteer)} will pick it up.</p>`;
    if (d.status === 'pickedup') next = `<p>${esc(d.volunteer)} is bringing it to the food bank.</p>`;
    html += `<article class="dcard">
      <div class="dcard-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag(STATUS[d.status].text, STATUS[d.status].tone)}</div>
      <p class="meta">Date on the package: ${niceDate(d.date)}</p>
      ${next}
    </article>`;
  }
  byId('my-donations').innerHTML = html || '<p class="empty">No donations yet. Use the form to offer your first donation.</p>';
  byId('donate-count').textContent = received + ' ' + plural(received, 'donation', 'donations') + ' received so far';
}

byId('donate-form').addEventListener('submit', event => {
  event.preventDefault();
  hideMessage('donate-ok');
  const item = byId('donate-item').value.trim();
  const qty = Number(byId('donate-qty').value);
  const date = byId('donate-date').value;

  // Check the input before saving it (FR12 and FR15).
  let problem = '';
  if (item.length < 2 || item.length > 60) problem = 'Describe the food in 2 to 60 characters.';
  else if (!Number.isInteger(qty) || qty < 1 || qty > 50) problem = 'How many must be a whole number from 1 to 50.';
  else if (!date) problem = 'Fill in the date on the package.';
  else if (daysLeft(date) < 2) problem = 'The date is too close. Choose a date at least 2 days from today.';
  if (problem) {
    showMessage('donate-error', problem);
    return;
  }
  hideMessage('donate-error');

  donations.unshift({
    id: 'D' + nextDonationNumber++, from: currentUser.first, fullName: currentUser.name, address: currentUser.address, area: currentUser.area,
    item: item, qty: qty, date: date, status: 'waiting', volunteer: null,
  });
  byId('donate-form').reset();
  showMessage('donate-ok', 'Donation offered. A volunteer nearby can accept it now.');
  drawDonate();
});

byId('my-donations').addEventListener('click', event => {
  const button = event.target.closest('button[data-cancel]');
  if (!button) return;
  const donation = donations.find(d => d.id === button.dataset.cancel);
  if (donation && donation.status === 'waiting') donation.status = 'cancelled';   // only while nobody accepted it
  drawDonate();
});

/* ---------- 6. Volunteer: scan station ---------- */

let mode = 'in';            // 'in', 'out' or 'waste'
let waitingProduct = null;  // In mode: the product that still needs a number and a date
let unknownBarcode = null;  // a scanned barcode that still has to be registered

const MODE_TITLE = { in: 'Scanning food in', out: 'Handing food out', waste: 'Throwing food away' };

function drawScan() {
  drawScanLog();
  drawTestButtons();
  byId('scan-input').focus();
}

function setMode(newMode) {
  mode = newMode;
  const page = byId('page-scan');
  page.classList.remove('mode-in', 'mode-out', 'mode-waste');
  page.classList.add('mode-' + mode);
  for (const button of document.querySelectorAll('.mode-btn')) {
    button.setAttribute('aria-pressed', button.dataset.mode === mode ? 'true' : 'false');
  }
  byId('scan-title').textContent = MODE_TITLE[mode];
  byId('add-form').hidden = true;
  byId('feedback').hidden = true;
  waitingProduct = null;
  byId('scan-input').focus();
}

function handleScan(text) {
  const code = text.trim();
  if (code === '') return;

  // In mode: the product that waits for its date comes first, so it doesn't get lost.
  if (mode === 'in' && waitingProduct) {
    showFeedback('error', '!', waitingProduct.name + ' is not on the shelf yet', 'Fill in the date and press Put on the shelf, or press Cancel.');
    byId('add-date').focus();
    return;
  }
  byId('add-form').hidden = true;
  byId('register-form').hidden = true;

  if (!/^\d{8,13}$/.test(code)) {
    showFeedback('error', '!', 'Not a barcode', 'Scan again, or type the 8 to 13 digits.');
    return;
  }
  const product = products.find(p => p.barcode === code);
  if (!product) {
    showFeedback('error', '?', 'Unknown barcode', 'Register the product below.');
    askToRegister(code);
    return;
  }
  if (mode === 'in') askHowMany(product);
  if (mode === 'out') handOut(product);
  if (mode === 'waste') throwAway(product);
}

function showFeedback(kind, big, title, text) {
  const box = byId('feedback');
  box.className = 'feedback ' + kind;
  box.innerHTML = `<span class="big">${esc(big)}</span><div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
  box.hidden = false;
  beep(kind === 'ok');
}

// In: ask how many there are and the date on the package, then put them on the shelf.
function askHowMany(product) {
  waitingProduct = product;
  byId('feedback').hidden = true;
  byId('add-title').textContent = product.name;
  byId('add-info').textContent = product.size + ', ' + stockOf(product) + ' on the shelf';
  byId('add-qty').value = 1;
  byId('add-date').value = '';
  hideMessage('add-error');
  byId('add-form').hidden = false;
  byId('add-date').focus();
  beep(true);
}

byId('add-form').addEventListener('submit', event => {
  event.preventDefault();
  const qty = Number(byId('add-qty').value);
  const date = byId('add-date').value;
  let problem = '';
  if (!Number.isInteger(qty) || qty < 1 || qty > 200) problem = 'How many must be a whole number from 1 to 200.';
  else if (!date) problem = 'Fill in the date on the package.';
  else if (daysLeft(date) < 0) problem = 'This date has passed. Switch to Waste to throw the food away.';
  if (problem) {
    showMessage('add-error', problem);
    return;
  }
  const product = waitingProduct;
  product.batches.push({ qty: qty, date: date });
  product.batches.sort((a, b) => a.date.localeCompare(b.date));   // oldest date first
  thisWeek.cameIn += qty;
  addToLog('in', product, qty);
  byId('add-form').hidden = true;
  waitingProduct = null;
  showFeedback('ok', '+' + qty, product.name, stockOf(product) + ' on the shelf.');
  byId('scan-input').focus();
});

byId('add-cancel').addEventListener('click', () => {
  byId('add-form').hidden = true;
  waitingProduct = null;
  byId('scan-input').focus();
});

// Out: hand out the item with the oldest date, but never food that is past its date.
function handOut(product) {
  const batch = product.batches.find(b => b.qty > 0 && daysLeft(b.date) >= 0);
  if (!batch) {
    if (stockOf(product) > 0) showFeedback('error', '!', product.name + ' is past its date', 'Switch to Waste and scan it again.');
    else showFeedback('error', '0', 'No ' + product.name + ' on the shelf', 'Switch to In to add it.');
    byId('scan-input').focus();
    return;
  }
  batch.qty -= 1;
  product.batches = product.batches.filter(b => b.qty > 0);
  thisWeek.handedOut += 1;
  addToLog('out', product, -1);
  const lowNote = statusOf(product).tone === 'bad' ? ' The minimum is ' + product.minimum + '.' : '';
  showFeedback('ok', '−1', product.name, stockOf(product) + ' on the shelf.' + lowNote);
  byId('scan-input').focus();
}

// Waste: take the item with the oldest date.
function throwAway(product) {
  const batch = product.batches.find(b => b.qty > 0);
  if (!batch) {
    showFeedback('error', '0', 'No ' + product.name + ' on the shelf', 'The stock is already 0, so nothing was thrown away.');
    byId('scan-input').focus();
    return;
  }
  batch.qty -= 1;
  product.batches = product.batches.filter(b => b.qty > 0);
  thisWeek.wasted += 1;
  addToLog('waste', product, -1);
  showFeedback('ok', '−1', product.name + ' thrown away', stockOf(product) + ' on the shelf.');
  byId('scan-input').focus();
}

// Unknown barcode: register the product (FR04).
function askToRegister(code) {
  unknownBarcode = code;
  byId('register-code').textContent = code;
  byId('register-name').value = '';
  byId('register-size').value = '';
  byId('register-minimum').value = 10;
  hideMessage('register-error');
  byId('register-form').hidden = false;
  byId('register-name').focus();
}

byId('register-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = byId('register-name').value.trim();
  const size = byId('register-size').value.trim();
  const minimum = Number(byId('register-minimum').value);
  let problem = '';
  if (name.length < 2 || name.length > 40) problem = 'The product name needs 2 to 40 characters.';
  else if (size.length > 20) problem = 'The pack size can have up to 20 characters.';
  else if (!Number.isInteger(minimum) || minimum < 0 || minimum > 500) problem = 'The minimum stock must be a whole number from 0 to 500.';
  if (problem) {
    showMessage('register-error', problem);
    return;
  }
  const product = { barcode: unknownBarcode, name: name, size: size || 'No pack size', minimum: minimum, lastWeeks: [0, 0, 0, 0], batches: [] };
  products.push(product);
  addToLog('new', product, 0);
  byId('register-form').hidden = true;
  drawTestButtons();
  if (mode === 'in') {
    askHowMany(product);
  } else {
    showFeedback('ok', '✓', name + ' registered', 'Scan it again to continue.');
    byId('scan-input').focus();
  }
});

byId('register-cancel').addEventListener('click', () => {
  byId('register-form').hidden = true;
  byId('feedback').hidden = true;
  byId('scan-input').focus();
});

function addToLog(kind, product, change) {
  scanLog.unshift({ time: clock(0), mode: kind, name: product.name, change: change, left: stockOf(product) });
  drawScanLog();
}

function drawScanLog() {
  const MODE_NAME = { in: 'In', out: 'Out', waste: 'Waste', new: 'Registered' };
  let html = '';
  for (const scan of scanLog.slice(0, 8)) {
    let change = '';
    if (scan.change > 0) change = '+' + scan.change + ' ';
    if (scan.change < 0) change = '−' + Math.abs(scan.change) + ' ';
    html += `<tr>
      <td class="num">${scan.time}</td>
      <td class="log-${scan.mode}">${MODE_NAME[scan.mode]}</td>
      <td>${change}${esc(scan.name)}</td>
      <td class="num">${scan.left}</td>
    </tr>`;
  }
  byId('scan-log').innerHTML = html;
  byId('week-totals').textContent = 'This week: ' + thisWeek.cameIn + ' in, ' + thisWeek.handedOut + ' out, ' + thisWeek.wasted + ' waste';
}

function drawTestButtons() {
  let html = '';
  for (const p of products) {
    html += `<button class="chip" type="button" data-code="${p.barcode}">${esc(p.name)}</button>`;
  }
  if (!products.some(p => p.barcode === UNKNOWN_BARCODE)) {
    html += `<button class="chip chip-odd" type="button" data-code="${UNKNOWN_BARCODE}">Unknown barcode</button>`;
  }
  byId('test-buttons').innerHTML = html;
}

byId('scan-form').addEventListener('submit', event => {
  event.preventDefault();          // the scanner presses Enter, which sends this form
  const text = byId('scan-input').value;
  byId('scan-input').value = '';
  handleScan(text);
});

// Clicking anywhere on the scan box makes the scanner ready again.
byId('scan-form').addEventListener('click', () => byId('scan-input').focus());

byId('test-buttons').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) handleScan(button.dataset.code);
});

for (const button of document.querySelectorAll('.mode-btn')) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

// A short beep for a good scan and a low buzz for a problem.
let audio = null;
function beep(good) {
  try {
    audio = audio || new AudioContext();
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.type = good ? 'square' : 'sawtooth';
    tone.frequency.value = good ? 1568 : 180;
    volume.gain.value = 0.04;
    tone.connect(volume);
    volume.connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + (good ? 0.08 : 0.25));
  } catch (e) { /* no sound is fine */ }
}

/* ---------- 7. Volunteer: pickups ---------- */

function drawPickups() {
  const me = currentUser.first;

  // Donations nobody has accepted yet, shortest date first. No address yet (privacy).
  const waiting = donations.filter(d => d.status === 'waiting').sort((a, b) => a.date.localeCompare(b.date));
  let html = '';
  for (const d of waiting) {
    const closeToDate = daysLeft(d.date) <= 7 ? tag('Close to its date', 'warn') : '';
    html += `<article class="dcard">
      <div class="dcard-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${closeToDate}</div>
      <p class="meta"><span>Date on the package: ${niceDate(d.date)}</span><span>From ${esc(d.from)}, ${esc(d.area)}</span></p>
      <div class="actions"><button class="btn btn-primary btn-small" type="button" data-accept="${d.id}">Accept</button></div>
    </article>`;
  }
  byId('waiting-list').innerHTML = html || '<p class="empty">Nothing is waiting right now.</p>';

  // My pickups: the address is only shown to me, and only until I picked it up.
  const mine = donations.filter(d => d.volunteer === me && (d.status === 'accepted' || d.status === 'pickedup'));
  html = '';
  for (const d of mine) {
    if (d.status === 'accepted') {
      html += `<article class="dcard">
        <div class="dcard-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag('Accepted', 'info')}</div>
        <p><b>Address:</b> ${esc(d.fullName)}, ${esc(d.address)}, ${esc(d.area)}</p>
        <p class="hint">Only you see this address, until you mark the donation as picked up.</p>
        <p class="meta">Date on the package: ${niceDate(d.date)}</p>
        <div class="actions"><button class="btn btn-primary btn-small" type="button" data-picked="${d.id}">Mark as picked up</button></div>
      </article>`;
    } else {
      html += `<article class="dcard">
        <div class="dcard-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag('Picked up', 'info')}</div>
        <p>Scan the food in at the scan station, then mark it as received.</p>
        <div class="actions">
          <a class="btn btn-small" href="#scan">Open scan station</a>
          <button class="btn btn-primary btn-small" type="button" data-received="${d.id}">Mark as received</button>
        </div>
      </article>`;
    }
  }
  byId('my-pickups').innerHTML = html || '<p class="empty">You have no pickups. Accept a donation to start.</p>';
  byId('pickup-count').textContent = mine.length + ' open ' + plural(mine.length, 'pickup', 'pickups');

  const done = donations.filter(d => d.volunteer === me && d.status === 'received');
  byId('done-list').textContent = done.length ? 'Received: ' + done.map(d => d.qty + '× ' + d.item).join(', ') + '.' : '';
}

byId('page-pickups').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.accept || button.dataset.picked || button.dataset.received;
  const donation = donations.find(d => d.id === id);
  if (!donation) return;
  if (button.dataset.accept && donation.status === 'waiting') {
    donation.status = 'accepted';
    donation.volunteer = currentUser.first;
  }
  if (button.dataset.picked && donation.status === 'accepted') donation.status = 'pickedup';
  if (button.dataset.received && donation.status === 'pickedup') donation.status = 'received';
  drawPickups();
});

/* ---------- 8. Manager: dashboard ---------- */

// One number in the strip at the top. tone colours the box when something needs action.
function counter(value, label, tone) {
  return `<div class="counter ${tone}"><b>${value}</b><span>${label}</span></div>`;
}

function drawDashboard() {
  let onShelf = 0, low = 0, closeToDate = 0, runsOut = 0;
  for (const p of products) {
    onShelf += stockOf(p);
    if (statusOf(p).tone === 'bad') low++;
    if (stockOf(p) < predictionOf(p)) runsOut++;
    for (const b of p.batches) if (daysLeft(b.date) <= 7) closeToDate += b.qty;
  }
  const wasted = thisWeek.wasted;
  byId('counters').innerHTML =
    counter(onShelf, plural(onShelf, 'item', 'items') + ' on the shelf', '') +
    counter(low, plural(low, 'product', 'products') + ' with low stock', low > 0 ? 'bad' : '') +
    counter(closeToDate, plural(closeToDate, 'item close to its date', 'items close to their date'), closeToDate > 0 ? 'warn' : '') +
    counter(wasted, plural(wasted, 'item', 'items') + ' thrown away this week', wasted > 0 ? 'waste' : '');

  // Stock per product, lowest first (compared with the minimum)
  const sorted = products.slice().sort((a, b) => stockOf(a) / Math.max(1, a.minimum) - stockOf(b) / Math.max(1, b.minimum));
  let html = '';
  for (const p of sorted) {
    const status = statusOf(p);
    html += `<tr>
      <td><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.size)}</span></td>
      <td class="num">${stockOf(p)}</td>
      <td class="num narrow-hide">${p.minimum}</td>
      <td>${tag(status.text, status.tone)}</td>
    </tr>`;
  }
  byId('stock-table').innerHTML = html;

  // Needs attention (FR14): red items first, then orange ones
  let urgent = '', soon = '';
  for (const p of products) {
    if (statusOf(p).tone === 'bad') {
      urgent += `<li>${tag('Low stock', 'bad')}<span><b>${esc(p.name)}</b>: ${stockOf(p)} on the shelf. The minimum is ${p.minimum}.</span></li>`;
    }
    for (const b of p.batches) {
      const n = daysLeft(b.date);
      if (n < 0) urgent += `<li>${tag('Past its date', 'bad')}<span>${b.qty} × <b>${esc(p.name)}</b>. Take it off the shelf and scan it as Waste.</span></li>`;
      else if (n <= 7) soon += `<li>${tag('Close to its date', 'warn')}<span>${b.qty} × <b>${esc(p.name)}</b>, ${niceDate(b.date)} (${daysText(n)}). Hand these out first.</span></li>`;
    }
  }
  if (runsOut > 0) {
    soon += `<li>${tag('Runs out next week', 'warn')}<span>${runsOut} products will probably run out. <a href="#shopping">See the shopping list</a></span></li>`;
  }
  byId('attention').innerHTML = (urgent + soon) || '<li class="empty">Nothing needs attention.</li>';

  // Food in, out and waste per week (FR13)
  html = '';
  let wastedTotal = 0, handedOutTotal = 0;
  for (const w of weeks) {
    const fullWeek = w !== thisWeek;
    const percent = fullWeek ? (w.wasted / (w.handedOut + w.wasted) * 100).toFixed(1) + '%' : '–';
    if (fullWeek) {
      wastedTotal += w.wasted;
      handedOutTotal += w.handedOut;
    }
    html += `<tr>
      <td>${w.label}</td>
      <td class="num">${w.cameIn}</td>
      <td class="num">${w.handedOut}</td>
      <td class="num">${w.wasted}</td>
      <td class="num narrow-hide">${percent}</td>
    </tr>`;
  }
  byId('flow-table').innerHTML = html;
  byId('waste-rate').textContent = 'Waste over the last 4 weeks: ' + (wastedTotal / (handedOutTotal + wastedTotal) * 100).toFixed(1) + '%';
}

/* ---------- 9. Manager: shopping list ---------- */

function drawShopping() {
  let html = '';
  let total = 0, runsOut = 0;
  for (const p of products) {
    const prediction = predictionOf(p);
    const buy = toBuyOf(p);
    const willRunOut = stockOf(p) < prediction;
    total += buy;
    if (willRunOut) runsOut++;
    // Amounts to buy get a yellow highlight. A 0 stays plain.
    const buyCell = buy > 0 ? `<span class="buy">${buy}</span>` : `<span class="buy-none">0</span>`;
    html += `<tr>
      <td><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.size)}</span></td>
      <td class="narrow-hide">${p.lastWeeks.join(', ')}</td>
      <td class="num">${prediction}</td>
      <td class="num">${stockOf(p)}</td>
      <td class="narrow-hide">${willRunOut ? tag('Runs out', 'warn') : tag('Enough', 'ok')}</td>
      <td class="num">${buyCell}</td>
    </tr>`;
  }
  byId('shopping-table').innerHTML = html;
  byId('buy-total').textContent = total;
  byId('runs-out-count').textContent = runsOut + ' of ' + products.length + ' products will probably run out';

  // A worked example with the first product, so everyone can follow the maths.
  const p = products[0];
  const average = p.lastWeeks.reduce((sum, n) => sum + n, 0) / p.lastWeeks.length;
  byId('example').textContent =
    'Example, ' + p.name + ': (' + p.lastWeeks.join(' + ') + ') ÷ 4 = ' + average + ', so about ' + predictionOf(p) + ' next week. ' +
    'Extra: 20% of ' + predictionOf(p) + ' is ' + extraOf(p) + '. ' +
    'To buy: ' + predictionOf(p) + ' + ' + extraOf(p) + ' − ' + stockOf(p) + ' on the shelf = ' + toBuyOf(p) + '.';
}

/* ---------- 10. Start ---------- */

let productOptions = '';
for (const p of products) productOptions += `<option value="${esc(p.name)}"></option>`;
byId('product-names').innerHTML = productOptions;

// The date pickers only offer dates that the forms accept.
byId('donate-date').min = dayFromToday(2);
byId('add-date').min = TODAY;

drawDemoAccounts();
showPage();
