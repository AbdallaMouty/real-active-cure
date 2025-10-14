import { useEffect, useState } from "react";
import { supabaseAdmin } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router";
import type { User } from "@supabase/supabase-js";

export default function Tracking() {
  const [users, setUsers] = useState<User[]>([]);
  const router = useNavigate();

  const getUsers = async () => {
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    if (data?.users) {
      setUsers(data.users as User[]);
    } else {
      alert("Please check your internet connection");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-white p-6">
      {/* Page Title */}
      <div className="flex justify-center items-center mb-6">
        <h2 className="text-gray-600 font-semibold">Tracking</h2>
      </div>

      {/* Users list */}
      <div className="flex flex-col gap-4 w-full">
        {users.map((user) => (
          <Card
            key={user.id}
            className="flex flex-row items-center justify-between px-4 py-3 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Avatar Placeholder */}
            <div className="bg-gray-300 w-14 h-14 rounded-lg shrink-0" />

            {/* User Info */}
            <div className="flex flex-col flex-1 w-1/3">
              <p className="text-base font-medium text-black truncate">
                {user.email?.replace("_", " ").split("@")[0]}
              </p>
              <p className="text-xs text-gray-500">
                {user.is_anonymous ? "Sales Representative" : "Admin"}
              </p>
            </div>

            {/* Track Button */}
            <Button
              className="bg-teal-500 text-white hover:bg-teal-600"
              onClick={() => router(`/admin/tracking/${user.id}`)}>
              Track
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
