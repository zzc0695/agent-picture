"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PromptLibrarySheet({
  template,
  onInsert,
  onReplace,
}: {
  template: string;
  onInsert: (template: string) => void;
  onReplace: (template: string) => void;
}) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">提示词模板</h2>
      <p className="mt-2 text-sm text-neutral-600">{template}</p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onInsert(template)}
        >
          插入
        </Button>
        <Button
          type="button"
          onClick={() => onReplace(template)}
        >
          替换
        </Button>
      </div>
    </Card>
  );
}
