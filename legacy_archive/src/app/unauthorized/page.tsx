import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-danger-soft rounded-full flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-danger" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            You don't have permission to view this page. Please log in with an authorized account.
          </p>
        </div>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/"
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
