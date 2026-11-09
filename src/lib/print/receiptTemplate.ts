import formatCurrency from '../formatCurrency';

export interface ReceiptLine {
  quantity: number;
  name: string;
  modifiers?: string[];
  note?: string;
  lineTotal: number;
}

export interface ReceiptData {
  storeName: string;
  header?: string;
  footer?: string;
  orderId: string;
  timestamp: Date | string;
  cashier?: string;
  customer?: string;
  phone?: string;
  address?: string;
  orderType?: string;
  status?: string;
  lines: ReceiptLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  giftCards?: { code: string; value: number }[];
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function currency(amount: number): string {
  return esc(formatCurrency(amount));
}

function orderTypeLabel(orderType?: string): string {
  switch (orderType) {
    case 'dine_in': return 'DINE IN';
    case 'takeaway': return 'TAKEAWAY';
    case 'delivery': return 'DELIVERY';
    default: return '';
  }
}

export function buildReceiptHTML(data: ReceiptData): string {
  const store = data.storeName || 'Vermont Thai';

  const metaRows: string[] = [];
  metaRows.push(`<div class="row"><span class="k">Order #</span><span class="v">${esc(data.orderId)}</span></div>`);
  metaRows.push(`<div class="row"><span class="k">Date</span><span class="v">${esc(new Date(data.timestamp).toLocaleString())}</span></div>`);
  const type = orderTypeLabel(data.orderType);
  if (type) metaRows.push(`<div class="row"><span class="k">Type</span><span class="v">${type}</span></div>`);
  if (data.cashier) metaRows.push(`<div class="row"><span class="k">Cashier</span><span class="v">${esc(data.cashier)}</span></div>`);
  if (data.customer) metaRows.push(`<div class="row"><span class="k">Customer</span><span class="v">${esc(data.customer)}</span></div>`);
  if (data.phone) metaRows.push(`<div class="row"><span class="k">Tel</span><span class="v">${esc(data.phone)}</span></div>`);

  const items = data.lines
    .map(line => {
      const mods = (line.modifiers && line.modifiers.length > 0)
        ? `<div class="mods">${line.modifiers.map(m => esc(typeof m === 'string' ? m : JSON.stringify(m))).join(', ')}</div>`
        : '';
      const note = line.note ? `<div class="note">Note: ${esc(line.note)}</div>` : '';
      return `<div class="item">
        <div class="top"><span class="name">${line.quantity}x ${esc(line.name)}</span><span class="price">${currency(line.lineTotal)}</span></div>
        ${mods}${note}
      </div>`;
    })
    .join('');

  const giftCards = (data.giftCards && data.giftCards.length > 0)
    ? `<div class="hr"></div>
      <div class="center bold" style="margin-bottom:1.5mm">GIFT CARDS PURCHASED</div>
      ${data.giftCards.map(gc => `<div class="giftcard">
        <div>Value: ${currency(gc.value)}</div>
        <div class="giftcode">${esc(gc.code)}</div>
      </div>`).join('')}`
    : '';

  const refunded = data.status && data.status.toLowerCase() === 'refunded'
    ? `<div class="stamp">VOIDED / REFUNDED</div>`
    : '';

  const paidBy = data.paymentMethod || 'CASH';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${esc(data.orderId)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; background: #fff; color: #000; }
  body { font-family: Tahoma, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; line-height: 1.35; padding: 3mm 3mm 10mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .store { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5mm; }
  .sub { font-size: 8pt; color: #222; }
  .hr { border-top: 1px dashed #000; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 4mm; }
  .row .k { color: #222; }
  .row .v { font-weight: bold; text-align: right; }
  .item { margin-bottom: 1.2mm; }
  .item .top { display: flex; justify-content: space-between; gap: 3mm; }
  .item .name { font-weight: bold; flex: 1; }
  .item .price { font-weight: bold; white-space: nowrap; }
  .item .mods { font-size: 8pt; color: #222; padding-left: 3mm; }
  .item .note { font-size: 8pt; color: #222; padding-left: 3mm; font-style: italic; }
  .grand { font-size: 12pt; font-weight: bold; border-top: 1px solid #000; padding-top: 1.5mm; margin-top: 1.5mm; }
  .payrow { font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 2mm; padding-top: 2mm; border-top: 1px dashed #000; }
  .giftcard { border: 1px solid #000; padding: 2mm; margin: 2mm 0; text-align: center; }
  .giftcode { font-family: 'Courier New', monospace; font-size: 11pt; font-weight: bold; letter-spacing: 1px; }
  .footer { font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .stamp { border: 2px solid #000; text-align: center; font-weight: bold; font-size: 13pt; padding: 2mm; margin: 3mm 0; transform: rotate(-3deg); }
  .addr { font-size: 8.5pt; margin-top: 1mm; }
</style>
</head>
<body>
  <div class="center">
    <div class="store">${esc(store)}</div>
    ${data.header ? `<div class="sub">${esc(data.header)}</div>` : `<div class="sub">Welcome to ${esc(store)}!</div>`}
  </div>
  <div class="hr"></div>
  ${metaRows.join('')}
  ${data.address ? `<div class="addr"><span class="sub">DELIVERY ADDRESS:</span><br>${esc(data.address)}</div>` : ''}
  <div class="hr"></div>
  ${items}
  <div class="hr"></div>
  <div class="totals">
    <div class="row"><span class="k">Subtotal</span><span class="v">${currency(data.subtotal)}</span></div>
    ${Number(data.tax) > 0 ? `<div class="row"><span class="k">Tax</span><span class="v">${currency(data.tax)}</span></div>` : ''}
    <div class="row grand"><span>Total</span><span>${currency(data.total)}</span></div>
  </div>
  <div class="payrow row"><span>Paid by</span><span>${esc(paidBy)}</span></div>
  ${giftCards}
  ${refunded}
  <div class="hr"></div>
  <div class="center footer">${esc(data.footer || 'Thank you for your visit!')}</div>
  <div class="center sub" style="margin-top:2mm">POWERED BY ${esc(store)}</div>
</body>
</html>`;
}
