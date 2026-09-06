import AdminToolHeader from "@/components/admin/AdminToolHeader";
import PasswordForm from "./PasswordForm";

export default function AdminPasswordPage() {
  return (
    <div className="admin-page space-y-4">
      <AdminToolHeader href="/admin/password" />
      <div className="card p-5">
        <PasswordForm />
      </div>
    </div>
  );
}
