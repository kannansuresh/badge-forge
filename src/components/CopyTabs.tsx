import { useState, useCallback, useMemo } from 'react';
import { FileCode, Code2, Link, FileText, BookOpen } from 'lucide-react';
import { toMarkdown, toHtml, toRst, toAsciiDoc } from '../lib/storage';

type TabId = 'md' | 'rst' | 'adoc' | 'html' | 'url';

const TABS: { id: TabId; label: string; Icon: typeof FileCode }[] = [
  { id: 'md',   label: 'Markdown', Icon: FileCode },
  { id: 'rst',  label: 'RST',      Icon: FileText },
  { id: 'adoc', label: 'AsciiDoc', Icon: BookOpen },
  { id: 'html', label: 'HTML',     Icon: Code2 },
  { id: 'url',  label: 'URL',      Icon: Link },
];

export default function CopyTabs({ shieldsUrl }: { shieldsUrl: string }) {
  const [tab, setTab] = useState<TabId>('md');
  const [copied, setCopied] = useState(false);

  const snippets = useMemo(() => ({
    md:   toMarkdown(shieldsUrl),
    rst:  toRst(shieldsUrl),
    adoc: toAsciiDoc(shieldsUrl),
    html: toHtml(shieldsUrl),
    url:  shieldsUrl,
  }), [shieldsUrl]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippets[tab]);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = snippets[tab];
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippets, tab]);

  return (
    <div className="card bg-base-200 border border-base-300 max-w-full overflow-hidden">
      <div className="card-body p-3 sm:p-4 gap-0">
        <div className="flex items-start justify-between">
          <div role="tablist" className="tabs tabs-lift">
            {TABS.map(({ id, label, Icon }) => (
              <label key={id} className={`tab gap-1 ${tab === id ? 'tab-active' : ''}`}>
                <input
                  type="radio"
                  name="copy_tabs"
                  className="tab hidden"
                  checked={tab === id}
                  onChange={() => setTab(id)}
                />
                <Icon className="w-3 h-3" />
                <span className="text-[11px]">{label}</span>
              </label>
            ))}
          </div>
          <button
            className={`btn btn-xs shrink-0 mt-1 ${copied ? 'btn-success' : 'btn-outline'}`}
            onClick={copy}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <div className="bg-neutral text-neutral-content rounded-box p-3 text-xs font-mono max-w-full overflow-hidden -mt-px">
          <code className="break-all whitespace-pre-wrap">{snippets[tab]}</code>
        </div>
      </div>
    </div>
  );
}
