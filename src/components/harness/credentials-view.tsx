"use client";

/**
 * CredentialsView — manages LLM provider credentials (CRUD, model discovery).
 *
 * Designed to feel like n8n's Credentials UI: a sidebar list on the left,
 * a detail panel on the right. "Add credential" opens a dialog where the
 * user picks a provider preset (Anthropic, Z.ai, DeepSeek, OpenRouter, ...),
 * enters the API key + base URL, and saves. After saving, a "Discover models"
 * button fetches the provider's /v1/models endpoint and caches them.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Credential, type ProviderModel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  KeyRound,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Cpu,
  ChevronRight,
  Loader2,
} from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai_compatible: "OpenAI-compatible",
};

export function CredentialsView() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: api.listCredentials,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCredential(id),
    onSuccess: () => {
      toast.success("Credential deleted");
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const selected = data?.credentials.find((c) => c.id === selectedId) || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-180px)]">
      {/* Sidebar list */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Credentials ({data?.credentials.length ?? 0})
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}
          {!isLoading && data?.credentials.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-lg">
              No credentials yet.
              <br />
              Click <span className="font-medium">New</span> to add your first provider.
            </div>
          )}
          {data?.credentials.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === c.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-sm truncate flex-1">{c.name}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {c.providerLabel || PROVIDER_LABELS[c.provider] || c.provider}
                </Badge>
                <span className="truncate">{c.apiKeyMasked}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail / empty state */}
      <div className="min-h-0 overflow-y-auto pr-1 custom-scrollbar">
        {selected ? (
          <CredentialDetail
            key={selected.id}
            credential={selected}
            onDelete={() => deleteMutation.mutate(selected.id)}
            isDeleting={deleteMutation.isPending}
          />
        ) : (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        )}
      </div>

      <CreateCredentialDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No credential selected</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Credentials store the API keys for each LLM provider you want to use (Anthropic,
          Z.ai, DeepSeek, OpenRouter, Ollama, etc.). Create one credential per provider —
          then reference it from a Model node inside any harness.
        </p>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4" /> Create your first credential
        </Button>
      </div>
    </div>
  );
}

function CredentialDetail({
  credential,
  onDelete,
  isDeleting,
}: {
  credential: Credential;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(credential.name);
  const [baseUrl, setBaseUrl] = useState(credential.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [notes, setNotes] = useState(credential.notes || "");

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["models", credential.id],
    queryFn: () => api.listModels(credential.id),
  });

  const discoverMutation = useMutation({
    mutationFn: () => api.discoverModels(credential.id),
    onSuccess: (data) => {
      toast.success(`Discovered ${data.count} models`);
      queryClient.invalidateQueries({ queryKey: ["models", credential.id] });
    },
    onError: (e: Error) => toast.error(`Discovery failed: ${e.message}`),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateCredential(credential.id, {
        name,
        baseUrl: baseUrl || undefined,
        apiKey: apiKey || undefined,
        notes,
      }),
    onSuccess: () => {
      toast.success("Credential updated");
      setEditing(false);
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                {credential.name}
              </CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="secondary" className="mr-2">
                  {credential.providerLabel || PROVIDER_LABELS[credential.provider] || credential.provider}
                </Badge>
                <span className="font-mono text-xs">{credential.apiKeyMasked}</span>
              </CardDescription>
            </div>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cred-name">Name</Label>
                <Input id="cred-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {credential.provider !== "anthropic" && (
                <div className="space-y-2">
                  <Label htmlFor="cred-baseurl">Base URL</Label>
                  <Input
                    id="cred-baseurl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cred-apikey">
                  New API Key{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (leave blank to keep current)
                  </span>
                </Label>
                <Input
                  id="cred-apikey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cred-notes">Notes</Label>
                <Textarea
                  id="cred-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="What is this key for?"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save changes
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Base URL</div>
                  <div className="font-mono">{credential.baseUrl || "(default)"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Created</div>
                  <div>{new Date(credential.createdAt).toLocaleString()}</div>
                </div>
              </div>
              {credential.notes && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Notes</div>
                  <div className="text-sm">{credential.notes}</div>
                </div>
              )}
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Available Models
              </CardTitle>
              <CardDescription>
                Models discovered from this provider&apos;s /v1/models endpoint.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => discoverMutation.mutate()}
              disabled={discoverMutation.isPending}
            >
              {discoverMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Discover
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modelsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
            </div>
          ) : modelsData?.models.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              No models discovered yet.
              <br />
              Click <span className="font-medium">Discover</span> to fetch the available models.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
              {modelsData?.models.map((m: ProviderModel) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/30"
                >
                  <div className="font-mono text-sm">{m.modelId}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(m.lastSeenAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateCredentialDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["presets"], queryFn: api.listCredentials });
  const presets = data?.presets || [];

  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrlOverride, setBaseUrlOverride] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [autoDiscover, setAutoDiscover] = useState(true);

  // Group presets by semantic category for nicer display in the dropdown
  const CATEGORY_GROUPS: { label: string; match: (p: typeof presets[number]) => boolean }[] = [
    {
      label: "Major labs",
      match: (p) =>
        ["Anthropic (Claude)", "Z.ai (GLM)", "DeepSeek", "OpenAI", "xAI (Grok)", "MiniMax", "Moonshot (Kimi)", "Mistral", "Google (Gemini)"].includes(p.label),
    },
    {
      label: "Inference platforms",
      match: (p) =>
        ["OpenRouter", "Groq", "Together AI", "Perplexity (sonar)", "Cohere (Command)", "Fireworks AI", "Novita AI", "AI21 Labs (Jamba)"].includes(p.label),
    },
    {
      label: "Local / Self-hosted",
      match: (p) => ["Ollama (local)", "LM Studio (local)", "vLLM / SGLang / Custom"].includes(p.label),
    },
  ];
  function categoryFor(preset: typeof presets[number]): string {
    for (const cat of CATEGORY_GROUPS) if (cat.match(preset)) return cat.label;
    return "Other";
  }
  const byCategory = presets.reduce<Record<string, typeof presets>>((acc, p) => {
    const c = categoryFor(p);
    if (!acc[c]) acc[c] = [];
    acc[c].push(p);
    return acc;
  }, {});

  const selectedPreset = presets.find((p) => `${p.key}::${p.label}` === selectedPresetKey);
  const baseUrl = baseUrlOverride ?? selectedPreset?.defaultBaseUrl ?? "";

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedPreset) throw new Error("Pick a provider first");
      return api.createCredential({
        name: name || selectedPreset.label,
        providerKey: selectedPreset.key,
        providerLabel: selectedPreset.label,
        baseUrl,
        apiKey,
        notes,
        autoDiscover,
      });
    },
    onSuccess: (data) => {
      const msg = autoDiscover && data.discoveredCount > 0
        ? `Credential created · ${data.discoveredCount} models discovered`
        : "Credential created";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      onOpenChange(false);
      setName("");
      setApiKey("");
      setBaseUrlOverride(null);
      setNotes("");
      setSelectedPresetKey("");
      setAutoDiscover(true);
    },
    onError: (e: Error) => toast.error(`Create failed: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>
            Pick a provider, enter your API key. Base URL is pre-filled but editable.
            Models are auto-discovered unless you disable it below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={selectedPresetKey}
              onValueChange={(v) => {
                setSelectedPresetKey(v);
                setBaseUrlOverride(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_GROUPS.map((cat) => {
                  const items = byCategory[cat.label] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.label}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {cat.label}
                      </div>
                      {items.map((p) => (
                        <SelectItem key={`${p.key}::${p.label}`} value={`${p.key}::${p.label}`}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
            )}
            {selectedPreset?.docsUrl && (
              <a
                href={selectedPreset.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              >
                Provider docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {/* Show known models as a hint even before discovery */}
            {selectedPreset && selectedPreset.knownModels && selectedPreset.knownModels.length > 0 && (
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Known models
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedPreset.knownModels.map((m) => (
                    <Badge key={m} variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4.5">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">Display name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedPreset?.label || "My API key"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-apikey">API Key</Label>
            <Input
              id="new-apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          {selectedPreset?.key === "openai_compatible" && (
            <div className="space-y-2">
              <Label htmlFor="new-baseurl">Base URL</Label>
              <Input
                id="new-baseurl"
                value={baseUrl}
                onChange={(e) => setBaseUrlOverride(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-notes">Notes (optional)</Label>
            <Textarea
              id="new-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Auto-discover toggle */}
          {selectedPreset && (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="flex-1 min-w-0">
                <Label htmlFor="auto-discover" className="text-sm font-medium cursor-pointer">
                  Auto-discover models
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPreset.supportsDiscovery
                    ? "Fetch the model list via /v1/models right after creating."
                    : "Use the built-in model list (Anthropic doesn't expose /v1/models)."}
                </p>
              </div>
              <Switch
                id="auto-discover"
                checked={autoDiscover}
                onCheckedChange={setAutoDiscover}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !apiKey || !selectedPreset}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create credential
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
