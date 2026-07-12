# Billing & Subscription Specification

## Purpose
Manage the financial relationship with the brand, tracking their 3D generation limits and SDK bandwidth usage.

## Layout & Components

### 1. Current Usage Panel
A clear indicator of their current monthly limits.
- **3D Generations**: Progress bar showing e.g., "12 / 50 Models Generated".
- **SDK Bandwidth / Views**: Progress bar showing e.g., "45k / 100k Views".

### 2. Pricing Tiers (Cards)
Three simple, transparent tiers.
- **Starter**: Perfect for boutique brands. Limit 10 models, 10k views.
- **Growth (Highlighted)**: For scaling D2C. Limit 50 models, 100k views.
- **Enterprise**: Custom limits, dedicated edge servers, white-label SDK.

### 3. Payment & Invoices
- Integration with Stripe Customer Portal for managing credit cards.
- A simple table listing past invoices with download links.

## Design System Tokens
- **Cards**: The "Growth" (recommended) tier should have a distinct border (`border-[#1A1A1A]`) and perhaps a subtle `#1A1A1A` shadow to make it stand out against the other `#E5E2DD` bordered cards.
- **Typography**: Prices should be prominent, using `Cormorant Garamond` `italic`. Features lists use `Inter` with small checkmark icons.
- **Progress Bars**: Track usage using `emerald-500` for healthy limits, turning `amber-500` when nearing 90% capacity, and `#1A1A1A` if limits are reached.
