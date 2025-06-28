"use client";

import { useState } from "react";
import React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon, Sparkles, User, Clock, CheckCircle, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ResultViewer } from "@/components/ResultViewer";
import { combineJewelryAndModelImages } from "@/lib/image-utils";

export default function TryOnPage() {
  const [jewelryFile, setJewelryFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [jewelrySize, setJewelrySize] = useState("");
  const [tryOnType, setTryOnType] = useState<"with_prompt_only" | "with_prompt_&_model">("with_prompt_only");
  const [isUploading, setIsUploading] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [combinedPreview, setCombinedPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Convex mutations and queries
  const createTryOn = useMutation(api.tryOn.createTryOn);
  const retryTryOn = useMutation(api.tryOn.retryTryOn);
  const deleteTryOn = useMutation(api.tryOn.deleteTryOn);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const userJobs = useQuery(api.tryOn.getUserTryOns, { limit: 10 });

  const handleFileUpload = async (file: File): Promise<Id<"_storage">> => {
    // Get upload URL from Convex
    const uploadUrl = await generateUploadUrl();

    // Upload file to Convex storage
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    const { storageId } = await result.json();
    return storageId;
  };

  const generateCombinedPreview = async () => {
    if (!jewelryFile || !modelFile) return;

    setIsGeneratingPreview(true);
    try {
      const combinedImage = await combineJewelryAndModelImages(jewelryFile, modelFile);
      const previewUrl = URL.createObjectURL(combinedImage);
      setCombinedPreview(previewUrl);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      toast.error("Failed to generate combined image preview");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Auto-generate preview when both files are available
  React.useEffect(() => {
    if (jewelryFile && modelFile && tryOnType === "with_prompt_&_model") {
      generateCombinedPreview();
    } else {
      setCombinedPreview(null);
    }
  }, [jewelryFile, modelFile, tryOnType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jewelryFile || !prompt) {
      toast.error("Please provide jewelry image and prompt");
      return;
    }

    if (tryOnType === "with_prompt_&_model" && !modelFile) {
      toast.error("Please provide a model image for this try-on type");
      return;
    }

    setIsUploading(true);

    try {
      let jewelryImageId: Id<"_storage">;
      let modelImageId: Id<"_storage"> | undefined;

      if (tryOnType === "with_prompt_&_model" && modelFile) {
        // Combine images client-side before upload
        toast.info("Combining images...");
        const combinedImage = await combineJewelryAndModelImages(jewelryFile, modelFile);

        // Upload individual images
        jewelryImageId = await handleFileUpload(jewelryFile);
        modelImageId = await handleFileUpload(modelFile);

        // Upload the combined image
        const combinedImageId = await handleFileUpload(combinedImage);

        // Create try-on job with combined image reference
        await createTryOn({
          type: tryOnType,
          jewelleryImageId: jewelryImageId,
          jewellerySize: jewelrySize || undefined,
          prompt,
          modelImageId,
          combinedImageId,
        });

        // Store the combined image ID in the job record
        console.log("Combined image stored with ID:", combinedImageId);
      } else {
        // Upload jewelry image only
        jewelryImageId = await handleFileUpload(jewelryFile);

        // Create try-on job
        await createTryOn({
          type: tryOnType,
          jewelleryImageId: jewelryImageId,
          jewellerySize: jewelrySize || undefined,
          prompt,
          modelImageId: undefined,
          combinedImageId: undefined,
        });
      }

      toast.success("Try-on job created successfully! Processing will begin shortly.");

      // Reset form
      setJewelryFile(null);
      setModelFile(null);
      setPrompt("");
      setJewelrySize("");

    } catch (error) {
      console.error("Failed to create try-on:", error);
      toast.error("Failed to create try-on. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "processing": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "processing": return <Sparkles className="h-4 w-4 animate-spin" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "failed": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const handleRetry = async (jobId: any) => {
    try {
      setRetryingJobId(jobId);
      await retryTryOn({ tryOnId: jobId });
      toast.success("Retry initiated! Your job has been queued for processing.");
    } catch (error) {
      console.error("Error retrying job:", error);
      toast.error("Failed to retry job. Please try again.");
    } finally {
      setRetryingJobId(null);
    }
  };
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const handleDelete = async (jobId: any) => {
    if (!confirm("Are you sure you want to delete this try-on job? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingJobId(jobId);
      await deleteTryOn({ tryOnId: jobId });
      toast.success("Try-on job deleted successfully.");
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job. Please try again.");
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            ✨ Virtual Jewelry Try-On
          </h1>
          <p className="text-lg text-gray-600">
            Transform your jewelry images with AI-powered virtual try-on technology
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Try-On</TabsTrigger>
            <TabsTrigger value="results">My Results ({userJobs?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Try-On Creation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Create Virtual Try-On
                  </CardTitle>
                  <CardDescription>
                    Upload your jewelry and let AI create stunning try-on images
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Try-On Type Selection */}
                    <div className="space-y-2">
                      <Label>Try-On Type</Label>
                      <Select
                        value={tryOnType}
                        onValueChange={(value: "with_prompt_only" | "with_prompt_&_model") =>
                          setTryOnType(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="with_prompt_only">
                            Generate Model + Jewelry
                          </SelectItem>
                          <SelectItem value="with_prompt_&_model">
                            Apply to Existing Model
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Jewelry Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="jewelry">Jewelry Image *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          id="jewelry"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setJewelryFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="jewelry"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {jewelryFile ? (
                            <>
                              <ImageIcon className="h-8 w-8 text-green-500" />
                              <span className="text-sm font-medium text-green-700">
                                {jewelryFile.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400" />
                              <span className="text-sm text-gray-500">
                                Click to upload jewelry image
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Model Upload (conditional) */}
                    {tryOnType === "with_prompt_&_model" && (
                      <div className="space-y-2">
                        <Label htmlFor="model">Model Image *</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <input
                            id="model"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <label
                            htmlFor="model"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            {modelFile ? (
                              <>
                                <User className="h-8 w-8 text-green-500" />
                                <span className="text-sm font-medium text-green-700">
                                  {modelFile.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  Click to upload model image
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Combined Image Preview */}
                    {tryOnType === "with_prompt_&_model" && (jewelryFile && modelFile) && (
                      <div className="space-y-2">
                        <Label>Combined Image Preview</Label>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          {isGeneratingPreview ? (
                            <div className="flex items-center justify-center h-32">
                              <div className="text-center">
                                <Sparkles className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                                <span className="text-sm text-gray-600">Generating preview...</span>
                              </div>
                            </div>
                          ) : combinedPreview ? (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-600 text-center">
                                This combined image will be sent to the AI
                              </p>
                              <div className="max-w-md mx-auto">
                                <img
                                  src={combinedPreview}
                                  alt="Combined jewelry and model preview"
                                  className="w-full h-auto rounded border"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              <ImageIcon className="h-6 w-6 mx-auto mb-2" />
                              <span className="text-sm">Preview will appear here</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="prompt">Description *</Label>
                      <Textarea
                        id="prompt"
                        placeholder={
                          tryOnType === "with_prompt_only"
                            ? "Describe the model: e.g., 'elegant young woman with dark hair, professional portrait style'"
                            : "Describe the desired outcome: e.g., 'make the jewelry look natural and elegant on the model'"
                        }
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>

                    {/* Jewelry Size */}
                    <div className="space-y-2">
                      <Label htmlFor="size">Jewelry Size (Optional)</Label>
                      <Input
                        id="size"
                        placeholder="e.g., Size 7, 18 inches, Medium"
                        value={jewelrySize}
                        onChange={(e) => setJewelrySize(e.target.value)}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Creating Try-On...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Virtual Try-On
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Upload Jewelry</h4>
                        <p className="text-sm text-gray-600">
                          Upload a clear image of your jewelry piece
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Choose Mode</h4>
                        <p className="text-sm text-gray-600">
                          Generate a new model or use your own photo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">AI Processing</h4>
                        <p className="text-sm text-gray-600">
                          Our AI creates realistic try-on images
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                        4
                      </div>
                      <div>
                        <h4 className="font-medium">Get Results</h4>
                        <p className="text-sm text-gray-600">
                          Download and share your virtual try-on images
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      Processing typically takes 30-60 seconds. You can create multiple try-ons simultaneously!
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="space-y-6">
              {userJobs && userJobs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userJobs.map((job) => (
                    <Card key={job._id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Try-On Job</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(job.status)} text-white border-none`}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(job.status)}
                                {job.status}
                              </span>
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(job._id)}
                              disabled={deletingJobId === job._id}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className={`h-4 w-4 ${deletingJobId === job._id ? 'animate-pulse' : ''}`} />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          Created {new Date(job.createdAt).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Type:</p>
                          <p className="text-sm text-gray-600">
                            {job.type === "with_prompt_only"
                              ? "Generated Model"
                              : "Existing Model"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700">Prompt:</p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {job.prompt}
                          </p>
                        </div>

                        {job.status === "processing" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Processing...</span>
                              <Sparkles className="h-4 w-4 animate-spin text-blue-500" />
                            </div>
                            <Progress value={65} className="h-2" />
                          </div>
                        )}

                        {job.status === "completed" && job.resultImageId && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-green-700">✅ Completed!</p>
                            <ResultViewer tryOnJob={job} />
                          </div>
                        )}

                        {job.status === "failed" && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-red-700">❌ Failed</p>
                            {job.errorMessage && (
                              <p className="text-xs text-red-600">{job.errorMessage}</p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleRetry(job._id)}
                              disabled={retryingJobId === job._id}
                            >
                              <RotateCcw className={`w-4 h-4 mr-2 ${retryingJobId === job._id ? 'animate-spin' : ''}`} />
                              {retryingJobId === job._id ? 'Retrying...' : 'Retry'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No try-ons yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first virtual jewelry try-on to get started!
                    </p>
                    <Button onClick={() => {
                      const createTab = document.querySelector('[data-value="create"]') as HTMLElement;
                      createTab?.click();
                    }}>
                      Create Try-On
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
