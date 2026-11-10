/* FoodConnect: volunteer, scan station
   The Scan station page: food in, out and waste. */

let mode = 'in';             // 'in', 'out' or 'waste'
let waitingProduct = null;   // In mode: the product that still needs a number and a date
let unknownBarcode = '';     // a scanned barcode that still has to be registered

const MODE_TITLE = { in: 'Scanning food in', out: 'Handing food out', waste: 'Throwing food away' };
const UNKNOWN_BARCODE = '2001230099176';   // a barcode that is not registered yet, to test with

function drawScan() {
  drawScanLog();
  drawTestTiles();
}

function setMode(newMode) {
  mode = newMode;
  for (const button of document.querySelectorAll('.mode')) {
    button.setAttribute('aria-pressed', button.dataset.mode === mode);
  }
  byId('scan-title').innerHTML = icon(mode) + MODE_TITLE[mode];
  byId('add-form').hidden = true;
  byId('feedback').hidden = true;
  waitingProduct = null;
  byId('scan-input').focus();
}

function handleScan(text) {
  const code = text.trim();
  if (code === '') return;

  // In mode: the product that waits for its date comes first, so it doesn't get lost
  if (mode === 'in' && waitingProduct) {
    showFeedback(true, '!', waitingProduct.name + ' is not on the shelf yet', 'Fill in the date and press Put on the shelf, or press Cancel.');
    byId('add-date').focus();
    return;
  }
  byId('add-form').hidden = true;
  byId('register-form').hidden = true;

  if (!/^\d{8,13}$/.test(code)) {   // a barcode has 8 to 13 digits
    showFeedback(true, '!', 'Not a barcode', 'Scan again, or type the 8 to 13 digits.');
    return;
  }
  const product = productByBarcode(code);
  if (!product) {
    showFeedback(true, '?', 'Unknown barcode', 'Register the product below.');
    askToRegister(code);
    return;
  }
  if (mode === 'in') askHowMany(product);
  if (mode === 'out') scanOut(product);
  if (mode === 'waste') scanWaste(product);
}

// The box under the scan field. A problem is red.
function showFeedback(isProblem, big, title, text) {
  const box = byId('feedback');
  box.className = 'feedback';
  if (isProblem) box.className = 'feedback feedback-error';
  box.innerHTML = '<span class="big">' + esc(big) + '</span><div><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>';
  box.hidden = false;
  beep(!isProblem);
}

// In: ask how many there are and the date on the package
function askHowMany(product) {
  waitingProduct = product;
  byId('feedback').hidden = true;
  byId('add-picture').innerHTML = icon(CATEGORY_ICON[product.category]);
  byId('add-title').textContent = product.name;
  byId('add-info').textContent = product.size + ', ' + stockOf(product) + ' on the shelf';
  byId('add-status').innerHTML = tag(statusOf(product).text, statusOf(product).color);
  byId('add-qty').value = 1;
  byId('add-date').value = '';
  hideMessage('add-error');
  byId('add-form').hidden = false;
  byId('add-date').focus();
  beep(true);
}

// − and + next to "How many?" (1 to 200)
byId('add-minus').addEventListener('click', function () {
  const n = Number(byId('add-qty').value) - 1;
  if (n >= 1) byId('add-qty').value = n;
});

byId('add-plus').addEventListener('click', function () {
  const n = Number(byId('add-qty').value) + 1;
  if (n <= 200) byId('add-qty').value = n;
});

// The same checks as Flask: a mistake shows straight away, and Flask checks again
function batchProblem(qty, date) {
  if (!Number.isInteger(qty) || qty < 1 || qty > 200) return 'How many must be a whole number from 1 to 200.';
  if (date === '') return 'Fill in the date on the package.';
  if (daysLeft(date) < 0) return 'This date has passed. Switch to Waste to throw the food away.';
  return '';
}

byId('add-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const barcode = waitingProduct.barcode;
  const qty = Number(byId('add-qty').value);
  const date = byId('add-date').value;
  const problem = batchProblem(qty, date);
  if (problem !== '') {
    showMessage('add-error', problem);
    return;
  }
  try {
    await api('POST', '/api/scan/in', { barcode: barcode, qty: qty, date: date });
  } catch (e) {
    showMessage('add-error', e.message);
    return;
  }
  const product = productByBarcode(barcode);   // with the new numbers from Flask
  byId('add-form').hidden = true;
  waitingProduct = null;
  drawScan();
  showFeedback(false, '+' + qty, product.name, stockOf(product) + ' on the shelf.');
  byId('scan-input').focus();
});

byId('add-cancel').addEventListener('click', function () {
  byId('add-form').hidden = true;
  waitingProduct = null;
  byId('scan-input').focus();
});

// Out: Flask hands out the item with the oldest date, but never food that is past its date
async function scanOut(product) {
  try {
    await api('POST', '/api/scan/out', { barcode: product.barcode });
  } catch (e) {
    showFeedback(true, '!', e.message, e.hint);
    byId('scan-input').focus();
    return;
  }
  const p = productByBarcode(product.barcode);
  drawScan();
  let text = stockOf(p) + ' on the shelf.';
  if (statusOf(p).color === 'red') text += ' The minimum is ' + p.minimum + '.';
  showFeedback(false, '−1', p.name, text);
  byId('scan-input').focus();
}

// Waste: Flask takes the item with the oldest date
async function scanWaste(product) {
  try {
    await api('POST', '/api/scan/waste', { barcode: product.barcode });
  } catch (e) {
    showFeedback(true, '!', e.message, e.hint);
    byId('scan-input').focus();
    return;
  }
  const p = productByBarcode(product.barcode);
  drawScan();
  showFeedback(false, '−1', p.name + ' thrown away', stockOf(p) + ' on the shelf.');
  byId('scan-input').focus();
}

// Unknown barcode: register the product (FR04)
function askToRegister(code) {
  unknownBarcode = code;
  byId('register-code').textContent = code;
  byId('register-name').value = '';
  byId('register-category').value = '';
  byId('register-size').value = '';
  byId('register-minimum').value = 10;
  hideMessage('register-error');
  byId('register-form').hidden = false;
  byId('register-name').focus();
}

// The same checks as Flask: a mistake shows straight away, and Flask checks again
function productProblem(name, category, size, minimum) {
  if (name.length < 2 || name.length > 40) return 'The product name needs 2 to 40 characters.';
  if (category === '') return 'Choose a category.';
  if (size.length > 20) return 'The pack size can have up to 20 characters.';
  if (!Number.isInteger(minimum) || minimum < 0 || minimum > 500) return 'The minimum stock must be a whole number from 0 to 500.';
  return '';
}

byId('register-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const name = byId('register-name').value.trim();
  const category = byId('register-category').value;
  const size = byId('register-size').value.trim();
  const minimum = Number(byId('register-minimum').value);
  const problem = productProblem(name, category, size, minimum);
  if (problem !== '') {
    showMessage('register-error', problem);
    return;
  }
  const barcode = unknownBarcode;
  try {
    await api('POST', '/api/products', { barcode: barcode, name: name, category: category, size: size, minimum: minimum });
  } catch (e) {
    showMessage('register-error', e.message);
    return;
  }
  const product = productByBarcode(barcode);
  byId('register-form').hidden = true;
  drawScan();
  if (mode === 'in') {
    askHowMany(product);
  } else {
    showFeedback(false, '✓', product.name + ' registered', 'Scan it again to continue.');
    byId('scan-input').focus();
  }
});

byId('register-cancel').addEventListener('click', function () {
  byId('register-form').hidden = true;
  byId('feedback').hidden = true;
  byId('scan-input').focus();
});

// Latest scans, newest first
function drawScanLog() {
  const MODE_NAME = { in: 'In', out: 'Out', waste: 'Waste', new: 'Registered' };
  let html = '';
  for (const scan of scanLog) {
    let change = '';
    if (scan.change > 0) change = '+' + scan.change + ' ';
    if (scan.change < 0) change = '−' + (-scan.change) + ' ';
    let iconName = scan.mode;
    if (scan.mode === 'new') iconName = 'barcode';
    html += `<li>
        <span class="log-icon">${icon(iconName)}</span>
        <div class="log-text"><b>${change}${esc(scan.name)}</b><span class="small muted">${MODE_NAME[scan.mode]} · ${scan.time}</span></div>
        <div class="log-count"><b>${scan.left}</b><span class="small muted">on the shelf</span></div>
      </li>`;
  }
  byId('scan-log').innerHTML = html;
  byId('week-totals').textContent = 'This week: ' + thisWeek.cameIn + ' in, ' + thisWeek.handedOut + ' out, ' + thisWeek.wasted + ' waste';
}

// Test without a scanner: one tile per product with its stock. Clicking a tile scans its barcode.
function drawTestTiles() {
  let html = '';
  for (const p of products) {
    const status = statusOf(p);
    html += `<button class="test-tile" type="button" data-code="${p.barcode}">
        <span class="test-name">${esc(p.name)}</span>
        <span class="test-size">${esc(p.size)}</span>
        <span class="test-stock"><span><b>${stockOf(p)}</b> on the shelf</span>${tag(status.text, status.color)}</span>
      </button>`;
  }
  if (!productByBarcode(UNKNOWN_BARCODE)) {
    html += `<button class="test-tile test-tile-new" type="button" data-code="${UNKNOWN_BARCODE}">
        <span class="test-name">Unknown barcode</span>
        <span class="test-size">Not registered yet</span>
      </button>`;
  }
  byId('test-tiles').innerHTML = html;
}

byId('scan-form').addEventListener('submit', function (event) {
  event.preventDefault();   // the scanner presses Enter, which sends this form
  const text = byId('scan-input').value;
  byId('scan-input').value = '';
  handleScan(text);
});

// Clicking anywhere on the scan box makes the scanner ready again
byId('scan-form').addEventListener('click', function () {
  byId('scan-input').focus();
});

byId('test-tiles').addEventListener('click', function (event) {
  const tile = event.target.closest('button');
  if (tile) handleScan(tile.dataset.code);
});

for (const button of document.querySelectorAll('.mode')) {
  button.addEventListener('click', function () {
    setMode(button.dataset.mode);
  });
}

// A short beep after a scan: high for a good scan, low for a problem
let sound = null;
function beep(good) {
  try {
    if (!sound) sound = new AudioContext();
    const tone = sound.createOscillator();
    const volume = sound.createGain();
    tone.frequency.value = good ? 1568 : 180;
    volume.gain.value = 0.05;
    tone.connect(volume);
    volume.connect(sound.destination);
    tone.start();
    tone.stop(sound.currentTime + 0.1);
  } catch (e) {
    // no sound is fine
  }
}
