"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function InsightNote({ loading, appliedNote, onApply }: { loading: boolean; appliedNote: string; onApply: (note: string) => void }) {
  const [note, setNote] = useState("");
  return <form className="card insight-note" onSubmit={event => { event.preventDefault(); onApply(note.trim()); }}>
    <span className="eyebrow"><Sparkles size={14} /> BEFORE YOUR INSIGHT</span>
    <label htmlFor="insight-note">What would you like a little perspective on?</label>
    <p id="note-help">Add an optional note about the kind of guidance you want.</p>
    <textarea id="insight-note" value={note} onChange={event => setNote(event.target.value)} maxLength={400} rows={3} disabled={loading}
      aria-describedby="note-help note-privacy" placeholder="For example: Help me plan short breaks between work blocks. Keep it brief and encouraging." />
    <div className="note-examples" aria-label="Suggested notes">{["Help me plan breaks", "Help me focus on one task", "Keep it brief and encouraging"].map(example =>
      <button type="button" key={example} disabled={loading} onClick={() => setNote(example)}>{example}</button>)}</div>
    <p id="note-privacy">Your note is sent with summarized metrics when AI is enabled. Leave out private details, links, and document names. It stays in this page only.</p>
    <div className="note-actions"><span aria-live="polite">{note.trim() !== appliedNote ? "Changes not applied" : appliedNote ? "Note applied to your insight" : "Optional · 400 characters max"}</span>
      <button className="refresh-button" disabled={loading} type="submit">{loading ? "Updating…" : "Update insight"}</button></div>
  </form>;
}
