"use client";

import { useEffect, useRef, useState } from "react";
import "./globals.css";

const STORAGE_KEY = "gallery-items-v1";

function loadItems() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Page() {
  const [items, setItems] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingDesc, setPendingDesc] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDesc, setEditingDesc] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    setItems(loadItems());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    setPendingFile({ name: file.name, dataUrl });
  }

  function addItem() {
    if (!pendingFile) return;
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      src: pendingFile.dataUrl,
      desc: pendingDesc.trim(),
      addedAt: Date.now(),
    };
    setItems((prev) => [item, ...prev]);
    setPendingFile(null);
    setPendingDesc("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingDesc(item.desc);
  }

  function saveEdit(id) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, desc: editingDesc.trim() } : i))
    );
    setEditingId(null);
    setEditingDesc("");
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gallery-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file) {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      alert("Couldn't read that file — expected a gallery-backup.json");
    }
  }

  return (
    <div className="wrap">
      <h1 className="title">gallery</h1>
      <p className="subtitle">drop pics, write descriptions, they stay on this device</p>

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
          <button className="btn" onClick={addItem} disabled={!pendingFile}>
            add to gallery
          </button>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn ghost" onClick={exportBackup}>
          export backup
        </button>
        <button className="btn ghost" onClick={() => importInputRef.current?.click()}>
          import backup
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => importBackup(e.target.files?.[0])}
        />
        <span className="count">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">nothing here yet — add your first image above</div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <div className="card" key={item.id}>
              <img src={item.src} alt={item.desc || "gallery image"} />
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
