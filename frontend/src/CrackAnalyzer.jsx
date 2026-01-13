import React, { useState } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  FileImage,
  Loader2,
} from "lucide-react";

export default function CrackDetectionApp() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        `Failed to analyze image. Check backend is running at ${API_URL}`
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      Low: "bg-green-100 text-green-800 border-green-300",
      Moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
      Severe: "bg-orange-100 text-orange-800 border-orange-300",
      Critical: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[severity] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getRiskColor = (risk) => {
    const colors = {
      Low: "text-green-600",
      Medium: "text-yellow-600",
      High: "text-orange-600",
      Critical: "text-red-600",
    };
    return colors[risk] || "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            AI Crack Detection System
          </h1>
          <p className="text-slate-600">
            Upload an image to detect and analyze structural cracks
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Upload Image
            </h2>

            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-slate-50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 max-w-full object-contain rounded"
                  />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG or JPEG (MAX. 10MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileImage className="w-5 h-5 mr-2" />
                  Analyze Image
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Analysis Results
            </h2>

            {!result ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <FileImage className="w-16 h-16 mb-3" />
                <p className="text-center">
                  Upload and analyze an image to see results
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center space-x-2">
                  {result.status === "STRUCTURAL_CRACK_DETECTED" ? (
                    <CheckCircle className="w-6 h-6 text-red-500" />
                  ) : result.status === "NO_CRACK" ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {result.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Overlay Image */}
                {result.overlay_image_base64 && (
                  <img
                    src={`data:image/png;base64,${result.overlay_image_base64}`}
                    alt="Overlay"
                    className="w-full rounded-lg shadow-md"
                  />
                )}

                {/* Crack Analysis */}
                {result.crack_analysis && (
                  <>
                    {/* Severity Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">
                        Severity Level
                      </span>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold border ${getSeverityColor(
                          result.severity
                        )}`}
                      >
                        {result.severity}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-800 mb-3">
                        Crack Analysis
                      </h3>
                      <div className="space-y-2 text-sm">
                        {[
                          "length_pixels",
                          "width_pixels",
                          "orientation",
                          "pattern",
                        ].map((key) => (
                          <div className="flex justify-between" key={key}>
                            <span className="text-slate-600">
                              {key.replace("_", " ").replace("pixels", " (px)")}
                              :
                            </span>
                            <span className="font-medium text-slate-800">
                              {result.crack_analysis[key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Engineering Recommendation */}
                    {result.engineering_recommendation && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <h3 className="font-semibold text-slate-800 mb-3">
                          Engineering Recommendation
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-slate-600 block mb-1">
                              Risk Level:
                            </span>
                            <span
                              className={`font-semibold ${getRiskColor(
                                result.engineering_recommendation.risk_level
                              )}`}
                            >
                              {result.engineering_recommendation.risk_level}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 block mb-1">
                              Recommended Action:
                            </span>
                            <span className="font-medium text-slate-800">
                              {
                                result.engineering_recommendation
                                  .recommended_action
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 block mb-1">
                              Engineer Required:
                            </span>
                            <span className="font-medium text-slate-800">
                              {result.engineering_recommendation
                                .engineer_required
                                ? "Yes"
                                : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* No Crack Message */}
                {result.status === "NO_CRACK" && (
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-semibold">
                      {result.message || "No crack detected in this image."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Connected to backend at{" "}
          <code className="bg-slate-200 px-2 py-1 rounded">{API_URL}</code>
        </div>
      </div>
    </div>
  );
}
