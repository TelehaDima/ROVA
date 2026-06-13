import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (elementId: string, filename: string = 'Restoration_Estimate.pdf'): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  const originalStyle = element.style.cssText;
  const originalWidth = element.style.width;
  const isMobile = window.innerWidth < 768;

  try {
    // Встановлюємо тимчасові стилі для кращого рендерингу
    element.style.borderRadius = '0';
    if (isMobile) {
      element.style.width = '800px'; 
      element.style.maxWidth = 'none'; // Щоб Tailwind не стискав блок
    }

    const canvas = await html2canvas(element, {
      scale: isMobile ? 1 : 2, // Менший скейл на мобільному, щоб уникнути помилок пам'яті (Out of Memory)
      useCORS: true, 
      logging: false,
      backgroundColor: '#13131A', 
    });

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
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert('Помилка при створенні PDF: ' + (error.message || String(error)));
    return false;
  } finally {
    // Гарантовано відновлюємо стилі, навіть якщо сталася помилка
    element.style.cssText = originalStyle;
    if (isMobile) {
      element.style.width = originalWidth;
      element.style.maxWidth = '';
    }
  }
};
