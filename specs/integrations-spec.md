# Integration & SDK Hub Specification

## Purpose
The developer-focused documentation and configuration center where brands configure how their generated 3D models appear on their storefronts via our SDK.

## Layout & Components

### 1. API Keys & Security
- **Domain Whitelisting**: A form to add approved domains (e.g., `www.mybrand.com`) to prevent SDK usage/bandwidth theft on unauthorized sites.
- **API Keys**: View, regenerate, and revoke public SDK keys.

### 2. SDK Installation Guides (Tabs)
A tabbed interface (`Vanilla JS`, `React`, `Shopify`, `WooCommerce`).

- **Vanilla JS**:
  - Script tag injection instructions.
  - Basic usage: `<studiov-viewer product-id="xyz" api-key="pk_live_123"></studiov-viewer>`

- **React / Next.js**:
  - `npm install @studiov/react`
  - Component usage documentation.

- **Shopify / E-Commerce**:
  - "Install Shopify App" button (future).
  - Instructions for modifying the Liquid `product.liquid` template to pass the dynamic Shopify product ID to the SDK.

### 3. Interactive Snippet Generator
- A dropdown to select a currently `Published` model from their inventory.
- Real-time generation of the exact HTML/React code needed to embed that specific model.
- Includes a "Copy to Clipboard" button (with proper `aria-label`).

## Design System Tokens
- **Typography**: Heavy use of `JetBrains Mono` for all code blocks, keys, and technical terms. `Inter` for explanatory text.
- **Layout**: Split screen or bento layout. Documentation on the left, interactive Snippet Generator on the right.
- **Code Blocks**: Dark mode `<pre>` blocks (`bg-[#1A1A1A]`) with syntax highlighting, contrasting against the `#F9F8F6` primary canvas.
