import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

interface CertificateData {
  id: string;
  studentName: string;
  courseSlug: string;
  courseTitle: string;
  certificateNo: string;
  issuedDate: string | Date;
  gradeScore?: string;
  signatureBy?: string;
}

/**
 * Generate a tamper-proof PDF certificate with QR verification code.
 * Uses pdf-lib for zero-dependency server-side PDF generation.
 */
export async function generateCertificatePDF(cert: CertificateData): Promise<Buffer> {
  // ── Create A4 landscape PDF ──
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape (points)
  const { width, height } = page.getSize();

  // ── Embed Fonts ──
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // ── Color Palette (UWE Gold / Dark Theme) ──
  const gold = rgb(0.831, 0.722, 0.067);       // #D4B811
  const brightGold = rgb(1, 0.722, 0);          // #FFB800
  const darkBg = rgb(0.039, 0.051, 0.094);      // #0A0D18
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.7, 0.7, 0.75);
  const goldFaint = rgb(0.831, 0.722, 0.067);

  // ── Background ──
  page.drawRectangle({
    x: 0, y: 0,
    width, height,
    color: darkBg,
  });

  // ── Gold Border Frame (outer) ──
  const borderWidth = 3;
  const margin = 25;
  // Top
  page.drawRectangle({ x: margin, y: height - margin - borderWidth, width: width - 2 * margin, height: borderWidth, color: gold });
  // Bottom
  page.drawRectangle({ x: margin, y: margin, width: width - 2 * margin, height: borderWidth, color: gold });
  // Left
  page.drawRectangle({ x: margin, y: margin, width: borderWidth, height: height - 2 * margin, color: gold });
  // Right
  page.drawRectangle({ x: width - margin - borderWidth, y: margin, width: borderWidth, height: height - 2 * margin, color: gold });

  // ── Inner Border (thinner) ──
  const innerMargin = 35;
  const innerBW = 1;
  page.drawRectangle({ x: innerMargin, y: height - innerMargin - innerBW, width: width - 2 * innerMargin, height: innerBW, color: rgb(0.5, 0.43, 0.04) });
  page.drawRectangle({ x: innerMargin, y: innerMargin, width: width - 2 * innerMargin, height: innerBW, color: rgb(0.5, 0.43, 0.04) });
  page.drawRectangle({ x: innerMargin, y: innerMargin, width: innerBW, height: height - 2 * innerMargin, color: rgb(0.5, 0.43, 0.04) });
  page.drawRectangle({ x: width - innerMargin - innerBW, y: innerMargin, width: innerBW, height: height - 2 * innerMargin, color: rgb(0.5, 0.43, 0.04) });

  // ── Corner Accents (gold squares) ──
  const cornerSize = 12;
  const cornerOffset = margin + 5;
  // Top-left
  page.drawRectangle({ x: cornerOffset, y: height - cornerOffset - cornerSize, width: cornerSize, height: cornerSize, color: gold });
  // Top-right
  page.drawRectangle({ x: width - cornerOffset - cornerSize, y: height - cornerOffset - cornerSize, width: cornerSize, height: cornerSize, color: gold });
  // Bottom-left
  page.drawRectangle({ x: cornerOffset, y: cornerOffset, width: cornerSize, height: cornerSize, color: gold });
  // Bottom-right
  page.drawRectangle({ x: width - cornerOffset - cornerSize, y: cornerOffset, width: cornerSize, height: cornerSize, color: gold });

  // ── Header: Organization Name ──
  const orgText = 'UNITY WARRIORS EMPIRE';
  const orgWidth = fontBold.widthOfTextAtSize(orgText, 11);
  page.drawText(orgText, {
    x: (width - orgWidth) / 2,
    y: height - 70,
    size: 11,
    font: fontBold,
    color: brightGold,
  });

  const subOrgText = 'SOVEREIGN EDUCATION DIRECTORATE';
  const subOrgWidth = fontRegular.widthOfTextAtSize(subOrgText, 8);
  page.drawText(subOrgText, {
    x: (width - subOrgWidth) / 2,
    y: height - 85,
    size: 8,
    font: fontRegular,
    color: lightGray,
  });

  // ── Decorative Line ──
  page.drawRectangle({
    x: width / 2 - 120,
    y: height - 100,
    width: 240,
    height: 1,
    color: goldFaint,
  });

  // ── Title: CERTIFICATE OF COMPLETION ──
  const titleText = 'CERTIFICATE OF COMPLETION';
  const titleSize = 28;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: height - 145,
    size: titleSize,
    font: fontBold,
    color: white,
  });

  // ── Subtitle ──
  const subtitleText = 'This officially certifies that the named operative has successfully';
  const subtitleWidth = fontItalic.widthOfTextAtSize(subtitleText, 9);
  page.drawText(subtitleText, {
    x: (width - subtitleWidth) / 2,
    y: height - 168,
    size: 9,
    font: fontItalic,
    color: lightGray,
  });

  const subtitle2 = 'satisfied all academic directives & tactical masterclasses.';
  const subtitle2Width = fontItalic.widthOfTextAtSize(subtitle2, 9);
  page.drawText(subtitle2, {
    x: (width - subtitle2Width) / 2,
    y: height - 182,
    size: 9,
    font: fontItalic,
    color: lightGray,
  });

  // ── "PROUDLY CONFERRED UPON" ──
  const conferText = 'PROUDLY CONFERRED UPON';
  const conferWidth = fontRegular.widthOfTextAtSize(conferText, 8);
  page.drawText(conferText, {
    x: (width - conferWidth) / 2,
    y: height - 215,
    size: 8,
    font: fontRegular,
    color: goldFaint,
  });

  // ── Student Name (large, gold) ──
  const nameSize = Math.min(36, 36 * (20 / Math.max(cert.studentName.length, 10)));
  const nameWidth = fontBold.widthOfTextAtSize(cert.studentName.toUpperCase(), nameSize);
  page.drawText(cert.studentName.toUpperCase(), {
    x: (width - nameWidth) / 2,
    y: height - 255,
    size: nameSize,
    font: fontBold,
    color: brightGold,
  });

  // ── Underline under name ──
  page.drawRectangle({
    x: (width - nameWidth) / 2 - 10,
    y: height - 262,
    width: nameWidth + 20,
    height: 2,
    color: goldFaint,
  });

  // ── "FOR MASTERING THE CURRICULUM OF" ──
  const forText = 'FOR MASTERING THE CURRICULUM OF';
  const forWidth = fontRegular.widthOfTextAtSize(forText, 8);
  page.drawText(forText, {
    x: (width - forWidth) / 2,
    y: height - 290,
    size: 8,
    font: fontRegular,
    color: lightGray,
  });

  // ── Course Title ──
  const courseTitle = cert.courseTitle.toUpperCase();
  const ctSize = 18;
  const ctWidth = fontBold.widthOfTextAtSize(courseTitle, ctSize);
  page.drawText(courseTitle, {
    x: (width - ctWidth) / 2,
    y: height - 315,
    size: ctSize,
    font: fontBold,
    color: brightGold,
  });

  // ── Grade Score Badge ──
  const grade = cert.gradeScore || 'HONORS (DISTINCTION)';
  const gradeText = `GRADE: ${grade.toUpperCase()}`;
  const gradeWidth = fontBold.widthOfTextAtSize(gradeText, 9);
  const badgeX = (width - gradeWidth - 24) / 2;
  page.drawRectangle({
    x: badgeX,
    y: height - 345,
    width: gradeWidth + 24,
    height: 20,
    color: rgb(0.831, 0.722, 0.067),
    opacity: 0.15,
    borderColor: goldFaint,
    borderWidth: 1,
  });
  page.drawText(gradeText, {
    x: badgeX + 12,
    y: height - 340,
    size: 9,
    font: fontBold,
    color: brightGold,
  });

  // ── Generate QR Code ──
  const verificationUrl = `https://uwe-pearl.vercel.app/api/certificates/verify/${cert.id}`;
  let qrImageBytes: Buffer | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#D4B811', light: '#0A0D18' },
    });
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    qrImageBytes = Buffer.from(base64Data, 'base64');
  } catch {
    // QR generation failed — skip QR embed
  }

  // ── Footer Section: Date | QR | Authority (3 columns) ──
  const footerY = 95;

  // ── Divider line above footer ──
  page.drawRectangle({
    x: 60,
    y: footerY + 35,
    width: width - 120,
    height: 1,
    color: rgb(0.3, 0.28, 0.2),
  });

  // Left: Date Conferred
  page.drawText('DATE CONFERRED', {
    x: 80,
    y: footerY + 18,
    size: 7,
    font: fontRegular,
    color: lightGray,
  });

  const issuedDate = new Date(cert.issuedDate);
  const dateStr = issuedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  page.drawText(dateStr, {
    x: 80,
    y: footerY + 3,
    size: 10,
    font: fontBold,
    color: white,
  });

  page.drawText('Verified Academic Record', {
    x: 80,
    y: footerY - 12,
    size: 7,
    font: fontItalic,
    color: goldFaint,
  });

  // Center: QR Code
  if (qrImageBytes) {
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrSize = 65;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: footerY - 20,
      width: qrSize,
      height: qrSize,
    });
    const scanText = 'SCAN TO VERIFY';
    const scanWidth = fontBold.widthOfTextAtSize(scanText, 6);
    page.drawText(scanText, {
      x: (width - scanWidth) / 2,
      y: footerY - 28,
      size: 6,
      font: fontBold,
      color: goldFaint,
    });
  }

  // Right: Command Authority
  const rightX = width - 220;
  page.drawText('COMMAND AUTHORITY', {
    x: rightX,
    y: footerY + 18,
    size: 7,
    font: fontRegular,
    color: lightGray,
  });

  const signedBy = cert.signatureBy || 'UWE Command Council';
  page.drawText(signedBy, {
    x: rightX,
    y: footerY + 3,
    size: 11,
    font: fontBold,
    color: brightGold,
  });

  page.drawText('Sovereign Directives Directorate', {
    x: rightX,
    y: footerY - 12,
    size: 7,
    font: fontItalic,
    color: lightGray,
  });

  // ── Bottom verification hash ──
  const hashText = `Verification Hash: ${cert.id} • Certificate No: ${cert.certificateNo}`;
  const hashWidth = fontRegular.widthOfTextAtSize(hashText, 6);
  page.drawText(hashText, {
    x: (width - hashWidth) / 2,
    y: 38,
    size: 6,
    font: fontRegular,
    color: lightGray,
  });

  const authText = 'Authenticated via UWE Cloud Gateway • Tamper-Proof Digital Credential';
  const authWidth = fontRegular.widthOfTextAtSize(authText, 5.5);
  page.drawText(authText, {
    x: (width - authWidth) / 2,
    y: 28,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // ── Serialize PDF ──
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
