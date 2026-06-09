export type Language = 'uk' | 'pl' | 'en';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface RestorationWork {
  id: string;
  description: string;
  unit: string; // м2, шт, п.м.
  quantity: number;
  unitPrice: number; // Editable by user
}

export interface Material {
  id: string;
  name: string;
  unit: string; // кг, литр, шт
  quantity: number;
  unitPrice: number; // Editable by user
}

export interface Damage {
  category: string;
  description: string;
  severity: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' | 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  technique?: string;
}

export interface ComponentAnalysis {
  id: string;
  name: string;
  material: string;
  condition: 'Good' | 'Fair' | 'Poor' | 'Critical';
  damages: Damage[];
  dimensions: string; // Estimated dimensions text
  suggestedWorks: RestorationWork[];
  requiredMaterials: Material[];
  sourceImage?: string; // To track which image this component belongs to
}

export interface RestorationReport {
  id: string;
  createdAt: number;
  imageBase64?: string; // Data URL for the primary image
  additionalImages?: string[]; // Data URLs for additional elements
  objectName: string;
  generalCondition: string;
  components: ComponentAnalysis[];
  overheadPercentage: number; // Editable
  language?: Language;
}

// Helper to calculate totals
export const calculateWorkTotal = (works: RestorationWork[]) => 
  works.reduce((acc, w) => acc + (w.quantity * w.unitPrice), 0);

export const calculateMaterialTotal = (mats: Material[]) => 
  mats.reduce((acc, m) => acc + (m.quantity * m.unitPrice), 0);

export const calculateGrandTotal = (report: RestorationReport) => {
  const worksCost = report.components.reduce((acc, c) => acc + calculateWorkTotal(c.suggestedWorks), 0);
  const matsCost = report.components.reduce((acc, c) => acc + calculateMaterialTotal(c.requiredMaterials), 0);
  const subTotal = worksCost + matsCost;
  const overhead = (subTotal * report.overheadPercentage) / 100;
  return subTotal + overhead;
};
