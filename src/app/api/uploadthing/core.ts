import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  brandImageRoute: f({ image: { maxFileSize: "16MB", maxFileCount: 5 } })
    .middleware(async ({ req }) => {
      const session = await auth();
      const userRole = (session?.user as any)?.role;

      if (!session?.user || userRole !== "BRAND") {
        throw new UploadThingError("Unauthorized: Only brands can upload reference images");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  adminAssetRoute: f({
    blob: { maxFileSize: "128MB", maxFileCount: 2 } 
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      const userRole = (session?.user as any)?.role;

      if (!session?.user || userRole !== "ADMIN") {
        throw new UploadThingError("Unauthorized: Only admins can upload 3D assets");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Asset upload complete for adminId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
