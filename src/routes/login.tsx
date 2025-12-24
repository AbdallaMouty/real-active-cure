import { useState, useEffect } from "react";
import Logo from "../assets/images/Logo.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import en from "../assets/flags/en.png";
import ar from "../assets/flags/ar.png";
import kr from "../assets/flags/kr.png";
import supabase from "@/utils/supabase";
import { useNavigate } from "react-router";
import store, { authStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import Splash from "@/components/Splash";
import text from "@/lib/text";
import { useErrorDialog } from "@/hooks/use-error-dialog";

const langs = [
  { name: "en", flag: en },
  { name: "ar", flag: ar },
  { name: "kr", flag: kr },
];

const Login = () => {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [splash, setSplash] = useState(true);
  const [open, setOpen] = useState(false);

  const { lang, setLang, setUser } = store();
  const {
    user,
    setUser: setAuthUser,
    password,
    setPassword,
    role,
    setRole,
  } = authStore();
  const { showError, ErrorDialogComponent } = useErrorDialog();

  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => setSplash(false), 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (user && password) {
      setTimeout(() => {
        setUsername(user.name);
        setPhone(password);
        login();
      }, 0);
    }
  }, [user, password]);

  const login = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${(username || user?.name || "")
          .toLowerCase()
          .replace(" ", "_")}@fake.com`,
        password: phone || user?.phone || "",
      });

      if (error) {
        showError(error.message);
        return;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          name: username,
          phone,
          role: role.en,
          email: data.user.email!,
          token: data.session.access_token,
        });
        setAuthUser({
          id: data.user.id,
          name: username,
          phone,
          role: role.en,
          email: data.user.email!,
          token: data.session.access_token,
        });
        setPassword(phone);

        if (data.user.is_anonymous && role.en === "Admin") {
          showError("You are not authorized to access this page");
        } else {
          if (role.en.toLocaleLowerCase() === "admin") navigate("/admin");
          else navigate("/sales");
        }
      }
    } catch {
      showError("An unexpected error occurred during login");
    }
  };

  if (splash) {
    return <Splash />;
  }

  return (
    <>
      <ErrorDialogComponent />
      <div className="w-screen h-screen p-5 px-7 flex flex-col pt-10">
        <div className="w-full flex items-center justify-between border-b border-b-[#D4D4D4] gap-2">
          <img src={Logo} className="w-1/2" />
          <p className="text-sm">Sales Representative Management Application</p>
        </div>
        <div className="w-full flex flex-col items-center justify-center gap-3 aspect-[2/1]">
          <h1 className="text-4xl font-bold">{text.auth.login[lang]}</h1>
          <p className="text-muted">{text.auth.fill[lang]}</p>
        </div>
        <div className="w-full grid grid-cols-2 gap-4">
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            className="col-span-2 w-full flex flex-col items-start justify-start gap-1">
            <span className="text-sm text-muted ml-4">
              {text.auth.name[lang]}
            </span>
            <Input
              className="w-full rounded-3xl p-5 py-7 border border-muted placeholder:text-muted/50"
              placeholder="Ex: Mohammad Ahmad"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            className="w-full flex flex-col items-start justify-start gap-1">
            <span className="text-sm text-muted ml-4">
              {text.auth.phone[lang]}
            </span>
            <Input
              className="w-full rounded-3xl p-5 py-7 border border-muted placeholder:text-muted/50"
              type="number"
              placeholder="Ex: 0750 222 1111"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div
            dir={lang === "en" ? "ltr" : "rtl"}
            className="w-full flex flex-col items-start justify-start gap-1">
            <span className="text-sm text-muted ml-4">
              {text.auth.role[lang]}
            </span>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger className="w-full flex items-center justify-center gap-5 rounded-3xl border border-muted bg-transparent h-full text-muted">
                <span className="max-w-1/2 truncate">{role[lang]}</span>
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {text.auth.roleDropdown.map((r) => (
                  <DropdownMenuLabel
                    className="p-3"
                    onClick={() => {
                      setRole(r);
                      setOpen(false);
                    }}>
                    {r[lang]}
                  </DropdownMenuLabel>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            onClick={login}
            className="col-span-2 w-full rounded-3xl text-xl py-7 font-bold">
            {text.auth.login[lang]}
          </Button>
          <div className="col-span-2 w-full flex items-center justify-center gap-6 mt-4">
            {langs.map((l) => (
              <button onClick={() => setLang(l.name as "en" | "ar" | "kr")}>
                <img src={l.flag} className="w-12" alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="w-full flex-1"></div>
        <div className="w-full flex flex-col items-center justify-center mb-10">
          <span className="text-lg font-light">Powered by</span>
          <h1 className="text-3xl">Dot Design</h1>
        </div>
      </div>
    </>
  );
};

export default Login;
