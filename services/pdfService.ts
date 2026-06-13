import html2pdf from 'html2pdf.js';

export const generatePDF = async (elementId: string, filename: string = 'Restoration_Estimate.pdf'): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  const isMobile = window.innerWidth < 768;
  const originalStyle = element.style.cssText;
  const originalWidth = element.style.width;

  try {
    element.style.borderRadius = '0';
    if (isMobile) {
      element.style.width = '800px'; 
      element.style.maxWidth = 'none'; 
    }

    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.95 },
      html2canvas:  { 
        scale: isMobile ? 1.5 : 2, 
        useCORS: true, 
        backgroundColor: '#13131A',
        logging: false
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Використовуємо html2pdf.js, який сам керує розбиттям на сторінки та збереженням
    await html2pdf().set(opt).from(element).save();
    
    return true;
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert('Помилка генератора: ' + (error.message || String(error)));
    return false;
  } finally {
    element.style.cssText = originalStyle;
    if (isMobile) {
      element.style.width = originalWidth;
      element.style.maxWidth = '';
    }
  }
};
