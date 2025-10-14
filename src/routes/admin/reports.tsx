import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Report } from "@/lib/types";
import OpenIcon from "@/components/icons/OpenIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import store from "@/lib/store";
import text from "@/lib/text";

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { lang } = store();

  const getReports = async () => {
    const { data } = await supabase.from("reports").select("*");
    if (data) {
      setReports(data);
    } else {
      alert("Please check your internet connection");
    }
  };

  useEffect(() => {
    getReports();
  }, []);

  const setAsRead = async (id: string) => {
    await supabase.from("reports").update({ status: true }).eq("id", id);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white p-6">
      {/* Header */}
      <div className="flex justify-center items-center mb-6">
        <h2 className="text-gray-600 font-semibold">
          {text.admins.reports.reports[lang]}
        </h2>
      </div>

      {/* Reports Table */}
      <Card className="w-full h-[85%] rounded-2xl shadow-md">
        <CardHeader
          dir={lang === "en" ? "ltr" : "rtl"}
          className="flex flex-row justify-between items-center text-black font-medium px-6">
          <span className="w-1/3">{text.admins.reports.title[lang]}</span>
          <span className="w-1/4">{text.admins.reports.sender[lang]}</span>
          <span className="w-1/6 text-center">
            {text.admins.reports.status[lang]}
          </span>
          <span className="w-1/4 text-right">
            {text.admins.reports.ops[lang]}
          </span>
        </CardHeader>
        <CardContent className="px-2">
          <ScrollArea
            dir={lang === "en" ? "ltr" : "rtl"}
            className="h-[70vh] w-full">
            {reports.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-row items-center justify-between py-3 border-b border-gray-300 text-sm">
                {/* Title */}
                <p className="w-1/3 text-gray-600 truncate">{admin.title}</p>

                {/* Sender */}
                <p className="w-1/4 text-gray-500 truncate">{admin.sender}</p>

                {/* Status */}
                <div className="w-1/6 flex justify-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      admin.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {admin.status ? "Open" : "Unread"}
                  </span>
                </div>

                {/* Operations */}
                <div className="w-1/4 flex justify-center gap-1">
                  <button
                    onClick={() => {
                      const updated: Report[] = reports.map((r) =>
                        r.id === admin.id ? { ...r, status: true } : r
                      );
                      setReports(updated);
                      setSelected(admin);
                      setShowModal(true);
                      setAsRead(admin.id.toString());
                    }}
                    className=" hover:bg-gray-100 rounded-lg">
                    <OpenIcon />
                  </button>
                  <button
                    onClick={() =>
                      setReports(reports.filter((a) => a.id !== admin.id))
                    }
                    className="hover:bg-gray-100 rounded-lg">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal */}
      <Drawer open={showModal} onOpenChange={setShowModal}>
        <DrawerContent
          dir={lang === "en" ? "ltr" : "rtl"}
          className="bg-white w-full sm:max-w-lg p-6">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold text-start">
              {text.admins.reports.rep_title[lang]}
            </DrawerTitle>
            <p className="text-gray-600 mt-1 text-start">{selected?.title}</p>
          </DrawerHeader>

          <div className="mt-6">
            <h3 className="text-md font-semibold text-black">
              {text.admins.reports.desc[lang]}
            </h3>
            <p className="bg-gray-100 text-gray-600 mt-2 p-3 rounded-lg">
              {selected?.description}
            </p>
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => setShowModal(false)}
              className="bg-teal-500 text-white">
              {text.admins.reports.ok[lang]}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
