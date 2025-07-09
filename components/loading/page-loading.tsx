import { LoadingSpinner } from "./loading-spinner";

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export default PageLoading;