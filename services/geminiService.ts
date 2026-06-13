
import { GoogleGenAI } from "@google/genai";
import { RestorationReport, Language, ChatMessage } from "../types";

// Helper to create IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : generateId();

const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const analyzeRestorationImage = async (base64Image: string, language: Language, pastProjects?: RestorationReport[]): Promise<RestorationReport> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const langInstruction = language === 'pl' 
    ? "Отвечай строго на ПОЛЬСКОМ языке (Polish)." 
    : language === 'en'
    ? "Отвечай строго на АНГЛИЙСКОМ языке (English)."
    : "Отвечай строго на УКРАИНСКОМ языке (Ukrainian).";

  let memoryContext = "";
  if (pastProjects && pastProjects.length > 0) {
    const recentProjects = pastProjects.slice(0, 5);
    const pastLearnings = recentProjects.map(p => {
      return `Объект: ${p.objectName}
Цены на Материалы (за 1 единицу): ${p.components.flatMap(c => c.requiredMaterials.map(m => `${m.name} - ${m.unitPrice} PLN/${m.unit}`)).join('; ')}
Цены на Работы (за 1 единицу): ${p.components.flatMap(c => c.suggestedWorks.map(w => `${w.description} - ${w.unitPrice} PLN/${w.unit}`)).join('; ')}
Повреждения: ${p.components.flatMap(c => c.damages.map(d => d.description)).join('; ')}`;
    }).join('\n\n');
    
    memoryContext = `
    ВАЖНО - ОПЫТ ПРЕДЫДУЩИХ ПРОЕКТОВ (ПОЛЬЗОВАТЕЛЬСКИЙ ПРАЙС-ЛИСТ):
    ${pastLearnings}
    
    ПРАВИЛО ЦЕНООБРАЗОВАНИЯ И ВЫБОРА:
    1. Если в опыте указана цена (unitPrice) для определенного материала или работы, ВЫ ОБЯЗАНЫ использовать ИМЕННО ЭТУ ЦЕНУ. Это личный прайс-лист пользователя, он в приоритете над рыночными данными.
    2. Учитывайте эти данные при подборе материалов и технологий, чтобы сохранять консистентность с прошлыми проектами.
    `;
  }

  const prompt = `
    Вы - профессиональный технолог-реставратор высшей категории.
    Проанализируйте изображение объекта реставрации.
    
    ЗАДАЧА:
    1. Составить дефектную ведомость.
    2. Подобрать технологии реставрации.
    3. Определить ТОЧНЫЙ список материалов с химическим составом.
    
    КОНТЕКСТ:
    - Рынок: Польша (Цены в PLN).
    - Язык ответа: ${langInstruction}
    ${memoryContext}
    
    ТРЕБОВАНИЯ К МАТЕРИАЛАМ (ВАЖНО):
    - Не пишите просто "Клей" или "Растворитель". 
    - Пишите конкретно: "Клей осетровый 7%", "Paraloid B-72 (5% в ацетоне)", "Раствор гидроксида аммония".
    - Расход материалов указывайте с учетом запаса 15-20%.
    - Указывайте единицы измерения материалов преимущественно в граммах (г) или миллилитрах (мл) для небольших объемов.
    
    ТРЕБОВАНИЯ К ЦЕНАМ:
    - Оцените стоимость работ и материалов в польских злотых (PLN/zł) на основе средних рыночных цен в Польше.
    - В поле estimatedTotalPrice указывайте ИТОГОВУЮ стоимость за ВСЕ указанное количество (quantity).
    - Возвращайте только числа (без валюты).
    
    Верни ответ ИСКЛЮЧИТЕЛЬНО в формате JSON (без Markdown):
    {
      "objectName": "Название объекта",
      "generalCondition": "Общее описание состояния (кратко)",
      "components": [
        {
          "name": "Название элемента",
          "material": "Основной материал",
          "condition": "Good" | "Fair" | "Poor" | "Critical",
          "damages": [
            {
              "category": "Тип повреждения (Structural, Surface, Biological, Chemical, Missing Parts)",
              "description": "Описание повреждения",
              "severity": "Very Low" | "Low" | "Medium" | "High" | "Very High",
              "technique": "Конкретная технология реставрации для этого повреждения"
            }
          ],
          "dimensions": "Оценка габаритов",
          "suggestedWorks": [
            {
              "description": "Технологическая operation",
              "unit": "м2/шт/дм2",
              "quantity": Число,
              "estimatedTotalPrice": Число
            }
          ],
          "requiredMaterials": [
            {
              "name": "Точное название материала (Химия/Бренд)",
              "unit": "г/мл/шт",
              "quantity": Число,
              "estimatedTotalPrice": Число
            }
          ]
        }
      ]
    }
  `;

  try {
    const reqArgs = {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    };

    let response;
    let retries = 5;
    let delay = 3000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          ...reqArgs
        } as any);
        break; // Success
      } catch (e: any) {
        retries--;
        const isRateLimit = String(e).includes('429') || String(e).includes('RESOURCE_EXHAUSTED');
        const isServerBusy = String(e).includes('503') || String(e).includes('UNAVAILABLE');
        
        if ((isRateLimit || isServerBusy) && retries > 0) {
          console.warn(`Gemini API error. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 1.5; // Exponential backoff
        } else {
          if (isRateLimit) throw new Error("RATE_LIMIT");
          if (isServerBusy) throw new Error("SERVER_BUSY");
          throw e;
        }
      }
    }

    if (!response) {
       throw new Error("SERVER_BUSY");
    }

    const text = response.text || "{}";
    
    let parsedData: any;
    try {
        parsedData = JSON.parse(text);
    } catch (e) {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanedText);
    }

    const report: RestorationReport = {
      id: generateUUID(),
      createdAt: Date.now(),
      language,
      objectName: parsedData.objectName || (language === 'pl' ? "Nieznany obiekt" : language === 'en' ? "Unknown object" : "Невідомий об'єкт"),
      generalCondition: parsedData.generalCondition || "---",
      overheadPercentage: 15,
      components: (parsedData.components || []).map((comp: any) => ({
        id: generateId(),
        name: comp.name || "Element",
        material: comp.material || "-",
        condition: comp.condition || "Fair",
        damages: (comp.damages || []).map((d: any) => ({
          category: d.category || "General",
          description: d.description || (typeof d === 'string' ? d : "Damage"),
          severity: d.severity || "Moderate",
          technique: d.technique || ""
        })),
        dimensions: comp.dimensions || "-",
        suggestedWorks: (comp.suggestedWorks || []).map((w: any) => {
          const qty = parseNumber(w.quantity) || 1;
          const totalPrice = parseNumber(w.estimatedTotalPrice || w.estimatedUnitPrice) || 0;
          return {
            id: generateId(),
            description: w.description,
            unit: w.unit,
            quantity: qty,
            unitPrice: qty > 0 ? Number((totalPrice / qty).toFixed(2)) : totalPrice
          };
        }),
        requiredMaterials: (comp.requiredMaterials || []).map((m: any) => {
          const qty = parseNumber(m.quantity) || 1;
          const totalPrice = parseNumber(m.estimatedTotalPrice || m.estimatedUnitPrice) || 0;
          return {
            id: generateId(),
            name: m.name,
            unit: m.unit,
            quantity: qty,
            unitPrice: qty > 0 ? Number((totalPrice / qty).toFixed(2)) : totalPrice
          };
        })
      }))
    };

    return report;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(`API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const translateReport = async (report: RestorationReport, targetLanguage: Language): Promise<RestorationReport> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const langInstruction = targetLanguage === 'pl' ? 'Polish' : targetLanguage === 'en' ? 'English' : 'Ukrainian';

  const prompt = `
    Translate the following JSON report into ${langInstruction}.
    IMPORTANT RULES:
    1. Keep the EXACT same JSON structure, keys, and IDs.
    2. Do NOT translate the "condition" field values ("Good", "Fair", "Poor", "Critical").
    3. Do NOT translate the "severity" field values ("Very Low", "Low", "Medium", "High", "Very High", "Minor", "Moderate", "Severe", "Critical").
    4. Do NOT translate the "imageBase64" and "additionalImages" fields.
    5. Translate ONLY these text fields: objectName, generalCondition, name (in components), material, dimensions, category (in damages), description (in damages), technique (in damages), description (in suggestedWorks), unit, name (in requiredMaterials).

    JSON to translate:
    ${JSON.stringify({ 
      ...report, 
      imageBase64: undefined, 
      additionalImages: undefined,
      components: report.components.map(comp => ({ ...comp, sourceImage: undefined }))
    })}
  `;

  try {
    let response;
    let retries = 5;
    let delay = 3000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        break;
      } catch (e: any) {
        retries--;
        const isRateLimit = String(e).includes('429') || String(e).includes('RESOURCE_EXHAUSTED');
        const isServerBusy = String(e).includes('503') || String(e).includes('UNAVAILABLE');
        
        if ((isRateLimit || isServerBusy) && retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 1.5;
        } else {
          if (isRateLimit) throw new Error("RATE_LIMIT");
          if (isServerBusy) throw new Error("SERVER_BUSY");
          throw e;
        }
      }
    }

    if (!response) {
       throw new Error("SERVER_BUSY");
    }

    const text = response.text || "{}";
    let parsedData: any;
    try {
        parsedData = JSON.parse(text);
    } catch (e) {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanedText);
    }

    // Restore missing fields to the components
    const restoredComponents = (parsedData.components || []).map((comp: any, idx: number) => {
      const originalComponent = report.components[idx];
      return {
        ...comp,
        sourceImage: originalComponent?.sourceImage
      };
    });

    return {
      ...parsedData,
      imageBase64: report.imageBase64,
      additionalImages: report.additionalImages,
      components: restoredComponents,
      language: targetLanguage
    };
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const chatWithExpert = async (
  history: ChatMessage[], 
  userInput: string, 
  language: Language,
  contextReport?: RestorationReport
): Promise<{ text: string; updatedReport?: RestorationReport }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const systemInstruction = `
    Вы - опытный химик-технолог и эксперт по научной реставрации. 
    Ваша задача: давать точные советы по методам консервации, исправлять материалы и работы в проекте.
    
    ${language === 'pl' ? 'Отвечайте на ПОЛЬСКОМ языке.' : language === 'en' ? 'Отвечайте на АНГЛИЙСКОМ языке.' : 'Отвечайте на УКРАИНСКОМ языке.'}
    
    ${contextReport ? `КОНТЕКСТ ТЕКУЩЕГО ПРОЕКТА (JSON): 
    ${JSON.stringify({ 
      ...contextReport, 
      imageBase64: undefined, 
      additionalImages: undefined,
      components: contextReport.components.map(comp => ({ ...comp, sourceImage: undefined }))
    })}` : 'Контекстного проекта нет.'}
    
    ОБЯЗАТЕЛЬНО возвращайте ответ ИСКЛЮЧИТЕЛЬНО в формате JSON со следующей структурой:
    {
      "text": "Строка с вашим текстовым ответом, советом или разъяснением",
      "updatedReport": { /* Полный JSON обновленного объекта отчета, если вы внесли изменения по просьбе пользователя, ИНАЧЕ null */ }
    }

    Если пользователь просит добавить/удалить материалы, изменить цену, поменять вид работ или описание убытков - внесите эти изменения в JSON проекта и верните его в поле "updatedReport". Сохраняйте все идентификаторы (id) и структуру JSON в неизменном виде.
  `;

  try {
    // The API requires the first message in the conversation to be from the user
    let validHistory = [...history];
    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    const contents = validHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: userInput }]
    });

    const reqConfig = {
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    };
    
    let response;
    let retries = 5;
    let delay = 3000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          ...reqConfig
        } as any);
        break;
      } catch (e: any) {
        retries--;
        const isRateLimit = String(e).includes('429') || String(e).includes('RESOURCE_EXHAUSTED');
        const isServerBusy = String(e).includes('503') || String(e).includes('UNAVAILABLE');
        
        if ((isRateLimit || isServerBusy) && retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 1.5;
        } else {
          if (isRateLimit) throw new Error("RATE_LIMIT");
          if (isServerBusy) throw new Error("SERVER_BUSY");
          throw e;
        }
      }
    }

    if (!response) {
       throw new Error("SERVER_BUSY");
    }

    const text = response.text || "{}";
    let parsedData: any;
    try {
        parsedData = JSON.parse(text);
    } catch (e) {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanedText);
    }
    
    let updatedReport = parsedData.updatedReport;
    if (updatedReport && updatedReport.id === contextReport?.id) {
       // Restore heavy properties that we omitted
       updatedReport.imageBase64 = contextReport.imageBase64;
       updatedReport.additionalImages = contextReport.additionalImages;
       
       if (updatedReport.components && contextReport.components) {
          updatedReport.components = updatedReport.components.map((comp: any, idx: number) => {
             const originalComponent = contextReport.components[idx];
             return {
                ...comp,
                sourceImage: originalComponent?.sourceImage
             };
          });
       }
    }

    return { 
      text: parsedData.text || (language === 'pl' ? "Oto moja odpowiedź." : language === 'en' ? "Here is my answer." : "Ось моя відповідь."),
      updatedReport: updatedReport 
    };

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { 
      text: language === 'pl' ? "Przepraszam, wystąpił błąd techniczny." : language === 'en' ? "Sorry, a technical error occurred." : "Вибачте, сталася технічна помилка." 
    };
  }
};

export const recalculateReport = async (currentReport: RestorationReport, language: Language): Promise<RestorationReport> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const langInstruction = language === 'pl' 
    ? "Отвечай строго на ПОЛЬСКОМ языке (Polish)." 
    : language === 'en'
    ? "Отвечай строго на АНГЛИЙСКОМ языке (English)."
    : "Отвечай строго на УКРАИНСКОМ языке (Ukrainian).";

  // Create a clean version of the report without base64 images to save tokens
  const cleanReport = {
    ...currentReport,
    imageBase64: undefined,
    additionalImages: undefined,
    components: currentReport.components.map(comp => ({
      ...comp,
      sourceImage: undefined
    }))
  };

  const prompt = `
    Вы - профессиональный технолог-реставратор.
    Пользователь ВРУЧНУЮ изменил некоторые данные в смете (например, увеличил физические размеры объекта, добавил или изменил название материалов или работ).
    
    Ваша задача: ПЕРЕСЧИТАТЬ КОЛИЧЕСТВА (quantity) всех материалов и работ в соответствии с новыми размерами и повреждениями.
    
    ПРАВИЛА (ОЧЕНЬ ВАЖНО):
    1. СОХРАНИТЕ все названия работ, материалов и повреждений ровно такими, какими их написал пользователь (даже если там есть опечатки).
    2. Измените ТОЛЬКО значения 'quantity' пропорционально новым размерам. Например, если размер стал в 2 раза больше, количество материалов должно вырасти.
    3. 'unitPrice' оставьте как есть (перенесите из текущей сметы).
    4. 'estimatedTotalPrice' пересчитайте как quantity * unitPrice.
    5. Структура ответа должна быть ИДЕНТИЧНА оригинальной (сохраните все ID элементов, если они есть).
    
    Язык: ${langInstruction}
    
    ТЕКУЩАЯ СМЕТА:
    ${JSON.stringify(cleanReport, null, 2)}
    
    Верните ОБНОВЛЕННУЮ смету в формате JSON. Не пишите ничего кроме JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    } as any);

    const text = response.text || "{}";
    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanedText);
    }

    // Re-inject images and IDs to ensure UI doesn't break
    const finalReport: RestorationReport = {
      ...parsedData,
      id: currentReport.id,
      imageBase64: currentReport.imageBase64,
      additionalImages: currentReport.additionalImages,
      createdAt: currentReport.createdAt,
      components: parsedData.components.map((comp: any, idx: number) => {
        const originalComp: any = currentReport.components[idx] || {};
        return {
          ...comp,
          id: comp.id || originalComp.id || generateUUID(),
          sourceImage: originalComp.sourceImage,
          suggestedWorks: (comp.suggestedWorks || []).map((w: any, wIdx: number) => ({
             ...w,
             id: w.id || originalComp.suggestedWorks?.[wIdx]?.id || generateUUID()
          })),
          requiredMaterials: (comp.requiredMaterials || []).map((m: any, mIdx: number) => ({
             ...m,
             id: m.id || originalComp.requiredMaterials?.[mIdx]?.id || generateUUID()
          }))
        };
      })
    };

    return finalReport;
  } catch (error) {
    console.error("Gemini Recalculation Error:", error);
    throw new Error("Failed to recalculate report.");
  }
};
