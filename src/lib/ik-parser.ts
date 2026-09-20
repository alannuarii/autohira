export interface ParsedIkDocument {
  title: string;
  docNumber: string;
  unit: string;
  supervisor: string;
  apdList: string[];
  steps: string[];
  stats: {
    e1: number;
    e2: number;
    e3: number;
    total: number;
  };
}

export function parseIkMarkdown(content: string): ParsedIkDocument {
  // 1. Ekstrak Judul IK
  let title = "Pemeliharaan Rutin P5 Mesin Cummins KTA50-G8";
  const titleMatch = content.match(/#+\s*\*\*([^*]+)\*\*/i) || content.match(/PEMELIHARAAN\s+[^\n]+/i);
  if (titleMatch) {
    const candidate = titleMatch[1]?.trim() || titleMatch[0]?.trim();
    if (candidate.toUpperCase().includes("PEMELIHARAAN")) {
      title = candidate;
    } else {
      const pMatch = content.match(/\*\*PEMELIHARAAN[^*]+\*\*/i);
      if (pMatch) {
        title = pMatch[0].replace(/\*/g, "").trim();
      }
    }
  }

  // 2. Ekstrak Nomor Dokumen
  let docNumber = "";
  const docMatch = content.match(/IKMH-[0-9A-Za-z.\-]+/i);
  if (docMatch) {
    docNumber = docMatch[0].trim();
  }

  // 3. Ekstrak Unit & Supervisor
  let unit = "UP Minahasa / ULPLTD Tahuna";
  const unitMatch = content.match(/ULPLTD\s+[A-Za-z0-9]+/i);
  if (unitMatch) {
    unit = `UP Minahasa / ${unitMatch[0].trim()}`;
  }

  let supervisor = "Team Leader Pemeliharaan";
  if (content.includes("Alan Nuari")) {
    supervisor = "Alan Nuari - Team Leader Pemeliharaan";
  }

  // 4. Ekstrak Daftar APD & Tools (Poin B.2) untuk dasar Kolom 13 ECM
  const apdList: string[] = [];
  const apdSectionMatch = content.match(/###\s*\*\*B\.2\.[\s\S]*?(?=###\s*\*\*B\.3\.|\n-\s*\*\*C)/i);
  if (apdSectionMatch) {
    const apdText = apdSectionMatch[0];
    const apdRegex = /\|\s*\d+\s*\|\s*([A-Za-z0-9\s,-]+)\s*\|/g;
    let match;
    while ((match = apdRegex.exec(apdText)) !== null) {
      const item = match[1].trim();
      if (item && !item.toLowerCase().includes("tools")) {
        apdList.push(item);
      }
    }
  }

  // 5. EKSTRAKSI OTOMATIS POIN E (Detail Aktivitas)
  // Potong hanya area Poin E (antara "E. Detail Aktivitas" hingga "F. Instruksi Kerja" / Akhir file)
  let sectionEText = "";
  const sectionEMatch = content.match(/-\s*\*\*E\.\s*Detail Aktivitas[\s\S]*?(?=###\s*\*\*F\.|$)/i);
  if (sectionEMatch) {
    sectionEText = sectionEMatch[0];
  } else {
    // Fallback jika header sedikit berbeda
    const fallbackMatch = content.match(/E\.\s*Detail Aktivitas[\s\S]*/i);
    sectionEText = fallbackMatch ? fallbackMatch[0] : content;
  }

  // Ekstrak butir E.1.x, E.2.x, dan E.3.x menggunakan non-greedy regex lookahead
  const stepRegex = /(E\.[123]\.\d+\.[\s\S]*?)(?=(?:E\.[123]\.\d+\.|$))/g;
  const steps: string[] = [];
  let e1 = 0;
  let e2 = 0;
  let e3 = 0;

  let match: RegExpExecArray | null;
  while ((match = stepRegex.exec(sectionEText)) !== null) {
    const rawMatch = match[1];
    if (rawMatch.startsWith("E.1")) e1++;
    else if (rawMatch.startsWith("E.2")) e2++;
    else if (rawMatch.startsWith("E.3")) e3++;

    // Hapus prefix E.X.X. agar murni langsung nama aktivitas
    const cleanedStep = rawMatch
      .replace(/[-*#|]+/g, " ")
      .replace(/E\.[123]\s+(?:Pelaksanaan|Persiapan|Tindakan)[^.]*/gi, " ")
      .replace(/PT\s+PLN\s+NUSANTARA\s+POWER[\s\S]*?Halaman\s+\d+\s+dari\s+\d+/gi, " ")
      .replace(/^E\.[123]\.\d+\.?\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanedStep.length > 3) {
      steps.push(cleanedStep);
    }
  }

  return {
    title,
    docNumber,
    unit,
    supervisor,
    apdList: apdList.length > 0 ? apdList : ["Sarung tangan", "Safety helmet", "Safety shoes", "Ear plug"],
    steps,
    stats: { e1, e2, e3, total: steps.length },
  };
}

export function getStepStats(stepsOrDoc: string[] | ParsedIkDocument) {
  if (stepsOrDoc && typeof stepsOrDoc === "object" && "stats" in stepsOrDoc) {
    return stepsOrDoc.stats;
  }
  if (Array.isArray(stepsOrDoc)) {
    const e1 = stepsOrDoc.filter(s => s.startsWith("E.1")).length;
    const e2 = stepsOrDoc.filter(s => s.startsWith("E.2")).length;
    const e3 = stepsOrDoc.filter(s => s.startsWith("E.3")).length;
    return { e1, e2, e3, total: stepsOrDoc.length };
  }
  return { e1: 0, e2: 0, e3: 0, total: 0 };
}
