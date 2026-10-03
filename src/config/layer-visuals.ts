import type { IconName } from "@/config/icons";
import { Layer } from "@/types/layers";

export interface LayerVisual {
  icon: IconName;
  short: string;
  color: string;
  description: string;
}

export const LAYER_VISUALS: Record<Layer, LayerVisual> = {
  [Layer.Shelters]: {
    icon: "warehouse",
    short: "Schrony",
    color: "#059669",
    description: "Gdzie można się schronić w pobliżu?",
  },
  [Layer.Drones]: {
    icon: "drone",
    short: "Drony",
    color: "#b91c1c",
    description: "Drony i rakiety w pobliżu granicy na żywo (OSINT NEPTUN)",
  },
  [Layer.Aircraft]: {
    icon: "plane",
    short: "Lotnictwo",
    color: "#0e7490",
    description: "Samoloty wojskowe nadające ADS-B nad Polską i w regionie",
  },
  [Layer.Smog]: {
    icon: "wind",
    short: "Powietrze",
    color: "#65a30d",
    description: "Sprawdź, jaka jest jakość powietrza w Twojej okolicy",
  },
  [Layer.Fires]: {
    icon: "flame",
    short: "Pożary",
    color: "#ea580c",
    description: "Pożary wykryte przez satelity w ciągu ostatnich 5 dni",
  },
  [Layer.Floods]: {
    icon: "waves",
    short: "Rzeki",
    color: "#2563eb",
    description: "Stacje z przekroczonym stanem ostrzegawczym lub alarmowym",
  },
  [Layer.AEDs]: {
    icon: "square-activity",
    short: "AED",
    color: "#e11d48",
    description: "Zlokalizuj najbliższy defibrylator",
  },
  [Layer.Reports]: {
    icon: "message-square-warning",
    short: "Zgłoszenia",
    color: "#7c3aed",
    description: "Incydenty zgłoszone przez użytkowników",
  },
};

export const NEPTUN_SOURCE_URL = "https://neptun.in.ua/";
export const ADSB_SOURCE_URL = "https://adsb.lol/";
