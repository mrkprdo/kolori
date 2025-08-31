// WLED Color Palettes Data
// Migrated and simplified from kolori_old/src/constants/palettes.js
// Each palette entry is [position, red, green, blue] where position is 0-255

export interface PaletteColor {
  position: number;
  red: number;
  green: number;
  blue: number;
}

export interface WledPalettesData {
  [paletteName: string]: PaletteColor[];
}

export const WLED_PALETTES_DATA: WledPalettesData = {
  "Default": [{position: 0, red: 255, green: 170, blue: 0}],
  "Party": [
    {position: 0, red: 255, green: 0, blue: 0}, 
    {position: 85, red: 0, green: 255, blue: 0}, 
    {position: 170, red: 0, green: 0, blue: 255}
  ],
  "Cloud": [
    {position: 0, red: 0, green: 0, blue: 255}, 
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Lava": [
    {position: 0, red: 0, green: 0, blue: 0}, 
    {position: 128, red: 255, green: 0, blue: 0}, 
    {position: 255, red: 255, green: 255, blue: 0}
  ],
  "Ocean": [
    {position: 0, red: 0, green: 0, blue: 255}, 
    {position: 255, red: 0, green: 255, blue: 255}
  ],
  "Forest": [
    {position: 0, red: 0, green: 255, blue: 0}, 
    {position: 255, red: 255, green: 255, blue: 0}
  ],
  "Rainbow": [
    {position: 0, red: 255, green: 0, blue: 0},
    {position: 42, red: 255, green: 255, blue: 0},
    {position: 85, red: 0, green: 255, blue: 0},
    {position: 127, red: 0, green: 255, blue: 255},
    {position: 170, red: 0, green: 0, blue: 255},
    {position: 212, red: 255, green: 0, blue: 255},
    {position: 255, red: 255, green: 0, blue: 0}
  ],
  "Sunset": [
    {position: 0, red: 181, green: 0, blue: 0},
    {position: 22, red: 218, green: 85, blue: 0},
    {position: 51, red: 255, green: 170, blue: 0},
    {position: 85, red: 211, green: 85, blue: 77},
    {position: 135, red: 167, green: 0, blue: 169},
    {position: 198, red: 73, green: 0, blue: 188},
    {position: 255, red: 0, green: 0, blue: 207}
  ],
  "Fire": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 46, red: 77, green: 0, blue: 0},
    {position: 96, red: 177, green: 0, blue: 0},
    {position: 108, red: 196, green: 38, blue: 9},
    {position: 119, red: 215, green: 76, blue: 19},
    {position: 146, red: 235, green: 115, blue: 29},
    {position: 174, red: 255, green: 153, blue: 41},
    {position: 188, red: 255, green: 178, blue: 41},
    {position: 202, red: 255, green: 204, blue: 41},
    {position: 218, red: 255, green: 230, blue: 41},
    {position: 234, red: 255, green: 255, blue: 41},
    {position: 244, red: 255, green: 255, blue: 143},
    {position: 255, red: 255, green: 255, blue: 255}
  ]
};