"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import "./globals.css";

export default function Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingDesc, setPendingDesc] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDesc, setEditingDesc] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setPendingFile(file);
  }

  async function addItem() {
    if (!pendingFile || uploading) return;
    setUploading(true);
    try {
      const pathname = `images/${Date.now()}-${pendingFile.name}`;
      const blob = await upload(pathname, pendingFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          pathname: blob.pathname,
          desc: pendingDesc,
          name: pendingFile.name,
        }),
      });

      setPendingFile(null);
      setPendingDesc("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/items/${id}`, { method: "DELETE" });
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingDesc(item.desc);
  }

  async function saveEdit(id) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desc: editingDesc }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingId(null);
    setEditingDesc("");
  }

  return (
    <div className="wrap">
      <h1 className="title">gallery</h1>
      <p className="subtitle">
        drop a pic, write a description — visible to anyone who visits this site
      </p>

      <div className="panel">
        <div className="panel-label">add image</div>

        <div
          className={`dropzone${dragActive ? " drag" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          {pendingFile ? (
            <span>selected: {pendingFile.name} — click to change</span>
          ) : (
            <span>drag & drop an image here, or click to browse</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <div className="form-row">
          <textarea
            rows={2}
            placeholder="description (optional)"
            value={pendingDesc}
            onChange={(e) => setPendingDesc(e.target.value)}
          />
          <button className="btn" onClick={addItem} disabled={!pendingFile || uploading}>
            {uploading ? "uploading..." : "add to gallery"}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <span className="count">
          {loading ? "loading..." : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {!loading && items.length === 0 ? (
        <div className="empty-state">nothing here yet — add your first image above</div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <div className="card" key={item.id}>
              <img src={item.url} alt={item.desc || "gallery image"} loading="lazy" />
              <div className="card-body">
                {editingId === item.id ? (
                  <textarea
                    rows={3}
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className={`card-desc${item.desc ? "" : " empty"}`}>
                    {item.desc || "no description"}
                  </div>
                )}
                <div className="card-actions">
                  {editingId === item.id ? (
                    <>
                      <button className="icon-btn" onClick={() => saveEdit(item.id)}>
                        save
                      </button>
                      <button className="icon-btn" onClick={() => setEditingId(null)}>
                        cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" onClick={() => startEdit(item)}>
                        edit
                      </button>
                      <button className="icon-btn" onClick={() => removeItem(item.id)}>
                        delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
