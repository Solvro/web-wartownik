export type UkraineAlertLevel = "red" | "yellow";

export interface UkraineAlert {
  level: UkraineAlertLevel;
  since: string;
  reasons: string[];
}

export interface UkraineRaionAlert extends UkraineAlert {
  raionId: string;
  oblastId: string;
}

export interface UkraineOblastAlert extends UkraineAlert {
  oblastId: string;
}

export interface UkraineAlerts {
  updatedAt: string;
  oblasts: UkraineOblastAlert[];
  raions: UkraineRaionAlert[];
}
