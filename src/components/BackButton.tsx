import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  onClick: () => void;
}

export default function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick}>
      <ArrowLeft className="size-6" />
    </Button>
  );
}
