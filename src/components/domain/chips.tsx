"use client";

import Link from "next/link";
import { Building2, Mail, MessageCircle, Monitor, Phone, Globe, User as UserIcon } from "lucide-react";
import { useLookups } from "@/hooks/use-data";
import type { Channel, ID } from "@/domain/types";
import { Avatar } from "@/components/ui/misc";
import { CHANNEL_META } from "@/domain/constants";
import { cn } from "@/lib/utils";

export function UserChip({ id, showName = true }: { id?: ID; showName?: boolean }) {
  const { users } = useLookups();
  const u = id ? users.get(id) : undefined;
  if (!u) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={u.name} color={u.color} size="xs" />
      {showName && <span className="truncate text-[13px]">{u.name}</span>}
    </span>
  );
}

export function ClientLink({ id, sub }: { id?: ID; sub?: boolean }) {
  const { clients } = useLookups();
  const c = id ? clients.get(id) : undefined;
  if (!c) return <span className="text-fg-subtle">—</span>;
  return (
    <Link href={`/crm/clientes/${c.id}`} onClick={(e) => e.stopPropagation()} className="group inline-flex min-w-0 items-center gap-2">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-[11px]", c.type === "empresa" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600")}>
        {c.type === "empresa" ? <Building2 className="size-3.5" /> : <UserIcon className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium group-hover:text-brand-700">{c.name}</span>
        {sub && <span className="block truncate text-[11px] text-fg-muted">{c.docType} {c.docNumber}</span>}
      </span>
    </Link>
  );
}

export function InsurerChip({ id, size = "sm" }: { id?: ID; size?: "sm" | "md" }) {
  const { insurers } = useLookups();
  const i = id ? insurers.get(id) : undefined;
  if (!i) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("grid shrink-0 place-items-center rounded-md font-bold text-white", size === "sm" ? "size-6 text-[10px]" : "size-9 text-xs")} style={{ background: i.color }}>
        {i.short.slice(0, 2).toUpperCase()}
      </span>
      <span className={cn("font-medium", size === "sm" ? "text-[13px]" : "text-sm")}>{i.short}</span>
    </span>
  );
}

export function LineName({ id }: { id?: ID }) {
  const { lines } = useLookups();
  return <>{(id && lines.get(id)?.name) ?? "—"}</>;
}

const CH_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle className="size-3.5" />,
  email: <Mail className="size-3.5" />,
  outlook: <Mail className="size-3.5" />,
  web: <Globe className="size-3.5" />,
  portal: <Monitor className="size-3.5" />,
  llamada: <Phone className="size-3.5" />,
};

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const color = { whatsapp: "bg-emerald-500", email: "bg-rose-500", outlook: "bg-sky-600", web: "bg-indigo-500", portal: "bg-brand-500", llamada: "bg-slate-500" }[channel];
  return <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-white", color, className)}>{CH_ICON[channel]}</span>;
}

export function ChannelLabel({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <ChannelIcon channel={channel} className="size-5 [&_svg]:size-3" />
      {CHANNEL_META[channel].label}
    </span>
  );
}
