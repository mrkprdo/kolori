export interface PaletteColor {
  position: number;
  red: number;
  green: number;
  blue: number;
}

export interface WledPalettesData {
  [paletteName: string]: PaletteColor[];
}

// Updated WLED palette data based on official WLED source (palettes.h)
export const WLED_PALETTES_DATA: WledPalettesData = {
  "Default": [{position: 0, red: 255, green: 170, blue: 0}],
  "Random Cycle": [],
  "Color 1": [{position: 0, red: 255, green: 0, blue: 0}],
  "Colors 1&2": [{position: 0, red: 255, green: 0, blue: 0}, {position: 255, red: 0, green: 0, blue: 255}],
  "Color Gradient": [],
  "Colors Only": [],
  "Party": [
    {position: 0, red: 94, green: 39, blue: 80},
    {position: 51, red: 84, green: 1, blue: 128},
    {position: 76, red: 69, green: 29, blue: 87},
    {position: 102, red: 125, green: 0, blue: 149},
    {position: 127, red: 165, green: 25, blue: 63},
    {position: 153, red: 125, green: 0, blue: 149},
    {position: 204, red: 84, green: 1, blue: 128},
    {position: 255, red: 94, green: 39, blue: 80}
  ],
  "Cloud": [
    {position: 0, red: 4, green: 1, blue: 26},
    {position: 15, red: 17, green: 6, blue: 66},
    {position: 89, red: 4, green: 1, blue: 26},
    {position: 132, red: 62, green: 125, blue: 209},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Lava": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 46, red: 18, green: 0, blue: 0},
    {position: 96, red: 113, green: 0, blue: 0},
    {position: 108, red: 142, green: 3, blue: 1},
    {position: 119, red: 175, green: 17, blue: 1},
    {position: 146, red: 213, green: 44, blue: 2},
    {position: 174, red: 255, green: 82, blue: 4},
    {position: 188, red: 255, green: 115, blue: 4},
    {position: 202, red: 255, green: 156, blue: 4},
    {position: 218, red: 255, green: 203, blue: 4},
    {position: 234, red: 255, green: 255, blue: 4},
    {position: 244, red: 255, green: 255, blue: 71},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Ocean": [
    {position: 0, red: 0, green: 119, blue: 190},
    {position: 33, red: 0, green: 150, blue: 167},
    {position: 76, red: 0, green: 180, blue: 155},
    {position: 119, red: 4, green: 210, blue: 157},
    {position: 160, red: 9, green: 240, blue: 159},
    {position: 204, red: 134, green: 211, blue: 206},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Forest": [
    {position: 0, red: 1, green: 27, blue: 105},
    {position: 51, red: 1, green: 40, blue: 127},
    {position: 76, red: 1, green: 52, blue: 114},
    {position: 102, red: 1, green: 89, blue: 123},
    {position: 127, red: 1, green: 89, blue: 123},
    {position: 153, red: 1, green: 52, blue: 114},
    {position: 204, red: 1, green: 40, blue: 127},
    {position: 255, red: 1, green: 27, blue: 105}
  ],
  "Rainbow": [
    {position: 0, red: 255, green: 0, blue: 0},
    {position: 32, red: 171, green: 85, blue: 0},
    {position: 64, red: 171, green: 171, blue: 0},
    {position: 96, red: 0, green: 255, blue: 0},
    {position: 128, red: 0, green: 171, blue: 85},
    {position: 160, red: 0, green: 0, blue: 255},
    {position: 192, red: 85, green: 0, blue: 171},
    {position: 224, red: 171, green: 0, blue: 85},
    {position: 255, red: 255, green: 0, blue: 0}
  ],
  "Rainbow Bands": [
    {position: 0, red: 255, green: 0, blue: 0},
    {position: 43, red: 255, green: 0, blue: 0},
    {position: 43, red: 255, green: 255, blue: 0},
    {position: 85, red: 255, green: 255, blue: 0},
    {position: 85, red: 0, green: 255, blue: 0},
    {position: 127, red: 0, green: 255, blue: 0},
    {position: 127, red: 0, green: 255, blue: 255},
    {position: 170, red: 0, green: 255, blue: 255},
    {position: 170, red: 0, green: 0, blue: 255},
    {position: 213, red: 0, green: 0, blue: 255},
    {position: 213, red: 255, green: 0, blue: 255},
    {position: 255, red: 255, green: 0, blue: 255}
  ],
  "Sunset": [
    {position: 0, red: 120, green: 0, blue: 0},
    {position: 22, red: 179, green: 22, blue: 0},
    {position: 51, red: 255, green: 104, blue: 0},
    {position: 85, red: 167, green: 22, blue: 18},
    {position: 135, red: 100, green: 0, blue: 103},
    {position: 198, red: 16, green: 0, blue: 130},
    {position: 255, red: 0, green: 0, blue: 160}
  ],
  "Rivendell": [
    {position: 0, red: 1, green: 14, blue: 5},
    {position: 101, red: 16, green: 36, blue: 14},
    {position: 165, red: 56, green: 68, blue: 30},
    {position: 242, red: 150, green: 156, blue: 99},
    {position: 255, red: 150, green: 156, blue: 99}
  ],
  "Breeze": [
    {position: 0, red: 1, green: 6, blue: 7},
    {position: 89, red: 1, green: 99, blue: 111},
    {position: 153, red: 144, green: 209, blue: 255},
    {position: 255, red: 0, green: 73, blue: 82}
  ],
  "Red & Blue": [
    {position: 0, red: 19, green: 2, blue: 39},
    {position: 25, red: 26, green: 4, blue: 73},
    {position: 48, red: 57, green: 6, blue: 105},
    {position: 73, red: 79, green: 12, blue: 114},
    {position: 89, red: 104, green: 20, blue: 132},
    {position: 130, red: 138, green: 78, blue: 171},
    {position: 163, red: 190, green: 135, blue: 218},
    {position: 186, red: 208, green: 171, blue: 251},
    {position: 211, red: 230, green: 206, blue: 255},
    {position: 255, red: 111, green: 55, blue: 139}
  ],
  "Yellowout": [
    {position: 0, red: 47, green: 30, blue: 2},
    {position: 42, red: 213, green: 147, blue: 0},
    {position: 84, red: 255, green: 193, blue: 17},
    {position: 127, red: 255, green: 255, blue: 0},
    {position: 170, red: 247, green: 159, blue: 2},
    {position: 212, red: 161, green: 55, blue: 1},
    {position: 255, red: 73, green: 9, blue: 0}
  ],
  "Analogous": [
    {position: 0, red: 3, green: 0, blue: 255},
    {position: 63, red: 23, green: 0, blue: 255},
    {position: 127, red: 67, green: 0, blue: 255},
    {position: 191, red: 142, green: 0, blue: 45},
    {position: 255, red: 255, green: 0, blue: 0}
  ],
  "Splash": [
    {position: 0, red: 126, green: 11, blue: 255},
    {position: 127, red: 197, green: 1, blue: 22},
    {position: 175, red: 210, green: 157, blue: 172},
    {position: 221, red: 157, green: 3, blue: 112},
    {position: 255, red: 157, green: 3, blue: 112}
  ],
  "Pastel": [
    {position: 0, red: 180, green: 205, blue: 255},
    {position: 51, red: 196, green: 113, blue: 237},
    {position: 102, red: 213, green: 49, blue: 220},
    {position: 153, red: 255, green: 19, blue: 284},
    {position: 204, red: 255, green: 207, blue: 6},
    {position: 255, red: 255, green: 255, blue: 0}
  ],
  "Sunset 2": [
    {position: 0, red: 120, green: 0, blue: 0},
    {position: 22, red: 179, green: 22, blue: 0},
    {position: 51, red: 255, green: 104, blue: 0},
    {position: 85, red: 167, green: 22, blue: 18},
    {position: 135, red: 100, green: 0, blue: 103},
    {position: 198, red: 16, green: 0, blue: 130},
    {position: 255, red: 0, green: 0, blue: 160}
  ],
  "Beech": [
    {position: 0, red: 255, green: 252, blue: 214},
    {position: 12, red: 255, green: 252, blue: 214},
    {position: 22, red: 255, green: 252, blue: 214},
    {position: 26, red: 190, green: 191, blue: 115},
    {position: 28, red: 137, green: 141, blue: 52},
    {position: 28, red: 112, green: 255, blue: 205},
    {position: 50, red: 51, green: 246, blue: 214},
    {position: 71, red: 17, green: 235, blue: 226},
    {position: 93, red: 2, green: 193, blue: 199},
    {position: 120, red: 0, green: 156, blue: 172},
    {position: 133, red: 2, green: 107, blue: 112},
    {position: 136, red: 4, green: 66, blue: 71},
    {position: 136, red: 32, green: 117, blue: 135},
    {position: 208, red: 12, green: 95, blue: 128},
    {position: 255, red: 1, green: 72, blue: 118}
  ],
  "Vintage": [
    {position: 0, red: 64, green: 19, blue: 32},
    {position: 51, red: 132, green: 0, blue: 69},
    {position: 76, red: 235, green: 208, blue: 63},
    {position: 101, red: 255, green: 239, blue: 113},
    {position: 127, red: 223, green: 82, blue: 66},
    {position: 153, red: 132, green: 0, blue: 69},
    {position: 229, red: 64, green: 19, blue: 32},
    {position: 255, red: 64, green: 19, blue: 32}
  ],
  "Departure": [
    {position: 0, red: 8, green: 3, blue: 0},
    {position: 42, red: 23, green: 7, blue: 0},
    {position: 63, red: 75, green: 38, blue: 6},
    {position: 84, red: 169, green: 99, blue: 38},
    {position: 106, red: 213, green: 169, blue: 119},
    {position: 116, red: 255, green: 255, blue: 255},
    {position: 138, red: 167, green: 255, blue: 159},
    {position: 148, red: 71, green: 255, blue: 59},
    {position: 170, red: 0, green: 255, blue: 0},
    {position: 191, red: 0, green: 136, blue: 0},
    {position: 212, red: 0, green: 86, blue: 0},
    {position: 255, red: 0, green: 86, blue: 0}
  ],
  "Landscape": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 37, red: 2, green: 25, blue: 5},
    {position: 76, red: 15, green: 115, blue: 5},
    {position: 127, red: 79, green: 213, blue: 1},
    {position: 128, red: 126, green: 211, blue: 47},
    {position: 130, red: 188, green: 209, blue: 247},
    {position: 153, red: 144, green: 182, blue: 205},
    {position: 204, red: 59, green: 117, blue: 250},
    {position: 255, red: 1, green: 37, blue: 192}
  ],
  "Beach": [
    {position: 0, red: 1, green: 9, blue: 0},
    {position: 19, red: 43, green: 18, blue: 1},
    {position: 38, red: 161, green: 79, blue: 1},
    {position: 63, red: 229, green: 144, blue: 1},
    {position: 66, red: 58, green: 181, blue: 75},
    {position: 255, red: 1, green: 9, blue: 0}
  ],
  "Sherbet": [
    {position: 0, red: 255, green: 33, blue: 4},
    {position: 43, red: 255, green: 68, blue: 25},
    {position: 86, red: 255, green: 7, blue: 25},
    {position: 127, red: 255, green: 82, blue: 103},
    {position: 170, red: 255, green: 255, blue: 242},
    {position: 209, red: 42, green: 255, blue: 22},
    {position: 255, red: 87, green: 255, blue: 65}
  ],
  "Hult": [
    {position: 0, red: 255, green: 239, blue: 247},
    {position: 48, red: 249, green: 189, blue: 255},
    {position: 89, red: 220, green: 3, blue: 99},
    {position: 160, red: 96, green: 75, blue: 123},
    {position: 216, red: 5, green: 117, blue: 95},
    {position: 255, red: 4, green: 117, blue: 111}
  ],
  "Hult 64": [
    {position: 0, red: 1, green: 92, blue: 87},
    {position: 66, red: 1, green: 92, blue: 87},
    {position: 104, red: 153, green: 57, blue: 1},
    {position: 130, red: 95, green: 107, blue: 1},
    {position: 150, red: 1, green: 92, blue: 87},
    {position: 201, red: 1, green: 92, blue: 87},
    {position: 239, red: 0, green: 55, blue: 45},
    {position: 255, red: 0, green: 55, blue: 45}
  ],
  "Drywet": [
    {position: 0, red: 47, green: 30, blue: 2},
    {position: 42, red: 213, green: 147, blue: 24},
    {position: 84, red: 103, green: 219, blue: 52},
    {position: 127, red: 3, green: 219, blue: 207},
    {position: 170, red: 1, green: 48, blue: 214},
    {position: 212, red: 1, green: 1, blue: 111},
    {position: 255, red: 1, green: 7, blue: 33}
  ],
  "Jul": [
    {position: 0, red: 194, green: 1, blue: 1},
    {position: 94, red: 1, green: 29, blue: 18},
    {position: 132, red: 57, green: 131, blue: 28},
    {position: 255, red: 113, green: 1, blue: 1}
  ],
  "Grintage": [
    {position: 0, red: 18, green: 2, blue: 1},
    {position: 53, red: 95, green: 1, blue: 0},
    {position: 104, red: 110, green: 49, blue: 11},
    {position: 153, red: 175, green: 118, blue: 6},
    {position: 255, red: 159, green: 129, blue: 112}
  ],
  "Rewhi": [
    {position: 0, red: 116, green: 120, blue: 184},
    {position: 72, red: 144, green: 135, blue: 144},
    {position: 89, red: 179, green: 153, blue: 137},
    {position: 107, red: 229, green: 201, blue: 48},
    {position: 141, red: 130, green: 138, blue: 111},
    {position: 255, red: 32, green: 41, blue: 67}
  ],
  "Tertiary": [
    {position: 0, red: 0, green: 1, blue: 255},
    {position: 63, red: 3, green: 68, blue: 45},
    {position: 127, red: 23, green: 255, blue: 0},
    {position: 191, red: 100, green: 68, blue: 3},
    {position: 255, red: 255, green: 1, blue: 4}
  ],
  "Fire": [
    {position: 0, red: 1, green: 1, blue: 0},
    {position: 76, red: 32, green: 5, blue: 0},
    {position: 146, red: 192, green: 24, blue: 0},
    {position: 197, red: 220, green: 105, blue: 5},
    {position: 240, red: 252, green: 255, blue: 34},
    {position: 250, red: 252, green: 255, blue: 111},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Icefire": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 80, red: 0, green: 51, blue: 147},
    {position: 150, red: 127, green: 180, blue: 255},
    {position: 199, red: 255, green: 238, blue: 223},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Cyane": [
    {position: 0, red: 0, green: 32, blue: 64},
    {position: 50, red: 32, green: 32, blue: 64},
    {position: 100, red: 0, green: 32, blue: 255},
    {position: 150, red: 0, green: 224, blue: 255},
    {position: 200, red: 0, green: 255, blue: 255},
    {position: 255, red: 224, green: 255, blue: 255}
  ],
  "Light Pink": [
    {position: 0, red: 64, green: 0, blue: 255},
    {position: 51, red: 115, green: 3, blue: 192},
    {position: 102, red: 194, green: 1, blue: 176},
    {position: 153, red: 240, green: 2, blue: 126},
    {position: 204, red: 255, green: 128, blue: 64},
    {position: 255, red: 255, green: 255, blue: 0}
  ],
  "Autumn": [
    {position: 0, red: 64, green: 0, blue: 1},
    {position: 51, red: 105, green: 4, blue: 1},
    {position: 84, red: 137, green: 10, blue: 1},
    {position: 104, red: 137, green: 101, blue: 1},
    {position: 112, red: 103, green: 67, blue: 1},
    {position: 122, red: 137, green: 101, blue: 1},
    {position: 135, red: 103, green: 67, blue: 1},
    {position: 142, red: 137, green: 101, blue: 1},
    {position: 163, red: 103, green: 10, blue: 1},
    {position: 204, red: 67, green: 4, blue: 1},
    {position: 249, red: 26, green: 1, blue: 1},
    {position: 255, red: 26, green: 1, blue: 1}
  ],
  "Magenta": [
    {position: 0, red: 1, green: 1, blue: 1},
    {position: 42, red: 19, green: 0, blue: 39},
    {position: 84, red: 74, green: 0, blue: 118},
    {position: 127, red: 142, green: 3, blue: 100},
    {position: 170, red: 216, green: 0, blue: 100},
    {position: 212, red: 216, green: 12, blue: 5},
    {position: 255, red: 255, green: 22, blue: 5}
  ],
  "Magred": [
    {position: 0, red: 1, green: 1, blue: 1},
    {position: 63, red: 19, green: 0, blue: 19},
    {position: 127, red: 60, green: 0, blue: 68},
    {position: 191, red: 255, green: 0, blue: 56},
    {position: 255, red: 255, green: 20, blue: 5}
  ],
  "Yelmag": [
    {position: 0, red: 1, green: 1, blue: 1},
    {position: 42, red: 32, green: 0, blue: 0},
    {position: 84, red: 255, green: 0, blue: 0},
    {position: 127, red: 255, green: 0, blue: 45},
    {position: 170, red: 255, green: 0, blue: 255},
    {position: 212, red: 255, green: 55, blue: 45},
    {position: 255, red: 255, green: 255, blue: 0}
  ],
  "Yelblu": [
    {position: 0, red: 7, green: 12, blue: 255},
    {position: 63, red: 83, green: 135, blue: 255},
    {position: 127, red: 181, green: 255, blue: 255},
    {position: 191, red: 145, green: 255, blue: 12},
    {position: 255, red: 223, green: 255, blue: 8}
  ],
  "Orange & Teal": [
    {position: 0, red: 0, green: 150, blue: 92},
    {position: 55, red: 0, green: 150, blue: 92},
    {position: 200, red: 255, green: 72, blue: 0},
    {position: 255, red: 255, green: 72, blue: 0}
  ],
  "Tiamat": [
    {position: 0, red: 1, green: 2, blue: 14},
    {position: 33, red: 2, green: 5, blue: 35},
    {position: 100, red: 13, green: 135, blue: 92},
    {position: 120, red: 43, green: 255, blue: 193},
    {position: 140, red: 247, green: 7, blue: 249},
    {position: 160, red: 193, green: 17, blue: 208},
    {position: 180, red: 39, green: 255, blue: 154},
    {position: 200, red: 4, green: 213, blue: 236},
    {position: 220, red: 39, green: 252, blue: 135},
    {position: 240, red: 193, green: 213, blue: 253},
    {position: 255, red: 255, green: 249, blue: 255}
  ],
  "April Night": [
    {position: 0, red: 1, green: 5, blue: 45},
    {position: 10, red: 1, green: 5, blue: 45},
    {position: 25, red: 5, green: 169, blue: 175},
    {position: 40, red: 1, green: 5, blue: 45},
    {position: 61, red: 1, green: 5, blue: 45},
    {position: 76, red: 45, green: 175, blue: 31},
    {position: 91, red: 1, green: 5, blue: 45},
    {position: 112, red: 1, green: 5, blue: 45},
    {position: 127, red: 249, green: 150, blue: 5},
    {position: 143, red: 1, green: 5, blue: 45},
    {position: 162, red: 1, green: 5, blue: 45},
    {position: 178, red: 255, green: 92, blue: 0},
    {position: 193, red: 1, green: 5, blue: 45},
    {position: 214, red: 1, green: 5, blue: 45},
    {position: 229, red: 223, green: 45, blue: 72},
    {position: 244, red: 1, green: 5, blue: 45},
    {position: 255, red: 1, green: 5, blue: 45}
  ],
  "Orangery": [
    {position: 0, red: 255, green: 95, blue: 23},
    {position: 30, red: 255, green: 82, blue: 0},
    {position: 60, red: 223, green: 13, blue: 8},
    {position: 90, red: 144, green: 44, blue: 2},
    {position: 120, red: 255, green: 110, blue: 17},
    {position: 150, red: 255, green: 69, blue: 0},
    {position: 180, red: 158, green: 13, blue: 11},
    {position: 210, red: 241, green: 82, blue: 17},
    {position: 255, red: 213, green: 37, blue: 4}
  ],
  "C9": [
    {position: 0, red: 184, green: 4, blue: 0},
    {position: 60, red: 184, green: 4, blue: 0},
    {position: 65, red: 144, green: 44, blue: 2},
    {position: 125, red: 144, green: 44, blue: 2},
    {position: 130, red: 4, green: 96, blue: 2},
    {position: 190, red: 4, green: 96, blue: 2},
    {position: 195, red: 7, green: 7, blue: 88},
    {position: 255, red: 7, green: 7, blue: 88}
  ],
  "Sakura": [
    {position: 0, red: 196, green: 19, blue: 10},
    {position: 65, red: 255, green: 69, blue: 45},
    {position: 130, red: 223, green: 45, blue: 72},
    {position: 195, red: 255, green: 82, blue: 103},
    {position: 255, red: 223, green: 13, blue: 17}
  ],
  "Aurora": [
    {position: 0, red: 1, green: 5, blue: 45},
    {position: 64, red: 0, green: 200, blue: 23},
    {position: 128, red: 0, green: 255, blue: 0},
    {position: 170, red: 0, green: 243, blue: 45},
    {position: 200, red: 0, green: 135, blue: 7},
    {position: 255, red: 1, green: 5, blue: 45}
  ],
  "Atlantica": [
    {position: 0, red: 0, green: 28, blue: 112},
    {position: 50, red: 32, green: 96, blue: 255},
    {position: 100, red: 0, green: 243, blue: 45},
    {position: 150, red: 12, green: 95, blue: 82},
    {position: 200, red: 25, green: 190, blue: 95},
    {position: 255, red: 40, green: 170, blue: 80}
  ],
  "C9 2": [
    {position: 0, red: 6, green: 126, blue: 2},
    {position: 45, red: 6, green: 126, blue: 2},
    {position: 46, red: 4, green: 30, blue: 114},
    {position: 90, red: 4, green: 30, blue: 114},
    {position: 91, red: 255, green: 5, blue: 0},
    {position: 135, red: 255, green: 5, blue: 0},
    {position: 136, red: 196, green: 57, blue: 2},
    {position: 180, red: 196, green: 57, blue: 2},
    {position: 181, red: 137, green: 85, blue: 2},
    {position: 255, red: 137, green: 85, blue: 2}
  ],
  "C9 New": [
    {position: 0, red: 255, green: 5, blue: 0},
    {position: 60, red: 255, green: 5, blue: 0},
    {position: 61, red: 196, green: 57, blue: 2},
    {position: 120, red: 196, green: 57, blue: 2},
    {position: 121, red: 6, green: 126, blue: 2},
    {position: 180, red: 6, green: 126, blue: 2},
    {position: 181, red: 4, green: 30, blue: 114},
    {position: 255, red: 4, green: 30, blue: 114}
  ],
  "Temperature": [
    {position: 0, red: 1, green: 27, blue: 105},
    {position: 14, red: 1, green: 40, blue: 127},
    {position: 28, red: 1, green: 70, blue: 168},
    {position: 42, red: 1, green: 92, blue: 197},
    {position: 56, red: 1, green: 119, blue: 221},
    {position: 70, red: 3, green: 130, blue: 151},
    {position: 84, red: 23, green: 156, blue: 149},
    {position: 99, red: 67, green: 182, blue: 112},
    {position: 113, red: 121, green: 201, blue: 52},
    {position: 127, red: 142, green: 203, blue: 11},
    {position: 141, red: 224, green: 223, blue: 1},
    {position: 155, red: 252, green: 187, blue: 2},
    {position: 170, red: 247, green: 147, blue: 1},
    {position: 184, red: 237, green: 87, blue: 1},
    {position: 198, red: 229, green: 43, blue: 1},
    {position: 226, red: 171, green: 2, blue: 2},
    {position: 240, red: 80, green: 3, blue: 3},
    {position: 255, red: 80, green: 3, blue: 3}
  ],
  "Aurora 2": [
    {position: 0, red: 17, green: 177, blue: 13},
    {position: 64, red: 121, green: 242, blue: 5},
    {position: 128, red: 25, green: 173, blue: 121},
    {position: 192, red: 250, green: 77, blue: 127},
    {position: 255, red: 171, green: 101, blue: 221}
  ],
  "Retro Clown": [
    {position: 0, red: 227, green: 101, blue: 3},
    {position: 117, red: 194, green: 18, blue: 19},
    {position: 255, red: 92, green: 8, blue: 192}
  ],
  "Candy": [
    {position: 0, red: 255, green: 255, blue: 8},
    {position: 15, red: 228, green: 100, blue: 9},
    {position: 142, red: 68, green: 1, blue: 84},
    {position: 198, red: 17, green: 2, blue: 89},
    {position: 255, red: 0, green: 0, blue: 45}
  ],
  "Toxy Reaf": [
    {position: 0, red: 1, green: 221, blue: 53},
    {position: 255, red: 73, green: 3, blue: 178}
  ],
  "Fairy Reaf": [
    {position: 0, red: 184, green: 1, blue: 128},
    {position: 160, red: 1, green: 193, blue: 182},
    {position: 219, red: 153, green: 227, blue: 190},
    {position: 255, red: 255, green: 255, blue: 255}
  ],
  "Semi Blue": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 12, red: 1, green: 1, blue: 3},
    {position: 53, red: 8, green: 1, blue: 22},
    {position: 80, red: 4, green: 6, blue: 89},
    {position: 119, red: 2, green: 25, blue: 216},
    {position: 145, red: 7, green: 10, blue: 99},
    {position: 186, red: 15, green: 2, blue: 31},
    {position: 233, red: 2, green: 1, blue: 5},
    {position: 255, red: 0, green: 0, blue: 0}
  ],
  "Pink Candy": [
    {position: 0, red: 17, green: 207, blue: 255},
    {position: 45, red: 4, green: 18, blue: 255},
    {position: 112, red: 200, green: 1, blue: 146},
    {position: 140, red: 17, green: 207, blue: 255},
    {position: 155, red: 200, green: 1, blue: 146},
    {position: 196, red: 68, green: 1, blue: 133},
    {position: 255, red: 17, green: 207, blue: 255}
  ],
  "Red Reaf": [
    {position: 0, red: 18, green: 25, blue: 47},
    {position: 104, red: 94, green: 136, blue: 230},
    {position: 188, red: 255, green: 0, blue: 0},
    {position: 255, red: 67, green: 3, blue: 1}
  ],
  "Aqua Flash": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 66, red: 57, green: 227, blue: 233},
    {position: 96, red: 255, green: 255, blue: 8},
    {position: 124, red: 255, green: 255, blue: 255},
    {position: 153, red: 255, green: 255, blue: 8},
    {position: 188, red: 57, green: 227, blue: 233},
    {position: 255, red: 0, green: 0, blue: 0}
  ],
  "Yelblu Hot": [
    {position: 0, red: 64, green: 40, blue: 6},
    {position: 58, red: 17, green: 3, blue: 215},
    {position: 122, red: 121, green: 10, blue: 162},
    {position: 158, red: 188, green: 45, blue: 55},
    {position: 183, red: 109, green: 71, blue: 51},
    {position: 219, red: 222, green: 105, blue: 32},
    {position: 255, red: 237, green: 135, blue: 45}
  ],
  "Lite Light": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 9, red: 7, green: 6, blue: 2},
    {position: 40, red: 15, green: 11, blue: 5},
    {position: 66, red: 15, green: 11, blue: 5},
    {position: 101, red: 19, green: 2, blue: 8},
    {position: 255, red: 0, green: 0, blue: 0}
  ],
  "Red Flash": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 99, red: 227, green: 1, blue: 1},
    {position: 130, red: 249, green: 199, blue: 95},
    {position: 155, red: 227, green: 1, blue: 1},
    {position: 255, red: 0, green: 0, blue: 0}
  ],
  "Blink Red": [
    {position: 0, red: 1, green: 1, blue: 1},
    {position: 43, red: 8, green: 5, blue: 13},
    {position: 76, red: 42, green: 1, blue: 2},
    {position: 109, red: 115, green: 2, blue: 10},
    {position: 127, red: 166, green: 58, blue: 48},
    {position: 165, red: 113, green: 15, blue: 121},
    {position: 204, red: 55, green: 13, blue: 200},
    {position: 255, red: 35, green: 2, blue: 19}
  ],
  "Red Shift": [
    {position: 0, red: 31, green: 2, blue: 31},
    {position: 45, red: 34, green: 2, blue: 16},
    {position: 99, red: 137, green: 5, blue: 9},
    {position: 132, red: 213, green: 128, blue: 10},
    {position: 175, red: 199, green: 22, blue: 1},
    {position: 201, red: 199, green: 9, blue: 6},
    {position: 255, red: 1, green: 0, blue: 1}
  ],
  "Red Tide": [
    {position: 0, red: 247, green: 5, blue: 0},
    {position: 28, red: 255, green: 67, blue: 1},
    {position: 43, red: 234, green: 88, blue: 11},
    {position: 58, red: 234, green: 176, blue: 51},
    {position: 84, red: 229, green: 28, blue: 1},
    {position: 114, red: 113, green: 12, blue: 1},
    {position: 140, red: 255, green: 225, blue: 44},
    {position: 168, red: 113, green: 12, blue: 1},
    {position: 196, red: 244, green: 209, blue: 88},
    {position: 216, red: 255, green: 28, blue: 1},
    {position: 255, red: 53, green: 1, blue: 1}
  ],
  "Candy2": [
    {position: 0, red: 87, green: 15, blue: 7},
    {position: 25, red: 17, green: 6, blue: 24},
    {position: 48, red: 83, green: 13, blue: 12},
    {position: 73, red: 234, green: 131, blue: 1},
    {position: 89, red: 188, green: 19, blue: 2},
    {position: 130, red: 17, green: 6, blue: 24},
    {position: 163, red: 255, green: 149, blue: 1},
    {position: 186, red: 234, green: 131, blue: 1},
    {position: 211, red: 87, green: 15, blue: 7},
    {position: 255, red: 6, green: 1, blue: 1}
  ],
  "Traffic Light": [
    {position: 0, red: 0, green: 0, blue: 0},
    {position: 85, red: 0, green: 255, blue: 0},
    {position: 170, red: 255, green: 255, blue: 0},
    {position: 255, red: 255, green: 0, blue: 0}
  ]
};