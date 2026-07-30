import { jsPDF } from "jspdf";

export interface TaxReceiptData {
  /** Stellar transaction hash */
  transactionHash: string;
  /** Campaign title */
  campaignTitle: string;
  /** Donation amount in XLM as a string (e.g. "10.5") */
  amountXlm: string;
  /** Donor's Stellar wallet address */
  donorAddress: string;
  /** ISO date string of the donation */
  donationDate: string;
}

const PLATFORM_NAME = "ProofOfHeart";
const PLATFORM_TAX_ID =
  process.env.NEXT_PUBLIC_PLATFORM_TAX_ID?.trim() || "XX-XXXXXXX"; // Set via NEXT_PUBLIC_PLATFORM_TAX_ID env variable for production

/**
 * Generates and triggers download of a PDF tax receipt for a donation.
 */
export function downloadTaxReceipt(data: TaxReceiptData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Donation Tax Receipt", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Issued by ${PLATFORM_NAME}`, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text(`Tax ID: ${PLATFORM_TAX_ID}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  // ── Horizontal line ──
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Receipt details ──
  const details: [string, string][] = [
    ["Receipt Issue Date", data.donationDate],
    ["Campaign", data.campaignTitle],
    ["Donation Amount", `${data.amountXlm} XLM`],
    ["Donor Address", data.donorAddress],
    ["Transaction Hash", data.transactionHash],
  ];

  doc.setFontSize(11);
  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    // Wrap long values
    const valueLines = doc.splitTextToSize(value, pageWidth - margin * 2 - 40);
    doc.text(valueLines, margin + 42, y);
    y += valueLines.length * 6 + 2;
  }

  // ── Horizontal line ──
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Footer ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const footerLines = [
    "This receipt serves as an official record of your donation for tax purposes.",
    "Please retain this document for your records.",
    `Generated on ${new Date().toISOString().split("T")[0]} by ${PLATFORM_NAME}.`,
  ];
  for (const line of footerLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  // Trigger download
  const filename = `donation-receipt-${data.transactionHash.slice(0, 10)}.pdf`;
  doc.save(filename);
}
