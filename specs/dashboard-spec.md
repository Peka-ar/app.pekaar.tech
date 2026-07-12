# Product Manager Dashboard Specification

## Purpose
The central hub where D2C brands manage their 3D inventory, upload source images, and monitor generation jobs.

## Layout & Components

### 1. Header & Navigation
- Global Sidebar or Top-Nav (determined by global layout).
- Breadcrumbs for nested views (e.g., `Dashboard / Active Jobs / Eames Chair`).
- **Primary CTA**: "New Generation Job" (Emerald Accent).

### 2. The "New Generation" Upload Flow (Wizard/Modal)
When a user clicks "New Generation Job":
- **Step 1: Product Details**: Name, SKU, Category.
- **Step 2: Image Upload**: A large drag-and-drop zone. 
  - *UI Cue*: Requires at least 4 angles (Front, Back, Left, Right). 
  - *Validation*: JPG/PNG formats only.
- **Step 3: Dimensions**: Physical width, height, depth in CM (vital for AR scaling).
- **Step 4: Confirm & Queue**: Submits the job to the backend.

### 3. Kanban / List View: Job Pipeline
A visual board or list showing the status of 3D models.
- **Columns/States**:
  - `Drafts`: Incomplete uploads.
  - `Queued`: Waiting for the AI engine.
  - `Processing`: AI engine is working (show animated spinner/progress bar).
  - `Review Required`: Model is generated, awaiting user approval.
  - `Published`: Model is live and accessible via SDK.

### 4. Interactive Model Inspector (Review Mode)
When a model reaches "Review Required":
- Opens a full-screen variant of our existing `ThreeDConfigurator`.
- Allows the user to:
  - Verify the photogrammetry/AI generation quality.
  - Tweak PBR properties (Roughness/Metalness) if the AI guessed incorrectly.
  - Set specific camera constraints.
  - **Approve & Publish**: Moves the model to the `Published` state.

## Design System Tokens
- **Backgrounds**: Main canvas `#F9F8F6`, Kanban columns `#EFEDEA`.
- **Typography**: `JetBrains Mono` for SKU/ID numbers and timestamps. `Cormorant Garamond` for the main page header.
- **Status Colors**: 
  - Processing: `amber-500`
  - Published: `emerald-500`
  - Review: `#1A1A1A` (urgent attention)
