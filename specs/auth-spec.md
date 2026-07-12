# Authentication & Onboarding Specification

## Purpose
Provide a secure, frictionless entry point into the SaaS platform, ensuring new brands immediately understand the value and workflow.

## Layout & Components

### 1. Split-Screen Layout
- **Left Pane (Visual)**: A large, beautifully rendered 3D model (using our own SDK) slowly auto-rotating on a dark `#1A1A1A` background. This proves the product works immediately.
- **Right Pane (Form)**: The authentication forms on a crisp `#FFFFFF` or `#F9F8F6` background.

### 2. Authentication Views
- **Sign In**: Email/Password and SSO (Google/Apple).
- **Sign Up**: Email, Password, Company Name.
- **Forgot Password**: Standard recovery flow.

### 3. The Onboarding Wizard
Once a new user signs up, they are immediately placed into a 3-step modal wizard before seeing the empty Dashboard.
- **Step 1: Welcome**: "Welcome to STUDIO.V. Let's digitize your catalog."
- **Step 2: How It Works**: A simple graphic showing: `1. Snap Photos` -> `2. We Generate 3D` -> `3. Embed via SDK`.
- **Step 3: First Action**: A CTA to "Upload Your First Product" which drops them directly into the Dashboard's New Generation Flow.

## Design System Tokens
- **Typography**: The form headers should be large, balanced `Cormorant Garamond`. Input fields use `Inter`.
- **Forms**: Strict adherence to Vercel Guidelines. 
  - Floating labels or clear external `<label>`.
  - `:focus-visible` rings on all inputs.
  - `autocomplete` attributes correctly set.
  - Real-time inline validation (e.g., password strength) using `aria-live="polite"`.
- **Buttons**: The primary Sign Up button should be `#1A1A1A` with a white text, featuring the `active:scale-95` interaction.
