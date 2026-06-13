import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

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

    // Приховуємо зайві кнопки (.no-print) та розгортаємо скролли (.overflow-y-auto)
    const noPrintElements = element.querySelectorAll('.no-print');
    const originalDisplays: string[] = [];
    noPrintElements.forEach((el: any) => {
      originalDisplays.push(el.style.display);
      el.style.display = 'none';
    });

    const scrollableAreas = element.querySelectorAll('.overflow-y-auto');
    const originalMaxHeights: string[] = [];
    const originalOverflows: string[] = [];
    scrollableAreas.forEach((el: any) => {
      originalMaxHeights.push(el.style.maxHeight);
      originalOverflows.push(el.style.overflow);
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });

    // Чекаємо мить, щоб браузер перерахував макет без скроллів і кнопок
    await new Promise(r => setTimeout(r, 100));

    // Використовуємо dom-to-image-more, який використовує нативний рендер браузера
    // і повністю підтримує сучасний CSS Tailwind v4 (oklch, oklab, color-mix)
    const scale = isMobile ? 1.5 : 2;
    const dataUrl = await domtoimage.toJpeg(element, { 
      quality: 0.95, 
      bgcolor: '#13131A',
      width: element.clientWidth * scale,
      height: element.clientHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }
    });

    // Відновлюємо DOM одразу після створення скріншоту
    noPrintElements.forEach((el: any, i) => {
      el.style.display = originalDisplays[i];
    });
    scrollableAreas.forEach((el: any, i) => {
      el.style.maxHeight = originalMaxHeights[i];
      el.style.overflow = originalOverflows[i];
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    const imgWidth = img.width;
    const imgHeight = img.height;
    
    const scaledImgWidth = pdfWidth;
    const scaledImgHeight = (imgHeight * pdfWidth) / imgWidth;
    
    let heightLeft = scaledImgHeight;
    let position = 0;

    pdf.addImage(dataUrl, 'JPEG', 0, position, scaledImgWidth, scaledImgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - scaledImgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', 0, position, scaledImgWidth, scaledImgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(filename);
    
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
