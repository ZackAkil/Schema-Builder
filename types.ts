
export interface Field {
  name: string;
  type: string;
  description: string;
  relevantRequirements: string[];
}

export interface Collection {
  name: string;
  description: string;
  fields: Field[];
  relevantRequirements: string[];
}

export interface Schema {
  collections: Collection[];
}

export interface GeminiResponse {
  schema: Schema;
  justification: string;
}

export interface HoveredElement {
  id: string;
  description: string;
  relevantRequirements: string[];
}

export interface RobustnessGroup {
  representative: GeminiResponse;
  temperatures: number[];
  count: number;
}