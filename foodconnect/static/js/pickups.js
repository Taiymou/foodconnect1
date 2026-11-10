/* FoodConnect: volunteer, pickups
   The Pickups page: accept a donation, pick it up and mark it as received. */

function drawPickups() {
  const me = currentUser.first;

  // Donations nobody has accepted yet, shortest date first. Flask sends no address yet (privacy).
  const waiting = [];
  for (const d of donations) {
    if (d.status === 'waiting') waiting.push(d);
  }
  waiting.sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
  let html = '';
  for (const d of waiting) {
    let closeToDate = '';
    if (daysLeft(d.date) <= 7) closeToDate = tag('Close to its date', 'orange');
    html += `<article class="card donation">
        <div class="donation-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${closeToDate}</div>
        <p class="small muted">Date on the package: ${niceDate(d.date)}<br>From ${esc(d.from)}, ${esc(d.area)}</p>
        <div><button class="btn btn-black btn-small" type="button" data-accept="${d.id}">Accept</button></div>
      </article>`;
  }
  if (html === '') html = '<p class="muted">Nothing is waiting right now.</p>';
  byId('waiting-list').innerHTML = html;

  // My pickups: Flask only sends the address to me, and only until I picked it up
  html = '';
  let open = 0;
  const received = [];
  for (const d of donations) {
    if (d.volunteer !== me) continue;
    if (d.status === 'received') received.push(d.qty + '× ' + d.item);
    if (d.status === 'accepted') {
      open++;
      html += `<article class="card donation">
          <div class="donation-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag('Accepted', 'grey')}</div>
          ${trackerHtml(d.status)}
          <div class="address">${icon('pin')}<div><b>${esc(d.fullName)}</b><span>${esc(d.address)}, ${esc(d.area)}</span><span class="small muted">Only you see this address, until you mark the donation as picked up.</span></div></div>
          <p class="small muted">Date on the package: ${niceDate(d.date)}</p>
          <button class="btn btn-black btn-wide" type="button" data-picked="${d.id}">Mark as picked up</button>
        </article>`;
    }
    if (d.status === 'pickedup') {
      open++;
      html += `<article class="card donation">
          <div class="donation-top"><h3><span class="qty">${d.qty}×</span> ${esc(d.item)}</h3>${tag('Picked up', 'grey')}</div>
          ${trackerHtml(d.status)}
          <p>Scan the food in at the scan station, then mark it as received.</p>
          <div class="two-buttons">
            <a class="btn btn-grey" href="#scan">Open scan station</a>
            <button class="btn btn-black" type="button" data-received="${d.id}">Mark as received</button>
          </div>
        </article>`;
    }
  }
  if (html === '') html = '<p class="muted">You have no pickups. Accept a donation to start.</p>';
  byId('my-pickups').innerHTML = html;
  byId('pickup-count').textContent = open + ' open ' + plural(open, 'pickup', 'pickups');
  byId('done-list').textContent = '';
  if (received.length > 0) byId('done-list').textContent = 'Received: ' + received.join(', ') + '.';
}

// Accept, Mark as picked up and Mark as received
byId('page-pickups').addEventListener('click', async function (event) {
  const button = event.target.closest('button');
  if (!button) return;
  let url = '';
  if (button.dataset.accept) url = '/api/donations/' + button.dataset.accept + '/accept';
  if (button.dataset.picked) url = '/api/donations/' + button.dataset.picked + '/picked';
  if (button.dataset.received) url = '/api/donations/' + button.dataset.received + '/received';
  if (url === '') return;
  try {
    await api('POST', url);
    hideMessage('pickups-error');
  } catch (e) {
    showMessage('pickups-error', e.message);   // for example another volunteer accepted it first
    await refresh();
  }
  drawPickups();
});
