import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LimitReachedCardProps {
  variant: 'anonymous' | 'user';
  alphaSignupUrl?: string;
  bookingUrl?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export default function LimitReachedCard({ 
  variant, 
  alphaSignupUrl, 
  bookingUrl,
  onPrimaryClick,
  onSecondaryClick,
}: LimitReachedCardProps) {
  const handlePrimaryClick = (e: React.MouseEvent) => {
    onPrimaryClick?.();
    // Let the link open normally
  };

  const handleSecondaryClick = (e: React.MouseEvent) => {
    onSecondaryClick?.();
    // Let the link open normally
  };

  return (
    <Card className="text-center">
      <h3 className="card-title mb-2">Daily Limit Reached</h3>
      <p className="helper-text mb-6">
        You've consumed today's free sourcing analysis. Our real-time landed cost and risk modeling is intensive. Unlock 4 more daily uses instantly by creating an account, or schedule a personalized strategy session.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {variant === 'anonymous' && alphaSignupUrl && (
          <Button asChild>
            <a 
              href={alphaSignupUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={handlePrimaryClick}
            >
              Unlock More Analysis (Free Sign-up)
            </a>
          </Button>
        )}
        {bookingUrl && (
          <Button asChild variant={variant === 'anonymous' ? 'outline' : 'default'}>
            <a 
              href={bookingUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={variant === 'anonymous' ? handleSecondaryClick : handlePrimaryClick}
            >
              Talk to a Sourcing Analyst
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}