import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import PDFDocumentKit from 'pdfkit';
import QRCode from 'qrcode';

type DesignRole =
  | 'static'
  | 'participantName'
  | 'eventName'
  | 'organizationName'
  | 'date'
  | 'certificateNumber'
  | 'signatoryName'
  | 'signatoryTitle'
  | 'signature';

type DesignElement = {
  id: string;
  type: 'text' | 'rect' | 'line' | 'ellipse' | 'icon' | 'path' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  letterSpacing?: number;
  fontStyle?: 'serif' | 'sans' | 'script';
  role?: DesignRole;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  iconId?: string;
  path?: string;
  src?: string;
  locked?: boolean;
};

type CertificateDesign = {
  version: 1;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
};

export type CertificatePdfInput = {
  certificateNumber: string;
  verificationToken: string;
  participantName: string;
  eventName: string;
  eventDate: Date;
  eventLocation?: string | null;
  organizationName: string;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  titleText: string;
  subtitleText: string;
  bodyText: string;
  backgroundUrl?: string | null;
  templatePdfUrl?: string | null;
  designJson?: unknown;
  nameXPercent?: number;
  nameYPercent?: number;
  nameFontSize?: number;
  nameColor?: string;
};

@Injectable()
export class PdfService {
  constructor(private readonly config: ConfigService) {}

  getCertificatesDir() {
    return path.join(process.cwd(), 'uploads', 'certificates');
  }

  async generateCertificatePdf(input: CertificatePdfInput): Promise<string> {
    const dir = this.getCertificatesDir();
    await mkdir(dir, { recursive: true });

    const fileName = `${input.certificateNumber}.pdf`;
    const filePath = path.join(dir, fileName);

    const design = this.parseDesign(input.designJson);
    if (design) {
      await this.generateFromDesignJson(input, design, filePath);
      return filePath;
    }

    const templatePdfPath = this.resolveUploadPath(input.templatePdfUrl);
    if (templatePdfPath) {
      await this.generateFromDesignerPdf(input, templatePdfPath, filePath);
      return filePath;
    }

    await this.generateWithPdfKit(input, filePath);
    return filePath;
  }

  private parseDesign(value: unknown): CertificateDesign | null {
    if (!value || typeof value !== 'object') return null;
    const design = value as CertificateDesign;
    if (
      design.version !== 1 ||
      !Array.isArray(design.elements) ||
      typeof design.width !== 'number' ||
      typeof design.height !== 'number'
    ) {
      return null;
    }
    return design;
  }

  private resolveRoleText(
    element: DesignElement,
    input: CertificatePdfInput,
  ): string {
    switch (element.role) {
      case 'participantName':
        return input.participantName;
      case 'eventName':
        return input.eventName;
      case 'organizationName':
        return element.text?.trim() || input.organizationName;
      case 'date':
        return input.eventDate.toLocaleDateString();
      case 'certificateNumber':
        return input.certificateNumber;
      case 'signatoryName':
        return (
          element.text?.trim() ||
          input.signatoryName ||
          input.organizationName
        );
      case 'signatoryTitle':
        return (
          element.text?.trim() ||
          input.signatoryDesignation ||
          'Authorized Signatory'
        );
      case 'signature':
        return element.text ?? '';
      default:
        return element.text ?? '';
    }
  }

  private pickFont(el: DesignElement) {
    if (el.fontStyle === 'script') {
      return 'Times-Italic';
    }
    if (el.fontStyle === 'serif') {
      return el.bold ? 'Times-Bold' : 'Times-Roman';
    }
    return el.bold ? 'Helvetica-Bold' : 'Helvetica';
  }

  private drawDesignIcon(
    doc: InstanceType<typeof PDFDocumentKit>,
    el: DesignElement,
  ) {
    const w = el.width ?? 80;
    const h = el.height ?? 80;
    const x = el.x;
    const y = el.y;
    const id = el.iconId ?? 'seal-gold';

    if (id === 'seal-gold' || id.startsWith('seal')) {
      const cx = x + w / 2;
      const cy = y + Math.min(w, h) * 0.42;
      const r = Math.min(w, h) * 0.38;
      doc.circle(cx, cy, r).fill('#d4af37');
      doc
        .circle(cx, cy, r * 0.72)
        .lineWidth(1.5)
        .stroke('#fff8dc');
      doc
        .circle(cx, cy, r * 0.5)
        .lineWidth(1)
        .stroke('#8a6a12');
      if (id.includes('ribbon') || id === 'seal-red') {
        const ribbon = id === 'seal-red' ? '#b91c1c' : '#c9a227';
        doc
          .polygon(
            [cx - r * 0.35, cy + r * 0.7],
            [cx - r * 0.55, y + h],
            [cx - r * 0.1, cy + r * 1.1],
            [cx, y + h],
            [cx + r * 0.1, cy + r * 1.1],
            [cx + r * 0.55, y + h],
            [cx + r * 0.35, cy + r * 0.7],
          )
          .fill(ribbon);
      }
      return;
    }

    if (id.includes('wreath') || id === 'laurel-pair') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const count = id === 'laurel-pair' ? 10 : 16;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(a) * (w * 0.34);
        const ly = cy + Math.sin(a) * (h * 0.34);
        doc
          .ellipse(lx, ly, w * 0.05, h * 0.1)
          .fill(id === 'wreath-black' ? '#1f2937' : '#d4af37');
      }
      if (id === 'trophy-wreath') {
        doc
          .roundedRect(cx - w * 0.12, cy - h * 0.15, w * 0.24, h * 0.28, 3)
          .fill('#f0d060');
      }
      if (id === 'shield-wreath') {
        doc
          .path(
            `M${cx},${cy - h * 0.2} L${cx + w * 0.16},${cy - h * 0.08} V${cy + h * 0.1} C${cx + w * 0.16},${cy + h * 0.22} ${cx},${cy + h * 0.3} ${cx},${cy + h * 0.3} C${cx},${cy + h * 0.3} ${cx - w * 0.16},${cy + h * 0.22} ${cx - w * 0.16},${cy + h * 0.1} V${cy - h * 0.08} Z`,
          )
          .fill('#d4af37');
      }
      return;
    }

    if (id === 'medal-gold') {
      doc
        .polygon([x + w * 0.3, y], [x + w * 0.5, y + h * 0.35], [x + w * 0.7, y])
        .fill('#111827');
      doc
        .circle(x + w / 2, y + h * 0.65, Math.min(w, h) * 0.28)
        .fill('#d4af37');
      return;
    }

    if (id === 'corner-flourish') {
      doc
        .moveTo(x + 4, y + 4)
        .bezierCurveTo(x + w * 0.5, y + 6, x + w * 0.55, y + h * 0.55, x + w * 0.9, y + h * 0.9)
        .lineWidth(2.5)
        .stroke('#d4af37');
      doc.circle(x + w * 0.88, y + h * 0.88, 3).fill('#d4af37');
      return;
    }

    doc.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2).fill('#d4af37');
  }

  private async prepareDesignImage(
    src: string,
    width: number,
    height: number,
  ): Promise<Buffer | string | null> {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const response = await fetch(src);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const input = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') ?? '';
        if (
          contentType.includes('svg') ||
          src.toLowerCase().endsWith('.svg')
        ) {
          const sharp = (await import('sharp')).default;
          return await sharp(input)
            .resize(
              Math.max(1, Math.round(width * 2)),
              Math.max(1, Math.round(height * 2)),
              {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            )
            .png()
            .toBuffer();
        }
        return input;
      } catch {
        return null;
      }
    }

    const imagePath = this.resolveUploadPath(src);
    if (!imagePath) return null;

    if (imagePath.toLowerCase().endsWith('.svg')) {
      try {
        const sharp = (await import('sharp')).default;
        return await sharp(imagePath)
          .resize(Math.max(1, Math.round(width * 2)), Math.max(1, Math.round(height * 2)), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
      } catch {
        return null;
      }
    }

    return imagePath;
  }

  private async generateFromDesignJson(
    input: CertificatePdfInput,
    design: CertificateDesign,
    filePath: string,
  ) {
    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/${input.verificationToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
    });
    const qrBuffer = Buffer.from(
      qrDataUrl.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );

    const imageSources = new Map<string, Buffer | string>();
    for (const el of design.elements) {
      if (el.type === 'image' && el.src) {
        const prepared = await this.prepareDesignImage(
          el.src,
          el.width ?? 120,
          el.height ?? 120,
        );
        if (prepared) {
          imageSources.set(el.id, prepared);
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocumentKit({
        size: [design.width, design.height],
        margin: 0,
      });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      doc
        .rect(0, 0, design.width, design.height)
        .fill(design.background || '#ffffff');

      for (const el of design.elements) {
        if (el.type === 'rect') {
          const stroke = el.stroke ?? '#000000';
          const fill = el.fill && el.fill !== 'transparent' ? el.fill : null;
          if (fill) {
            doc.rect(el.x, el.y, el.width ?? 0, el.height ?? 0).fill(fill);
          }
          if (el.stroke) {
            doc
              .lineWidth(el.strokeWidth ?? 1)
              .rect(el.x, el.y, el.width ?? 0, el.height ?? 0)
              .stroke(stroke);
          }
        } else if (el.type === 'line') {
          doc
            .lineWidth(el.strokeWidth ?? 1)
            .strokeColor(el.stroke ?? '#9ca3af')
            .moveTo(el.x, el.y)
            .lineTo(el.x + (el.width ?? 0), el.y + (el.height ?? 0))
            .stroke();
        } else if (el.type === 'ellipse') {
          const w = el.width ?? 40;
          const h = el.height ?? 40;
          const fill = el.fill && el.fill !== 'transparent' ? el.fill : null;
          if (fill) {
            doc.ellipse(el.x + w / 2, el.y + h / 2, w / 2, h / 2).fill(fill);
          }
          if (el.stroke) {
            doc
              .lineWidth(el.strokeWidth ?? 1)
              .ellipse(el.x + w / 2, el.y + h / 2, w / 2, h / 2)
              .stroke(el.stroke);
          }
        } else if (el.type === 'path' && el.path) {
          try {
            doc.save();
            doc.translate(el.x || 0, el.y || 0);
            doc.path(el.path).fill(el.fill ?? '#111111');
            doc.restore();
          } catch {
            // ignore invalid paths
          }
        } else if (el.type === 'icon') {
          this.drawDesignIcon(doc, el);
        } else if (el.type === 'image') {
          const source = imageSources.get(el.id);
          if (source) {
            try {
              doc.image(source, el.x, el.y, {
                width: el.width ?? 120,
                height: el.height ?? 120,
                fit: [el.width ?? 120, el.height ?? 120],
                align: 'center',
                valign: 'center',
              });
            } catch {
              // skip broken image
            }
          }
        } else if (el.type === 'text') {
          const text = this.resolveRoleText(el, input);
          const fontSize = el.fontSize ?? 16;
          const color = el.color ?? '#111827';
          const align = el.align ?? 'left';
          const boxWidth = el.width ?? design.width * 0.7;

          doc
            .font(this.pickFont(el))
            .fillColor(color)
            .fontSize(fontSize)
            .text(text, el.x, el.y, {
              width: boxWidth,
              align,
              lineGap: 4,
              height: el.height,
            });
        }
      }

      const qrSize = 64;
      doc.image(
        qrBuffer,
        design.width - qrSize - 36,
        design.height - qrSize - 28,
        {
          width: qrSize,
          height: qrSize,
        },
      );
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .fontSize(8)
        .text(input.certificateNumber, 36, design.height - 36);

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private async generateFromDesignerPdf(
    input: CertificatePdfInput,
    templatePdfPath: string,
    outputPath: string,
  ) {
    const templateBytes = readFileSync(templatePdfPath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new BadRequestException('Template PDF has no pages');
    }

    const page = pages[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = input.nameFontSize ?? 36;
    const name = input.participantName.trim();
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    const xPercent = input.nameXPercent ?? 50;
    const yPercent = input.nameYPercent ?? 42;
    const centerX = (width * xPercent) / 100;
    const fromTop = (height * yPercent) / 100;
    const textY = height - fromTop - fontSize * 0.75;
    const textX = centerX - textWidth / 2;
    const color = this.parseHexColor(input.nameColor ?? '#1d4ed8');

    const coverWidth = Math.max(textWidth + fontSize * 1.2, fontSize * 8);
    const coverHeight = fontSize * 1.35;
    page.drawRectangle({
      x: Math.max(0, centerX - coverWidth / 2),
      y: textY - fontSize * 0.2,
      width: coverWidth,
      height: coverHeight,
      color: rgb(1, 1, 1),
    });

    page.drawText(name, {
      x: textX,
      y: textY,
      size: fontSize,
      font,
      color,
    });

    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/${input.verificationToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 160,
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
    const qrSize = Math.min(72, width * 0.12);
    page.drawImage(qrImage, {
      x: width - qrSize - 28,
      y: 24,
      width: qrSize,
      height: qrSize,
    });

    const smallFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(input.certificateNumber, {
      x: 28,
      y: 28,
      size: 8,
      font: smallFont,
      color: rgb(0.35, 0.4, 0.45),
    });

    const pdfBytes = await pdfDoc.save();
    await writeFile(outputPath, pdfBytes);
  }

  private async generateWithPdfKit(
    input: CertificatePdfInput,
    filePath: string,
  ) {
    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/${input.verificationToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    const backgroundPath = this.resolveUploadPath(input.backgroundUrl);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocumentKit({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      if (backgroundPath) {
        doc.image(backgroundPath, 0, 0, {
          width: pageWidth,
          height: pageHeight,
        });
      } else {
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke('#0f766e');
        doc.rect(28, 28, pageWidth - 56, pageHeight - 56).stroke('#94a3b8');
      }

      doc
        .fillColor('#0f766e')
        .fontSize(12)
        .text(input.organizationName.toUpperCase(), 50, 55, {
          align: 'center',
          width: pageWidth - 100,
        });

      doc
        .fillColor('#14212b')
        .fontSize(28)
        .text(input.titleText, 50, 95, {
          align: 'center',
          width: pageWidth - 100,
        });

      doc
        .fillColor('#5b6b76')
        .fontSize(14)
        .text(input.subtitleText, 50, 145, {
          align: 'center',
          width: pageWidth - 100,
        });

      doc
        .fillColor('#0f766e')
        .fontSize(26)
        .text(input.participantName, 50, 180, {
          align: 'center',
          width: pageWidth - 100,
        });

      doc
        .fillColor('#5b6b76')
        .fontSize(14)
        .text(input.bodyText, 50, 225, {
          align: 'center',
          width: pageWidth - 100,
        });

      doc
        .fillColor('#14212b')
        .fontSize(18)
        .text(input.eventName, 50, 255, {
          align: 'center',
          width: pageWidth - 100,
        });

      const meta = [
        `Date: ${input.eventDate.toLocaleDateString()}`,
        input.eventLocation ? `Location: ${input.eventLocation}` : null,
        `Certificate ID: ${input.certificateNumber}`,
      ]
        .filter(Boolean)
        .join('   ·   ');

      doc
        .fillColor('#5b6b76')
        .fontSize(11)
        .text(meta, 50, 300, {
          align: 'center',
          width: pageWidth - 100,
        });

      const signatoryName = input.signatoryName || input.organizationName;
      const signatoryRole = input.signatoryDesignation || 'Authorized Signatory';

      doc
        .fillColor('#14212b')
        .fontSize(12)
        .text(signatoryName, 80, pageHeight - 120, { width: 220 });
      doc
        .fillColor('#5b6b76')
        .fontSize(10)
        .text(signatoryRole, 80, pageHeight - 100, { width: 220 });

      doc.image(qrBuffer, pageWidth - 180, pageHeight - 160, {
        width: 100,
        height: 100,
      });
      doc
        .fillColor('#5b6b76')
        .fontSize(8)
        .text('Scan to verify', pageWidth - 180, pageHeight - 55, {
          width: 100,
          align: 'center',
        });

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private resolveUploadPath(fileUrl?: string | null) {
    if (!fileUrl) {
      return null;
    }

    if (fileUrl.startsWith('/uploads/')) {
      const absolutePath = path.join(
        process.cwd(),
        fileUrl.replace(/^\//, ''),
      );
      return existsSync(absolutePath) ? absolutePath : null;
    }

    if (path.isAbsolute(fileUrl) && existsSync(fileUrl)) {
      return fileUrl;
    }

    return null;
  }

  private parseHexColor(hex: string) {
    const cleaned = hex.replace('#', '');
    if (cleaned.length !== 6) {
      return rgb(0.11, 0.31, 0.85);
    }
    const r = Number.parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = Number.parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = Number.parseInt(cleaned.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
}
