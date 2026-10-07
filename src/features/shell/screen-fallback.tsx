import { Spinner } from "@/components/ui/spinner";

export function ScreenFallback() {
  return (
    <div className="flex justify-center p-10">
      <Spinner />
    </div>
  );
}
