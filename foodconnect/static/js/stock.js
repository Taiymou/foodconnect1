/* FoodConnect: stock
   Works out the stock and the status of a product. Every page uses this.
   (The prediction is not made here any more: Python makes it, and forecast.js shows it.) */

function productByBarcode(barcode) {
  for (const p of products) {
    if (p.barcode === barcode) return p;
  }
  return null;
}

function stockOf(product) {
  let total = 0;
  for (const batch of product.batches) total += batch.qty;
  return total;
}

// Low stock (red), Getting low (orange) or In stock (grey), compared with the minimum
function statusOf(product) {
  const stock = stockOf(product);
  if (stock <= product.minimum) return { text: 'Low stock', color: 'red' };
  if (stock <= product.minimum * 1.5) return { text: 'Getting low', color: 'orange' };
  return { text: 'In stock', color: 'grey' };
}

// The picture of each category (the files are in static/icons)
const CATEGORY_ICON = {
  'Pasta, rice and grains': 'bowl',
  'Beans and legumes': 'can',
  'Vegetables and fruit': 'apple',
  'Dairy': 'carton',
  'Oil and spreads': 'bottle',
  'Fish and meat': 'fish',
};

// The products that match the search text and the category ('All' means every category)
function findProducts(search, category) {
  const result = [];
  for (const p of products) {
    const nameMatches = p.name.toLowerCase().includes(search.trim().toLowerCase());
    const categoryMatches = category === 'All' || p.category === category;
    if (nameMatches && categoryMatches) result.push(p);
  }
  return result;
}

// Turns one chip on (black) and the other chips in the same group off
function turnOnChip(group, chip) {
  for (const other of group.querySelectorAll('.chip')) {
    other.setAttribute('aria-pressed', 'false');
  }
  chip.setAttribute('aria-pressed', 'true');
}
