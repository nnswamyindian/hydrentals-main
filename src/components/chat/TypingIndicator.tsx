const TypingIndicator = () => (
  <div className="flex items-center gap-2 px-4 py-2">
    <div className="flex gap-1">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
    <span className="text-xs text-muted-foreground">typing...</span>
  </div>
);

export default TypingIndicator;
