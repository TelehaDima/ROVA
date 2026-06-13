import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (elementId: string, filename: string = 'Restoration_Estimate.pdf'): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    // Встановлюємо тимчасові стилі для кращого рендерингу (наприклад, ховаємо скролли)
    const originalStyle = element.style.cssText;
    element.style.borderRadius = '0';
    
    // Якщо на мобільному контент занадто вузький, ми примусово задаємо ширину для нормального вигляду в PDF
    const originalWidth = element.style.width;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      element.style.width = '800px'; 
    }

    const canvas = await html2canvas(element, {
      scale: 2, // Висока роздільна здатність
      useCORS: true, // Дозволити завантаження зображень з інших доменів
      logging: false,
      backgroundColor: '#13131A', // Темний фон під колір додатку
    });

    // Відновлюємо стилі
    element.style.cssText = originalStyle;
    if (isMobile) {
      element.style.width = originalWidth;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Формат A4
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Пропорційно масштабуємо
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const scaledImgWidth = pdfWidth;
    const scaledImgHeight = (imgHeight * pdfWidth) / imgWidth;
    
    let heightLeft = scaledImgHeight;
    let position = 0;

    // Перша сторінка
    pdf.addImage(imgData, 'JPEG', 0, position, scaledImgWidth, scaledImgHeight);
    heightLeft -= pdfHeight;

    // Додаємо наступні сторінки, якщо звіт дуже довгий
    while (heightLeft >= 0) {
      position = heightLeft - scaledImgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, scaledImgWidth, scaledImgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
