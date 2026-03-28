/**
 * GlossaryBadge — A styled badge that shows a friendly label
 * with a hover tooltip revealing the technical term.
 * Used for agent types and ownership models throughout the app.
 */
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getAgentTypeLabel,
  getAgentTypeBg,
  getAgentTypeTechnical,
  getOwnerLabel,
  getOwnerBg,
  getOwnerTechnical,
  type AgentType,
  type OwnerType,
} from "@/lib/data";

interface AgentTypeBadgeProps {
  type: AgentType;
  className?: string;
}

export function AgentTypeBadge({ type, className = "" }: AgentTypeBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border cursor-help ${getAgentTypeBg(type)} ${className}`}>
          {getAgentTypeLabel(type)}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-foreground text-background text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg"
      >
        aka {getAgentTypeTechnical(type)}
      </TooltipContent>
    </Tooltip>
  );
}

interface OwnerBadgeProps {
  owner: OwnerType;
  className?: string;
}

export function OwnerBadge({ owner, className = "" }: OwnerBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border cursor-help ${getOwnerBg(owner)} ${className}`}>
          {getOwnerLabel(owner)}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-foreground text-background text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg"
      >
        aka {getOwnerTechnical(owner)}
      </TooltipContent>
    </Tooltip>
  );
}
