import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import {
  Bold, Italic, Underline as UnderlineIcon, Eraser, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon,
  Image as ImageIcon, Video, Minus, Maximize2, Code2, HelpCircle, Highlighter,
} from "lucide-react";
import Swal from "sweetalert2";

const MAX_IMAGE_MB = 2;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Unable to read the file."));
    reader.readAsDataURL(file);
  });

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

type UploadImage = (file: File) => Promise<string>;

async function askImage(onUploadImage?: UploadImage) {
  const result = await Swal.fire({
    title: "Insert image",
    html: `
      <div style="text-align:left;font-size:14px">
        <label>Upload from device</label>
        <input id="swal-img-file" type="file" accept="image/*" class="swal2-file" style="width:100%;margin:6px 0 4px" />
        <div style="text-align:center;margin:10px 0;color:#98a2b3">— or —</div>
        <label>Image URL</label>
        <input id="swal-img-url" class="swal2-input" placeholder="https://example.com/image.jpg" style="width:100%;margin:6px 0 12px" />
        <label>Alt text (optional)</label>
        <input id="swal-img-alt" class="swal2-input" placeholder="Describe the image" style="width:100%;margin:6px 0 0" />
      </div>`,
    showCancelButton: true,
    confirmButtonText: "Insert",
    focusConfirm: false,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const popup = Swal.getPopup()!;
      const file = (popup.querySelector("#swal-img-file") as HTMLInputElement).files?.[0];
      const url = (popup.querySelector("#swal-img-url") as HTMLInputElement).value.trim();
      const alt = (popup.querySelector("#swal-img-alt") as HTMLInputElement).value.trim();

      if (file) {
        if (!file.type.startsWith("image/")) {
          Swal.showValidationMessage("Please choose an image file.");
          return false;
        }
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
          Swal.showValidationMessage(`Image must be under ${MAX_IMAGE_MB} MB.`);
          return false;
        }
        try {
          const src = onUploadImage ? await onUploadImage(file) : await readAsDataUrl(file);
          return { src, alt };
        } catch (error) {
          Swal.showValidationMessage(error instanceof Error ? error.message : "Upload failed.");
          return false;
        }
      }

      if (url) {
        if (!isHttpUrl(url)) {
          Swal.showValidationMessage("Enter a valid URL starting with http:// or https://");
          return false;
        }
        return { src: url, alt };
      }

      Swal.showValidationMessage("Choose a file or enter an image URL.");
      return false;
    },
  });
  return result.isConfirmed ? (result.value as { src: string; alt: string }) : null;
}

async function askVideo() {
  const result = await Swal.fire({
    title: "Insert video link",
    html: `
      <div style="text-align:left;font-size:14px">
        <label>Video URL (YouTube, Vimeo, etc.)</label>
        <input id="swal-vid-url" class="swal2-input" placeholder="https://youtube.com/watch?v=..." style="width:100%;margin:6px 0 12px" />
        <label>Link text</label>
        <input id="swal-vid-text" class="swal2-input" value="Watch the video" style="width:100%;margin:6px 0 0" />
      </div>`,
    showCancelButton: true,
    confirmButtonText: "Insert",
    focusConfirm: false,
    preConfirm: () => {
      const popup = Swal.getPopup()!;
      const url = (popup.querySelector("#swal-vid-url") as HTMLInputElement).value.trim();
      const text = (popup.querySelector("#swal-vid-text") as HTMLInputElement).value.trim() || "Watch the video";
      if (!isHttpUrl(url)) {
        Swal.showValidationMessage("Enter a valid video URL.");
        return false;
      }
      return { url, text };
    },
  });
  return result.isConfirmed ? (result.value as { url: string; text: string }) : null;
}

async function askLink(previous?: string) {
  const result = await Swal.fire({
    title: "Insert link",
    input: "url",
    inputValue: previous ?? "",
    inputPlaceholder: "https://example.com",
    showCancelButton: true,
    showDenyButton: Boolean(previous),
    denyButtonText: "Remove link",
    confirmButtonText: "Apply",
    inputValidator: (value) => (!value ? "Enter a URL." : undefined),
  });
  if (result.isDenied) return "";
  return result.isConfirmed ? (result.value as string) : null;
}

const FONTS = ["sans-serif", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];
const SIZES = ["12", "14", "15", "16", "18", "20", "24", "32"];
const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"];

const btn = (active = false) =>
  `flex h-9 w-9 items-center justify-center rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 ${
    active ? "bg-gray-200 dark:bg-white/15" : ""
  }`;
const sel =
  "h-9 rounded border border-gray-200 bg-white px-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

function Toolbar({
  editor, onToggleCode, onToggleFullscreen, onUploadImage,
}: {
  editor: Editor;
  onToggleCode: () => void;
  onToggleFullscreen: () => void;
  onUploadImage?: UploadImage;
}) {
  const setLink = async () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = await askLink(previous);
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = async () => {
    const image = await askImage(onUploadImage);
    if (image) editor.chain().focus().setImage({ src: image.src, alt: image.alt }).run();
  };

  const addVideoLink = async () => {
    const video = await askVideo();
    if (!video) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: video.text,
        marks: [{ type: "link", attrs: { href: video.url, target: "_blank" } }],
      })
      .run();
  };

  const onStyleChange = (value: string) => {
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else if (value === "quote") chain.toggleBlockquote().run();
    else if (value === "code") chain.toggleCodeBlock().run();
    else chain.setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  };

  const onTableAction = (action: string) => {
    const c = editor.chain().focus();
    switch (action) {
      case "insert": c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case "addRow": c.addRowAfter().run(); break;
      case "addCol": c.addColumnAfter().run(); break;
      case "delRow": c.deleteRow().run(); break;
      case "delCol": c.deleteColumn().run(); break;
      case "delTable": c.deleteTable().run(); break;
    }
  };

  const attrs = editor.getAttributes("textStyle");

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-white/[0.03]">
      {/* Style (magic wand dropdown) */}
      <select className={sel} defaultValue="p" onChange={(e) => onStyleChange(e.target.value)} title="Style">
        <option value="p">Normal</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="quote">Quote</option>
        <option value="code">Code block</option>
      </select>

      <button type="button" title="Bold" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
      <button type="button" title="Italic" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
      <button type="button" title="Underline" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
      <button type="button" title="Clear formatting" className={btn()} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></button>

      <select className={sel} title="Font" value={attrs.fontFamily ?? "sans-serif"} onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}>
        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      <select className={sel} title="Font size" value={(attrs.fontSize ?? "15px").replace("px", "")} onChange={(e) => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}>
        {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Text color + highlight */}
      <label title="Text color" className={`${btn()} cursor-pointer font-bold`} style={{ color: attrs.color ?? undefined }}>
        A
        <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
      </label>
      <label title="Highlight" className={`${btn(editor.isActive("highlight"))} cursor-pointer`}>
        <Highlighter size={16} />
        <input type="color" defaultValue="#ffff00" className="sr-only" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
      </label>

      <button type="button" title="Bullet list" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
      <button type="button" title="Numbered list" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>

      <button type="button" title="Align left" className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></button>
      <button type="button" title="Align center" className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></button>
      <button type="button" title="Align right" className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></button>
      <button type="button" title="Justify" className={btn(editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={16} /></button>

      <select className={sel} title="Line height" defaultValue="" onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}>
        <option value="" disabled>Line height</option>
        {LINE_HEIGHTS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <select className={sel} title="Table" value="" onChange={(e) => onTableAction(e.target.value)}>
        <option value="" disabled>Table</option>
        <option value="insert">Insert 3×3 table</option>
        <option value="addRow">Add row</option>
        <option value="addCol">Add column</option>
        <option value="delRow">Delete row</option>
        <option value="delCol">Delete column</option>
        <option value="delTable">Delete table</option>
      </select>

      <button type="button" title="Link" className={btn(editor.isActive("link"))} onClick={setLink}><LinkIcon size={16} /></button>
      <button type="button" title="Image" className={btn()} onClick={addImage}><ImageIcon size={16} /></button>
      <button type="button" title="Video link" className={btn()} onClick={addVideoLink}><Video size={16} /></button>
      <button type="button" title="Horizontal line" className={btn()} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></button>
      <button type="button" title="Fullscreen" className={btn()} onClick={onToggleFullscreen}><Maximize2 size={16} /></button>
      <button type="button" title="HTML code view" className={btn()} onClick={onToggleCode}><Code2 size={16} /></button>
      <button
        type="button"
        title="Help"
        className={btn()}
        onClick={() => window.alert("Shortcuts:\nCtrl+B Bold\nCtrl+I Italic\nCtrl+U Underline\nCtrl+Z Undo\nCtrl+Shift+Z Redo")}
      >
        <HelpCircle size={16} />
      </button>
    </div>
  );
}

export default function RichTextEditor({
  value, onChange, placeholder = "Write your email content...", onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const [codeView, setCodeView] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "email-editor min-h-48 p-4 outline-none text-sm text-gray-800 dark:text-white/90" },
    },
  });

  // keep the editor in sync when the parent changes value (Clear button, edit/replicate)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${
        fullscreen ? "fixed inset-4 z-99999 flex flex-col shadow-2xl" : ""
      }`}
    >
      <Toolbar
        editor={editor}
        onToggleCode={() => setCodeView((v) => !v)}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
        onUploadImage={onUploadImage}
        />
      {codeView ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-48 w-full flex-1 bg-gray-900 p-4 font-mono text-xs text-green-300 outline-none"
          spellCheck={false}
        />
      ) : (
        <div className={fullscreen ? "flex-1 overflow-y-auto" : "max-h-[500px] overflow-y-auto"}>
          <EditorContent editor={editor} placeholder={placeholder} />
        </div>
      )}
    </div>
  );
}