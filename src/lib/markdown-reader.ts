/**
 * Markdown parser with frontmatter support.
 * Used by template and memory ingestion phases.
 */

import matter from 'gray-matter';

export interface MarkdownSection {
  level: number;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  content: string;
  sections: MarkdownSection[];
}

/**
 * Parse markdown content with frontmatter and section extraction.
 */
export function parseMarkdown(rawContent: string): ParsedMarkdown {
  // Parse frontmatter
  const { data: frontmatter, content } = matter(rawContent);

  // Extract sections by heading
  const sections: MarkdownSection[] = [];
  const lines = content.split('\n');

  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        currentSection.endLine = i;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
        startLine: i + 1, // 1-indexed
        endLine: i + 1,
      };
      contentBuffer = [];
    } else if (currentSection) {
      contentBuffer.push(line);
    }
  }

  // Save final section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    currentSection.endLine = lines.length;
    sections.push(currentSection);
  }

  return {
    frontmatter: frontmatter as Record<string, unknown>,
    content,
    sections,
  };
}
