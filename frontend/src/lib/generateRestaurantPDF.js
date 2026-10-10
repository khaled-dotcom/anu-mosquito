function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function getOrderNumberValue(order) {
  const value = String(order?.order_number ?? '')
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER
}

function sortOrdersByNumber(orders) {
  return [...orders].sort((a, b) => {
    const diff = getOrderNumberValue(a) - getOrderNumberValue(b)
    return diff || String(a?.order_number ?? '').localeCompare(String(b?.order_number ?? ''))
  })
}

export function generateRestaurantPDF({ restaurant, batch, orders }) {
  const activeOrders = sortOrdersByNumber(
    (orders || []).filter((order) => order.status !== 'CANCELLED')
  )

  if (!activeOrders.length) return

  const restaurantName = restaurant?.name || 'Restaurant'
  const batchNumber = batch?.batch_number ?? '-'
  const deliveryDate = batch?.delivery_date
    ? new Date(batch.delivery_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}logo.png`

  let grandTotal = 0

  const orderCards = activeOrders.map((order) => {
    const items = order.order_items || []
    const orderTotal = items.reduce(
      (sum, item) => sum + Number(item.line_total ?? Number(item.unit_selling_price || 0) * Number(item.quantity || 0)),
      0
    )
    grandTotal += orderTotal

    const rows = items.map((item) => {
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unit_cost_price || 0)
      const lineTotal = Number(item.line_total ?? unitPrice * quantity)

      return `
        <tr>
          <td>
            <div class="item-name">${escapeHTML(item.food_name_snapshot)}</div>
            ${item.size_name ? `<div class="item-size">${escapeHTML(item.size_name)}</div>` : ''}
            ${item.notes ? `<div class="item-note">Note: ${escapeHTML(item.notes)}</div>` : ''}
          </td>
          <td class="price">${formatMoney(unitPrice)}</td>
          <td class="qty">${quantity}</td>
          <td class="total">${formatMoney(lineTotal)}</td>
        </tr>
      `
    }).join('')

    return `
      <section class="order-card">
        <div class="order-strip"></div>
        <div class="order-header">
          <div class="order-label">ORDER</div>
          <div class="order-number">${escapeHTML(order.order_number)}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>PRICE</th>
              <th>QTY</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">ORDER TOTAL</td>
              <td>${formatMoney(orderTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    `
  }).join('')

  const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>ANU Mosquito - ${escapeHTML(restaurantName)} - Batch ${escapeHTML(batchNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f6f8; color: #172033; font-family: Arial, Helvetica, sans-serif; }
  .page { max-width: 900px; margin: 0 auto; padding: 32px; }
  .header { position: relative; text-align: center; background: #fff; border: 1px solid #dfe3e8; border-radius: 20px; padding: 28px 24px 26px; box-shadow: 0 8px 24px rgba(23,32,51,.06); }
  .logo-wrap { width: 118px; height: 118px; margin: 0 auto 16px; border: 1px solid #dfe3e8; border-radius: 50%; padding: 8px; background: #fff; }
  .logo { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
  .brand { margin: 0; font-size: 10px; letter-spacing: 3px; color: #6b7280; font-weight: 700; }
  .restaurant { margin: 7px 0 14px; font-size: 30px; line-height: 1.1; font-weight: 900; }
  .batch-pill { display: inline-flex; align-items: center; gap: 10px; border: 1px solid #d5dae0; border-radius: 999px; padding: 9px 15px; font-size: 13px; font-weight: 700; background: #fafbfc; }
  .batch-pill .muted { color: #737b87; }
  .batch-pill .divider { width: 1px; height: 16px; background: #d5dae0; }
  .orders { margin-top: 22px; }
  .order-card { position: relative; background: #fff; border: 1px solid #d5dae0; border-radius: 16px; margin-bottom: 18px; overflow: hidden; box-shadow: 0 5px 18px rgba(23,32,51,.05); page-break-inside: avoid; break-inside: avoid; }
  .order-strip { height: 3px; background: #b8bec7; }
  .order-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 20px; border-bottom: 1px solid #e4e7eb; }
  .order-label { font-size: 10px; letter-spacing: 2px; color: #7a828e; font-weight: 800; }
  .order-number { min-width: 145px; min-height: 52px; padding: 10px 18px; display: flex; align-items: center; justify-content: center; border: 1px solid #cfd4db; border-radius: 12px; font-size: 34px; line-height: 1; font-weight: 900; background: #fafbfc; }
  .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .items-table th { padding: 12px 20px; text-align: left; font-size: 10px; letter-spacing: 1px; color: #7a828e; border-bottom: 1px solid #e4e7eb; }
  .items-table th:nth-child(1) { width: 48%; }
  .items-table th:nth-child(2) { width: 20%; }
  .items-table th:nth-child(3) { width: 12%; text-align: center; }
  .items-table th:nth-child(4) { width: 20%; text-align: right; }
  .items-table td { padding: 13px 20px; border-bottom: 1px solid #edf0f2; vertical-align: top; }
  .item-name { font-size: 15px; font-weight: 700; }
  .item-size { margin-top: 3px; font-size: 12px; color: #7a828e; }
  .item-note { margin-top: 5px; font-size: 11px; color: #7a828e; }
  .price { font-size: 13px; color: #5f6875; }
  .qty { text-align: center; font-size: 15px; font-weight: 800; }
  .total { text-align: right; font-size: 13px; font-weight: 800; }
  .items-table tfoot td { border-bottom: 0; padding-top: 14px; padding-bottom: 16px; font-size: 12px; font-weight: 800; }
  .items-table tfoot td:first-child { text-align: right; color: #6b7280; letter-spacing: .5px; }
  .summary { display: grid; grid-template-columns: .8fr 1.6fr; gap: 14px; margin-top: 22px; page-break-inside: avoid; }
  .summary-box { background: #fff; border: 1px solid #d5dae0; border-radius: 14px; padding: 18px 20px; }
  .summary-box.main { background: #f0f2f4; }
  .summary-label { font-size: 10px; letter-spacing: 1.4px; color: #737b87; font-weight: 800; }
  .summary-value { margin-top: 7px; font-size: 26px; font-weight: 900; }
  .summary-box.main .summary-value { font-size: 30px; }
  .back { display: block; width: max-content; margin: 18px auto 0; padding: 10px 18px; border: 1px solid #d5dae0; border-radius: 10px; background: #fff; color: #172033; cursor: pointer; font-weight: 700; }
  @media (max-width: 600px) {
    .page { padding: 14px; }
    .restaurant { font-size: 24px; }
    .order-header { padding: 14px; }
    .order-number { min-width: 110px; font-size: 28px; }
    .items-table th, .items-table td { padding-left: 12px; padding-right: 12px; }
    .summary { grid-template-columns: 1fr; }
  }
  @media print {
    @page { size: A4; margin: 10mm; }
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; padding: 0; }
    .header { box-shadow: none; }
    .order-card { box-shadow: none; }
    .back { display: none; }
    .order-card, .summary { page-break-inside: avoid; break-inside: avoid; }
    .items-table tr { page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="logo-wrap"><img class="logo" src="${logoUrl}" alt="ANU Mosquito" /></div>
      <p class="brand">ANU MOSQUITO</p>
      <h1 class="restaurant">${escapeHTML(restaurantName)}</h1>
      <div class="batch-pill">
        <span class="muted">BATCH</span>
        <span>#${escapeHTML(batchNumber)}</span>
        <span class="divider"></span>
        <span>${escapeHTML(deliveryDate)}</span>
      </div>
    </header>

    <div class="orders">${orderCards}</div>

    <section class="summary">
      <div class="summary-box">
        <div class="summary-label">TOTAL ORDERS</div>
        <div class="summary-value">${activeOrders.length}</div>
      </div>
      <div class="summary-box main">
        <div class="summary-label">TOTAL COST OF ALL ORDERS</div>
        <div class="summary-value">${formatMoney(grandTotal)}</div>
      </div>
    </section>

    <button class="back" onclick="window.close()">Close</button>
  </main>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1000,height=800')

  if (!printWindow) {
    alert('Please allow pop-ups to generate the PDF.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
  }, 300)
}
