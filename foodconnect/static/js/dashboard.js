/* FoodConnect: manager, dashboard
   The Dashboard page: stock, things that need attention, the forecast, and food in, out and waste. */

let stockCategory = 'All';   // the chip that is on, above the stock table

function drawDashboard() {
  getForecastIfNeeded();   // asks Flask for new predictions when the data changed
  let onShelf = 0;
  let low = 0;
  let closeToDate = 0;
  for (const p of products) {
    onShelf += stockOf(p);
    if (statusOf(p).color === 'red') low++;
    for (const b of p.batches) {
      if (daysLeft(b.date) <= 7) closeToDate += b.qty;
    }
  }
  byId('numbers').innerHTML =
    '<div class="number"><b>' + onShelf + '</b><span>' + plural(onShelf, 'item', 'items') + ' on the shelf</span></div>' +
    '<div class="number"><b>' + low + '</b><span>' + plural(low, 'product', 'products') + ' with low stock</span></div>' +
    '<div class="number"><b>' + closeToDate + '</b><span>' + plural(closeToDate, 'item close to its date', 'items close to their date') + '</span></div>' +
    '<div class="number"><b>' + thisWeek.wasted + '</b><span>' + plural(thisWeek.wasted, 'item', 'items') + ' thrown away this week</span></div>';

  drawStockTable();

  // Needs attention (FR14): red items first, then orange ones
  let urgent = '';
  let soon = '';
  for (const p of products) {
    if (statusOf(p).color === 'red') {
      urgent += `<li>${tag('Low stock', 'red')}<span><b>${esc(p.name)}:</b> ${stockOf(p)} on the shelf. The minimum is ${p.minimum}.</span></li>`;
    }
    for (const b of p.batches) {
      const n = daysLeft(b.date);
      if (n < 0) {
        urgent += `<li>${tag('Past its date', 'red')}<span>${b.qty} × <b>${esc(p.name)}.</b> Take it off the shelf and scan it as Waste.</span></li>`;
      } else if (n <= 7) {
        soon += `<li>${tag('Close to its date', 'orange')}<span>${b.qty} × <b>${esc(p.name)},</b> ${niceDate(b.date)} (${daysText(n)}). Hand these out first.</span></li>`;
      }
    }
  }
  // From the forecast (Machine Learning): how many products have a high risk of running out
  const highRisk = countHighRisk();
  if (highRisk > 0) {
    urgent += `<li>${tag('High risk', 'red')}<span>${highRisk} ${plural(highRisk, 'product has', 'products have')} a high risk of running out in the next 7 days.</span><a href="#shopping">See the shopping list</a></li>`;
  }
  let attention = urgent + soon;
  if (attention === '') attention = '<li class="muted">Nothing needs attention.</li>';
  byId('attention').innerHTML = attention;

  drawForecast();

  // Food in, out and waste per week (FR13)
  let html = '';
  let wastedTotal = 0;
  let handedOutTotal = 0;
  for (const w of weeks) {
    let percent = '–';
    if (w !== thisWeek) {
      percent = (w.wasted / (w.handedOut + w.wasted) * 100).toFixed(1) + '%';
      wastedTotal += w.wasted;
      handedOutTotal += w.handedOut;
    }
    html += `<tr>
        <td>${w.label}</td>
        <td class="num">${w.cameIn}</td>
        <td class="num">${w.handedOut}</td>
        <td class="num">${w.wasted}</td>
        <td class="num hide-on-phone">${percent}</td>
      </tr>`;
  }
  byId('flow-table').innerHTML = html;
  byId('waste-rate').textContent = 'Waste over the last 4 weeks: ' + (wastedTotal / (handedOutTotal + wastedTotal) * 100).toFixed(1) + '%';
}

// Stock per product, lowest first (compared with the minimum). The search and the chips filter it.
function drawStockTable() {
  const shown = findProducts(byId('stock-search').value, stockCategory);
  shown.sort(function (a, b) {
    return stockOf(a) / Math.max(1, a.minimum) - stockOf(b) / Math.max(1, b.minimum);
  });
  let html = '';
  for (const p of shown) {
    const status = statusOf(p);
    html += `<tr>
        <td><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.size)} – ${esc(p.category)}</span></td>
        <td class="num"><b>${stockOf(p)}</b></td>
        <td class="num hide-on-phone muted">${p.minimum}</td>
        <td>${tag(status.text, status.color)}</td>
      </tr>`;
  }
  byId('stock-table').innerHTML = html;
  byId('stock-empty').hidden = shown.length > 0;
}

byId('stock-search').addEventListener('input', drawStockTable);

byId('stock-chips').addEventListener('click', function (event) {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  stockCategory = chip.dataset.category;
  turnOnChip(byId('stock-chips'), chip);
  drawStockTable();
});
