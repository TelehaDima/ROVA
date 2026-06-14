import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { RestorationReport, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { calculateWorkTotal, calculateMaterialTotal } from '../types';

export const generateWord = async (report: RestorationReport, language: Language) => {
  const t = TRANSLATIONS[language];
  
  const totalWorksCost = report.components.reduce((acc, comp) => acc + calculateWorkTotal(comp.suggestedWorks), 0);
  const totalMaterialsCost = report.components.reduce((acc, comp) => acc + calculateMaterialTotal(comp.requiredMaterials), 0);
  const subTotal = totalWorksCost + totalMaterialsCost;
  const overheadCost = (subTotal * report.overheadPercentage) / 100;
  const grandTotal = subTotal + overheadCost;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  };

  const sections = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: t.calcTitle + " - " + report.objectName,
          bold: true,
          size: 32,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Summary
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${t.summaryWorks}: `, bold: true }),
        new TextRun({ text: formatCurrency(totalWorksCost) }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${t.summaryMaterials}: `, bold: true }),
        new TextRun({ text: formatCurrency(totalMaterialsCost) }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${t.summaryOverhead} (${report.overheadPercentage}%): `, bold: true }),
        new TextRun({ text: formatCurrency(overheadCost) }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${t.summaryTotal}: `, bold: true }),
        new TextRun({ text: formatCurrency(grandTotal) }),
      ],
      spacing: { after: 400 },
    })
  );

  // Components
  for (const comp of report.components) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: comp.name + " (" + t.dimensions + ": " + comp.dimensions + ")",
            bold: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    // Works Table
    if (comp.suggestedWorks.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: t.summaryWorks, bold: true, size: 24 })],
          spacing: { before: 200, after: 100 },
        })
      );

      const workRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: t.tableDesc })] }),
            new TableCell({ children: [new Paragraph({ text: t.tableQty })] }),
            new TableCell({ children: [new Paragraph({ text: t.tablePrice })] }),
            new TableCell({ children: [new Paragraph({ text: t.tableSum })] }),
          ],
        }),
      ];

      for (const work of comp.suggestedWorks) {
        workRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(work.description)] }),
              new TableCell({ children: [new Paragraph(work.quantity + ' ' + work.unit)] }),
              new TableCell({ children: [new Paragraph(work.unitPrice.toString())] }),
              new TableCell({ children: [new Paragraph((work.quantity * work.unitPrice).toFixed(2))] }),
            ],
          })
        );
      }

      sections.push(
        new Table({
          rows: workRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      );
    }

    // Materials Table
    if (comp.requiredMaterials.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: t.summaryMaterials, bold: true, size: 24 })],
          spacing: { before: 400, after: 100 },
        })
      );

      const matRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: t.tableName })] }),
            new TableCell({ children: [new Paragraph({ text: t.tableRate })] }),
            new TableCell({ children: [new Paragraph({ text: t.tablePrice })] }),
            new TableCell({ children: [new Paragraph({ text: t.tableSum })] }),
          ],
        }),
      ];

      for (const mat of comp.requiredMaterials) {
        matRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(mat.name)] }),
              new TableCell({ children: [new Paragraph(mat.quantity + ' ' + mat.unit)] }),
              new TableCell({ children: [new Paragraph(mat.unitPrice.toString())] }),
              new TableCell({ children: [new Paragraph((mat.quantity * mat.unitPrice).toFixed(2))] }),
            ],
          })
        );
      }

      sections.push(
        new Table({
          rows: matRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  
  // Create download link
  const cleanName = report.objectName?.replace(/\s+/g, '_') || 'Projekt';
  const filename = `${cleanName}_Estimate.docx`;
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  return true;
};
