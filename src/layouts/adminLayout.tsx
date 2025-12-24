import { Menu } from "lucide-react";
import { useState } from "react";
import Logo from "../assets/images/Logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router";
import en from "../assets/flags/en.png";
import ar from "../assets/flags/ar.png";
import kr from "../assets/flags/kr.png";
import store, { authStore } from "@/lib/store";
import LangIcon from "@/components/icons/LangIcon";
import LogoutIcon from "@/components/icons/LogoutIcon";

const langs = [
  { name: "English", flag: en, value: "en" },
  { name: "Arabic", flag: ar, value: "ar" },
  { name: "Kurdish", flag: kr, value: "kr" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { lang, setLang } = store();
  const { user, setUser } = authStore();

  const [side, setSide] = useState(false);

  const links = [
    {
      en: "Home",
      ar: "الصفحة الرئيسية",
      kr: "باش بەتاڵ",
      href: "/admin",
    },
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
    <div className="w-screen h-screen overflow-hidden">
      <nav
        dir={lang === "en" ? "ltr" : "rtl"}
        className="w-full flex items-center justify-start text-white bg-primary text-xl p-4 h-[9vh] font-semibold gap-5 pt-16">
        <Menu className="text-white" onClick={() => setSide(true)} />
        <span className="text-white capitalize">
          {user?.email.split("@")[0].replaceAll("_", " ")}
        </span>
      </nav>
      {side && (
        <div
          className={`w-full h-full absolute top-0 left-0 flex ${
            lang === "en" ? "flex-row" : "flex-row-reverse"
          } z-50 animate__animated animate__fadeIn animate__faster backdrop-blur-xs`}>
          <div
            className={`w-[55%] h-full bg-secondary flex flex-col items-center justify-between animate__animated ${
              lang === "en" ? "animate__slideInLeft" : "animate__slideInRight"
            } animate__faster p-4 py-10`}>
            <img src={Logo} className="w-full" alt="" />
            <div
              dir={lang === "en" ? "ltr" : "rtl"}
              className="w-full flex flex-col items-start justify-center text-white text-lg gap-4 px-8">
              {links.map((link) => (
                <button
                  className="text-start"
                  onClick={() => {
                    navigate(link.href);
                    setSide(false);
                  }}>
                  {link[lang]}
                </button>
              ))}
            </div>
            <div
              dir={lang === "en" ? "ltr" : "rtl"}
              className="w-full flex flex-col items-start justify-start text-white pt-40 px-8 text-xl gap-3">
              <Accordion type="single" className="w-full p-0" collapsible>
                <AccordionItem value="1">
                  <AccordionTrigger className="text-xl font-normal gap-1">
                    <LangIcon />
                    {lang === "en"
                      ? "Language"
                      : lang === "ar"
                      ? "اللغة"
                      : "زمان"}
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col items-start justify-start gap-4">
                    {langs.map((l) => (
                      <button
                        onClick={() => setLang(l.value as "en" | "ar" | "kr")}
                        className="w-full flex items-center justify-start gap-2">
                        <img src={l.flag} className="w-10" />
                        {l.name}
                      </button>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <button
                onClick={() => {
                  setUser(null);
                  navigate("/");
                }}
                className="flex items-center justify-center gap-1">
                <LogoutIcon />{" "}
                {lang === "en"
                  ? "Logout"
                  : lang === "ar"
                  ? "تسجيل الخروج"
                  : "دەرچوون"}
              </button>
            </div>
          </div>
          <div onClick={() => setSide(false)} className="flex-1 h-full"></div>
        </div>
      )}
      {children}
    </div>
  );
};

export default AdminLayout;
