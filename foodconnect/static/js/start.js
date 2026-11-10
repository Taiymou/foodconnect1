/* FoodConnect: start
   index.html loads this file last, because it uses functions from all the other files. */

// The date pickers only offer dates that the forms accept
byId('donate-date').min = dayFromToday(2);
byId('add-date').min = TODAY;

showPage();

// The demo accounts come from Flask
api('GET', '/api/accounts')
  .then(function (answer) {
    accounts = answer.accounts;
    drawDemoAccounts();
  })
  .catch(function () {
    // the message about the connection is already on the page
  });
