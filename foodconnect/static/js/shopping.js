/* FoodConnect: manager, shopping list
   The Shopping list page: what to buy for the next 7 days.
   The suggested amounts come from Flask (Linear Regression, see the ai folder). */

let buyAmounts = {};   // the amounts the manager changed, by barcode. The other products use the suggestion.

// The amount Flask suggests for a product. 0 when there is no prediction for it.
function suggestedOf(product) {
  const f = forecastOf(product);
  if (!hasPrediction(f)) return 0;
  return f.toBuy;
}

// The amount on the list: the manager's own amount, or else the suggestion
function amountToBuy(product) {
  if (buyAmounts[product.barcode] !== undefined) return buyAmounts[product.barcode];
  return suggestedOf(product);
}

function drawShopping() {
  getForecastIfNeeded();   // asks Flask for new predictions when the data changed
  const ready = showForecastState('shopping-loading', 'shopping-error');
  byId('shopping-box').hidden = !ready;
  byId('example').hidden = !ready;
  if (!ready) {
    byId('runs-out-count').textContent = '';
    byId('buy-total').textContent = '–';
    return;
  }
  byId('extra-percent').textContent = forecast.extraPercent;

  let html = '';
  for (const p of products) {
    const f = forecastOf(p);
    const amount = amountToBuy(p);
    const suggested = suggestedOf(p);
    let prediction = '–';
    let history = p.lastWeeks.join(', ');
    let note = 'Suggested: ' + suggested;
    if (hasPrediction(f)) {
      prediction = f.predictedDemand;
    } else {
      history = 'Not enough yet';
      note = 'No suggestion yet';
    }
    // A changed amount gets a black stepper, with the suggestion under it
    let stepperClass = 'stepper';
    let noteHidden = ' hidden';
    if (amount !== suggested) {
      stepperClass = 'stepper stepper-dark';
      noteHidden = '';
    }
    html += `<tr>
        <td><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.size)}</span></td>
        <td class="hide-on-phone muted">${history}</td>
        <td class="num hide-on-phone">${prediction}</td>
        <td class="num">${stockOf(p)}</td>
        <td class="hide-on-phone">${riskTag(f)}</td>
        <td class="num">
          <div class="${stepperClass}">
            <button class="stepper-minus" type="button" data-barcode="${p.barcode}" aria-label="Remove one"${amount <= 0 ? ' disabled' : ''}>−</button>
            <input value="${amount}" data-barcode="${p.barcode}" inputmode="numeric" aria-label="To buy, ${esc(p.name)}">
            <button class="stepper-plus" type="button" data-barcode="${p.barcode}" aria-label="Add one">+</button>
          </div>
          <span class="suggested"${noteHidden}>${note}</span>
        </td>
      </tr>`;
  }
  byId('shopping-table').innerHTML = html;
  const highRisk = countHighRisk();
  byId('runs-out-count').textContent = highRisk + ' of ' + products.length + ' products have a high risk of running out';
  drawTotal();

  // A worked example with the first product that has a prediction, so everyone can follow the steps.
  // Every number in it comes from Flask.
  byId('example').hidden = true;
  for (const p of products) {
    const f = forecastOf(p);
    if (!hasPrediction(f)) continue;
    byId('example').innerHTML =
      '<b>Example, ' + esc(p.name) + ':</b> handed out ' + p.lastWeeks.join(', ') + ' in the last ' + p.lastWeeks.length + ' weeks. ' +
      'Linear Regression predicts ' + f.predictedDemand + ' for the next 7 days. ' +
      'Extra: ' + forecast.extraPercent + '% of ' + f.predictedDemand + ' is ' + f.extra + '. ' +
      'To buy: ' + f.predictedDemand + ' + ' + f.extra + ' − ' + f.stock + ' on the shelf = ' + f.toBuy + '.';
    byId('example').hidden = false;
    break;
  }
}

// The total in the black bar. It changes straight away when an amount changes.
function drawTotal() {
  let total = 0;
  for (const p of products) total += amountToBuy(p);
  byId('buy-total').textContent = total;
}

// − and + in the list
byId('shopping-table').addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) return;
  const product = productByBarcode(button.dataset.barcode);
  let amount = amountToBuy(product);
  if (button.classList.contains('stepper-minus')) amount = amount - 1;
  if (button.classList.contains('stepper-plus')) amount = amount + 1;
  if (amount < 0) amount = 0;
  if (amount > 999) amount = 999;
  buyAmounts[product.barcode] = amount;
  hideCopyResult();
  drawShopping();
});

// Typing an amount: the note, the stepper colour and the total change straight away.
// The list is not drawn again here, because that would empty the field you are typing in.
byId('shopping-table').addEventListener('input', function (event) {
  const product = productByBarcode(event.target.dataset.barcode);
  let amount = parseInt(event.target.value);
  if (isNaN(amount) || amount < 0) amount = 0;
  buyAmounts[product.barcode] = amount;
  const row = event.target.closest('tr');
  if (amount === suggestedOf(product)) {
    row.querySelector('.suggested').hidden = true;
    row.querySelector('.stepper').className = 'stepper';
  } else {
    row.querySelector('.suggested').hidden = false;
    row.querySelector('.stepper').className = 'stepper stepper-dark';
  }
  hideCopyResult();
  drawTotal();
});

// The list as text: one line per product with an amount above 0, like "29 × Wholegrain pasta (500 g)"
function listText() {
  const lines = [];
  for (const p of products) {
    const amount = amountToBuy(p);
    if (amount > 0) lines.push(amount + ' × ' + p.name + ' (' + p.size + ')');
  }
  return lines.join('\n');
}

function hideCopyResult() {
  hideMessage('copy-ok');
  hideMessage('copy-error');
  byId('copy-fallback').hidden = true;
}

byId('copy-list').addEventListener('click', async function () {
  hideCopyResult();
  const text = listText();
  if (text === '') {
    showMessage('copy-error', 'Nothing to copy. Every amount is 0.');
    return;
  }
  try {
    // Browsers only allow copying straight after a click, so this happens inside the click
    await navigator.clipboard.writeText(text);
    showMessage('copy-ok', 'List copied.');
  } catch (e) {
    // Copying didn't work (for example on plain http from another computer): show the list to copy by hand
    byId('copy-text').value = text;
    byId('copy-text').rows = text.split('\n').length;
    byId('copy-fallback').hidden = false;
    byId('copy-text').select();
  }
});
