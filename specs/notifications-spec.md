# Notifications & Status Center Specification

## Purpose
An asynchronous communication channel to alert users when their 3D models are finished generating, or if an image upload failed validation.

## Layout & Components

### 1. Global Header Bell Icon
- A bell icon (`lucide-react/Bell`) in the global navigation.
- Shows a red/amber dot when there are unread notifications.

### 2. Notification Dropdown (Popover)
When the bell is clicked, a sleek, glassmorphic dropdown appears.
- **List Items**:
  - `Success`: "Your model 'Eames Lounge Chair' is ready for review!" (Clicking routes to the Inspector).
  - `Error`: "Generation failed for 'SKU-123'. Please upload higher resolution source images."
  - `System`: "SDK version 2.0 is now available."
- **Actions**: "Mark all as read", "View All Notifications".

### 3. Dedicated Status History Page (`/jobs`)
A full-page table view for enterprise brands managing hundreds of generations.
- **Table Columns**:
  - Job ID (`JetBrains Mono`)
  - Product Name
  - Initiated Date
  - Completion Time
  - Status Badge (Queued, Processing, Failed, Completed)
- **Filters**: Filter by date range, status, or search by Product Name.

## Design System Tokens
- **Animations**: The popover should use a quick `transition-transform` and `transition-opacity` (e.g., slide down and fade in) without violating `prefers-reduced-motion`.
- **Typography**: Notification text should be `Inter` `text-xs` for maximum readability. Timestamps (e.g., "2m ago") in `JetBrains Mono` `text-[9px]`.
- **Icons**: Use filled Lucide icons for status (CheckCircle for success, AlertTriangle for errors).
