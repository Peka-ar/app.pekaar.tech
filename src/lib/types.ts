// Product shape shared by the tasks pipeline and the shared configurator.
// The demo catalog (PRODUCTS) moved to the marketing site — this file stays
// because TasksClient and ThreeDConfigurator depend on the Product type.
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
