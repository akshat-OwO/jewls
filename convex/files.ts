import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const getImageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

export const saveFileReference = mutation({
    args: {
        storageId: v.id("_storage"),
        filename: v.string(),
        contentType: v.string(),
    },
    handler: async (ctx, args) => {
        return { success: true, storageId: args.storageId };
    },
});
