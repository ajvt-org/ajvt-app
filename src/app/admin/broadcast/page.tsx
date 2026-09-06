import AdminToolHeader from "@/components/admin/AdminToolHeader";
import BroadcastForm from "./BroadcastForm";

export default function AdminBroadcastPage() {
  return (
    <div className="admin-page space-y-4">
      <AdminToolHeader href="/admin/broadcast" />
      <div className="card p-5">
        <BroadcastForm />
      </div>
    </div>
  );
}
