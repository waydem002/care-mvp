import { getDocuments, getPatients, getDocumentFolders } from "@/lib/queries";
import DocumentSearch from "@/components/DocumentSearch";
import DocumentForm from "@/components/DocumentForm";
import DocumentList from "@/components/DocumentList";

export default async function DocumentsPage() {
  const [documents, patients, folders] = await Promise.all([getDocuments(), getPatients(), getDocumentFolders()]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Documents</h1>
      <p className="mb-6 text-sm text-muted">
        Internal knowledge base — policies, procedures, and notes, searchable by staff.
      </p>

      <div className="mb-6">
        <DocumentSearch />
      </div>

      <div className="mb-8">
        <DocumentForm patients={patients} folders={folders} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-base font-semibold text-ink">All documents ({documents.length})</h2>
        <DocumentList documents={documents} />
      </div>
    </div>
  );
}
