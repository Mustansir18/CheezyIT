'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = (error) => {
        // Construct a more informative error
        const err = new Error(`Failed to load image from URL: ${url}. Error: ${error}`);
        reject(err);
    };
    img.src = url;
  });
};


const addHeader = async (doc: jsPDF, title: string) => {
    // The logo is removed because it was causing 404 errors in production.
    
    doc.setFontSize(20);
    doc.text('Cheezious IT Support', 15, 20);
    doc.setFontSize(14);
    doc.text(title, 15, 28);
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);
};

const exportToPdf = async (title: string, head: string[][], body: any[][]) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await addHeader(doc, title);
    
    autoTable(doc, {
        head: head,
        body: body,
        startY: 38,
        theme: 'grid',
        headStyles: { fillColor: [249, 168, 38] }, // This is an orange color
        styles: {
            fontSize: 9,
            cellPadding: 2,
        },
    });
    
    doc.save(`${title.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

const exportToExcel = (title: string, head: string[], body: any[][]) => {
    const header = ["Cheezious IT Support"];
    const reportTitle = [title];
    
    const wsData = [
        header,
        [], // empty row
        reportTitle,
        [], // empty row
        head,
        ...body
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const merge = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: head.length > 0 ? head.length - 1 : 0 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: head.length > 0 ? head.length - 1 : 0 } }
    ];
    if (wsData[0].length > 1) {
        ws['!merges'] = merge;
    }
    
    const setCellStyle = (cell: string, style: any) => {
        if (!ws[cell]) ws[cell] = { t: 's', v: '' };
        ws[cell].s = style;
    };

    setCellStyle('A1', { font: { name: 'Arial', sz: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
    setCellStyle('A3', { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });

    const colWidths: number[] = head.map(h => h.length);
    body.forEach(row => {
        row.forEach((cell, i) => {
            const len = cell ? String(cell).length : 0;
            if (!colWidths[i] || len > colWidths[i]) {
                colWidths[i] = len;
            }
        });
    });

    ws['!cols'] = colWidths.map(wch => ({ wch: wch + 2 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};


export const exportData = async (
    format: 'pdf' | 'excel',
    title: string,
    columns: string[],
    data: any[][]
) => {
    if (format === 'pdf') {
        await exportToPdf(title, [columns], data);
    } else if (format === 'excel') {
        exportToExcel(title, columns, data);
    }
};
