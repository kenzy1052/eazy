export interface FontOption {
  family: string;
  category: 'sans' | 'serif' | 'display' | 'script' | 'mono';
  weights: number[];
}

export const FONTS: FontOption[] = [
  { family: 'Plus Jakarta Sans', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'Space Grotesk', category: 'sans', weights: [400, 500, 600, 700] },
  { family: 'Montserrat', category: 'sans', weights: [400, 600, 700, 800] },
  { family: 'Inter', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'Poppins', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 700, 900] },
  { family: 'Cormorant Garamond', category: 'serif', weights: [400, 600, 700] },
  { family: 'Lora', category: 'serif', weights: [400, 600, 700] },
  { family: 'Anton', category: 'display', weights: [400] },
  { family: 'Bebas Neue', category: 'display', weights: [400] },
  { family: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Oswald', category: 'display', weights: [400, 600, 700] },
  { family: 'Caveat', category: 'script', weights: [600, 700] },
  { family: 'Dancing Script', category: 'script', weights: [600, 700] },
  { family: 'JetBrains Mono', category: 'mono', weights: [400, 600, 700] },
];

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
    'family=Space+Grotesk:wght@400;500;600;700',
    'family=Montserrat:wght@400;600;700;800',
    'family=Inter:wght@400;500;600;700;800',
    'family=Poppins:wght@400;500;600;700;800',
    'family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700',
    'family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600',
    'family=Lora:ital,wght@0,400;0,600;0,700;1,400',
    'family=Anton',
    'family=Bebas+Neue',
    'family=Archivo+Black',
    'family=Oswald:wght@400;600;700',
    'family=Caveat:wght@600;700',
    'family=Dancing+Script:wght@600;700',
    'family=JetBrains+Mono:wght@400;600;700',
  ].join('&') +
  '&display=swap';
