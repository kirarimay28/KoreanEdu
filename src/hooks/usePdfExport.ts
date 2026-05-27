import { useRef, useState } from 'react';

export function usePdfExport(filename: string) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportToPDF() {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#f8f9fd',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;

      let remaining = scaledH;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfW, scaledH);
      remaining -= pdfH;

      while (remaining > 0) {
        position -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, scaledH);
        remaining -= pdfH;
      }

      pdf.save(filename);
    } finally {
      setIsExporting(false);
    }
  }

  return { contentRef, exportToPDF, isExporting };
}
