/* FoodConnect: household, offer food
   The My donations page. */

const STATUS_TEXT = {
  waiting: 'Waiting for a volunteer',
  accepted: 'Accepted',
  pickedup: 'Picked up',
  received: 'Received',
  cancelled: 'Cancelled',
};

let chosen = '';             // the barcode of the chosen product, 'other' for "Something else", or '' for nothing
let donateQty = 1;           // How many? From 1 to 50
let otherName = '';          // the name typed for "Something else"
let donateCategory = 'All';  // the chip that is on, above the tiles

function drawDonate() {
  drawTiles();
  drawNewDonation();
  drawMyDonations();
}

// One tile per product, and "Something else" at the end
function drawTiles() {
  let html = '';
  for (const p of findProducts(byId('donate-search').value, donateCategory)) {
    html += tileHtml(p.barcode, p.name, p.size, CATEGORY_ICON[p.category]);
  }
  html += tileHtml('other', 'Something else', 'Not in the list', 'pencil');
  byId('product-tiles').innerHTML = html;
}

// A tile has a + in the corner. On the chosen tile the + becomes a stepper.
function tileHtml(id, name, size, iconName) {
  let tileClass = 'tile';
  if (id === 'other') tileClass = 'tile tile-other';
  let corner = '<button class="tile-add" type="button" aria-label="Choose ' + esc(name) + '">+</button>';
  if (id === chosen) {
    tileClass += ' tile-chosen';
    corner = `<div class="stepper stepper-dark">
        <button class="stepper-minus" type="button" aria-label="Remove one"${donateQty <= 1 ? ' disabled' : ''}>−</button>
        <input id="donate-qty" value="${donateQty}" inputmode="numeric" aria-label="How many?">
        <button class="stepper-plus" type="button" aria-label="Add one"${donateQty >= 50 ? ' disabled' : ''}>+</button>
      </div>`;
  }
  return `<div class="${tileClass}" data-choose="${id}">
      <div class="tile-picture">${icon(iconName)}${corner}</div>
      <p class="tile-name">${esc(name)}</p>
      <p class="tile-size">${esc(size)}</p>
    </div>`;
}

// The "New donation" panel shows what you chose. On a phone the black bar at the bottom shows it too.
function drawNewDonation() {
  let html = '<p class="muted">Nothing chosen yet. Tap the + on a product.</p>';
  let barText = '';
  if (chosen === 'other') {
    html = `<div class="field">
        <label for="other-name">Name of the food</label>
        <input id="other-name" maxlength="60" value="${esc(otherName)}" placeholder="For example: Baby formula">
      </div>`;
    barText = donateQty + ' × Something else';
  } else if (chosen !== '') {
    const p = productByBarcode(chosen);
    html = `<div class="chosen">
        <span class="chosen-picture">${icon(CATEGORY_ICON[p.category])}</span>
        <div><b>${donateQty} × ${esc(p.name)}</b><span class="small muted">${esc(p.size)}</span></div>
      </div>`;
    barText = donateQty + ' × ' + p.name;
  }
  byId('donate-summary').innerHTML = html;
  byId('basket-text').textContent = barText;
  byId('basket-bar').hidden = chosen === '';
}

// The donations of this household, each with a tracker
function drawMyDonations() {
  byId('donate-address').textContent = 'Only the volunteer who accepts your donation sees your address (' + currentUser.address + ').';
  let html = '';
  let received = 0;
  for (const d of donations) {   // Flask only sends this household's own donations
    if (d.status === 'received') received++;
    let next = '';
    if (d.status === 'waiting') next = '<div><button class="btn btn-outline btn-small" type="button" data-cancel="' + d.id + '">Cancel donation</button></div>';
    if (d.status === 'accepted') next = '<p>' + esc(d.volunteer) + ' will pick it up.</p>';
    if (d.status === 'pickedup') next = '<p>' + esc(d.volunteer) + ' is bringing it to the food bank.</p>';
    html += `<article class="card donation">
        <div class="donation-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag(STATUS_TEXT[d.status], 'grey')}</div>
        ${trackerHtml(d.status)}
        <p class="small muted">Date on the package: ${niceDate(d.date)}</p>
        ${next}
      </article>`;
  }
  if (html === '') html = '<p class="muted">No donations yet. Choose a product to offer your first donation.</p>';
  byId('my-donations').innerHTML = html;
  byId('donate-count').textContent = received + ' received so far';
}

// The 4 steps of a donation, like a delivery tracker. A cancelled donation has no tracker.
function trackerHtml(status) {
  if (status === 'cancelled') return '';
  const steps = ['Listed', 'Accepted', 'Picked up', 'Received'];
  const now = ['waiting', 'accepted', 'pickedup', 'received'].indexOf(status);
  let html = '<ol class="tracker" aria-label="Steps">';
  for (let i = 0; i < steps.length; i++) {
    if (i < now) html += '<li class="step-done">' + steps[i] + '</li>';
    if (i === now) html += '<li class="step-now" aria-current="step">' + steps[i] + '</li>';
    if (i > now) html += '<li>' + steps[i] + '</li>';
  }
  return html + '</ol>';
}

// Clicking a tile chooses it. Only one product per donation, and a new choice starts at 1.
byId('product-tiles').addEventListener('click', function (event) {
  if (event.target.closest('.stepper-minus')) {
    changeDonateQty(-1);
    return;
  }
  if (event.target.closest('.stepper-plus')) {
    changeDonateQty(1);
    return;
  }
  if (event.target.closest('.stepper')) return;   // a click on the number itself
  const tile = event.target.closest('.tile');
  if (tile && tile.dataset.choose !== chosen) {
    chosen = tile.dataset.choose;
    donateQty = 1;
    hideMessage('donate-error');
    hideMessage('donate-ok');
    drawTiles();
    drawNewDonation();
  }
});

// − and + on the chosen tile. The number stays between 1 and 50.
function changeDonateQty(step) {
  donateQty = donateQty + step;
  if (donateQty < 1) donateQty = 1;
  if (donateQty > 50) donateQty = 50;
  drawTiles();
  drawNewDonation();
}

// Typing the number in the stepper
byId('product-tiles').addEventListener('input', function (event) {
  if (event.target.id === 'donate-qty') {
    donateQty = parseInt(event.target.value) || 0;
    drawNewDonation();
  }
});

// Typing the name for "Something else"
byId('donate-summary').addEventListener('input', function (event) {
  if (event.target.id === 'other-name') otherName = event.target.value;
});

// Search and chips above the tiles
byId('donate-search').addEventListener('input', drawTiles);

byId('donate-chips').addEventListener('click', function (event) {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  donateCategory = chip.dataset.category;
  turnOnChip(byId('donate-chips'), chip);
  drawTiles();
});

// The black bar on a phone: jump to the date field
byId('basket-button').addEventListener('click', function () {
  byId('donate-date').focus();
});

// The same checks as Flask (FR12 and FR15), so a mistake shows straight away. Flask checks again.
function donationProblem(item, qty, date) {
  if (chosen === '') return 'Choose what food it is.';
  if (item.length < 2 || item.length > 60) return 'The name of the food needs 2 to 60 characters.';
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) return 'How many must be a whole number from 1 to 50.';
  if (date === '') return 'Fill in the date on the package.';
  if (daysLeft(date) < 2) return 'The date is too close. Choose a date at least 2 days from today.';
  return '';
}

byId('donate-button').addEventListener('click', async function () {
  hideMessage('donate-ok');
  let item = otherName.trim();
  if (chosen !== '' && chosen !== 'other') item = productByBarcode(chosen).name;
  const date = byId('donate-date').value;
  const problem = donationProblem(item, donateQty, date);
  if (problem !== '') {
    showMessage('donate-error', problem);
    return;
  }
  try {
    await api('POST', '/api/donations', { item: item, qty: donateQty, date: date });
  } catch (e) {
    showMessage('donate-error', e.message);
    return;
  }
  hideMessage('donate-error');
  chosen = '';
  donateQty = 1;
  otherName = '';
  byId('donate-date').value = '';
  showMessage('donate-ok', 'Donation offered. A volunteer nearby can accept it now.');
  drawDonate();
});

// Cancel a donation, only while nobody accepted it
byId('my-donations').addEventListener('click', async function (event) {
  const button = event.target.closest('button[data-cancel]');
  if (!button) return;
  try {
    await api('POST', '/api/donations/' + button.dataset.cancel + '/cancel');
  } catch (e) {
    await refresh();   // for example a volunteer accepted it just now: show its latest status
  }
  drawMyDonations();
});
