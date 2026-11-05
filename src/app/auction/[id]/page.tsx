import { Suspense } from "react";
import { LiveAuctionRoom } from "@/components/auction/LiveAuctionRoom";

async function AuctionContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LiveAuctionRoom auctionId={id} />;
}

export default function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      }
    >
      <AuctionContent params={params} />
    </Suspense>
  );
}
