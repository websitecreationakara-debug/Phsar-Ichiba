// Client-side invoice PDF generation for admin orders. jspdf + autotable are
// heavy and only needed on click, so they're imported dynamically — this keeps
// them out of the storefront bundle entirely.

import { withBase } from "./base-path";

type InvoiceItem = { id?: string; title: string; qty: number; price: number };

export type InvoiceOrder = {
  id: string;
  created_at: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  items: InvoiceItem[];
  total: number;
  status?: string | null;
};

const STORE = {
  name: "Phsar Ichiba",
  phone: "023-966-313",
};

// leaf-600, the storefront's primary brand green.
const BRAND: [number, number, number] = [59, 125, 32];

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(withBase("/brand/wordmark.png"));
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// jsPDF's built-in fonts (Helvetica etc.) only cover Latin text — product
// titles, customer names, and addresses are Japanese, so without an embedded
// Japanese-capable font they render as garbled boxes. Fetched as a plain TTF
// (not a data URL) since jsPDF's addFileToVFS wants raw base64.
async function loadJapaneseFontBase64(): Promise<string | null> {
  try {
    const res = await fetch(withBase("/fonts/NotoSansJP-subset.ttf"));
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

const JP_FONT = "NotoSansJP";

async function buildInvoice(order: InvoiceOrder) {
  const [{ jsPDF }, autoTableMod, logo, jpFontBase64] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadLogo(),
    loadJapaneseFontBase64(),
  ]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const shortId = order.id.slice(0, 8).toUpperCase();

  // All non-bold text uses this — falls back to Helvetica only if the font
  // fetch failed, in which case Japanese text will still garble, but the rest
  // of the invoice still renders instead of the whole thing failing.
  let bodyFont = "helvetica";
  if (jpFontBase64) {
    doc.addFileToVFS("NotoSansJP.ttf", jpFontBase64);
    doc.addFont("NotoSansJP.ttf", JP_FONT, "normal");
    bodyFont = JP_FONT;
  }

  // ---- Header: logo (left) + INVOICE (right) ----
  let infoY = 20;
  if (logo) {
    const w = 50;
    const h = w * (311 / 562); // preserve the wordmark's aspect ratio
    doc.addImage(logo, "PNG", M, 12, w, h);
    infoY = 12 + h + 5;
  }

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(STORE.phone, M, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30);
  doc.text("INVOICE", pageW - M, 20, { align: "right" });

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Invoice #${shortId}`, pageW - M, 26, { align: "right" });
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, pageW - M, 30, {
    align: "right",
  });
  if (order.status) {
    doc.text(`Status: ${order.status}`, pageW - M, 34, { align: "right" });
  }

  doc.setDrawColor(220);
  doc.line(M, 40, pageW - M, 40);

  // ---- Bill To ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text("Bill To", M, 50);

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const billLines = [
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    [order.address, order.city, order.postal_code].filter(Boolean).join(", ") || null,
  ].filter((l): l is string => Boolean(l));
  let y = 56;
  for (const line of billLines) {
    doc.text(line, M, y);
    y += 5;
  }

  // ---- Items ----
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Number(order.total);
  const shipping = Math.max(0, Math.round((total - subtotal) * 100) / 100);

  autoTable(doc, {
    startY: Math.max(y + 4, 70),
    head: [["Item", "Qty", "Unit Price", "Amount"]],
    body: order.items.map((it) => [
      it.title,
      String(it.qty),
      `$${it.price.toFixed(2)}`,
      `$${(it.price * it.qty).toFixed(2)}`,
    ]),
    styles: { font: bodyFont, fontSize: 9, cellPadding: 3 },
    // Headers are always plain English ("Item", "Qty", ...) — keep them on
    // Helvetica bold rather than the Japanese font, which only has a normal
    // weight registered.
    headStyles: { font: "helvetica", fillColor: BRAND, textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
    margin: { left: M, right: M },
  });

  // ---- Totals ----
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const labelX = pageW - M - 50;
  const valX = pageW - M;
  let ty = finalY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Subtotal", labelX, ty);
  doc.text(`$${subtotal.toFixed(2)}`, valX, ty, { align: "right" });
  ty += 6;
  doc.text("Shipping", labelX, ty);
  doc.text(shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`, valX, ty, { align: "right" });

  doc.setDrawColor(220);
  doc.line(labelX, ty + 3, valX, ty + 3);
  ty += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text("Total", labelX, ty);
  doc.text(`$${total.toFixed(2)}`, valX, ty, { align: "right" });

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Thank you for your order!  ·  ${STORE.name}`, M, pageH - 14);

  return { doc, shortId };
}

// Saves the PDF to disk — the usual desktop flow, but on mobile it lands in
// Downloads with no easy way to look at it, since there's no file browser UI
// built into most mobile browsers' download flow.
export async function downloadInvoice(order: InvoiceOrder) {
  const { doc, shortId } = await buildInvoice(order);
  doc.save(`Phsar-Ichiba-invoice-${shortId}.pdf`);
}
