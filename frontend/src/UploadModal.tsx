import React, { useState, useRef, useEffect } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("hsbc");
  const [accountId, setAccountId] = useState("hsbc-main");

  // Dynamic defaults based on source type
  useEffect(() => {
    const defaults: Record<string, string> = {
      hsbc: "hsbc-t1",
      icici: "icici-sapphiro",
      axis: "axis-flipkart",
      kotak_mt940: "kotak-811",
    };
    setAccountId(defaults[sourceType] || "");
  }, [sourceType]);

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_id", accountId);
    formData.append("source_type", sourceType);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.detail || "An error occurred during upload.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
          <h2 className="text-lg font-bold text-card-foreground">
            Upload Statement
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted text-muted-foreground rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!result ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Source Type
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full border border-border bg-background rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="hsbc">HSBC (CSV)</option>
                    <option value="icici">ICICI Bank (Excel .xls)</option>
                    <option value="axis">Axis Bank (Excel)</option>
                    <option value="kotak_mt940">Kotak Bank (MT940)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full border border-border bg-background rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. hsbc-main"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    An identifier for the account this statement belongs to.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Statement File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      file
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,.xlsx,.xls,.txt"
                      className="hidden"
                    />

                    {file ? (
                      <div className="flex flex-col items-center">
                        <div className="bg-primary/20 p-3 rounded-full mb-3">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="bg-muted p-3 rounded-full mb-3">
                          <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Click to browse or drag file here
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports CSV and Excel exports
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-start text-sm">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-emerald-500/20 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-card-foreground">
                  Import Successful!
                </h3>
                <p className="text-muted-foreground mt-2">
                  Successfully imported{" "}
                  <span className="font-bold text-card-foreground">
                    {result.inserted}
                  </span>{" "}
                  new transactions.
                </p>
                {result.collisions?.length > 0 && (
                  <p className="text-sm text-amber-500 mt-2 bg-amber-500/10 p-2 rounded-lg inline-block">
                    Skipped {result.collisions.length} exact duplicates.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end space-x-3">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 font-medium text-muted-foreground hover:bg-muted rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading || !accountId}
                className="px-6 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition shadow-sm shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload Statement
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onSuccess();
              }}
              className="px-6 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-sm shadow-primary/20 w-full"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
