import React, { useEffect, useState } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  FileImage,
  Loader2,
  XCircle,
} from "lucide-react";

export default function CrackDetectionApp() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  /* -----------------------------
     FILE HANDLING (HARDENED)
  ------------------------------ */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /* -----------------------------
     ANALYSIS REQUEST
  ------------------------------ */
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(`Backend not reachable at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     UI HELPERS
  ------------------------------ */
  const getSeverityColor = (severity) => {
    return (
      {
        Low: "bg-green-100 text-green-800 border-green-300",
        Moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
        Severe: "bg-orange-100 text-orange-800 border-orange-300",
        Critical: "bg-red-100 text-red-800 border-red-300",
      }[severity] || "bg-gray-100 text-gray-800 border-gray-300"
    );
  };

  const getRiskColor = (risk) => {
    return (
      {
        Low: "text-green-600",
        Medium: "text-yellow-600",
        High: "text-orange-600",
        Critical: "text-red-600",
      }[risk] || "text-gray-600"
    );
  };

  const isStructural =
    result?.status === "STRUCTURAL_CRACK_DETECTED" && result?.crack_analysis;

  /* -----------------------------
     RENDER
  ------------------------------ */
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Structural Crack Detection System
          </h1>
          <p className="text-slate-600">
            Computer Vision Based Structural Assessment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* UPLOAD */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Image</h2>

            <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 bg-slate-50">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 object-contain rounded"
                />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-600">
                    PNG, JPG, JPEG. Max 10MB
                  </p>
                </>
              )}
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
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-lg flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <FileImage className="w-5 h-5 mr-2" />
                  Analyze Image
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border rounded-lg flex">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* RESULTS */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

            {!result && (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <FileImage className="w-12 h-12 mr-2" />
                Awaiting analysis
              </div>
            )}

            {result?.status === "NO_CRACK" && (
              <div className="h-64 flex flex-col items-center justify-center">
                <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
                <p className="font-semibold">No crack detected</p>
              </div>
            )}

            {result?.status === "NON_STRUCTURAL_FEATURE" && (
              <div className="h-64 flex flex-col items-center justify-center">
                <XCircle className="w-14 h-14 text-yellow-500 mb-3" />
                <p className="font-semibold">Non-structural feature</p>
                <p className="text-sm text-slate-600 text-center mt-2">
                  {result.reason}
                </p>
              </div>
            )}

            {isStructural && (
              <div className="space-y-6">
                {/* OVERLAY IMAGE */}
                {result.overlay_image_base64 && (
                  <img
                    src={`data:image/png;base64,${result.overlay_image_base64}`}
                    alt="Crack Overlay"
                    className="w-full rounded-lg border"
                  />
                )}

                {/* SEVERITY */}
                <div className="flex justify-between">
                  <span>Severity</span>
                  <span
                    className={`px-3 py-1 rounded-full border text-sm font-semibold ${getSeverityColor(
                      result.severity
                    )}`}
                  >
                    {result.severity}
                  </span>
                </div>

                {/* METRICS */}
                <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Length</span>
                    <span>{result.crack_analysis.length_pixels} px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Width</span>
                    <span>{result.crack_analysis.width_pixels} px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orientation</span>
                    <span>{result.crack_analysis.orientation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pattern</span>
                    <span>{result.crack_analysis.pattern}</span>
                  </div>
                </div>

                {/* RECOMMENDATION */}
                {result.engineering_recommendation && (
                  <div className="bg-blue-50 p-4 rounded-lg text-sm">
                    <p className="font-semibold mb-2">Recommendation</p>
                    <p
                      className={`font-semibold ${getRiskColor(
                        result.engineering_recommendation.risk_level
                      )}`}
                    >
                      Risk: {result.engineering_recommendation.risk_level}
                    </p>
                    <p>
                      {result.engineering_recommendation.recommended_action}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Backend: {API_URL}
        </p>
      </div>
    </div>
  );
}
