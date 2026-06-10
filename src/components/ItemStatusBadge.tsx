import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ItemStatusBadgeProps {
  completed: boolean;
}

export default function ItemStatusBadge({ completed }: ItemStatusBadgeProps) {
  return completed ? (
    <Badge className="h-auto bg-green-50 px-2 py-1 text-green-600">
      <CheckCircle />
      Completed
    </Badge>
  ) : (
    <Badge className="h-auto bg-yellow-50 px-2 py-1 text-yellow-600">
      <XCircle />
      In Progress
    </Badge>
  );
}
