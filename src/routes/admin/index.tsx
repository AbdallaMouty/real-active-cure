import { Button } from "@/components/ui/button";
import store from "@/lib/store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabaseAdmin } from "@/utils/supabase";
import type { User } from "@supabase/supabase-js";
import text from "@/lib/text";
import { useErrorDialog } from "@/hooks/use-error-dialog";

const Admin = () => {
  const { lang } = store();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const { ErrorDialogComponent, showError } = useErrorDialog();

  const getUsers = async () => {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (data) {
        setUsers(data.users);
      }
      if (error) {
        showError("An error occurred");
      }
    } catch {
      showError("An error occurred");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const links = [
    {
      en: "Admins",
      ar: "المدراء",
      kr: "بەڕێوەبەر",
      href: "/admin/admins",
    },
    {
      en: "Sales Reps",
      ar: "مندوبي المبيعات",
      kr: "فرۆشتنەری فرۆشتن",
      href: "/admin/sales",
    },
    {
      en: "Tracking",
      ar: "تتبع",
      kr: "بازرگانی",
      href: "/admin/tracking",
    },
    {
      en: "Reports",
      ar: "التقارير",
      kr: "گزارشەکان",
      href: "/admin/reports",
    },
  ];

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="w-full flex items-center justify-center gap-5 p-10 px-7">
          <div className="bg-primary rounded-xl p-4 pr-20 text-white min-w-[40%]">
            <h1 className="text-4xl font-bold">
              {users.filter((user) => !user.is_anonymous).length}
            </h1>
            <span className="text-sm">{text.admins.index.admins[lang]}</span>
          </div>
          <div className="bg-primary rounded-xl p-4 flex-1 text-white">
            <h1 className="text-4xl font-bold">
              {users.filter((user) => user.is_anonymous).length}
            </h1>
            <span className="text-sm truncate">
              {text.admins.index.reps[lang]}
            </span>
          </div>
        </div>
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-5 px-7">
        {links.map((link) => (
          <Button
            onClick={() => navigate(link.href)}
            className="w-full rounded-full p-6 text-xl">
            {link[lang]}
          </Button>
        ))}
      </div>
      </div>
      <ErrorDialogComponent />
    </>
  );
};

export default Admin;
