import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ClassItem {
  ID: number;
  name?: string;
  level?: string;
  department?: string;
  number?: string;
}

interface ClassBadgesListProps {
  classes?: ClassItem[];
  maxVisible?: number;
  badgeClassName?: string;
  containerClassName?: string;
  emptyText?: string;
}

export const ClassBadgesList: React.FC<ClassBadgesListProps> = ({
  classes = [],
  maxVisible = 3,
  badgeClassName = "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80",
  containerClassName = "max-w-[220px]",
  emptyText = "Semua Kelas"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!classes || classes.length === 0) {
    return <span className="text-xs text-slate-400 italic">{emptyText}</span>;
  }

  const getClassName = (c: ClassItem) => {
    return c.name || `${c.level || ''} ${c.department || ''} ${c.number || ''}`.trim() || 'Kelas';
  };

  const total = classes.length;

  if (total <= maxVisible) {
    return (
      <div className={`flex flex-wrap gap-1 ${containerClassName}`}>
        {classes.map(c => (
          <span key={c.ID} className={badgeClassName}>
            {getClassName(c)}
          </span>
        ))}
      </div>
    );
  }

  const visibleClasses = isExpanded ? classes : classes.slice(0, maxVisible);
  const remainingCount = total - maxVisible;
  const remainingNames = classes.slice(maxVisible).map(getClassName).join(', ');

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <div
        className={`flex flex-wrap gap-1 transition-all duration-200 ${
          isExpanded ? 'max-h-44 overflow-y-auto pr-1 py-1 bg-slate-50/90 rounded-lg border border-slate-200/70 p-1.5' : ''
        }`}
      >
        {visibleClasses.map(c => (
          <span key={c.ID} className={badgeClassName}>
            {getClassName(c)}
          </span>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          title={isExpanded ? "Klik untuk meringkas" : `Kelas lainnya:\n${remainingNames}`}
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all shadow-2xs ${
            isExpanded
              ? 'bg-slate-200/90 text-slate-700 hover:bg-slate-300'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80'
          }`}
        >
          <span>{isExpanded ? 'Sembunyikan' : `+${remainingCount} Selengkapnya`}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
    </div>
  );
};

export default ClassBadgesList;
