-- AlterEnum
-- Adds the COMPLETED status to ProjectStatus.
-- This is an admin-only terminal state: when an admin uploads a 3D model
-- and clicks "Mark as Completed", the project lands here. Brands see a
-- COMPLETED project as "Review" and can either request changes (REVIEW)
-- or publish it (PUBLISHED).
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';
