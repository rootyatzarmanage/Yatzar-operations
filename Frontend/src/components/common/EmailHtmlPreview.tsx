import DOMPurify from "dompurify";

export default function EmailHtmlPreview({ content, height = "h-[720px]" }: { content: string; height?: string }) {
  const safeContent = DOMPurify.sanitize(content);
  const responsiveStyles = `<style>
    html,body{width:100%;min-width:600px;margin:0;padding:0;overflow-x:auto}
    body{box-sizing:border-box}
    img{max-width:100%;height:auto}
    table{max-width:none}
    td,th{overflow-wrap:anywhere}
  </style>`;
  const srcDoc = /<html[\s>]/i.test(safeContent)
    ? safeContent.replace(/<\/head\s*>/i, `${responsiveStyles}</head>`)
    : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${responsiveStyles}</head><body>${safeContent}</body></html>`;

  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
      <iframe
        title="Email preview"
        srcDoc={srcDoc}
        sandbox=""
        className={`block w-full min-w-[640px] border-0 bg-white ${height}`}
      />
    </div>
  );
}
