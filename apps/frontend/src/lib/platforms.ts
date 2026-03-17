export const PARENT_TO_SPECIFIC_PLATFORMS: Record<number, number[]> = {
  1: [1, 4, 6, 186, 187], // PC: PC, Linux, Mac, Xbox Series, PS5 (кросс-платформенные)
  2: [2, 3, 16, 18, 187], // PlayStation: PS2, PS3, PS4, PS5, Vita
  3: [1, 14, 186],        // Xbox: Xbox One, 360, Series X/S
  4: [3, 15],             // iOS: iPhone, iPad
  8: [21, 12],            // Android: Android Phone, Tablet (RAWG: 21=Android, 12=Android Tablet)
  7: [7, 8, 9, 10, 107],  // Nintendo: Switch, 3DS, Wii, Wii U, NES
};

// Для отображения в UI (без коллизий!)
export const PARENT_PLATFORMS_FOR_UI = [
  { id: 1, name: "PC" },
  { id: 2, name: "PlayStation" },
  { id: 3, name: "Xbox" },
  { id: 4, name: "iOS" },
  { id: 8, name: "Android" }, 
  { id: 7, name: "Nintendo" },
];