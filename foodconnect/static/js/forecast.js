/* FoodConnect: manager, the forecast
   Gets the Machine Learning predictions from Flask and shows them.
   Nothing is predicted here: Python does that (the ai folder). This file only displays the answer. */

let forecast = null;         // the latest answer from Flask, or null when there is none (yet)
let forecastError = '';      // the message when Flask could not make the predictions
let forecastAskedFor = 0;    // the version of the data we last asked predictions for
let forecastLoading = false;

function resetForecast() {
  forecast = null;
  forecastError = '';
  forecastAskedFor = 0;
}

// The manager's pages call this when they are drawn.
// It asks Flask for new predictions when the data changed since the last time.
function getForecastIfNeeded() {
  if (forecastAskedFor !== version && !forecastLoading) loadForecast();
}

async function loadForecast() {
  forecastLoading = true;
  forecastAskedFor = version;
  try {
    forecast = await api('GET', '/api/forecast');
    forecastError = '';
  } catch (e) {
    forecast = null;
    forecastError = e.message;
    if (e.hint) forecastError += ' ' + e.hint;
  }
  forecastLoading = false;
  if (!currentUser) return;   // logged out in the meantime
  // Draw the page with the new predictions, but not while someone types in a field,
  // because drawing again would empty the field. The 3-second check draws it later.
  const field = document.activeElement;
  if (field.tagName === 'INPUT' && field.id !== 'scan-input') {
    drawnVersion = -1;
  } else {
    drawPage();
  }
}

// The prediction of one product, or null when there are no predictions (yet)
function forecastOf(product) {
  if (!forecast) return null;
  for (const f of forecast.forecasts) {
    if (f.productId === product.barcode) return f;
  }
  return null;
}

function hasPrediction(f) {
  return f !== null && f.status === 'ok';
}

// Green for low risk, orange for medium, red for high
const RISK_TAG = {
  LOW: { text: 'Low risk', color: 'green' },
  MEDIUM: { text: 'Medium risk', color: 'orange' },
  HIGH: { text: 'High risk', color: 'red' },
};

function riskTag(f) {
  if (!hasPrediction(f)) return tag('Not enough history', 'grey');
  return tag(RISK_TAG[f.risk].text, RISK_TAG[f.risk].color);
}

function countHighRisk() {
  let count = 0;
  if (forecast) {
    for (const f of forecast.forecasts) {
      if (f.risk === 'HIGH') count++;
    }
  }
  return count;
}

// Shows "Loading" or the error above a table with predictions.
// Returns true when the predictions are there and the table can be drawn.
function showForecastState(loadingId, errorId) {
  byId(loadingId).hidden = forecast !== null || forecastError !== '';
  byId(errorId).hidden = forecastError === '';
  byId(errorId).querySelector('span').textContent = forecastError;
  return forecast !== null;
}

// The Forecast card on the dashboard: highest risk first
function drawForecast() {
  const ready = showForecastState('forecast-loading', 'forecast-error');
  byId('forecast-box').hidden = !ready;
  byId('forecast-models').hidden = !ready;
  if (!ready) return;

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const rows = forecast.forecasts.slice();
  rows.sort(function (a, b) {
    const first = hasPrediction(a) ? order[a.risk] : 3;
    const second = hasPrediction(b) ? order[b.risk] : 3;
    return first - second;
  });
  let html = '';
  for (const f of rows) {
    let demand = '<b>' + f.predictedDemand + '</b>';
    if (!hasPrediction(f)) demand = '<span class="muted">–</span>';
    html += `<tr>
        <td><span class="name">${esc(f.name)}</span></td>
        <td class="num">${f.stock}</td>
        <td class="num">${demand}</td>
        <td>${riskTag(f)}</td>
        <td class="hide-on-phone muted small">${esc(f.predictionModel)} / ${esc(f.riskModel)}</td>
      </tr>`;
  }
  byId('forecast-table').innerHTML = html;

  // One line about how the models did on their tests
  const prediction = forecast.models.prediction.evaluation;
  const risk = forecast.models.risk.evaluation;
  let text = '';
  if (prediction.averageError !== null) {
    text += 'Test: predicting last week from the weeks before was off by ' + prediction.averageError + ' items on average. ';
  }
  text += 'The risk model was right for ' + Math.round(risk.accuracy * 100) + '% of ' + risk.testedOn + ' made-up test examples, not real food bank data.';
  byId('forecast-models').textContent = text;
}

// "Try again" under an error
document.addEventListener('click', function (event) {
  if (event.target.closest('.forecast-retry')) {
    forecastError = '';
    drawPage();
    loadForecast();
  }
});
