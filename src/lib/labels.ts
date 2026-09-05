import { SCOPES, SOURCE_SYSTEMS, type Scope, type SourceSystem } from "@/lib/constants";

export function scopeLabel(scope: string[]) {
  if (scope.includes("all")) return SCOPES.all;
  return scope.map((s) => SCOPES[s as Scope] ?? s).join(" · ");
}

export function sourceLabel(source: string | null) {
  if (!source) return null;
  return SOURCE_SYSTEMS[source as SourceSystem] ?? source;
}
