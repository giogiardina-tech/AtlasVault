'use client';
import { Category, Template } from '@/lib/types';

interface Props {
  category: Category;
  templates: Template[];
  onSelect: (template: Template) => void;
  onBack: () => void;
}

export default function TemplateSelector({ category, templates, onSelect, onBack }: Props) {
  const filtered = templates.filter((t) => t.category === category);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">Choose a Game Format</h2>
      <p className="text-zinc-400 mb-8">
        <span className="text-white font-medium">{category}</span> — select a reusable format
      </p>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="group bg-tk-card border border-tk-border hover:border-white/20 rounded-xl p-5 text-left transition-all hover:bg-white/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-white font-semibold text-base">{template.name}</div>
                <div className="text-zinc-500 text-sm mt-1 leading-relaxed">{template.description}</div>
              </div>
              <div className="text-zinc-600 group-hover:text-white transition-colors mt-0.5 shrink-0">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
