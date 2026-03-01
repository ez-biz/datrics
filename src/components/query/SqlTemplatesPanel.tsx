"use client";

import { useState } from "react";
import { FileCode, ChevronRight, Search, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SQL_TEMPLATES, TEMPLATE_CATEGORIES, SqlTemplate } from "@/lib/sql-templates";
import { cn } from "@/lib/utils";

interface SqlTemplatesPanelProps {
  onSelect: (sql: string) => void;
}

export function SqlTemplatesPanel({ onSelect }: SqlTemplatesPanelProps) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["basic"]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredTemplates = search
    ? SQL_TEMPLATES.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.sql.toLowerCase().includes(search.toLowerCase())
      )
    : SQL_TEMPLATES;

  const groupedTemplates = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    templates: filteredTemplates.filter((t) => t.category === cat.id),
  }));

  const handleCopy = async (template: SqlTemplate) => {
    await navigator.clipboard.writeText(template.sql);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCode className="h-4 w-4 text-primary" />
          SQL Templates
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {search ? (
            // Flat list when searching
            filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  onSelect={() => onSelect(template.sql)}
                  onCopy={() => handleCopy(template)}
                  isCopied={copiedId === template.id}
                />
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No templates matching &quot;{search}&quot;
              </div>
            )
          ) : (
            // Grouped by category
            groupedTemplates.map(
              (group) =>
                group.templates.length > 0 && (
                  <Collapsible
                    key={group.id}
                    open={openCategories.includes(group.id)}
                    onOpenChange={() => toggleCategory(group.id)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                      <span>{group.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="h-4 text-[10px] px-1">
                          {group.templates.length}
                        </Badge>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            openCategories.includes(group.id) && "rotate-90"
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {group.templates.map((template) => (
                        <TemplateItem
                          key={template.id}
                          template={template}
                          onSelect={() => onSelect(template.sql)}
                          onCopy={() => handleCopy(template)}
                          isCopied={copiedId === template.id}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TemplateItemProps {
  template: SqlTemplate;
  onSelect: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

function TemplateItem({ template, onSelect, onCopy, isCopied }: TemplateItemProps) {
  return (
    <div
      className="group p-2 rounded-md border bg-card hover:bg-accent hover:border-accent-foreground/20 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">{template.name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {template.description}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded p-1.5 overflow-hidden max-h-16">
        {template.sql.slice(0, 150)}
        {template.sql.length > 150 && "..."}
      </pre>
    </div>
  );
}
