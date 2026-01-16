/**
 * PLATFORM DOCUMENTATION SOURCE
 * 
 * Extracts and ingests platform documentation from the codebase.
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { createDocument } from '../knowledge-base';
import type { CreateDocumentInput } from '../knowledge-base';

export interface PlatformDocsConfig {
  tenantId: string;
  knowledgeBaseId: string;
  docsPath?: string;
  corePath?: string;
}

/**
 * Extract documentation from platform README files
 */
export async function extractPlatformDocs(
  config: PlatformDocsConfig
): Promise<void> {
  const {
    tenantId,
    knowledgeBaseId,
    docsPath = join(process.cwd(), 'docs'),
    corePath = join(process.cwd(), 'packages/@tinadmin/core/src'),
  } = config;

  // Extract from docs directory
  await extractDocsFromDirectory(docsPath, {
    tenantId,
    knowledgeBaseId,
    sourcePrefix: 'docs/',
  });

  // Extract from core domain READMEs
  await extractCoreDomainDocs(corePath, {
    tenantId,
    knowledgeBaseId,
  });
}

/**
 * Extract documentation from a directory
 */
async function extractDocsFromDirectory(
  dirPath: string,
  options: {
    tenantId: string;
    knowledgeBaseId: string;
    sourcePrefix: string;
  }
): Promise<void> {
  try {
    const files = await readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = join(dirPath, file.name);

      if (file.isDirectory()) {
        await extractDocsFromDirectory(fullPath, {
          ...options,
          sourcePrefix: `${options.sourcePrefix}${file.name}/`,
        });
      } else if (file.name.endsWith('.md')) {
        await extractMarkdownFile(fullPath, {
          tenantId: options.tenantId,
          knowledgeBaseId: options.knowledgeBaseId,
          source: `${options.sourcePrefix}${file.name}`,
        });
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error);
  }
}

/**
 * Extract documentation from core domain directories
 */
async function extractCoreDomainDocs(
  corePath: string,
  options: {
    tenantId: string;
    knowledgeBaseId: string;
  }
): Promise<void> {
  try {
    const domains = await readdir(corePath, { withFileTypes: true });

    for (const domain of domains) {
      if (!domain.isDirectory()) continue;

      const readmePath = join(corePath, domain.name, 'README.md');
      try {
        await extractMarkdownFile(readmePath, {
          tenantId: options.tenantId,
          knowledgeBaseId: options.knowledgeBaseId,
          source: `packages/@tinadmin/core/src/${domain.name}/README.md`,
          domain: domain.name as any,
        });
      } catch (error) {
        // README might not exist, skip
      }
    }
  } catch (error) {
    console.warn(`Could not read core directory ${corePath}:`, error);
  }
}

/**
 * Extract content from a markdown file
 */
async function extractMarkdownFile(
  filePath: string,
  options: {
    tenantId: string;
    knowledgeBaseId: string;
    source: string;
    domain?: string;
  }
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const title = extractTitle(content) || options.source.split('/').pop() || 'Untitled';

    const docInput: CreateDocumentInput = {
      knowledgeBaseId: options.knowledgeBaseId,
      tenantId: options.tenantId,
      title,
      content,
      source: options.source,
      sourceType: 'file',
      metadata: {
        domain: options.domain,
        filePath: options.source,
      },
    };

    await createDocument(docInput);
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, error);
  }
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string | null {
  // Try to find H1 header
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try to find title in frontmatter
  const frontmatterMatch = content.match(/^---\n.*title:\s*(.+)\n.*---/s);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  return null;
}

