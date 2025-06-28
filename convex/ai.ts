import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { experimental_generateImage as generateImage } from "ai";
import { fal } from "@ai-sdk/fal";

export const processTryOnJob = internalAction({
    args: { tryOnId: v.id("tryOn") },
    handler: async (ctx, args) => {
        try {
            // Mark job as processing
            await ctx.runMutation(internal.tryOn.updateTryOnStatus, {
                tryOnId: args.tryOnId,
                status: "processing",
            });

            const tryOn = await ctx.runQuery(internal.tryOn.getTryOnById, {
                tryOnId: args.tryOnId,
            });

            if (!tryOn) {
                throw new Error("Try-on job not found");
            }

            const jewelryUrl = await ctx.storage.getUrl(tryOn.jewelleryImageId);
            let finalPrompt = "";
            let imageUrl = jewelryUrl;

            if (tryOn.type === "with_prompt_only") {
                finalPrompt = `Create a realistic, high-quality image where ${tryOn.prompt}. The person should be wearing the specific jewelry shown in this image.

**Critical requirements:**
- The jewelry must be the exact piece from the provided image, not a substitute or generic version
- Ensure seamless integration with proper perspective, scale, and positioning
- Match lighting and shadows to create realistic depth and contours
- The jewelry should appear genuinely worn, not digitally overlaid
- Maintain professional photography quality with sharp details and natural colors
- Focus on creating an authentic, e-commerce ready result`;
            } else if (tryOn.type === "with_prompt_&_model" && tryOn.modelImageId) {
                // Check if we have a combined image from client-side processing
                if (tryOn.combinedImageId) {
                    imageUrl = await ctx.storage.getUrl(tryOn.combinedImageId);
                    finalPrompt = `**Goal: Virtual Try-On - Place Jewelry from Left onto Model on Right.**

You are provided with a single image composed of two distinct panels, presented side-by-side.

The **left panel** clearly displays a specific piece of jewelry against a plain background.

The **right panel** features a model who is currently not wearing this jewelry.

**Your primary task is to generate a single, new, and highly realistic image where the model from the right panel is accurately and naturally wearing *only* the specific jewelry from the left panel.**

**DO NOT SHOW THE RIGHT PANEL IMAGE ON THE RIGHT PANEL**
**ONLY SHOW THE MODEL WEARING THE JEWELLERY**

**Crucial requirements for the output image:**

1. **Exact Jewelry Transfer:** The jewelry applied to the model *must be the identical jewelry from the left panel*. Do not substitute it with any other jewelry or generic pieces.
2. **Seamless Integration:** Composite the jewelry onto the model so that it appears genuinely worn. Pay close attention to:
   * **Perspective and Scale:** The jewelry should be scaled and angled correctly to fit the model's body and pose.
   * **Lighting and Shadows:** Ensure the lighting on the jewelry matches the existing lighting on the model, casting appropriate and subtle shadows to enhance realism.
   * **Depth and Contours:** The jewelry should realistically conform to the curves of the model's body, not appear flat or "pasted on."
3. **Model Preservation:** Maintain the model's original pose, expression, clothing, hairstyle, and overall appearance from the right panel. Your only modification to the model should be the addition of this specific jewelry. Do not change the background, clothing, or any other features.
4. **High Quality Output:** The final image must be of professional photographic quality, with sharp details, natural colors, and a polished aesthetic, suitable for e-commerce or fashion display.
5. **Only show the model wearing jewelry**: You don't have to show the image in the right panel that is for your reference, remove that image completely and just process left image.

Additional context: ${tryOn.prompt}`;
                } else {
                    // Fallback to using just jewelry image with enhanced prompt
                    finalPrompt = `Create a realistic, high-quality image where ${tryOn.prompt}. The person should be wearing the specific jewelry shown in this image.

**Critical requirements:**
- The jewelry must be the exact piece from the provided image, not a substitute or generic version
- Ensure seamless integration with proper perspective, scale, and positioning
- Match lighting and shadows to create realistic depth and contours
- The jewelry should appear genuinely worn, not digitally overlaid
- Maintain professional photography quality with sharp details and natural colors
- Focus on creating an authentic, e-commerce ready result`;
                }
            }

            const { image } = await generateImage({
                model: fal.image("fal-ai/flux-pro/kontext"),
                prompt: finalPrompt,
                size: "1024x1024",
                providerOptions: {
                    fal: {
                        image_url: imageUrl,
                    },
                },
            });

            const imageBlob = new Blob([image.uint8Array], {
                type: image.mimeType,
            });

            const resultStorageId = await ctx.storage.store(imageBlob);

            await ctx.runMutation(internal.tryOn.updateTryOnStatus, {
                tryOnId: args.tryOnId,
                status: "completed",
                resultImageId: resultStorageId,
            });
        } catch (error) {
            console.error("AI processing failed:", error);

            // Mark job as failed
            await ctx.runMutation(internal.tryOn.updateTryOnStatus, {
                tryOnId: args.tryOnId,
                status: "failed",
                errorMessage: "Something went wrong",
            });
        }
    },
});

export const processBatchJobs = internalAction({
    args: {
        jobIds: v.array(v.id("tryOn")),
        maxConcurrent: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxConcurrent = args.maxConcurrent ?? 5;

        for (let i = 0; i < args.jobIds.length; i += maxConcurrent) {
            const batch = args.jobIds.slice(i, i + maxConcurrent);

            const promises = batch.map((jobId) =>
                ctx.runAction(internal.ai.processTryOnJob, {
                    tryOnId: jobId,
                }),
            );

            await Promise.allSettled(promises);

            if (i + maxConcurrent < args.jobIds.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    },
});

export const processJobQueue = internalMutation({
    handler: async (ctx) => {
        const pendingJobs = await ctx.runQuery(internal.tryOn.getPendingJobs, {
            limit: 50,
        });

        if (pendingJobs.length === 0) {
            return;
        }

        console.log(`Found ${pendingJobs.length} pending jobs to process`);

        const jobIds = pendingJobs.map((job) => job._id);

        try {
            await ctx.scheduler.runAfter(0, internal.ai.processBatchJobs, {
                jobIds,
                maxConcurrent: 10,
            });

            console.log(
                `Scheduled ${jobIds.length} jobs for parallel processing`,
            );
        } catch (error) {
            console.error("Failed to schedule batch job processing:", error);

            for (const job of pendingJobs) {
                try {
                    await ctx.scheduler.runAfter(
                        0,
                        internal.ai.processTryOnJob,
                        {
                            tryOnId: job._id,
                        },
                    );
                } catch (jobError) {
                    console.error(
                        `Failed to schedule individual job ${job._id}:`,
                        jobError,
                    );
                }
            }
        }
    },
});
