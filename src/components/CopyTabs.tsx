import { useState, useCallback, useMemo } from 'react';
import { toMarkdown, toHtml } from '../lib/storage';

export default function CopyTabs({ shieldsUrl }: { shieldsUrl: string }) {
  const [tab, setTab] = useState<'md' | 'html' | 'url'>('md');
  const [copied, setCopied] = useState(false);

  const snippets = useMemo(() => ({
    md: toMarkdown(shieldsUrl),
    html: toHtml(shieldsUrl),
    url: shieldsUrl,
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
      <div className="card-body p-3 sm:p-4 gap-2">
        <div className="flex items-center justify-between">
          <div role="tablist" className="tabs tabs-box">
            <a role="tab" className={`tab text-xs ${tab === 'md' ? 'tab-active' : ''}`} onClick={() => setTab('md')}>Markdown</a>
            <a role="tab" className={`tab text-xs ${tab === 'html' ? 'tab-active' : ''}`} onClick={() => setTab('html')}>HTML</a>
            <a role="tab" className={`tab text-xs ${tab === 'url' ? 'tab-active' : ''}`} onClick={() => setTab('url')}>URL</a>
          </div>
          <button className={`btn btn-xs ${copied ? 'btn-success' : 'btn-outline'}`} onClick={copy}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <div className="bg-neutral text-neutral-content rounded-box p-3 text-xs font-mono max-w-full overflow-hidden">
          <code className="break-all whitespace-pre-wrap">{snippets[tab]}</code>
        </div>
      </div>
    </div>
  );
}
