# Analytics & Insights Specification

## Purpose
To demonstrate the ROI of the 3D pipeline to the D2C brand by tracking interactions, AR launches, and estimating conversion lifts based on embed usage.

## Layout & Components

### 1. Top-Level Metric Cards (Bento Style)
A grid of 4 cards showing aggregate data (with date-picker filtering: 7 Days, 30 Days, All Time).
- **Total Model Views**: Number of times the SDK was loaded on their site.
- **Interaction Rate**: Percentage of users who rotated or zoomed the model.
- **AR Launches**: Number of times "Place in Space" was clicked (iOS Quick-Look / WebXR).
- **Est. Conversion Lift**: A calculated metric based on industry averages applied to their interacted users.

### 2. Time-Series Chart (Main Canvas)
- A line or bar chart showing Views vs. Interactions over time.
- Tooltips on hover showing exact numbers.

### 3. Top Performing Products Table
- A leaderboard of their 3D models.
- Columns:
  - Product Name
  - Views
  - Avg. Time Spent Interacting
  - AR Launches

## Design System Tokens
- **Charts**: Use minimalist chart styles. Remove grid lines. Use `emerald-500` for primary data lines and `#E5E2DD` for secondary/background data.
- **Typography**: Metric numbers should use `Cormorant Garamond` `italic` to match the premium brand identity, contrasting with `JetBrains Mono` for the axis labels.
- **Layout**: Clean, white cards (`bg-white`) on the off-white canvas (`#F9F8F6`) with subtle `#E5E2DD` borders.
