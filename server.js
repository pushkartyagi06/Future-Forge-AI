// ============================================================
//  AI Future Predictor — Backend Server
//  Run:      node server.js
//  Requires: npm install express cors node-fetch@2
// ============================================================

const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// ── PASTE YOUR OPENROUTER API KEY HERE ──────────────────────
const OPENROUTER_API_KEY = "YOUR_OPENROUTER_API_KEY_HERE";
// ────────────────────────────────────────────────────────────

// ── Fallback roadmap when AI fails or returns bad JSON ───────
function fallbackRoadmap(u) {
  return {
    summary: `${u.goal} is a great career choice. With ${u.hours} hours of daily study and a ${u.timeline} timeline, you are on a solid path. Your strength in ${u.strength||"dedication"} will be your biggest advantage.`,
    phases: [
      { title: "Phase 1: Foundation (Month 1-2)", tasks: ["Learn core concepts of " + u.goal, "Study " + (u.hours||"2") + " hours daily using structured courses", "Complete beginner tutorials and exercises", "Set up your development environment"] },
      { title: "Phase 2: Building Skills (Month 3-4)", tasks: ["Start small hands-on projects", "Practice daily coding challenges", "Join online communities (Reddit, Discord)", "Document your learning in a journal"] },
      { title: "Phase 3: Real Projects (Month 5-6)", tasks: ["Build 2-3 portfolio projects", "Contribute to open source if possible", "Get feedback from peers or mentors", "Fix " + (u.weakness||"weak areas") + " through targeted practice"] },
      { title: "Phase 4: Job Ready (" + (u.timeline||"Final Phase") + ")", tasks: ["Polish your portfolio and resume", "Apply for internships or junior roles", "Practice mock interviews", "Network on LinkedIn"] }
    ],
    skills: ["Core technical skills for " + u.goal, "Problem solving & logical thinking", "Git & version control", "Communication & teamwork", "Self-learning & consistency", "Project management basics"],
    resources: ["YouTube: freeCodeCamp, Traversy Media", "Udemy / Coursera (free audits available)", "Official documentation of your tools", "GitHub — study open source projects", "Stack Overflow — for debugging help", "LeetCode / HackerRank — for practice"],
    challenges: [
      (u.challenge||"Lack of focus") + " — break study sessions into 25-min Pomodoro blocks",
      (u.weakness||"Procrastination") + " — set a fixed study time daily and stick to it",
      "Feeling overwhelmed — focus on one topic at a time, not everything at once",
      "No mentor — use online communities and forums for guidance"
    ],
    dailyPlan: [
      "Morning (15 min): Review yesterday's notes",
      "Study block 1: " + Math.ceil((u.hours||2)/2) + " hour(s) of new learning",
      "Study block 2: " + Math.floor((u.hours||2)/2) + " hour(s) of practice/projects",
      "Evening (15 min): Write down what you learned today",
      "Weekly: Review progress and adjust goals"
    ],
    milestones: [
      "Month 1: Complete a beginner course on " + u.goal,
      u.shortGoal ? "Short-term: " + u.shortGoal : "Month 2: Build your first mini project",
      "Month 3: Finish 1 full project end-to-end",
      "Month 4: Share work on GitHub with a portfolio page",
      (u.timeline||"Final goal") + ": Land first job or internship in " + u.goal
    ]
  };
}

// ── Ask AI for structured JSON ───────────────────────────────
async function askAI(u) {
  const prompt = `You are a career coach. Return ONLY a valid JSON object, no markdown, no explanation, no code fences.

The JSON must have exactly these keys:
{
  "summary": "2-3 sentences about this student",
  "phases": [{ "title": "Phase name", "tasks": ["task1","task2","task3"] }],
  "skills": ["skill1","skill2","skill3","skill4","skill5"],
  "resources": ["resource1","resource2","resource3","resource4"],
  "challenges": ["challenge1 and solution","challenge2 and solution"],
  "dailyPlan": ["step1","step2","step3","step4"],
  "milestones": ["milestone1","milestone2","milestone3","milestone4"]
}

Student: Goal=${u.goal}, Hours=${u.hours}/day, Timeline=${u.timeline}, Short-term=${u.shortGoal}, Level=${u.level}, Strengths=${u.strength}, Weaknesses=${u.weakness}, Habits=${u.habit}, Challenges=${u.challenge}

Return ONLY the JSON. Start your response with { and end with }.`;

  console.log("Calling OpenRouter...");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Future Predictor"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.log("API error:", err);
    return null; // Will use fallback
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log("Response length:", content.length);

  if (!content || content.length < 10) return null;

  // Extract JSON — find first { and last }
  const start = content.indexOf("{");
  const end   = content.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch (e) {
    console.log("JSON parse failed:", e.message);
    return null;
  }
}

// ── Build HTML from data ──────────────────────────────────────
function buildHTML(d, u) {
  const li  = arr => arr.map(i => `<li>${i}</li>`).join("");
  const tag = (color, text) => `<span style="color:${color};font-weight:600">${text}</span>`;

  const phases = d.phases.map(p => `
    <div class="phase-block">
      <div class="phase-title">${p.title}</div>
      <ul>${li(p.tasks)}</ul>
    </div>`).join("");

  return `
    <div class="section">
      <h3>📌 Profile Summary</h3>
      <p>${d.summary}</p>
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Goal</span><span class="meta-val">${u.goal}</span></div>
        <div class="meta-item"><span class="meta-label">Level</span><span class="meta-val">${u.level||"N/A"}</span></div>
        <div class="meta-item"><span class="meta-label">Daily Hours</span><span class="meta-val">${u.hours||"N/A"} hrs</span></div>
        <div class="meta-item"><span class="meta-label">Timeline</span><span class="meta-val">${u.timeline||"N/A"}</span></div>
      </div>
    </div>
    <div class="section">
      <h3>🗺️ Phase-wise Roadmap</h3>
      ${phases}
    </div>
    <div class="section">
      <h3>📚 Key Skills to Learn</h3>
      <ul>${li(d.skills)}</ul>
    </div>
    <div class="section">
      <h3>🛠️ Recommended Tools &amp; Resources</h3>
      <ul>${li(d.resources)}</ul>
    </div>
    <div class="section">
      <h3>⚠️ Challenges &amp; Solutions</h3>
      <ul>${d.challenges.map(c => `<li>${tag("#f87171","⚠")} ${c}</li>`).join("")}</ul>
    </div>
    <div class="section">
      <h3>💡 Daily Action Plan</h3>
      <ul>${d.dailyPlan.map((a,i) => `<li>${tag("#22c55e","Step "+(i+1)+":")} ${a}</li>`).join("")}</ul>
    </div>
    <div class="section">
      <h3>🏆 Success Milestones</h3>
      <ul>${d.milestones.map(m => `<li>${tag("#facc15","★")} ${m}</li>`).join("")}</ul>
    </div>`;
}

// ── Route ─────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const u = {
    goal:      req.body.goal      || "",
    hours:     req.body.hours     || "",
    timeline:  req.body.timeline  || "",
    shortGoal: req.body.shortGoal || "",
    level:     req.body.level     || "",
    strength:  req.body.strength  || "",
    weakness:  req.body.weakness  || "",
    habit:     req.body.habit     || "",
    challenge: req.body.challenge || ""
  };

  try {
    // Try AI first, fall back to smart local roadmap if AI fails
    const aiData = await askAI(u);
    const data   = aiData || fallbackRoadmap(u);

    if (!aiData) console.log("Using fallback roadmap (AI unavailable)");
    else         console.log("✓ Using AI-generated roadmap");

    res.json({ output: buildHTML(data, u) });

  } catch (err) {
    console.error("Unexpected error:", err.message);
    // Even if everything fails, still return a roadmap
    res.json({ output: buildHTML(fallbackRoadmap(u), u) });
  }
});

// ── Start ──────────────────────────────────────────────────────
// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});