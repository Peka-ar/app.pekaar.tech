export interface Product {
  id: string;
  name: string;
  category: 'Chairs' | 'Sofas' | 'Lighting' | 'Stools';
  brand: string;
  price: number;
  src: string;
  usdz?: string;
  thumbnail: string;
  description: string;
  idealPhysicalDimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export const PRODUCTS: Product[] = [
  {
    id: 'sheen-armchair',
    name: 'Velvet Sheen Armchair',
    category: 'Sofas',
    brand: 'Elysian Design',
    price: 1290,
    src: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb',
    thumbnail: '/velvet_sheen_armchair.jpg',
    description: 'Expertly designed to display the ultimate luxury of microfiber silk-velvet sheen shading. Fully customizable cushions and rear frame, paired with polished solid wood legs that elevate premium lounges.',
    idealPhysicalDimensions: { width: 90, height: 95, depth: 88 }
  }
];
