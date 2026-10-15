// @ts-nocheck
// villas.ts: all villa data. Ratings: L = Location, U = Luxury, V = Value (1–3 stars). nightly = price per night (USD).
// ⚠️ The first destination had no name in the source data, so it is called "Destination 1". Replace it with the real name.
// extra (optional): { maxGuests: number, note: "text shown on the villa card" }. nightly: null = price not provided yet.
const v = (id, name, nightly, L, U, V, extra = {}) => ({ id, name, nightly, location: L, luxury: U, value: V, ...extra });

export const DESTINATIONS = {
  dest1: {
    name: "Destination 1 (rename)",
    tiers: {
      "4-6": [v("presidente", "Presidente", 850, 3, 3, 2), v("elsueno", "El Sueno", 1195, 3, 1, 3), v("casasur", "Casa Sur", 1450, 3, 2, 2)],
      "7-9": [v("playanorte", "Playa Norte", 1695, 2, 2, 3), v("casario", "Casa Rio", 2450, 3, 2, 2), v("elpalacio", "El Palacio", 2595, 3, 3, 2)],
      "10-12": [v("lima", "Lima", 1895, 2, 2, 3), v("emma", "Emma", 2395, 2, 3, 2), v("bliss", "Bliss", 2195, 1, 3, 2)],
      "13+": [v("nueve", "Nueve", 2995, 3, 2, 2), v("olga", "Olga", 3495, 2, 3, 2), v("isabella", "Isabella", 3995, 3, 2, 2)],
    },
  },
  dr: {
    name: "Dominican Republic",
    tiers: {
      "4-6": [v("oceanworld", "Ocean World (6 BR)", 1200, 2, 2, 2), v("villav", "Villa V", 1100, 1, 2, 2), v("vp3", "Villa Paradise III", 1295, 2, 2, 2)],
      "7-9": [v("coral", "Coral", 1300, 2, 1, 3), v("miami", "Miami", 1350, 3, 3, 2), v("reysosua", "Rey de Sosua", 1650, 3, 3, 2)],
      "10-12": [v("vp2", "Villa Paradise II", 1650, 2, 3, 3), v("casadelmar", "Casa del Mar", 1700, 3, 2, 3), v("celestine2", "Celestine II", 2800, 1, 3, 2)],
      "13+": [v("vp", "Villa Paradise", 1850, 2, 3, 3), v("fantasia", "Fantasia", 2200, 3, 2, 2), v("celestine", "Celestine", 3800, 1, 3, 2)],
    },
  },
  medellin: {
    name: "Medellin, Colombia",
    tiers: {
      "4-6": [
        v("casacinco", "Casa Cinco", 750, 3, 2, 3),
        v("escobar2", "Escobar Penthouse Dos", 1500, 2, 3, 2, { maxGuests: 10 }),
        v("escobar3", "Escobar Penthouse Tres", 1500, 2, 2, 2, { maxGuests: 10 }),
      ],
      "7-9": [
        v("casalorena", "Casa Lorena", null, 2, 2, 3), // ⚠️ price not provided by the client yet
        v("casabianca", "Casa Bianca", 900, 3, 2, 3),
        v("mollie", "Mollie Penthouse", 1350, 3, 3, 2),
      ],
      "10-12": [
        v("casaacona", "Casa Acona", 2700, 3, 3, 3, { maxGuests: 15 }),
        v("casagenie", "Casa Genie", 1800, 3, 2, 2, { maxGuests: 15 }),
        v("villaonce", "Villa Once", 1700, 3, 2, 2),
      ],
      "13+": [ // ⚠️ the client listed only two villas for this tier
        v("colossal", "Casa Colossal", 2550, 3, 3, 3),
        v("zoey1", "Zoey Penthouse 1", 3300, 3, 2, 2, { note: "14 bedrooms" }),
      ],
    },
  },
  cartagena: {
    name: "Cartagena, Colombia",
    tiers: {
      "4-6": [v("christina", "Christina", 595, 3, 2, 2), v("marisol", "Marisol", 895, 3, 3, 2), v("vodka", "Vodka", 1195, 3, 3, 2)],
      "7-9": [v("spectacular", "Spectacular", 1695, 3, 3, 2), v("shakira", "Shakira", 1395, 3, 3, 2), v("priscilla", "Priscilla", 1295, 3, 3, 2)],
      "10-12": [v("eleven", "Eleven", 2995, 3, 3, 2), v("jefe", "Jefe", 3395, 3, 3, 2), v("salnas", "Salnas Penthouse", 2495, 3, 3, 2)],
      "13+": [v("grande", "Grande", 4195, 3, 3, 2), v("trece", "Trece", 1595, 3, 2, 3), v("cartagena", "Cartagena", 2995, 3, 3, 2)],
    },
  },
};