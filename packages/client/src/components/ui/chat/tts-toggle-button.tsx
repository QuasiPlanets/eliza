import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Volume2, VolumeX } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface TtsToggleButtonProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export default function TtsToggleButton({ isEnabled, onToggle }: TtsToggleButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <Volume2 className="h-4 w-4 text-primary" />
                    ) : (
                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={onToggle}
                        size="sm"
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p>{isEnabled ? 'Disable' : 'Enable'} text-to-speech</p>
            </TooltipContent>
        </Tooltip>
    );
} 