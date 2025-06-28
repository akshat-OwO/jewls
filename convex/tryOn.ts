import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createTryOn = mutation({
    args: {
        type: v.union(
            v.literal("with_prompt_only"),
            v.literal("with_prompt_&_model"),
        ),
        jewelleryImageId: v.id("_storage"),
        jewellerySize: v.optional(v.string()),
        prompt: v.string(),
        modelImageId: v.optional(v.id("_storage")),
        combinedImageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        if (args.type === "with_prompt_&_model" && !args.modelImageId) {
            throw new Error(
                "Model image is required for 'with_prompt_&_model' type",
            );
        }

        const tryOnId = await ctx.db.insert("tryOn", {
            userId,
            type: args.type,
            status: "pending",
            jewelleryImageId: args.jewelleryImageId,
            jewellerySize: args.jewellerySize,
            prompt: args.prompt,
            modelImageId: args.modelImageId,
            combinedImageId: args.combinedImageId,
            createdAt: Date.now(),
        });

        return tryOnId;
    },
});

export const getUserTryOns = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        return await ctx.db
            .query("tryOn")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(args.limit ?? 20);
    },
});

export const getTryOnById = internalQuery({
    args: { tryOnId: v.id("tryOn") },
    handler: async (ctx, args) => {
        const tryOn = await ctx.db.get(args.tryOnId);

        if (!tryOn) {
            throw new Error("Try-on not found");
        }

        return tryOn;
    },
});

export const getPendingJobs = internalQuery({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tryOn")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .order("asc")
            .take(args.limit ?? 50);
    },
});

export const updateTryOnStatus = internalMutation({
    args: {
        tryOnId: v.id("tryOn"),
        status: v.union(
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        resultImageId: v.optional(v.id("_storage")),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updateData: any = {
            status: args.status,
        };

        if (args.status === "processing") {
            updateData.startedAt = Date.now();
        }

        if (args.status === "completed" || args.status === "failed") {
            updateData.completedAt = Date.now();
        }

        if (args.resultImageId) {
            updateData.resultImageId = args.resultImageId;
        }

        if (args.errorMessage) {
            updateData.errorMessage = args.errorMessage;
        }

        await ctx.db.patch(args.tryOnId, updateData);
    },
});

export const retryTryOn = mutation({
    args: { tryOnId: v.id("tryOn") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const tryOn = await ctx.db.get(args.tryOnId);

        if (!tryOn || tryOn.userId !== userId) {
            throw new Error("Try-on not found or access denied");
        }

        // Update the existing job to pending status and clear error/result data
        await ctx.db.patch(args.tryOnId, {
            status: "pending",
            errorMessage: undefined,
            resultImageId: undefined,
            startedAt: undefined,
            completedAt: undefined,
        });

        return args.tryOnId;
    },
});

export const updateTryOnWithCombinedImage = internalMutation({
    args: {
        tryOnId: v.id("tryOn"),
        combinedImageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tryOnId, {
            combinedImageId: args.combinedImageId,
        });
    },
});

export const deleteTryOn = mutation({
    args: { tryOnId: v.id("tryOn") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const tryOn = await ctx.db.get(args.tryOnId);

        if (!tryOn || tryOn.userId !== userId) {
            throw new Error("Try-on not found or access denied");
        }

        await ctx.db.delete(args.tryOnId);
    },
});
