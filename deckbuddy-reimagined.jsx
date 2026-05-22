import { useState, useRef, useCallback, useEffect } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap";

const C = {
  bg: "#FAFAF7", bgAlt: "#F3F2EE", surface: "#FFFFFF",
  accent: "#C4501B", accentSoft: "#FDF0EB", accentText: "#9A3A10",
  text: "#1C1C1A", textMid: "#5A5A56", textLight: "#9C9C96",
  border: "#E8E6E0", borderLight: "#F0EEEA",
  blue: "#3A7BD5", blueSoft: "#EBF2FC",
  green: "#2A8C5E", greenSoft: "#E8F5EE",
  amber: "#C68B1E", amberSoft: "#FDF5E6",
  coral: "#D4592A", coralSoft: "#FAECE7",
  teal: "#1D9E75", tealSoft: "#E1F5EE",
};

const EMOTIONS = {
  hook: { icon: "⚡", label: "Provoke", color: C.blue, soft: C.blueSoft },
  empathy: { icon: "🎯", label: "Empathize", color: C.coral, soft: C.coralSoft },
  build: { icon: "📈", label: "Build", color: C.amber, soft: C.amberSoft },
  reveal: { icon: "💡", label: "Reveal", color: C.teal, soft: C.tealSoft },
  proof: { icon: "📊", label: "Prove", color: C.green, soft: C.greenSoft },
  close: { icon: "🎯", label: "Close", color: C.accent, soft: C.accentSoft },
};

const AUDIENCES = ["Investors / VCs", "Executive leadership", "Technical team", "Clients / Customers", "General audience"];
const DURATIONS = ["5 minutes", "10 minutes", "15 minutes", "20 minutes", "30 minutes"];

const s = {
  app: { fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, minHeight: "100vh", color: C.text },
  serif: { fontFamily: "'Instrument Serif', serif" },
};

function InputScreen({ onGenerate }) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [duration, setDuration] = useState("10 minutes");
  const [files, setFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const fileRef = useRef(null);

  const msgs = [
    "Reading your source documents…",
    "Mapping the narrative arc…",
    "Crafting each moment…",
    "Writing conversational scripts…",
    "Timing the delivery…",
  ];

  const handleFiles = useCallback(async (fl) => {
    const arr = Array.from(fl);
    setFiles(p => [...p, ...arr.map(f => f.name)]);
    const contents = await Promise.all(arr.map(f => new Promise(r => {
      const reader = new FileReader();
      reader.onload = e => r({ name: f.name, text: e.target.result });
      reader.onerror = () => r({ name: f.name, text: "[unreadable]" });
      reader.readAsText(f);
    })));
    setFileContents(p => [...p, ...contents]);
  }, []);

  const go = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    let mi = 0;
    setLoadMsg(msgs[0]);
    const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadMsg(msgs[mi]); }, 2800);

    const filePart = fileContents.length
      ? `\n\nSOURCE DOCUMENTS (use these for grounding all claims — cite them by filename and page/section):\n${fileContents.map(f => `--- ${f.name} ---\n${f.text.slice(0, 5000)}`).join("\n\n")}`
      : "";

    const prompt = `You are a world-class presentation director and speechwriter. Create a presentation structured as "moments" — each moment is an atomic unit of the presentation.

TOPIC: ${topic}
CONTEXT: ${context || "None"}
AUDIENCE: ${audience}
DURATION: ${duration}
${filePart}

Respond ONLY with JSON (no markdown, no backticks, no preamble):
{
  "title": "Presentation title",
  "moments": [
    {
      "id": 1,
      "title": "Short moment title (2-4 words)",
      "emotion": "hook|empathy|build|reveal|proof|close",
      "duration_seconds": 60,
      "slide_heading": "The heading that appears on the actual slide (can differ from moment title)",
      "slide_bullets": ["Key point 1 for the slide", "Key point 2 with data", "Key point 3"],
      "script": "The full conversational speaker script for this moment. Write it exactly as the person should say it out loud — natural, confident, with pauses noted. 3-6 sentences. Include transition to next moment at the end.",
      "sources": ["filename.pdf p.3"] or []
    }
  ],
  "total_duration": "9m 30s",
  "tips": ["Tip 1", "Tip 2"]
}

CRITICAL RULES:
- emotion must be one of: hook, empathy, build, reveal, proof, close
- slide_heading is what appears ON the slide (e.g. "$4.2B market by 2029") — it should be punchy and visual
- slide_bullets should be 3-5 concise points that work as slide content (not paragraphs)
- Scripts must sound like natural human speech, not corporate bullet points
- Include specific data/claims from source documents when available, citing the filename
- Every moment needs a clear emotional purpose
- Time the moments to fit within ${duration}
- Create 5-8 moments depending on duration
- The narrative arc should flow: hook → problem/empathy → build context → reveal solution → prove it works → close with ask`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      clearInterval(iv);
      const text = data.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      onGenerate(parsed, { topic, context, audience, duration, files, fileContents });
    } catch (e) {
      clearInterval(iv);
      setLoading(false);
      alert("Generation failed: " + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16, padding: 40 }}>
        <div style={{ width: 32, height: 32, border: `2.5px solid ${C.borderLight}`, borderTop: `2.5px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: C.textMid, animation: "pulse 2s ease infinite" }}>{loadMsg}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px 120px" }}>
      <div style={{ marginBottom: 48, animation: "fadeUp .6s ease" }}>
        <div style={{ fontSize: 16, fontWeight: 400, color: C.accent, letterSpacing: 0.5, marginBottom: 12 }}><span style={{ ...s.serif, fontSize: 20 }}>Mo</span><span style={{ fontSize: 12, color: C.textLight }}>(ve)</span><span style={{ ...s.serif, fontSize: 20 }}>ments</span></div>
        <h1 style={{ ...s.serif, fontSize: 42, fontWeight: 400, lineHeight: 1.15, marginBottom: 12 }}>What are you<br />presenting?</h1>
        <p style={{ fontSize: 16, color: C.textMid, lineHeight: 1.6 }}>Tell me about your presentation and upload any source material. I'll build your moments — slide by slide, word by word.</p>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} input:focus,textarea:focus,select:focus{border-color:${C.accent}!important;outline:none}`}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp .6s ease .1s both" }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Topic</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Series A pitch, quarterly review, product launch…" style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.surface, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Context and key points</label>
          <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Background, goals, specific data to include, things to emphasize or avoid…" rows={4} style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.surface, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.surface, fontFamily: "inherit", boxSizing: "border-box" }}>
              {AUDIENCES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.surface, fontFamily: "inherit", boxSizing: "border-box" }}>
              {DURATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Source documents</label>
          <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", transition: "border-color .2s", background: C.bgAlt }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>↑</div>
            <div style={{ fontSize: 14, color: C.textMid }}>Drop files or <span style={{ color: C.accent, fontWeight: 500 }}>browse</span></div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>.txt, .md, .csv — text files for grounding</div>
            <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json" style={{ display: "none" }} onChange={e => e.target.files?.length && handleFiles(e.target.files)} />
          </div>
          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {files.map((f, i) => (
                <span key={i} style={{ fontSize: 12, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  📄 {f}
                  <span onClick={() => { setFiles(p => p.filter((_, j) => j !== i)); setFileContents(p => p.filter((_, j) => j !== i)); }} style={{ cursor: "pointer", color: C.accent, fontWeight: 600, fontSize: 14 }}>×</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={go} disabled={!topic.trim()} style={{ marginTop: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, fontFamily: "inherit", border: "none", borderRadius: 10, background: topic.trim() ? C.accent : C.border, color: "#fff", cursor: topic.trim() ? "pointer" : "default", transition: "all .2s", alignSelf: "flex-end" }}>
          Build my moments →
        </button>
      </div>
    </div>
  );
}

function SlideEditor({ moment, onUpdate }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBullet, setEditingBullet] = useState(null);
  const [titleDraft, setTitleDraft] = useState(moment.slide_heading || moment.title);
  const [bulletDraft, setBulletDraft] = useState("");

  const heading = moment.slide_heading || moment.title;
  const bullets = moment.slide_bullets || [];

  const saveTitle = () => {
    onUpdate({ ...moment, slide_heading: titleDraft });
    setEditingTitle(false);
  };
  const saveBullet = (idx) => {
    const nb = [...bullets]; nb[idx] = bulletDraft;
    onUpdate({ ...moment, slide_bullets: nb });
    setEditingBullet(null);
  };
  const removeBullet = (idx) => {
    onUpdate({ ...moment, slide_bullets: bullets.filter((_, i) => i !== idx) });
  };
  const addBullet = () => {
    onUpdate({ ...moment, slide_bullets: [...bullets, "New point"] });
    setEditingBullet(bullets.length);
    setBulletDraft("New point");
  };

  return (
    <div style={{ background: "#1E293B", borderRadius: 10, padding: "18px 20px", aspectRatio: "16/10", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `${C.accent}15`, borderRadius: "0 0 0 100%" }} />
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#ffffff33" }}>SLIDE {moment.id}</div>

      {!editingTitle ? (
        <div onClick={e => { e.stopPropagation(); setEditingTitle(true); setTitleDraft(heading); }} style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 12, cursor: "text", padding: "2px 4px", borderRadius: 4, transition: "background .15s", lineHeight: 1.3 }} onMouseEnter={e => e.target.style.background = "#ffffff12"} onMouseLeave={e => e.target.style.background = "transparent"}>
          {heading}
        </div>
      ) : (
        <div onClick={e => e.stopPropagation()} style={{ marginBottom: 12 }}>
          <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onBlur={saveTitle} onKeyDown={e => e.key === "Enter" && saveTitle()} autoFocus style={{ width: "100%", fontSize: 16, fontWeight: 600, color: "#fff", background: "#ffffff15", border: `1px solid ${C.accent}`, borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: C.accent, fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
            {editingBullet !== i ? (
              <div onClick={e => { e.stopPropagation(); setEditingBullet(i); setBulletDraft(b); }} style={{ fontSize: 13, color: "#ffffffcc", lineHeight: 1.5, cursor: "text", padding: "1px 4px", borderRadius: 4, flex: 1, transition: "background .15s" }} onMouseEnter={e => e.target.style.background = "#ffffff12"} onMouseLeave={e => e.target.style.background = "transparent"}>
                {b}
              </div>
            ) : (
              <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: "flex", gap: 4 }}>
                <input value={bulletDraft} onChange={e => setBulletDraft(e.target.value)} onBlur={() => saveBullet(i)} onKeyDown={e => e.key === "Enter" && saveBullet(i)} autoFocus style={{ flex: 1, fontSize: 13, color: "#fff", background: "#ffffff15", border: `1px solid ${C.accent}`, borderRadius: 4, padding: "2px 6px", fontFamily: "inherit", outline: "none" }} />
                <span onClick={() => removeBullet(i)} style={{ color: "#ffffff55", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div onClick={e => { e.stopPropagation(); addBullet(); }} style={{ marginTop: 8, fontSize: 12, color: "#ffffff44", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }} onMouseEnter={e => e.target.style.color = "#ffffff88"} onMouseLeave={e => e.target.style.color = "#ffffff44"}>
        + Add point
      </div>
    </div>
  );
}

function MomentCard({ moment, active, onClick, onUpdate, onAgentRequest }) {
  const em = EMOTIONS[moment.emotion] || EMOTIONS.build;
  const [editingScript, setEditingScript] = useState(false);
  const [editText, setEditText] = useState(moment.script);
  const mins = Math.floor(moment.duration_seconds / 60);
  const secs = moment.duration_seconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs > 0 ? secs + "s" : ""}` : `${secs}s`;

  const saveScript = () => { onUpdate({ ...moment, script: editText }); setEditingScript(false); };

  const heading = moment.slide_heading || moment.title;
  const bullets = moment.slide_bullets || [];

  return (
    <div onClick={onClick} style={{ display: "flex", gap: 0, cursor: "pointer", transition: "all .2s", borderRadius: 14, border: active ? `1.5px solid ${C.accent}22` : "1.5px solid transparent", background: active ? C.surface : "transparent", marginBottom: 2 }}>
      <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 16px 10px", gap: 6, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${active ? C.accent : C.border}`, background: active ? C.accent : "transparent", transition: "all .2s" }} />
        <div style={{ width: 1.5, flex: 1, background: C.borderLight }} />
      </div>

      <div style={{ flex: 1, padding: "12px 14px 14px 6px" }}>
        {/* Header row — always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: active ? 12 : 6 }}>
          <span style={{ ...s.serif, fontSize: 18, fontWeight: 400 }}>{moment.title}</span>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: em.soft, color: em.color, fontWeight: 500 }}>{em.icon} {em.label}</span>
          <span style={{ fontSize: 12, color: C.textLight, marginLeft: "auto" }}>⏱ {timeStr}</span>
        </div>

        {/* Collapsed view: mini slide + script preview */}
        {!active && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 110, flexShrink: 0 }}>
              <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 6, background: "#1E293B", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 7, fontWeight: 600, color: "#ffffffcc", lineHeight: 1.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{heading}</div>
                {bullets.slice(0, 2).map((b, i) => (
                  <div key={i} style={{ fontSize: 6, color: "#ffffff88", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>• {b}</div>
                ))}
                {bullets.length > 2 && <div style={{ fontSize: 5, color: "#ffffff55" }}>+{bullets.length - 2} more</div>}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{moment.script}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {(moment.sources || []).map((src, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 6, background: C.amberSoft, color: C.amber, fontWeight: 500 }}>{src}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expanded view: slide editor + script editor side by side */}
        {active && (
          <div>
            <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
              {/* Left: Slide editor */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Slide content <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— click any text to edit</span></div>
                <SlideEditor moment={moment} onUpdate={onUpdate} />
              </div>
              {/* Right: Script */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>🎤 Speaker script</div>
                {!editingScript ? (
                  <div style={{ background: C.bgAlt, borderRadius: 10, padding: "14px 14px", border: `1px solid ${C.borderLight}`, minHeight: 130 }}>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{moment.script}</div>
                  </div>
                ) : (
                  <div onClick={e => e.stopPropagation()}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={6} style={{ width: "100%", padding: "12px 14px", fontSize: 13, fontFamily: "inherit", border: `1.5px solid ${C.accent}`, borderRadius: 10, background: C.surface, lineHeight: 1.8, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: `1px solid ${C.borderLight}` }}>
              {!editingScript ? (
                <span onClick={e => { e.stopPropagation(); setEditingScript(true); setEditText(moment.script); }} style={{ fontSize: 12, color: C.textLight, cursor: "pointer", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4 }}>✏️ Edit script</span>
              ) : (
                <>
                  <span onClick={e => { e.stopPropagation(); saveScript(); }} style={{ fontSize: 12, color: "#fff", cursor: "pointer", padding: "4px 12px", borderRadius: 6, background: C.accent, fontWeight: 500 }}>Save</span>
                  <span onClick={e => { e.stopPropagation(); setEditingScript(false); }} style={{ fontSize: 12, color: C.textLight, cursor: "pointer", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>Cancel</span>
                </>
              )}
              <span onClick={e => { e.stopPropagation(); onAgentRequest(`Rewrite the script for moment "${moment.title}"`); }} style={{ fontSize: 12, color: C.textLight, cursor: "pointer", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4 }}>🤖 Revise with agent</span>
              <div style={{ flex: 1 }} />
              {(moment.sources || []).map((src, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: C.amberSoft, color: C.amber, fontWeight: 500 }}>{src}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentChat({ presentation, activeMoment, meta, onUpdateMoment }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (presentation) {
      setMessages([{ role: "ai", text: `Your presentation "${presentation.title}" is ready — ${presentation.moments?.length} moments, ${presentation.total_duration}. Click any moment to expand its script. I'm watching and can help refine anything.` }]);
    }
  }, [presentation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(p => [...p, { role: "user", text: userMsg }]);
    setInput("");
    setThinking(true);

    const momentContext = activeMoment != null
      ? `\n\nCurrently selected moment (index ${activeMoment}):\n${JSON.stringify(presentation.moments[activeMoment])}`
      : "";

    const sysPrompt = `You are the AI co-director for a presentation tool called Mo(ve)ments. The user has a presentation with these moments:\n${JSON.stringify(presentation.moments.map(m => ({ id: m.id, title: m.title, emotion: m.emotion })))}\n${momentContext}\n\nThe user's request is about refining their presentation. Respond helpfully in 1-3 short sentences. If they ask you to change a script, generate the new script text. If they want structural changes, suggest what to do. Be conversational and direct — no corporate speak. If you're generating a new script, wrap it in <newscript moment_id="N">...</newscript> tags so the system can apply it.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: sysPrompt + "\n\nUser says: " + userMsg }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text || "").join("") || "Sorry, something went wrong.";

      const scriptMatch = reply.match(/<newscript moment_id="(\d+)">([\s\S]*?)<\/newscript>/);
      let cleanReply = reply.replace(/<newscript[\s\S]*?<\/newscript>/, "").trim();

      if (scriptMatch) {
        const mId = parseInt(scriptMatch[1]);
        const newScript = scriptMatch[2].trim();
        const moment = presentation.moments.find(m => m.id === mId);
        if (moment) {
          onUpdateMoment({ ...moment, script: newScript });
          if (!cleanReply) cleanReply = `Updated the script for "${moment.title}".`;
        }
      }

      setMessages(p => [...p, { role: "ai", text: cleanReply }]);
    } catch (e) {
      setMessages(p => [...p, { role: "ai", text: "Something went wrong: " + e.message }]);
    }
    setThinking(false);
  };

  return (
    <div style={{ width: 260, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface, flexShrink: 0 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Agent</span>
        {activeMoment != null && <span style={{ fontSize: 11, color: C.textLight, marginLeft: "auto" }}>Moment {activeMoment + 1}</span>}
      </div>
      <div ref={scrollRef} style={{ flex: 1, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 500 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ padding: "8px 10px", borderRadius: 12, fontSize: 13, lineHeight: 1.5, maxWidth: "92%", ...(m.role === "user" ? { background: C.accent, color: "#fff", marginLeft: "auto", borderBottomRightRadius: 4 } : { background: C.bgAlt, color: C.textMid, borderBottomLeftRadius: 4 }) }}>{m.text}</div>
        ))}
        {thinking && (
          <div style={{ padding: "8px 10px", borderRadius: 12, fontSize: 13, background: C.bgAlt, color: C.textLight, animation: "pulse 1.5s ease infinite", borderBottomLeftRadius: 4 }}>Thinking…</div>
        )}
      </div>
      <div style={{ padding: "10px 10px", borderTop: `1px solid ${C.borderLight}`, display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="Ask about any moment…" style={{ flex: 1, padding: "7px 12px", fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 20, fontFamily: "inherit", outline: "none", background: C.bg }} />
        <button onClick={() => send(input)} style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, flexShrink: 0 }}>↑</button>
      </div>
    </div>
  );
}

function ArcBar({ moments }) {
  const emotionColors = { hook: C.blue, empathy: C.coral, build: C.amber, reveal: C.teal, proof: C.green, close: C.accent };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderBottom: `1px solid ${C.borderLight}` }}>
      <span style={{ fontSize: 11, color: C.textLight, minWidth: 26 }}>Arc</span>
      <div style={{ display: "flex", flex: 1, gap: 2, alignItems: "center" }}>
        {moments.map((m, i) => (
          <div key={i} style={{ flex: m.duration_seconds || 60, height: 4, borderRadius: 2, background: emotionColors[m.emotion] || C.border, opacity: 0.7, transition: "flex .3s" }} title={`${m.title} — ${EMOTIONS[m.emotion]?.label || m.emotion}`} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: C.textLight, minWidth: 44, textAlign: "right" }}>
        {moments.reduce((a, m) => a + (m.duration_seconds || 60), 0) > 0 ? `${Math.round(moments.reduce((a, m) => a + (m.duration_seconds || 60), 0) / 60)}m` : ""}
      </span>
    </div>
  );
}

function Workspace({ presentation, meta, onReset }) {
  const [active, setActive] = useState(null);
  const [moments, setMoments] = useState(presentation.moments || []);

  const updateMoment = (updated) => {
    setMoments(p => p.map(m => m.id === updated.id ? updated : m));
  };

  const pres = { ...presentation, moments };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <span onClick={onReset} style={{ fontSize: 13, color: C.textLight, cursor: "pointer" }}>← Back</span>
        <div style={{ width: 1, height: 18, background: C.borderLight }} />
        <span style={{ ...s.serif, fontSize: 18 }}>{presentation.title}</span>
        <span style={{ fontSize: 12, color: C.textLight }}>{moments.length} moments · {presentation.total_duration} · {meta.audience}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <span style={{ fontSize: 13, color: C.textMid, cursor: "pointer" }}>📂 Sources</span>
          <span style={{ fontSize: 13, color: C.textMid, cursor: "pointer" }}>▶ Rehearse</span>
          <span style={{ fontSize: 13, color: C.textMid, cursor: "pointer" }}>⬇ Export</span>
        </div>
      </div>

      <ArcBar moments={moments} />

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
          {moments.map((m, i) => (
            <div key={m.id} style={{ animation: `slideIn .4s ease ${i * 0.06}s both` }}>
              <MomentCard
                moment={m}
                active={active === i}
                onClick={() => setActive(active === i ? null : i)}
                onUpdate={updateMoment}
                onAgentRequest={(text) => {}}
              />
            </div>
          ))}
          {presentation.tips?.length > 0 && (
            <div style={{ marginTop: 24, padding: "16px 18px", borderRadius: 12, background: C.greenSoft, border: `1px solid ${C.green}22` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 8 }}>DELIVERY TIPS</div>
              {presentation.tips.map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginBottom: 4 }}>✓ {t}</div>
              ))}
            </div>
          )}
        </div>

        <AgentChat presentation={pres} activeMoment={active} meta={meta} onUpdateMoment={updateMoment} />
      </div>
    </div>
  );
}

export default function Movements() {
  const [presentation, setPresentation] = useState(null);
  const [meta, setMeta] = useState(null);

  return (
    <div style={s.app}>
      <link href={FONT} rel="stylesheet" />
      {!presentation && <InputScreen onGenerate={(p, m) => { setPresentation(p); setMeta(m); }} />}
      {presentation && <Workspace presentation={presentation} meta={meta} onReset={() => { setPresentation(null); setMeta(null); }} />}
    </div>
  );
}
