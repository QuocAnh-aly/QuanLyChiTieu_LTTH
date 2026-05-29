import React from "react";

export function PageLayout({ title, subtitle, actions, children, className = "" }) {
  return (
    <div className={`p-8 min-h-full bg-slate-50 ${className}`}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
