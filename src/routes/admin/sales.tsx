import EditIcon from "@/components/icons/EditIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabaseAdmin } from "@/utils/supabase";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import text from "@/lib/text";
import store from "@/lib/store";

const SalesPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [id, setId] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { lang } = store();

  const getUsers = async () => {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (data) {
      setUsers(
        data.users.filter((user) => user.user_metadata?.is_anonymous === true)
      );
    }
    if (error) {
      alert("an error occured");
    }
  };

  const editUser = async () => {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        {
          email: `${name.toLowerCase().replace(" ", "_")}@fake.com`,
          phone: mobile,
          password: mobile, // password same as phone number
          user_metadata: { is_anonymous: true },
        }
      );

      if (error) {
        console.error("Error updating user:", error);
        alert(`Error ${error.message}`);
        return;
      }

      console.log("User updated:", data);
      await getUsers(); // refresh admin list
      setShowEdit(false);
    } catch (e) {
      console.error("Unexpected error:", e);
    }
  };

  const addUser = async () => {
    try {
      // Create user with anonymous metadata
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: `${name.toLowerCase().replace(" ", "_")}@fake.com`,
        phone: mobile,
        password: mobile,
        email_confirm: true,
        user_metadata: { is_anonymous: true },
      });

      if (error) {
        console.error("Error creating user:", error);
        return;
      }
      console.log("User created:", data);
      if (error) {
        console.error("Error creating user:", error);
        return;
      }
      console.log("User created:", data);
      await getUsers(); // refresh admin list
      setShowModal(false);
    } catch (e) {
      console.error("Unexpected error:", e);
    }
  };

  const deleteUser = async () => {
    await supabaseAdmin.auth.admin.deleteUser(id);
    getUsers();
    setShowDelete(false);
  };

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"} className="w-full h-full p-4">
      <div className="w-full flex items-center justify-start gap-3">
        <h1 className="text-[#7D7A7A] font-bold text-xl">
          {text.admins.reps.admins[lang]}
        </h1>
        <Button
          onClick={() => {
            setName("");
            setMobile("");
            setShowModal(true);
          }}>
          {text.admins.reps.add[lang]}
        </Button>
      </div>
      <Card className="w-full max-h-5/6 h-5/6 mt-5">
        <CardHeader className="w-full flex items-center justify-between">
          <span className="w-1/4 text-black">
            {text.admins.reps.name[lang]}
          </span>
          <span className="w-1/3 text-black">
            {text.admins.reps.mobile[lang]}
          </span>
          <span className="pr-2 text-black">
            {text.admins.reps.status[lang]}
          </span>
          <span className="w-1/4 text-black">{text.admins.reps.ops[lang]}</span>
        </CardHeader>
        <CardContent className="w-full h-full flex flex-col items-start justify-start overflow-y-scroll">
          {users.map((user) => (
            <div className="w-full flex items-center justify-between py-4 border-b border-[#7D7A7A50]">
              <span className="w-1/4 text-black text-xs">
                {user.email?.replace("_", " ").split("@")[0]}
              </span>
              <span className="w-1/3 text-black text-xs text-start">
                {user.phone}
              </span>
              <span
                className={`mr-2 text-xs text-center py-0.5 p-1 rounded-full ${
                  //@ts-expect-error any
                  user.status !== 1
                    ? "bg-active text-[#249D0C]"
                    : "bg-inactive text-[#DF0609]"
                }`}>
                {
                  //@ts-expect-error any
                  user.status !== 1 ? "Active" : "Inactive"
                }
              </span>
              <span className="w-1/4 flex items-center justify-center gap-1">
                <button
                  onClick={() => {
                    {
                      setId(user.id);
                      //@ts-expect-error any
                      setName(user.email.replace("_", " ").split("@")[0]);
                      setMobile(user.phone || "");
                      setShowEdit(true);
                    }
                  }}>
                  <EditIcon />
                </button>
                <button
                  onClick={() => {
                    {
                      setId(user.id);
                      setShowDelete(true);
                    }
                  }}>
                  <TrashIcon />
                </button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="rounded-2xl bg-teal-500 text-white p-6 border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {text.admins.admins.delete.title[lang]}
            </DialogTitle>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-6">
            <Button
              className="flex-1 text-white"
              variant="secondary"
              onClick={() => setShowDelete(false)}>
              {text.admins.admins.delete.cancel[lang]}
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                deleteUser();
                setShowDelete(false);
              }}>
              {text.admins.admins.delete.del[lang]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          dir={lang === "en" ? "ltr" : "rtl"}
          className="rounded-2xl bg-teal-500 text-white p-0 max-w-sm border-0">
          {/* Header */}
          <div className="w-full border-b border-white px-4 pt-3 pb-2">
            <DialogHeader className="text-center space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {text.admins.reps.new[lang]}
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm px-6">
                {text.admins.reps.new_sub[lang]}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="w-full px-6 py-4 space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-gray-100">
                {text.admins.reps.new_name[lang]}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mohammed Ahmed"
                className="bg-white text-black rounded-xl placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-100">
                {text.admins.reps.new_number[lang]}
              </span>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Ex: 0750 000 2222"
                className="bg-white text-black rounded-xl placeholder:text-gray-400"
              />
            </div>

            <Button
              onClick={addUser}
              variant={"secondary"}
              className="w-full text-white rounded-xl mt-2">
              {text.admins.reps.add_new[lang]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent
          dir={lang === "en" ? "ltr" : "rtl"}
          className="rounded-2xl bg-teal-500 text-white p-0 max-w-sm border-0">
          {/* Header */}
          <div className="w-full border-b border-white px-4 pt-3 pb-2">
            <DialogHeader className="text-center space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {text.admins.reps.edit[lang]}
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm px-6">
                {text.admins.reps.edit_sub[lang]}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="w-full px-6 py-4 space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-gray-100">
                {text.admins.reps.new_name[lang]}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mohammed Ahmed"
                className="bg-white text-black rounded-xl placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-100">
                {text.admins.reps.new_number[lang]}
              </span>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Ex: 0750 000 2222"
                className="bg-white text-black rounded-xl placeholder:text-gray-400"
              />
            </div>

            <Button
              onClick={editUser}
              variant={"secondary"}
              className="w-full text-white rounded-xl mt-2">
              {text.admins.reps.edit_new[lang]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPage;
