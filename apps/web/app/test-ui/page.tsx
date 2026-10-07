"use client";

import { useState } from "react";
import {
  Button,
  Badge,
  SegmentedControl,
  Progress,
  Dialog,
  DialogActions,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";

export default function TestUiPage() {
  const [activeTab, setActiveTab] = useState("tab-1");
  const [progressValue, setProgressValue] = useState(25);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas p-8 text-zinc-100 space-y-12">
      <h1 className="text-3xl font-bold tracking-tight">Core UI Components Test Suite</h1>

      {/* 1. BUTTONS */}
      <section id="section-buttons" className="space-y-4">
        <h2 className="text-xl font-semibold">1. Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="gradient" data-testid="btn-gradient">
            Gradient CTA
          </Button>
          <Button variant="primary" data-testid="btn-primary">
            Primary Violet
          </Button>
          <Button variant="secondary" data-testid="btn-secondary">
            Secondary Dark
          </Button>
          <Button variant="outline" data-testid="btn-outline">
            Outline Subtle
          </Button>
          <Button variant="ghost" data-testid="btn-ghost">
            Ghost Minimal
          </Button>
          <Button variant="danger" data-testid="btn-danger">
            Danger Destructive
          </Button>
          <Button isLoading data-testid="btn-loading">
            Loading Button
          </Button>
          <Button disabled data-testid="btn-disabled">
            Disabled Button
          </Button>
          <Button size="sm" data-testid="btn-sm">
            Small
          </Button>
          <Button size="lg" data-testid="btn-lg">
            Large
          </Button>
        </div>
      </section>

      {/* 2. BADGES */}
      <section id="section-badges" className="space-y-4">
        <h2 className="text-xl font-semibold">2. Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default" data-testid="badge-default">
            Default Badge
          </Badge>
          <Badge variant="success" data-testid="badge-success">
            Success Badge
          </Badge>
          <Badge variant="warning" data-testid="badge-warning">
            Warning Badge
          </Badge>
          <Badge variant="danger" data-testid="badge-danger">
            Danger Badge
          </Badge>
          <Badge variant="hand-rh" data-testid="badge-hand-rh">
            Right Hand
          </Badge>
          <Badge variant="hand-lh" data-testid="badge-hand-lh">
            Left Hand
          </Badge>
          <Badge variant="accent" data-testid="badge-accent">
            Accent Pill
          </Badge>
          <Badge variant="streak" data-testid="badge-streak">
            Streak Badge
          </Badge>
          <Badge variant="success" dot data-testid="badge-with-dot">
            Active Dot
          </Badge>
        </div>
      </section>

      {/* 3. SEGMENTED CONTROL */}
      <section id="section-segmented" className="space-y-4">
        <h2 className="text-xl font-semibold">3. Segmented Control</h2>
        <div>
          <SegmentedControl
            ariaLabel="Test Mode Switcher"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: "tab-1", label: "Mode Alpha" },
              { id: "tab-2", label: "Mode Beta", badge: <Badge size="sm">Pro</Badge> },
              { id: "tab-3", label: "Mode Gamma" },
              { id: "tab-disabled", label: "Disabled Mode", disabled: true },
            ]}
          />
          <div data-testid="segmented-current-value" className="mt-2 text-sm text-zinc-400">
            Selected: {activeTab}
          </div>
        </div>
      </section>

      {/* 4. PROGRESS */}
      <section id="section-progress" className="space-y-4">
        <h2 className="text-xl font-semibold">4. Progress Bars</h2>
        <div className="max-w-md space-y-4">
          <Progress
            value={progressValue}
            showLabel
            data-testid="progress-bar-determinate"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              data-testid="btn-update-progress"
              onClick={() => setProgressValue(75)}
            >
              Set to 75%
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgressValue(100)}
            >
              Set to 100%
            </Button>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Indeterminate with Shimmer:</div>
            <Progress indeterminate data-testid="progress-bar-indeterminate" />
          </div>
        </div>
      </section>

      {/* 5. CARDS */}
      <section id="section-cards" className="space-y-4">
        <h2 className="text-xl font-semibold">5. Obsidian Card</h2>
        <Card data-testid="obsidian-card" className="max-w-md">
          <CardHeader>
            <CardTitle>Grand Staff Preview</CardTitle>
            <CardDescription>Real-time vector engraved score rendering.</CardDescription>
          </CardHeader>
          <CardContent>
            High contrast dark-stage concert elegance.
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="gradient">
              Explore
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* 6. DIALOG */}
      <section id="section-dialog" className="space-y-4">
        <h2 className="text-xl font-semibold">6. Obsidian Dialog</h2>
        <Button
          variant="primary"
          data-testid="btn-open-dialog"
          onClick={() => setIsDialogOpen(true)}
        >
          Open Modal Dialog
        </Button>

        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Modal Test Dialog"
          data-testid="test-dialog"
        >
          <div className="space-y-4">
            <p>Focus is trapped inside this modal dialog.</p>
            <input
              type="text"
              data-testid="dialog-first-input"
              placeholder="First focusable input"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              type="text"
              data-testid="dialog-second-input"
              placeholder="Second focusable input"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <DialogActions>
            <Button
              variant="ghost"
              data-testid="btn-dialog-cancel"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              data-testid="btn-dialog-confirm"
              onClick={() => setIsDialogOpen(false)}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </section>
    </div>
  );
}
