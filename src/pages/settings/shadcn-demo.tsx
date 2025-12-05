import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const ShadcnDemo = () => {
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Shadcn 组件演示</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">名称</Label>
          <Input id="name" placeholder="输入名称" />
        </div>

        <div className="space-y-2">
          <Label>选择</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">选项 A</SelectItem>
              <SelectItem value="b">选项 B</SelectItem>
              <SelectItem value="c">选项 C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} />
          <span>复选框：{checked ? "已选" : "未选"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span>开关：{enabled ? "开启" : "关闭"}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button>默认按钮</Button>
        <Button variant="secondary">次级按钮</Button>
        <Button variant="outline">描边按钮</Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>示例对话框</DialogTitle>
              <DialogDescription>这是一个 Shadcn Dialog 示例。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary">取消</Button>
              <Button>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ShadcnDemo;

