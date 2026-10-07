import BookingRequestForm from "@/components/BookingRequestForm";

export default function BookPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-brand">Pflegedienst</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Request an appointment</h1>
          <p className="mt-1 text-sm text-muted">
            Fill this in and our team will get back to you — no account needed.
          </p>
        </div>
        <BookingRequestForm />
      </div>
    </div>
  );
}
