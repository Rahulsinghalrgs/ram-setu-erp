type TextPdfOptions = {
  title: string;
  subtitle?: string;
  lines: string[];
};

function pdfText(value: string) {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line: string, maxLength = 92) {
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function paginate(lines: string[]) {
  const pages: string[][] = [];
  let page: string[] = [];

  for (const line of lines.flatMap((item) => wrapLine(item))) {
    if (page.length >= 42) {
      pages.push(page);
      page = [];
    }
    page.push(line);
  }

  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

export function createTextPdf({ title, subtitle, lines }: TextPdfOptions) {
  const pageLines = paginate(lines);
  const objects: string[] = [];

  function addObject(content: string) {
    objects.push(content);
    return objects.length;
  }

  const fontObject = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs: number[] = [];

  for (let index = 0; index < pageLines.length; index += 1) {
    const commands = [
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      `(${pdfText(title)}) Tj`,
      "/F1 10 Tf",
      "0 -18 Td",
      `(${pdfText(subtitle || `Generated from Ram Setu ERP on ${new Date().toLocaleString("en-IN")}`)}) Tj`,
      "/F1 10 Tf",
      "0 -16 Td",
      `(${pdfText(`Page ${index + 1} of ${pageLines.length}`)}) Tj`,
      "/F1 10 Tf",
      "0 -24 Td"
    ];

    for (const line of pageLines[index]) {
      commands.push(`(${pdfText(line)}) Tj`);
      commands.push("0 -15 Td");
    }

    commands.push("ET");
    const stream = commands.join("\n");
    const contentObject = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(
      `<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    pageRefs.push(pageObject);
  }

  const pagesObject = addObject(
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`
  );
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  for (const pageRef of pageRefs) {
    objects[pageRef - 1] = objects[pageRef - 1].replace("PAGES_REF", String(pagesObject));
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "binary");
}

