export type RcbAlertLevel = 1 | 2 | 3;

export interface RcbAlert {
  id: string;
  source: "rso" | "gov";
  title: string;
  message: string;
  details: string | null;
  regionIds: string[];
  issuedAt: string;
  issuedAtPrecision: "minute" | "day";
  validTo: string | null;
  air: boolean;
  level: RcbAlertLevel;
  cancelled: boolean;
  url: string | null;
}

export interface RcbAlerts {
  updatedAt: string;
  alerts: RcbAlert[];
}
