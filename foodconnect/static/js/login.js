/* FoodConnect: log in and switching pages
   Logs in and out, and shows the pages that each role may see. */

const ROLE_NAME = { household: 'Household', volunteer: 'Volunteer', manager: 'Manager' };

// The pages each role may see. The first one is where they start.
const MENU = {
  household: [{ page: 'donate', label: 'My donations', icon: 'bag' }],
  volunteer: [{ page: 'scan', label: 'Scan station', icon: 'barcode' }, { page: 'pickups', label: 'Pickups', icon: 'truck' }],
  manager: [{ page: 'dashboard', label: 'Dashboard', icon: 'grid' }, { page: 'shopping', label: 'Shopping list', icon: 'cart' }],
};

let accounts = [];          // the demo accounts on the log in page
let currentPage = 'login';

// Flask checks the password. It gives the same message for a wrong email and a wrong password.
async function logIn(email, password) {
  let answer;
  try {
    answer = await api('POST', '/api/login', { email: email, password: password });
  } catch (e) {
    showMessage('login-error', e.message);
    return;
  }
  token = answer.token;
  currentUser = answer.user;
  hideMessage('login-error');
  location.hash = MENU[currentUser.role][0].page;
  showPage();
}

// Log out: Flask forgets this window, then the page starts fresh
async function logOut() {
  try {
    await api('POST', '/api/logout');
  } catch (e) {
    // the server may be gone; we log out anyway
  }
  token = null;
  currentUser = null;
  location.hash = 'login';
  location.reload();
}

// Shows the page from the address bar (#scan, #dashboard, ...)
function showPage() {
  let page = location.hash.slice(1);
  if (!currentUser) {
    page = 'login';
  } else {
    // each role only sees its own pages
    let allowed = false;
    for (const item of MENU[currentUser.role]) {
      if (item.page === page) allowed = true;
    }
    if (!allowed) page = MENU[currentUser.role][0].page;
  }
  currentPage = page;
  for (const section of document.querySelectorAll('.page')) {
    section.hidden = section.id !== 'page-' + page;
  }
  hideMessage('pickups-error');
  drawTopbar();
  if (currentUser) drawPage();
  if (page === 'scan') byId('scan-input').focus();
}

// Draws the data on the page you are on
function drawPage() {
  if (currentPage === 'donate') drawDonate();
  if (currentPage === 'scan') drawScan();
  if (currentPage === 'pickups') drawPickups();
  if (currentPage === 'dashboard') drawDashboard();
  if (currentPage === 'shopping') drawShopping();
  drawnVersion = version;
}

function drawTopbar() {
  if (!currentUser) {
    byId('nav').innerHTML = '';
    byId('who').hidden = true;
    return;
  }
  let html = '';
  for (const item of MENU[currentUser.role]) {
    let current = '';
    if (item.page === currentPage) current = ' aria-current="page"';
    html += '<a href="#' + item.page + '"' + current + '><span class="nav-icon">' + icon(item.icon) + '</span>' + item.label + '</a>';
  }
  byId('nav').innerHTML = html;
  byId('who-name').textContent = currentUser.name;
  byId('who-role').textContent = ROLE_NAME[currentUser.role];
  byId('who').hidden = false;
}

function drawDemoAccounts() {
  let html = '';
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    html += `<li>
      <div><b>${esc(account.name)}</b><span class="small muted">${ROLE_NAME[account.role]}, ${esc(account.email)}</span></div>
      <button class="btn btn-grey btn-small" type="button" data-index="${i}">Log in as ${esc(account.first)}</button>
    </li>`;
  }
  byId('demo-accounts').innerHTML = html;
}

byId('login-form').addEventListener('submit', function (event) {
  event.preventDefault();
  logIn(byId('login-email').value.trim().toLowerCase(), byId('login-password').value);
});

byId('demo-accounts').addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (button) logIn(accounts[button.dataset.index].email, 'demo1234');
});

byId('logout').addEventListener('click', logOut);
window.addEventListener('hashchange', showPage);
