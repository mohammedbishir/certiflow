import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

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
    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/${input.verificationToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke('#0f766e');
      doc.rect(28, 28, pageWidth - 56, pageHeight - 56).stroke('#94a3b8');

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

    return filePath;
  }
}
