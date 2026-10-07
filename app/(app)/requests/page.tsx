import { getBookingRequests } from "@/lib/queries";
import BookingRequestCard from "@/components/BookingRequestCard";

export default async function RequestsPage() {
  const requests = await getBookingRequests();
  const pending = requests.filter((r) => r.status === "pending");
  const other = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Booking requests</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No pending requests. New submissions from the public booking page will show up here.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <BookingRequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>

      {other.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Reviewed</h2>
          <div className="space-y-3">
            {other.map((r) => (
              <BookingRequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
