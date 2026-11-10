/* FoodConnect: talking to Flask
   Flask (app.py) keeps all the data, so every browser window sees the same donations, stock and scans.
   This file sends requests to Flask and keeps the latest data in the variables below. */

let token = null;        // proves to Flask who is logged in, in this browser window
let currentUser = null;  // the person who is logged in
let products = [];
let weeks = [];
let thisWeek = null;     // the last row of weeks
let scanLog = [];        // newest scan first
let donations = [];      // only the donations this user may see
let version = 0;         // Flask counts up after every change
let drawnVersion = 0;    // the version of the data that the page shows now

// Sends a request to Flask and returns its answer.
// When Flask says no, this throws an error with Flask's message.
async function api(method, url, body) {
  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Authorization': token || '' },
  };
  if (body) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url, options);
  } catch (e) {
    showMessage('connection-error', 'No connection to the server. Check that python app.py is still running.');
    throw new Error('No connection to the server.');
  }
  hideMessage('connection-error');

  const answer = await response.json();
  if (response.status === 401 && token) {
    // Flask doesn't know this window any more, for example because the server restarted
    token = null;
    currentUser = null;
    location.hash = 'login';
    showPage();
    showMessage('login-error', 'Please log in again.');
  }
  if (!response.ok) {
    const error = new Error(answer.error);
    error.hint = answer.hint || '';
    throw error;
  }
  if (answer.state) {
    products = answer.state.products;
    weeks = answer.state.weeks;
    thisWeek = weeks[weeks.length - 1];
    scanLog = answer.state.scanLog;
    donations = answer.state.donations;
    version = answer.state.version;
  }
  return answer;
}

// Asks Flask for the latest data
async function refresh() {
  try {
    await api('GET', '/api/state');
  } catch (e) {
    // the message about the connection is already on the page
  }
}

// Every 3 seconds: did somebody change something in another window? Then draw the page again.
// Not while someone types in a field, because drawing again would empty the field.
// (The scan field is the exception: it has focus all the time.)
setInterval(async function () {
  if (!token) return;
  await refresh();
  const field = document.activeElement;
  const typing = field.tagName === 'INPUT' && field.id !== 'scan-input';
  if (version !== drawnVersion && !typing) drawPage();
}, 3000);
