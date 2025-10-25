// WLED Effects Lookup Table
// Based on official WLED documentation and wledFxData.json

export interface WLEDEffectData {
  name: string;
  displayName: string;
  description: string;
  id: number;
  flags: string[];
  colors: string[];
  parameters: string[];
  isAudioReactive: boolean;
  supportsPalette: boolean;
  supports1D: boolean;
  supports2D: boolean;
}

// Raw JSON data from wledFxData.json
const WLED_FX_RAW_DATA = [
  {
    Akemi: {
      ID: 186,
      Description: "The WLED mascot rocking to your tunes.",
      Flags: ["▦", "♫"],
      Colors: ["Head palette", "Arms & Legs", "Eyes & Mouth", "🎨"],
      Parameters: ["Color speed", "Dance"],
    },
  },
  {
    Android: {
      ID: 27,
      Description: "Section of varying length running",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    Aurora: {
      ID: 38,
      Description: "Simulation of the Aurora Borealis",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Black Hole": {
      ID: 183,
      Description: "Colorful dots orbiting a white black hole.",
      Flags: ["▦"],
      Colors: ["Fx", "🎨"],
      Parameters: [
        "Fade rate",
        "Outer Y freq.",
        "Outer X freq.",
        "Inner X freq.",
        "Inner Y freq.",
        "Solid",
      ],
    },
  },
  {
    Blends: {
      ID: 115,
      Description: "Blends random colors across palette",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Shift speed", "Blend speed"],
    },
  },
  {
    Blink: {
      ID: 1,
      Description: "Blinks between primary and secondary color",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Duty cycle"],
    },
  },
  {
    "Blink Rainbow": {
      ID: 26,
      Description: "Same as blink, cycles through the rainbow",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Frequency", "Blink duration"],
    },
  },
  {
    Blobs: {
      ID: 121,
      Description: "No really, they are blobs.",
      Flags: ["▦"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "# blobs", "Blur"],
    },
  },
  {
    Blurz: {
      ID: 163,
      Description: "Flash an fftResult bin per frame and then blur/fade.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Color mix", "🎨"],
      Parameters: ["Fade rate", "Blur"],
    },
  },
  {
    "Bouncing Balls": {
      ID: 91,
      Description: "Bouncing ball effect",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Gravity", "# of balls", "Overlay"],
    },
  },
  {
    Bpm: {
      ID: 68,
      Description: "Pulses moving back and forth on palette",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Breathe: {
      ID: 2,
      Description: "Fades between primary and secondary color",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Candle: {
      ID: 88,
      Description: "Flicker resembling a candle flame",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Candle Multi": {
      ID: 102,
      Description:
        "Like candle effect, but each LED has its own flicker pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Chase: {
      ID: 28,
      Description: "2 LEDs in primary color running on secondary",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    "Chase 2": {
      ID: 37,
      Description:
        "Pattern of n LEDs primary and n LEDs secondary moves along the strip",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    "Chase 3": {
      ID: 54,
      Description: "Like Chase, but with 3 colors",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Speed", "Size"],
    },
  },
  {
    "Chase Flash": {
      ID: 31,
      Description:
        "2 LEDs flash in secondary color while the rest is lit in primary. The flashing LEDs wander from start to end",
      Flags: ["⋮"],
      Colors: ["Bg", "Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Chase Flash Rnd": {
      ID: 32,
      Description:
        "Like Chase Flash, but the 2 LEDs flash in random colors and leaves a random color behind",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Chase Rainbow": {
      ID: 30,
      Description: "Like 28 but leaves trail of rainbow",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    "Chase Random": {
      ID: 29,
      Description: "Like Chase but leaves trail of random color",
      Flags: ["⋮"],
      Colors: ["Fx", "Cs", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    Chunchun: {
      ID: 111,
      Description: "Birds flying in a circle formation",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Gap size"],
    },
  },
  {
    "Colored Bursts": {
      ID: 167,
      Description: "Rotating rays of color.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "# of lines", "Blur", "Gradient", "Dots"],
    },
  },
  {
    Colorful: {
      ID: 34,
      Description: "Shifting Red-Amber-Green-Blue pattern",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Speed", "Saturation"],
    },
  },
  {
    Colorloop: {
      ID: 8,
      Description: "Cycle all LEDs through the rainbow colors",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Saturation"],
    },
  },
  {
    Colortwinkles: {
      ID: 74,
      Description: "LEDs light up randomly in random colors and fade off again",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Fade speed", "Spawn speed"],
    },
  },
  {
    Colorwaves: {
      ID: 67,
      Description: "Like Pride 2015, but uses palettes",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "Hue"],
    },
  },
  {
    "Crazy Bees": {
      ID: 119,
      Description: "Bees darting from flower to flower.",
      Flags: ["▦"],
      Colors: [],
      Parameters: ["Speed", "Blur"],
    },
  },
  {
    "DJ Light": {
      ID: 159,
      Description: "An effect emanating from the center to the edges.",
      Flags: ["⋮", "♫"],
      Colors: [],
      Parameters: ["Speed"],
    },
  },
  {
    DNA: {
      ID: 152,
      Description: "A very cool DNA like pattern.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Scroll speed", "Blur"],
    },
  },
  {
    "DNA Spiral": {
      ID: 182,
      Description: "Spiraling DNA pattern",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Scroll speed", "Y frequency"],
    },
  },
  {
    "Dancing Shadows": {
      ID: 112,
      Description: "Moving spotlights",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "# of shadows"],
    },
  },
  {
    Dissolve: {
      ID: 18,
      Description: "Fills LEDs with primary in random order, then off again",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Repeat speed", "Dissolve speed", "Random"],
    },
  },
  {
    "Dissolve Rnd": {
      ID: 19,
      Description:
        "Fills LEDs with random colors in random order, then off again",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Repeat speed", "Dissolve speed"],
    },
  },
  {
    "Distortion Waves": {
      ID: 124,
      Description: "Distorted sine waves with a psychedelic flair.",
      Flags: ["▦"],
      Colors: [],
      Parameters: ["Speed", "Scale"],
    },
  },
  {
    Drift: {
      ID: 164,
      Description: "A rotating kaleidoscope.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Rotation speed", "Blur amount"],
    },
  },
  {
    "Drift Rose": {
      ID: 123,
      Description:
        "Spinning arms that adds and removes nodes as it winds and unwinds.",
      Flags: ["▦"],
      Colors: [],
      Parameters: ["Fade", "Blur"],
    },
  },
  {
    Drip: {
      ID: 96,
      Description: "Water dripping effect",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Gravity", "# of drips", "Overlay"],
    },
  },
  {
    Dynamic: {
      ID: 7,
      Description: "Sets each LED to a random color",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Intensity", "Smooth"],
    },
  },
  {
    "Dynamic Smooth": {
      ID: 117,
      Description: "Like Dynamic, but with smooth palette blends",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Fade: {
      ID: 12,
      Description: "Fades smoothly between primary and secondary color",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Fairy: {
      ID: 49,
      Description: "Inspired by twinkle style Christmas lights.",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "# of flashers"],
    },
  },
  {
    Fairytwinkle: {
      ID: 51,
      Description: "Like Colortwinkle, but starting from all lit",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Fill Noise": {
      ID: 69,
      Description: "Noise pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Fire 2012": {
      ID: 66,
      Description: "Simulates flickering fire in red and yellow",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Cooling", "Spark rate", "Boost"],
    },
  },
  {
    "Fire Flicker": {
      ID: 45,
      Description: "LEDs randomly flickering",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Firenoise: {
      ID: 149,
      Description: "Using Perlin Noise for fire.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["X scale", "Y scale"],
    },
  },
  {
    Fireworks: {
      ID: 42,
      Description: "Random color blobs light up, then fade again",
      Flags: ["⋮", "▦"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Frequency"],
    },
  },
  {
    "Fireworks 1D": {
      ID: 90,
      Description: "One dimension fireworks with flare",
      Flags: ["⋮", "▦"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Gravity", "Firing side"],
    },
  },
  {
    "Fireworks Starburst": {
      ID: 89,
      Description: "Exploding multicolor fireworks",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Chance", "Fragments", "Overlay"],
    },
  },
  {
    Flow: {
      ID: 110,
      Description: "Blend of palette and spot effects",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Zones"],
    },
  },
  {
    "Flow Stripe": {
      ID: 179,
      Description: "Strip with rotating colours.",
      Flags: ["⋮"],
      Colors: [],
      Parameters: ["Hue speed", "Effect speed"],
    },
  },
  {
    Freqmap: {
      ID: 155,
      Description:
        "Map the loudest frequency throughout the length of the LED's.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "Starting color"],
    },
  },
  {
    Freqmatrix: {
      ID: 138,
      Description:
        "The temporal tail for this animation starts at the beginning of the Segment rather than in the center of the segment.",
      Flags: ["⋮", "♫"],
      Colors: [],
      Parameters: [
        "Speed",
        "Sound effect",
        "Low bin",
        "High bin",
        "Sensitivity",
      ],
    },
  },
  {
    Freqpixels: {
      ID: 141,
      Description: "Random pixels coloured by frequency.",
      Flags: ["⋮", "♫"],
      Colors: [],
      Parameters: ["Fade rate", "Starting color", "# of pixels"],
    },
  },
  {
    Freqwave: {
      ID: 137,
      Description:
        "Maps the major frequencies from the incoming signal to colors in the HSV color space.",
      Flags: ["⋮", "♫"],
      Colors: [],
      Parameters: ["Speed", "Sound effect", "Low bin", "High bin", "Pre-amp"],
    },
  },
  {
    Frizzles: {
      ID: 177,
      Description: "Moving patterns.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["X frequency", "Y frequency", "Blur"],
    },
  },
  {
    "Funky Plank": {
      ID: 160,
      Description: "A 2D wall of reactivity running from bottom to top",
      Flags: ["▦", "♫"],
      Colors: [],
      Parameters: ["Scroll speed", "# of bands"],
    },
  },
  {
    GEQ: {
      ID: 139,
      Description: "A 16x16 graphic equalizer.",
      Flags: ["▦", "♫"],
      Colors: ["Fx", "Peaks", "🎨"],
      Parameters: ["Fade speed", "Ripple decay", "# of bands", "Color bars"],
    },
  },
  {
    "Game Of Life": {
      ID: 172,
      Description: "Scrolling game of life.",
      Flags: ["▦"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Ghost Rider": {
      ID: 120,
      Description: "Color changing ghost riding a kite... in a tornado.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Fade rate", "Blur"],
    },
  },
  {
    Glitter: {
      ID: 87,
      Description: "Rainbow with white sparkles",
      Flags: ["⋮"],
      Colors: ["1", "2", "Glitter color", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    Gradient: {
      ID: 46,
      Description:
        "Moves a saturation gradient of the primary color along the strip",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Spread"],
    },
  },
  {
    Gravcenter: {
      ID: 156,
      Description:
        "Volume reactive vu-meter from center with gravity and perlin noise.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Rate of fall", "Sensitivity"],
    },
  },
  {
    Gravcentric: {
      ID: 157,
      Description:
        "Volume reactive vu-meter from center with gravity. Volume provides index to (time rotating) palette colour.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Rate of fall", "Sensitivity"],
    },
  },
  {
    Gravfreq: {
      ID: 158,
      Description:
        "VU Meter from center. Log of frequency is index to center colour.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Rate of fall", "Sensitivity"],
    },
  },
  {
    Gravimeter: {
      ID: 132,
      Description: "Volume reactive vu-meter with gravity and perlin noise.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Rate of fall", "Sensitivity"],
    },
  },
  {
    "Halloween Eyes": {
      ID: 82,
      Description: "One Pair of blinking eyes at random intervals along strip",
      Flags: ["⋮", "▦"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Duration", "Eye fade time", "Overlay"],
    },
  },
  {
    Heartbeat: {
      ID: 100,
      Description: "led strip pulsing rhythm similar to a heart beat",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Hiphotic: {
      ID: 180,
      Description: "A moving plasma.",
      Flags: ["▦"],
      Colors: ["Fx", "🎨"],
      Parameters: ["X scale", "Y scale", "Speed"],
    },
  },
  {
    ICU: {
      ID: 58,
      Description: "Two 'eyes' running on opposite sides of the strip",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    Juggle: {
      ID: 64,
      Description: "Eight colored dots running, leaving trails",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Trail"],
    },
  },
  {
    Juggles: {
      ID: 130,
      Description: "Juggling balls.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "# of balls"],
    },
  },
  {
    Julia: {
      ID: 168,
      Description:
        "Animated Julia set fractal named after mathematician Gaston Julia.",
      Flags: ["▦"],
      Colors: ["Fx", "🎨"],
      Parameters: [
        "Max iterations per pixel",
        "X center",
        "Y center",
        "Area size",
      ],
    },
  },
  {
    Lake: {
      ID: 75,
      Description: "Calm palette waving",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Lighthouse: {
      ID: 41,
      Description: "Dot moves from start to end, leaving behind a fading trail",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Fade rate"],
    },
  },
  {
    Lightning: {
      ID: 57,
      Description: "Short random white strobe similar to a lightning bolt",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    Lissajous: {
      ID: 176,
      Description: "A frequency based Lissajous pattern.",
      Flags: ["▦"],
      Colors: ["Fx", "🎨"],
      Parameters: ["X frequency", "Fade rate", "Speed"],
    },
  },
  {
    Loading: {
      ID: 47,
      Description: "Moves a sawtooth pattern along the strip",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Fade"],
    },
  },
  {
    Matripix: {
      ID: 131,
      Description: "Similar to Matrix.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Brightness"],
    },
  },
  {
    Matrix: {
      ID: 153,
      Description: "The Matrix, on a 2D matrix.",
      Flags: ["▦"],
      Colors: ["Spawn", "Trail"],
      Parameters: ["Speed", "Spawning rate", "Trail", "Custom color"],
    },
  },
  {
    Metaballs: {
      ID: 154,
      Description: "A cool plasma type effect.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Meteor: {
      ID: 76,
      Description:
        "The primary color creates a trail of randomly decaying color",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "Trail length"],
    },
  },
  {
    "Meteor Smooth": {
      ID: 77,
      Description: "Smoothly animated meteor",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed", "Trail length"],
    },
  },
  {
    Midnoise: {
      ID: 135,
      Description: "Perlin noise emanating from center.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "Max. length"],
    },
  },
  {
    "Multi Comet": {
      ID: 59,
      Description: "Like Scanner, but creates multiple trails",
      Flags: ["⋮"],
      Colors: [],
      Parameters: [],
    },
  },
  {
    "Noise 1": {
      ID: 70,
      Description: "Fast Noise shift pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Noise 2": {
      ID: 71,
      Description: "Fast Noise shift pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Noise 3": {
      ID: 72,
      Description: "Noise shift pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Noise 4": {
      ID: 73,
      Description: "Noise sparkle pattern",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Noise Pal": {
      ID: 107,
      Description:
        "Peaceful noise that's slow and with gradually changing palettes",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Scale"],
    },
  },
  {
    Noise2D: {
      ID: 146,
      Description: "",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Scale"],
    },
  },
  {
    Noisefire: {
      ID: 143,
      Description: "A perlin noise based volume reactive fire routine.",
      Flags: ["⋮", "♪"],
      Colors: [],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Noisemeter: {
      ID: 136,
      Description: "Volume reactive vu-meter.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "Width"],
    },
  },
  {
    Noisemove: {
      ID: 145,
      Description:
        "Using perlin noise as movement for different frequency bins.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed of perlin movement", "Fade rate"],
    },
  },
  {
    Octopus: {
      ID: 126,
      Description: "A cephalopod stuck in a whirlpool.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Offset X", "Offset Y", "Legs"],
    },
  },
  {
    Oscillate: {
      ID: 62,
      Description:
        "Areas of primary and secondary colors move between opposite ends, combining colors where they touch",
      Flags: ["⋮"],
      Colors: [],
      Parameters: [],
    },
  },
  {
    Pacifica: {
      ID: 101,
      Description: "Gentle ocean waves",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Angle"],
    },
  },
  {
    Palette: {
      ID: 65,
      Description: "Running color palette",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Cycle speed"],
    },
  },
  {
    Percent: {
      ID: 98,
      Description: "Lights up a percentage of segment",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["% of fill", "One color"],
    },
  },
  {
    "Perlin Move": {
      ID: 147,
      Description: "Using Perlin Noise for movement.",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "# of pixels", "Fade rate"],
    },
  },
  {
    Phased: {
      ID: 105,
      Description: "Sine waves (in sourcecode)",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Phased Noise": {
      ID: 109,
      Description: "Noisy sine waves",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Pixels: {
      ID: 128,
      Description: "Random pixels",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "# of pixels"],
    },
  },
  {
    Pixelwave: {
      ID: 129,
      Description: "Pixels emanating from center",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Sensitivity"],
    },
  },
  {
    Plasma: {
      ID: 97,
      Description: "Plasma lamp",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: ["Phase", "Intensity"],
    },
  },
  {
    "Plasma Ball": {
      ID: 178,
      Description: "A ball of plasma.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Fade", "Blur"],
    },
  },
  {
    Plasmoid: {
      ID: 133,
      Description: "Sine wave based plasma.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Phase", "# of pixels"],
    },
  },
  {
    "Polar Lights": {
      ID: 174,
      Description: "The northern lights.",
      Flags: ["▦"],
      Colors: [],
      Parameters: ["Speed", "Scale"],
    },
  },
  {
    Popcorn: {
      ID: 95,
      Description: "Popping kernels",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    "Pride 2015": {
      ID: 63,
      Description: "Rainbow cycling with brightness variation",
      Flags: ["⋮"],
      Colors: [],
      Parameters: ["Speed"],
    },
  },
  {
    Puddlepeak: {
      ID: 144,
      Description:
        "Blast coloured puddles randomly up and down the strand with the 'beat'.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "Puddle size", "Select bin", "Volume (min)"],
    },
  },
  {
    Puddles: {
      ID: 134,
      Description: "Blast coloured puddles based on volume.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Fade rate", "Puddle size"],
    },
  },
  {
    Pulser: {
      ID: 162,
      Description: "Travelling waves.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Blur"],
    },
  },
  {
    Railway: {
      ID: 78,
      Description:
        "Shows primary and secondary color on alternating LEDs. All LEDs fade to their opposite color and back again",
      Flags: ["⋮"],
      Colors: ["1", "2", "🎨"],
      Parameters: ["Speed", "Smoothness"],
    },
  },
  {
    Rain: {
      ID: 43,
      Description: "Like Fireworks, but the blobs move",
      Flags: ["⋮", "▦"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Spawning rate"],
    },
  },
  {
    Rainbow: {
      ID: 9,
      Description: "Displays rainbow colors along the whole strip",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Size"],
    },
  },
  {
    "Rainbow Runner": {
      ID: 33,
      Description:
        "Like Chase, but the 2 LEDs light up in rainbow colors and leave a primary color trail",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Speed", "Size"],
    },
  },
  {
    "Random Colors": {
      ID: 5,
      Description: "Applies a new random color to all LEDs",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Fade time"],
    },
  },
  {
    Ripple: {
      ID: 79,
      Description: "Effect resembling random water ripples",
      Flags: ["⋮", "▦"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Speed", "Wave #", "Overlay"],
    },
  },
  {
    "Ripple Peak": {
      ID: 148,
      Description: "Peak detection triggers ripples.",
      Flags: ["⋮", "♪"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: [
        "Fade rate",
        "Max # of ripples",
        "Select bin",
        "Volume (min)",
      ],
    },
  },
  {
    "Ripple Rainbow": {
      ID: 99,
      Description: "Like ripple, but with a dimly lit changing background",
      Flags: ["⋮", "▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Wave #"],
    },
  },
  {
    Rocktaves: {
      ID: 185,
      Description:
        "Colours the same for each note between octaves, with sine wave going back and forth.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: [],
    },
  },
  {
    Running: {
      ID: 15,
      Description: "Sine Waves scrolling",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Wave width"],
    },
  },
  {
    "Running Dual": {
      ID: 52,
      Description: "Sine waves in both directions",
      Flags: ["⋮"],
      Colors: ["L", "Bg", "R", "🎨"],
      Parameters: ["Speed", "Wave width"],
    },
  },
  {
    Saw: {
      ID: 16,
      Description: "Sawtooth Waves scrolling",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Width"],
    },
  },
  {
    Scan: {
      ID: 10,
      Description:
        "A single primary colored light wanders between start and end",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "# of dots", "Overlay"],
    },
  },
  {
    "Scan Dual": {
      ID: 11,
      Description: "Same as Scan but uses two lights starting at both ends",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "# of dots", "Overlay"],
    },
  },
  {
    Scanner: {
      ID: 40,
      Description: "Dot moves between ends, leaving behind a fading trail",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Fade rate"],
    },
  },
  {
    "Scanner Dual": {
      ID: 60,
      Description: "Like Scanner, but with two dots running on opposite sides",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "Fade rate"],
    },
  },
  {
    "Scrolling Text": {
      ID: 122,
      Description:
        "Edit segment name to set text (variables #DATE, #TIME, #DDMM, #MMDD, #HHMM, #HH, #MM; suffix with 0 to have leading 0s, i.e. #DATE0). Use segment grouping to increase text size on a large matrix.",
      Flags: ["▦"],
      Colors: ["Fx", "Bg", "Gradient", "🎨"],
      Parameters: [
        "Speed",
        "Y Offset",
        "Trail",
        "Font size",
        "Gradient",
        "Overlay",
        "0",
      ],
    },
  },
  {
    Sindots: {
      ID: 181,
      Description: "Dots revolving in a circle while the 'camera'",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Dot distance", "Fade rate", "Blur"],
    },
  },
  {
    Sine: {
      ID: 108,
      Description: "Controllable sine waves",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: [],
    },
  },
  {
    Sinelon: {
      ID: 92,
      Description: "Fastled sinusoidal moving eye",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "Trail"],
    },
  },
  {
    "Sinelon Dual": {
      ID: 93,
      Description: "Sinelon from both directions",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "Cs", "🎨"],
      Parameters: ["Speed", "Trail"],
    },
  },
  {
    "Sinelon Rainbow": {
      ID: 94,
      Description: "Sinelon in rainbow colours",
      Flags: ["⋮"],
      Colors: ["Cs", "🎨"],
      Parameters: ["Speed", "Trail"],
    },
  },
  {
    Soap: {
      ID: 125,
      Description: "Like soap bubbles, but lasts longer.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Smoothness"],
    },
  },
  {
    Solid: {
      ID: 0,
      Description: "Solid primary color on all LEDs",
      Flags: ["⋮"],
      Colors: [],
      Parameters: [],
    },
  },
  {
    "Solid Glitter": {
      ID: 103,
      Description: "Like Glitter, but with solid color background",
      Flags: ["⋮"],
      Colors: ["Bg", "Glitter color", "🎨"],
      Parameters: ["Intensity"],
    },
  },
  {
    "Solid Pattern": {
      ID: 83,
      Description: "Speed sets number of LEDs on, intensity sets off",
      Flags: ["⋮"],
      Colors: ["Fg", "Bg", "🎨"],
      Parameters: ["Fg size", "Bg size"],
    },
  },
  {
    "Solid Pattern Tri": {
      ID: 84,
      Description: "Solid Pattern with three colors",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Size"],
    },
  },
  {
    Spaceships: {
      ID: 118,
      Description:
        "Circling ships with fading trails. Homage to 80s spaceship shooter games.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Blur"],
    },
  },
  {
    Sparkle: {
      ID: 20,
      Description:
        "Single random LEDs light up in the primary color for a short time, secondary is background",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Overlay"],
    },
  },
  {
    "Sparkle Dark": {
      ID: 21,
      Description:
        "All LEDs are lit in the primary color, single random LEDs turn off for a short time",
      Flags: ["⋮"],
      Colors: ["Bg", "Fx", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    "Sparkle+": {
      ID: 22,
      Description:
        "All LEDs are lit in the primary color, multiple random LEDs turn off for a short time",
      Flags: ["⋮"],
      Colors: ["Bg", "Fx", "🎨"],
      Parameters: ["Speed", "Intensity", "Overlay"],
    },
  },
  {
    Spots: {
      ID: 85,
      Description: "Solid lights with even distance",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Spread", "Width", "Overlay"],
    },
  },
  {
    "Spots Fade": {
      ID: 86,
      Description: "Spots, getting bigger and smaller",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Spread", "Width", "Overlay"],
    },
  },
  {
    "Squared Swirl": {
      ID: 150,
      Description: "Boxes moving around",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Blur"],
    },
  },
  {
    Stream: {
      ID: 39,
      Description: "Flush bands random hues along the string",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Zone size"],
    },
  },
  {
    "Stream 2": {
      ID: 61,
      Description: "Flush random hues along the string",
      Flags: ["⋮"],
      Colors: [],
      Parameters: ["Speed"],
    },
  },
  {
    Strobe: {
      ID: 23,
      Description:
        "All LEDs are lit in the secondary color, all LEDs flash in a single short burst in primary color",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Strobe Mega": {
      ID: 25,
      Description:
        "All LEDs are lit in the secondary color, all LEDs flash in several short bursts in primary color",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Strobe Rainbow": {
      ID: 24,
      Description: "Same as strobe, cycles through the rainbow",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Sun Radiation": {
      ID: 166,
      Description: "The sun! Doesn't support segments.",
      Flags: ["▦"],
      Colors: [],
      Parameters: ["Variance", "Brightness"],
    },
  },
  {
    Sunrise: {
      ID: 104,
      Description:
        "Simulates a gradual sunrise or sunset. Speed sets: 0 - static sun, 1 - 60: sunrise time in minutes, 60 - 120: sunset time in minutes - 60, above: 'breathing' rise and set",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Time [min]", "Width"],
    },
  },
  {
    Sweep: {
      ID: 6,
      Description:
        "Switches between primary and secondary, switching LEDs one by one, start to end to start",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Sweep Random": {
      ID: 36,
      Description: "Like Sweep, but uses random colors",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Swirl: {
      ID: 175,
      Description:
        "Several blurred circles. Looks good with pink plasma palette. Supports AGC.",
      Flags: ["▦", "♪"],
      Colors: ["Bg Swirl", "🎨"],
      Parameters: ["Speed", "Sensitivity", "Blur"],
    },
  },
  {
    "TV Simulator": {
      ID: 116,
      Description: "TV light spill simulation",
      Flags: ["⋮"],
      Colors: [],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Tartan: {
      ID: 173,
      Description:
        "Plaid pattern of horizontal and vertical bands. Makes a great kilt.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["X scale", "Y scale", "Sharpness"],
    },
  },
  {
    Tetrix: {
      ID: 44,
      Description: "Falling blocks stack",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Width", "One color"],
    },
  },
  {
    Theater: {
      ID: 13,
      Description: "Pattern of one lit and two unlit LEDs running",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Gap size"],
    },
  },
  {
    "Theater Rainbow": {
      ID: 14,
      Description: "Same as Theater but uses colors of the rainbow",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Speed", "Gap size"],
    },
  },
  {
    "Traffic Light": {
      ID: 35,
      Description: "Emulates a traffic light",
      Flags: ["⋮"],
      Colors: ["Bg", "🎨"],
      Parameters: ["Speed", "US style"],
    },
  },
  {
    "Tri Fade": {
      ID: 56,
      Description:
        "Fades the whole strip from primary color to secondary color to off",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    "Tri Wipe": {
      ID: 55,
      Description: "Like Wipe but turns LEDs off as 'third color'",
      Flags: ["⋮"],
      Colors: ["1", "2", "3", "🎨"],
      Parameters: ["Speed"],
    },
  },
  {
    Twinkle: {
      ID: 17,
      Description:
        "Random LEDs light up in the primary color with secondary as background",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Twinklecat: {
      ID: 81,
      Description: "Twinkling with fast in / slow out",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Twinkle rate"],
    },
  },
  {
    Twinklefox: {
      ID: 80,
      Description: "FastLED gentle twinkling with slow fade in/out",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Twinkle rate"],
    },
  },
  {
    Twinkleup: {
      ID: 106,
      Description: "Twinkle effect with fade-in",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Two Dots": {
      ID: 50,
      Description: "Two areas sweeping",
      Flags: ["⋮"],
      Colors: ["1", "2", "Bg", "🎨"],
      Parameters: ["Speed", "Dot size", "Overlay"],
    },
  },
  {
    "Washing Machine": {
      ID: 113,
      Description: "Spins, slows, reverses directions",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    Waterfall: {
      ID: 140,
      Description:
        "A volume AND FFT version of a Waterfall that has 'beat' support.",
      Flags: ["⋮", "♫"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Adjust color", "Select bin", "Volume (min)"],
    },
  },
  {
    Waverly: {
      ID: 165,
      Description: "Noise waves with some sound.",
      Flags: ["▦", "♪"],
      Colors: ["🎨"],
      Parameters: ["Amplification", "Sensitivity"],
    },
  },
  {
    Wavesins: {
      ID: 184,
      Description: "Beat waves and phase shifting. Looks OK in 2D'ish as well.",
      Flags: ["⋮"],
      Colors: ["Fx", "🎨"],
      Parameters: [
        "Speed",
        "Brightness variation",
        "Starting color",
        "Range of colors",
        "Color variation",
      ],
    },
  },
  {
    "Waving Cell": {
      ID: 127,
      Description:
        "If a bunch of eucaryotes went to a sports stadium and did the wave, it would look exactly like this.",
      Flags: ["▦"],
      Colors: ["🎨"],
      Parameters: ["Speed", "Amplitude 1", "Amplitude 2", "Amplitude 3"],
    },
  },
  {
    Wipe: {
      ID: 3,
      Description:
        "Switches between primary and secondary, switching LEDs one by one, start to end",
      Flags: ["⋮"],
      Colors: ["Fx", "Bg", "🎨"],
      Parameters: ["Speed", "Intensity"],
    },
  },
  {
    "Wipe Random": {
      ID: 4,
      Description: "Same as Wipe, but uses random colors",
      Flags: ["⋮"],
      Colors: ["🎨"],
      Parameters: ["Speed"],
    },
  },
];

// Transform the raw JSON data into a lookup array indexed by effect ID (0-186)
function createEffectsArray(): WLEDEffectData[] {
  const effects: WLEDEffectData[] = new Array(187);

  // Initialize all positions with null/placeholder
  for (let i = 0; i < 187; i++) {
    effects[i] = {
      name: `Unknown Effect ${i}`,
      displayName: "",
      description: "Effect not found in database",
      id: i,
      flags: [],
      colors: [],
      parameters: [],
      isAudioReactive: false,
      supportsPalette: true, // Default to true for unknown effects
      supports1D: false,
      supports2D: false,
    };
  }

  // Process each effect from the raw JSON data
  WLED_FX_RAW_DATA.forEach((effectObj) => {
    const effectName = Object.keys(effectObj)[0];
    const effectData: any = effectObj[effectName as keyof typeof effectObj];

    // Skip if effectData is undefined
    if (!effectData) return;

    const flags = effectData.Flags || [];
    const isAudioReactive = flags.includes("♪") || flags.includes("♫");
    const supports1D = flags.includes("⋮");
    const supports2D = flags.includes("▦");
    const supportsPalette = effectData.Colors?.includes("🎨") ?? false;

    // Create the effect name with capability indicators
    const indicators = [];
    if (isAudioReactive) {
      if (flags.includes("♫")) indicators.push("♫"); // FFT
      else if (flags.includes("♪")) indicators.push("♪"); // Volume
    }
    if (supports1D) indicators.push("⋮");
    if (supports2D) indicators.push("▦");
    if (supportsPalette) indicators.push("🎨");

    const nameWithIndicators = `${effectName}${
      indicators.length > 0 ? " " + indicators.join("") : ""
    }`;

    effects[effectData.ID] = {
      name: effectName,
      displayName: nameWithIndicators,
      description: effectData.Description,
      id: effectData.ID,
      flags: flags,
      colors: effectData.Colors || [],
      parameters: effectData.Parameters || [],
      isAudioReactive,
      supports1D,
      supports2D,
      supportsPalette,
    };
  });

  return effects;
}

// Create the effects array
export const WLED_EFFECTS: WLEDEffectData[] = createEffectsArray();

// Query functions

// Get effect data by ID
export function getEffectData(aEffectId: number): WLEDEffectData | null {
  const lEffect = WLED_EFFECTS[aEffectId];
  return lEffect ?? null; // if undefined, return null
}

// Get effect data by name (exact match)
export function getEffectByName(name: string): WLEDEffectData | null {
  return WLED_EFFECTS.find((effect) => effect.name === name) || null;
}
