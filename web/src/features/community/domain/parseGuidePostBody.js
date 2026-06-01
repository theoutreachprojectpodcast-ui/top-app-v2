/**
 * Parses moderator guide bodies with optional intro, "Step N — …" lines, and "Why this matters:".
 *
 * @param {string} body
 * @returns {{ intro: string, steps: { n: string, text: string }[], why: string }}
 */
export function parseGuidePostBody(body) {
  const lines = String(body || "").split(/\r?\n/);
  const introLines = [];
  const steps = [];
  const whyLines = [];
  let section = "intro";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const whyLead = trimmed.match(/^why this matters:\s*(.*)$/i);
    if (whyLead) {
      section = "why";
      if (whyLead[1]) whyLines.push(whyLead[1]);
      continue;
    }

    const stepMatch = trimmed.match(/^step\s+(\d+)\s*[-—–]\s*(.+)$/i);
    if (stepMatch) {
      section = "steps";
      steps.push({ n: stepMatch[1], text: stepMatch[2] });
      continue;
    }

    if (section === "why") whyLines.push(trimmed);
    else if (section === "steps" && steps.length) {
      steps[steps.length - 1].text += ` ${trimmed}`;
    } else introLines.push(trimmed);
  }

  return {
    intro: introLines.join("\n"),
    steps,
    why: whyLines.join(" "),
  };
}
