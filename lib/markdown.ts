import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) {
    return ''
  }

  const file = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(markdown)
  return String(file)
}
