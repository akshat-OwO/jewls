import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,

    tryOn: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("with_prompt_only"),
            v.literal("with_prompt_&_model"),
        ),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),

        jewelleryImageId: v.id("_storage"),
        jewellerySize: v.optional(v.string()),

        prompt: v.string(),

        modelImageId: v.optional(v.id("_storage")),

        combinedImageId: v.optional(v.id("_storage")),

        resultImageId: v.optional(v.id("_storage")),

        errorMessage: v.optional(v.string()),

        createdAt: v.number(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),
});
