/** Match legacy main.js formatArticleContentHtml / formatCommentContentHtml. */

function escHtml(v: unknown): string {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escAttr(v: unknown): string {
  return escHtml(v).replace(/"/g, '&quot;')
}

/** Escape text; keep bare <img ...> tags; turn newlines into <br>. */
export function formatArticleContentHtml(rawContent: unknown): string {
  const raw = rawContent == null ? '' : String(rawContent)
  if (!raw.trim()) return '<p>暂无内容</p>'
  const parts = raw.split(/(<img\b[^>]*\/?>)/gi)
  return parts
    .map((part) => {
      if (/^<img\b/i.test(part)) return part
      return escHtml(part).replace(/\r\n|\r|\n/g, '<br>')
    })
    .join('')
}

/** Escape text; expand [[img:url]] to comment images; newlines to <br>. */
export function formatCommentContentHtml(rawContent: unknown): string {
  const imgRe = /\[\[img:([^\]]+)\]\]/g
  let contentHtml = ''
  let last = 0
  let m: RegExpExecArray | null
  const raw = rawContent == null ? '' : String(rawContent)
  while ((m = imgRe.exec(raw)) !== null) {
    const textPart = raw.slice(last, m.index)
    contentHtml += escHtml(textPart).replace(/\n/g, '<br>')
    const imgUrl = m[1]
    contentHtml +=
      '<img class="comment-image" src="' +
      escAttr(imgUrl) +
      '" alt="" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\'">'
    last = m.index + m[0].length
  }
  contentHtml += escHtml(raw.slice(last)).replace(/\n/g, '<br>')
  return contentHtml
}
