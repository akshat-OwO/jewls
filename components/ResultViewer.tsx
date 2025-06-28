"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Image as ImageIcon } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

interface ResultViewerProps {
  tryOnJob: Doc<"tryOn">;
}

export function ResultViewer({ tryOnJob }: ResultViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get image URLs
  const jewelryImageUrl = useQuery(
    api.files.getImageUrl,
    tryOnJob.jewelleryImageId ? { storageId: tryOnJob.jewelleryImageId } : "skip"
  );

  const modelImageUrl = useQuery(
    api.files.getImageUrl,
    tryOnJob.modelImageId ? { storageId: tryOnJob.modelImageId } : "skip"
  );



  const resultImageUrl = useQuery(
    api.files.getImageUrl,
    tryOnJob.resultImageId ? { storageId: tryOnJob.resultImageId } : "skip"
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <Eye className="w-4 h-4 mr-2" />
          View Result
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <div className="space-y-4">
          <div className="pb-4">
            <h2 className="text-lg font-semibold">Try-On Results</h2>
            <p className="text-sm text-gray-600 line-clamp-2">{tryOnJob.prompt}</p>
            {tryOnJob.jewellerySize && (
              <p className="text-xs text-gray-500">Size: {tryOnJob.jewellerySize}</p>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Jewelry Image */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-center">Original Jewelry</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden min-h-[150px]">
                  {jewelryImageUrl === undefined ? (
                    <Skeleton className="w-full h-full" />
                  ) : jewelryImageUrl ? (
                    <img
                      src={jewelryImageUrl}
                      alt="Original jewelry"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Model Image (if available) */}
              {tryOnJob.type === "with_prompt_&_model" && tryOnJob.modelImageId && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-center">Model</h4>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden min-h-[150px]">
                      {modelImageUrl === undefined ? (
                        <Skeleton className="w-full h-full" />
                      ) : modelImageUrl ? (
                        <img
                          src={modelImageUrl}
                          alt="Model"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator orientation="vertical" className="hidden lg:block" />
                </>
              )}

              {/* Result Image */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-center">Result</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden min-h-[150px]">
                  {resultImageUrl === undefined ? (
                    <Skeleton className="w-full h-full" />
                  ) : resultImageUrl ? (
                    <img
                      src={resultImageUrl}
                      alt="Try-on result"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info section */}
            <Separator />
            <div className="text-xs text-gray-500 space-y-1">
              <p>Type: {tryOnJob.type.replace(/_/g, " ").replace(/&/g, "and")}</p>
              <p>Job ID: {tryOnJob._id}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}