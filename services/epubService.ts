import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { Book, ChapterRef } from '../types';

// Helper to resolve relative paths in EPUB structure
const resolvePath = (base: string, relative: string) => {
  const stack = base.split('/');
  stack.pop(); // Remove current file
  const parts = relative.split('/');
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
};

export const epubService = {
  async parse(file: File): Promise<Book> {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Locate .opf file via META-INF/container.xml
    const container = await zip.file('META-INF/container.xml')?.async('text');
    if (!container) throw new Error('Invalid EPUB: Missing container.xml');
    
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(container, 'application/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    const opfPath = rootfile?.getAttribute('full-path');
    
    if (!opfPath) throw new Error('Invalid EPUB: Missing rootfile path');
    
    // 2. Parse .opf
    const opfContent = await zip.file(opfPath)?.async('text');
    if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file');
    
    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    
    // Metadata
    const title = opfDoc.querySelector('metadata > title')?.textContent || 'Untitled';
    const author = opfDoc.querySelector('metadata > creator')?.textContent || 'Unknown';
    
    // Manifest (id -> href)
    const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));
    const manifest: Record<string, string> = {};
    manifestItems.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) manifest[id] = href;
    });

    // Spine (order of reading)
    const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'));
    const spineIds = spineItems.map(item => item.getAttribute('idref')).filter(Boolean) as string[];
    
    // TOC (ncx or nav) - Simplified: Using spine as TOC source for v1 correctness if NCX is complex
    // Real EPUB parsing usually requires parsing .ncx for hierarchical TOC. 
    // For this V1, we will flatten the spine into a linear chapter list for reliability.
    
    const toc: ChapterRef[] = spineIds.map((id, index) => ({
      id,
      label: `Chapter ${index + 1}`, // Fallback label
      href: resolvePath(opfPath, manifest[id]),
    }));

    // 3. Extract text content (Lazy load logic would be here, but we preload text for v1 responsiveness)
    // NOTE: In a production app with huge books, we would only unzip on demand.
    // For V1 "Bounded memory" requirement, we store strings.
    
    const contentMap: Record<string, string> = {};
    
    // Parallel extraction for speed
    await Promise.all(toc.map(async (chapter) => {
       const file = zip.file(chapter.href);
       if (file) {
         let rawHTML = await file.async('text');
         // Aggressive Sanitization
         const cleanHTML = DOMPurify.sanitize(rawHTML, {
           USE_PROFILES: { html: true },
           FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
           FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'style'],
         });
         contentMap[chapter.id] = cleanHTML;
       }
    }));

    return {
      id: crypto.randomUUID(),
      title,
      author,
      toc,
      contentMap
    };
  }
};
