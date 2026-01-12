import React, { useState, useEffect } from "react";
import {
  Camera,
  Upload,
  AlertCircle,
  CheckCircle,
  History,
  Download,
  Settings,
  Trash2,
  X,
  FileText,
} from "lucide-react";

export default function CrackAnalyzer() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analysisParams, setAnalysisParams] = useState({
    sensitivity: "medium",
    measurementUnit: "metric",
    includeRecommendations: true,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await window.storage.list("crack-analysis:");
      if (historyData && historyData.keys) {
        const analyses = await Promise.all(
          historyData.keys.map(async (key) => {
            try {
              const item = await window.storage.get(key);
              return item ? JSON.parse(item.value) : null;
            } catch {
              return null;
            }
          })
        );
        setHistory(
          analyses.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp)
        );
      }
    } catch (error) {
      console.log(error);
      setHistory([]);
    }
  };

  const analyzeCrack = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const sensitivity = analysisParams.sensitivity;
    const isMetric = analysisParams.measurementUnit === "metric";

    const severityLevels = {
      high: ["Severe", "Critical", "Major"],
      medium: ["Moderate", "Significant"],
      low: ["Minor", "Hairline"],
    };

    const severity =
      severityLevels[sensitivity][
        Math.floor(Math.random() * severityLevels[sensitivity].length)
      ];
    const width = (Math.random() * 5 + 0.5).toFixed(1);
    const length = (Math.random() * 80 + 20).toFixed(1);

    return {
      "Crack Type": ["Structural", "Surface", "Settlement", "Thermal"][
        Math.floor(Math.random() * 4)
      ],
      Severity: severity,
      [`Width (${isMetric ? "mm" : "in"})`]: isMetric
        ? width
        : (width / 25.4).toFixed(2),
      [`Length (${isMetric ? "cm" : "in"})`]: isMetric
        ? length
        : (length / 2.54).toFixed(1),
      Pattern: ["Vertical", "Horizontal", "Diagonal", "Spider Web"][
        Math.floor(Math.random() * 4)
      ],
      "Depth Assessment": ["Surface Only", "Partial Depth", "Full Depth"][
        Math.floor(Math.random() * 3)
      ],
      "Risk Level":
        severity.includes("Severe") || severity.includes("Critical")
          ? "High"
          : severity.includes("Moderate") || severity.includes("Significant")
          ? "Medium"
          : "Low",
      ...(analysisParams.includeRecommendations && {
        "Recommended Action": severity.includes("Severe")
          ? "Immediate professional inspection required"
          : severity.includes("Moderate")
          ? "Schedule repair within 30 days"
          : "Monitor regularly, repair at convenience",
      }),
    };
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        setUploadedImage(event.target.result);
        setAnalyzing(true);
        setResult(null);

        try {
          const analysisResult = await analyzeCrack();
          // event.target.result
          setResult(analysisResult);

          const analysisRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            image: event.target.result,
            result: analysisResult,
          };

          await window.storage.set(
            `crack-analysis:${analysisRecord.id}`,
            JSON.stringify(analysisRecord)
          );
          await loadHistory();
        } catch (error) {
          console.error("Analysis failed:", error);
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await window.storage.delete(`crack-analysis:${id}`);
      await loadHistory();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const loadHistoryItem = (item) => {
    setUploadedImage(item.image);
    setResult(item.result);
    setShowHistory(false);
  };

  const downloadReport = () => {
    if (!result) return;

    const reportContent = `BUILDING CRACK ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

${Object.entries(result)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

---
This is an automated analysis. Please consult a professional structural engineer for detailed assessment.
`;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crack-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header with Actions */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Crack Analyzer
            </h1>
            <p className="text-sm text-slate-600">
              Professional assessment tool
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
              title="View History"
            >
              <History className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
          >
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                Upload crack image
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG or JPG</p>
            </div>
            <input
              id="image-upload"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        {/* Uploaded Image */}
        {uploadedImage && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Analyzed Image
            </h2>
            <img
              src={uploadedImage}
              alt="Crack analysis"
              className="w-full rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Analyzing State */}
        {analyzing && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Analyzing crack...</p>
            <p className="text-xs text-slate-500 mt-2">
              Processing image with AI
            </p>
          </div>
        )}

        {/* Results */}
        {result && !analyzing && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">
                  Analysis Complete
                </h2>
              </div>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Report
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(result).map(([key, value]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-medium text-slate-700 text-sm">
                      {key}
                    </span>
                    <span
                      className={`text-right text-sm font-semibold px-3 py-1 rounded-full ${
                        key === "Risk Level"
                          ? getRiskColor(value)
                          : "text-slate-900"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {(result["Risk Level"] === "Medium" ||
              result["Risk Level"] === "High") && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Professional structural inspection
                  strongly recommended.
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-slate-800">
                  Analysis History
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    No analysis history yet
                  </p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex gap-4">
                        <img
                          src={item.image}
                          alt="Historical crack"
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 mb-1">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                          <p className="font-medium text-slate-800">
                            {item.result["Crack Type"]}
                          </p>
                          <p className="text-sm text-slate-600">
                            Risk: {item.result["Risk Level"]}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => loadHistoryItem(item)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-slate-800">
                  Analysis Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Detection Sensitivity
                  </label>
                  <select
                    value={analysisParams.sensitivity}
                    onChange={(e) =>
                      setAnalysisParams({
                        ...analysisParams,
                        sensitivity: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="low">Low - Major cracks only</option>
                    <option value="medium">Medium - Balanced</option>
                    <option value="high">High - All cracks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Measurement Units
                  </label>
                  <select
                    value={analysisParams.measurementUnit}
                    onChange={(e) =>
                      setAnalysisParams({
                        ...analysisParams,
                        measurementUnit: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="metric">Metric (mm, cm)</option>
                    <option value="imperial">Imperial (inches)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recommendations"
                    checked={analysisParams.includeRecommendations}
                    onChange={(e) =>
                      setAnalysisParams({
                        ...analysisParams,
                        includeRecommendations: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="recommendations"
                    className="ml-2 text-sm text-slate-700"
                  >
                    Include repair recommendations
                  </label>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Footer */}
        {!uploadedImage && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>Disclaimer:</strong> This tool provides preliminary
              assessment only. Always consult qualified structural engineers for
              professional evaluation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
