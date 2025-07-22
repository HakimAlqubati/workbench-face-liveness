import React, { useState, useRef } from "react";
import {PYTHON_BASE_API} from '../config';
const API_URL = `${PYTHON_BASE_API}/recognize`; 

export default function FaceRecognitionPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setError("");
    setResult(null);
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!selectedFile) {
      setError("Please select an image.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("img", selectedFile);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Recognition failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewURL(null);
    setResult(null);
    setError("");
    fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-slate-100 to-teal-50 py-8">
      <div className="bg-white p-7 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-5 text-teal-700 text-center">
          Face Recognition
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full border rounded-md p-2 text-sm"
          />
          {previewURL && (
            <div className="flex flex-col items-center">
              <img
                src={previewURL}
                alt="Preview"
                className="rounded-lg h-36 object-contain border mb-2"
              />
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-gray-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
          <button
            type="submit"
            className="bg-teal-700 text-white rounded-lg py-2 font-bold hover:bg-teal-800 transition"
            disabled={loading}
          >
            {loading ? "Processing..." : "Recognize"}
          </button>
        </form>
        {error && (
          <div className="text-red-500 mt-3 text-center">{error}</div>
        )}
        {result && (
          <div className="mt-7">
            {result.matched ? (
              <div className="text-center">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={result.employee.avatar_url}
                    alt="Employee"
                    className="h-20 w-20 rounded-full border shadow"
                  />
                  <div className="font-semibold text-lg">
                    {result.employee.name}
                  </div>
                  <div className="text-gray-500 text-sm">
                    Employee ID: {result.employee.employee_id}
                  </div>
                  <div className="text-green-600 font-bold">
                    Matched &bull; Distance:{" "}
                    <span className="font-mono">{result.distance.toFixed(5)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-red-600 font-semibold">
                No matching employee found.<br />
                Closest distance:{" "}
                <span className="font-mono">
                  {typeof result.distance === "number"
                    ? result.distance.toFixed(5)
                    : "N/A"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
