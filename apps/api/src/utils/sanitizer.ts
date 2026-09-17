// @ts-nocheck
/**
 * Content Sanitizer & Text Extractor for Tiptap JSON and HTML payloads
 */

export function sanitizePlainText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractPlainTextFromTiptapJson(doc: any): string {
  if (!doc) return '';
  if (typeof doc === 'string') return sanitizePlainText(doc);

  let text = '';

  function traverse(node: any) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      text += node.text + ' ';
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(doc);
  return text.replace(/\s+/g, ' ').trim();
}

export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Reject executable or unsafe protocols
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return null;
  }

  // Allow https, http, mailto
  if (/^(https?:\/\/|mailto:)/i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }

  return null;
}

export function sanitizeTiptapJsonNode(node: any): any {
  if (!node || typeof node !== 'object') return node;

  // Clone object
  const cleanNode = { ...node };

  // Sanitize links if mark is link
  if (Array.isArray(cleanNode.marks)) {
    cleanNode.marks = cleanNode.marks.map((mark: any) => {
      if (mark.type === 'link' && mark.attrs?.href) {
        const safeHref = sanitizeUrl(mark.attrs.href);
        return {
          ...mark,
          attrs: {
            ...mark.attrs,
            href: safeHref || '#',
          },
        };
      }
      return mark;
    });
  }

  // Sanitize image src if node is image
  if (cleanNode.type === 'image' && cleanNode.attrs?.src) {
    const safeSrc = sanitizeUrl(cleanNode.attrs.src);
    cleanNode.attrs = {
      ...cleanNode.attrs,
      src: safeSrc || '',
    };
  }

  // Recursively sanitize content children
  if (Array.isArray(cleanNode.content)) {
    cleanNode.content = cleanNode.content.map(sanitizeTiptapJsonNode);
  }

  return cleanNode;
}

export function calculateReadingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 200; // standard reading speed
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
