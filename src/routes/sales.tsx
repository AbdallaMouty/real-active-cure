import store from "@/lib/store";
import supabase from "@/utils/supabase";
import { ChevronDown, Info, MapPin, Menu } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import { Switch } from "@/components/ui/switch";
import AddressIcon from "@/components/AddressIcon";
import TimeIcon from "@/components/icons/TimeIcon";
import HouseIcon from "@/components/icons/HouseIcon";
import { Button } from "@/components/ui/button";
import "animate.css";
import Logo from "../assets/images/Logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import en from "../assets/flags/en.png";
import ar from "../assets/flags/ar.png";
import kr from "../assets/flags/kr.png";
import { Geolocation } from "@capacitor/geolocation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Dialog } from "@headlessui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router";
import Hand from "@/components/icons/Hand";
import LogoutIcon from "@/components/icons/LogoutIcon";
import LangIcon from "@/components/icons/LangIcon";
import ReportIcon from "@/components/icons/ReportIcon";

const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const Sales = () => {
  const {
    active,
    setActive,
    reportOpen,
    toggleReportOpen,
    user,
    lang,
    setLang,
  } = store();
  const navigate = useNavigate();

  const langs = [
    { name: "English", flag: en, value: "en" },
    { name: "Arabic", flag: ar, value: "ar" },
    { name: "Kurdish", flag: kr, value: "kr" },
  ];

  const date = new Date();
  const mapRef = useRef(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  //const [region, setRegion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLocationInfo, setNewLocationInfo] = useState({
    name: "",
    address: "",
    time: date,
  });
  const [locations, setLocations] = useState<
    {
      latitude: number;
      longitude: number;
      name: string;
      address: string;
      time: Date;
      number: string;
    }[]
  >([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    let watchId: string | number | null = null;

    const initLocationTracking = async () => {
      if (!active || !user?.id) return; // Only track when active and user exists

      // Request permission
      const permission = await Geolocation.requestPermissions();
      if (permission.location === "denied") {
        alert("Location permission denied. Please enable it to continue.");
        return;
      }

      // Get current location once
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        //@ts-expect-error any
        setLocation(position);
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (err) {
        console.error("Failed to get current location:", err);
      }

      // Start watching location continuously
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 5000 },
        async (position, err) => {
          if (err) return console.error(err);
          if (position) {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });

            // Send to Supabase
            await supabase.from("user_locations").upsert({
              user_id: user.id,
              latitude,
              longitude,
              updated_at: new Date().toISOString(),
            });
          }
        }
      );
    };

    initLocationTracking();

    // Stop tracking when component unmounts or 'active' changes
    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch({ id: watchId.toString() });
      }
    };
  }, [active, user?.id]);

  const [side, setSide] = useState(false);
  const [activate, setActivate] = useState(false);

  const getLocations = async () => {
    const userData = await supabase.auth.getUser();
    console.log(userData.data);
    if (userData.data.user) {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", userData.data.user.id);
      if (data) {
        setLocations(data);
      } else {
        alert("please check your internet connection");
      }
      if (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    getLocations();
  }, []);

  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    name: string;
    address: string;
    time: Date;
    number: string;
  } | null>(locations[0]);
  const [reportType, setReportType] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  //const [add, setAdd] = useState(false);

  async function getCurrentLocation() {
    try {
      // Request permission first (if needed)
      const permission = await Geolocation.requestPermissions();
      if (permission.location === "denied") {
        alert("Location permission denied");
        return;
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      //@ts-expect-error any
      setLocation(position); // store in state
    } catch (error) {
      console.error("Error getting location:", error);
      alert("Failed to get current location");
    }
  }

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Format date and time
  const formatDateTime = (dateInput: Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  };

  // Assign new location
  const assign = async () => {
    if (!active) {
      setActivate(true);
      return;
    }
    if (!location) {
      alert("Location not available yet.");
      return;
    }
    if (!location?.coords) {
      alert("Location not ready.");
      return;
    }

    const newLoc = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      name: "",
      address: "",
      time: date,
      number: "#" + Math.floor(Math.random() * 10000).toString(),
    };

    setSelected(newLoc);
    setModalVisible(true);
    try {
      if (mapRef.current) {
        //@ts-expect-error any
        const map = mapRef.current.getMap(); // get underlying mapbox-gl instance
        map.flyTo({
          center: [newLoc.longitude, newLoc.latitude],
          zoom: 15,
          essential: true, // this ensures animation works even with reduced motion
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  /*const onTimeChange = (event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      setNewLocationInfo({ ...newLocationInfo, time: selectedDate });
    }
  };*/

  const saveNewLocation = async () => {
    if (!userLocation) {
      alert("No current location available.");
      return;
    }
    
    const newLocationData = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      ...newLocationInfo,
      number: user?.phone || ""
    };
    
    const { data, error } = await supabase
      .from("locations")
      .insert([newLocationData])
      .select("*");
    if (data) {
      try {
        const updatedLoc = data[0];
        setLocations([...locations, updatedLoc]);
        setModalVisible(false);
        setNewLocationInfo({ name: "", address: "", time: date });
        setSelected(updatedLoc);
      } catch (error) {
        console.error("Error saving location:", error);
        alert("Failed to save location.");
      }
    } else {
      console.error(error);
      alert("an error occured");
    }
  };

  const formatDate = (dateInput: Date | string) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const addReport = async () => {
    const { data, error } = await supabase
      .from("reports")
      .insert([
        {
          title,
          description,
          user_id: user?.id,
          type: reportType,
          sender: user?.name,
        },
      ])
      .select("*");

    if (data) {
      toggleReportOpen();
    } else {
      console.log(error);
      alert("an error occured");
    }
  };

  const logAssignment = async () => {
    if (!selected || !user) {
      alert("Missing user or location.");
      return;
    }

    try {
      // Check if an assignment already exists for this user + location
      const { data: existing, error: fetchError } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        //@ts-expect-error any
        .eq("location_id", selected.id)
        .limit(1);

      if (fetchError) {
        console.error(fetchError);
        alert("Failed to fetch existing assignments.");
        return;
      }

      if (existing && existing.length > 0) {
        // Update the existing assignment (e.g., refresh the timestamp)
        const { data, error } = await supabase
          .from("assignments")
          .update({ assigned_at: new Date().toISOString() }) // update timestamp
          .eq("id", existing[0].id)
          .select("*");

        if (error) {
          console.error("Error updating assignment:", error);
          alert("Could not update assignment.");
        } else {
          console.log("Assignment updated:", data);
          alert("Assignment updated successfully.");
        }
      } else {
        // Insert a new assignment
        const { data, error } = await supabase
          .from("assignments")
          .insert([
            {
              user_id: user.id,
              //@ts-expect-error any
              location_id: selected.id,
              location_name: selected.name,
              location_address: selected.address,
              location_number: selected.number,
              assigned_at: new Date().toISOString(),
            },
          ])
          .select("*");

        if (error) {
          console.error("Error logging assignment:", error);
          alert("Could not save assignment.");
        } else {
          console.log("Assignment logged:", data);
          alert("Assigned successfully.");
        }
      }
    } catch (err) {
      console.error("Unexpected error logging assignment:", err);
    }
  };

  return (
    <div className="h-full w-full relative">
      <div
        dir={lang === "en" ? "ltr" : "rtl"}
        className="w-full flex items-center justify-start text-white bg-primary text-xl p-4 h-[9vh] font-semibold gap-5 pt-12">
        <Menu onClick={() => setSide(true)} />
        <span className="capitalize">{user?.name}</span>
      </div>
      <div
        dir={lang === "en" ? "ltr" : "rtl"}
        className="w-full flex items-center justify-between bg-secondary p-4 h-[6.5vh] relative">
        {activate && (
          <Hand
            className={`absolute w-16 ${
              lang === "en"
                ? "left-[22%] -bottom-10"
                : "right-[13%] rotate-45 -bottom-12"
            } z-50 animate__animated animate__fadeIn animate__faster`}
          />
        )}
        <div className="flex items-center justify-center gap-3 text-white text-xs">
          <span>
            {lang === "en"
              ? "Not Active"
              : lang === "ar"
              ? "غير فعال"
              : "چالاک نییە"}
          </span>
          <Switch
            dir="ltr"
            className={`bg-white ${lang !== "en" ? "rotate-180" : ""}`}
            checked={active}
            onCheckedChange={() => {
              setActive(!active);
              setActivate(false);
            }}
          />
          <span>
            {lang === "en" ? "Active" : lang === "ar" ? "فعال" : "چالاک"}
          </span>
        </div>
        <div className="text-white flex items-center justify-center gap-2">
          <span>
            {lang === "en" ? "Date" : lang === "ar" ? "التاريخ" : "ڕێکەوت"}:
          </span>
          <span>{formatDate(date)}</span>
        </div>
      </div>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          longitude: 44.009167,
          latitude: 36.191113,
          zoom: 10,
        }}
        style={{ width: "100vw", height: "70vh", position: "relative" }}
        mapStyle="mapbox://styles/mapbox/streets-v9">
        {userLocation && active && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="center">
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "blue",
                borderRadius: "50%",
                border: "2px solid white",
              }}
            />
          </Marker>
        )}
        {locations.map((location) => (
          <Marker
            longitude={location.longitude}
            latitude={location.latitude}
            onClick={() => {
              setSelected(location);
              if (mapRef.current) {
                //@ts-expect-error any
                const map = mapRef.current.getMap(); // get underlying mapbox-gl instance
                map.flyTo({
                  center: [location.longitude, location.latitude],
                  zoom: 15,
                  essential: true, // this ensures animation works even with reduced motion
                });
              }
            }}
          />
        ))}
        <Button
          onClick={assign}
          className="absolute bottom-4 right-4 rounded-full size-12 z-30 shadow-xl">
          <MapPin className="size-6" />
        </Button>
      </Map>
      <div className="w-full h-[14.5vh] bg-primary p-4 px-6 flex items-center justify-center">
        <div className="h-full w-2/3 flex flex-col items-start justify-start gap-2 text-white">
          <div className="w-full flex items-center justify-start gap-2">
            <HouseIcon />
            <span>{selected?.name}</span>
          </div>
          <div className="w-full flex items-center justify-start gap-2">
            <TimeIcon />
            <span>
              {selected?.time ? formatDateTime(selected.time) : "No time"}
            </span>
          </div>
          <div className="w-full flex items-center justify-start gap-2">
            <AddressIcon />
            <span>{selected?.address}</span>
          </div>
        </div>
        <div className="h-full w-1/3 flex items-center justify-between flex-col text-white text-lg">
          <span>{selected?.number}</span>
          <Button
            onClick={logAssignment}
            variant={"secondary"}
            className="text-white rounded-none">
            Assign
          </Button>
        </div>
      </div>
      {side && (
        <div className="w-full h-full absolute top-0 left-0 flex z-50 animate__animated animate__fadeIn animate__faster backdrop-blur-xs">
          <div className="w-[55%] h-full bg-secondary animate__animated animate__slideInLeft animate__faster p-4 py-10">
            <img src={Logo} className="w-full" alt="" />
            <div className="w-full h-full flex flex-col items-start justify-start text-white pt-40 px-8 text-xl gap-3">
              <button
                onClick={() => {
                  setSide(false);
                  toggleReportOpen();
                }}
                className="flex items-center justify-center gap-1">
                <ReportIcon />
                {lang === "en" ? "Report" : lang === "ar" ? "تقرير" : "ڕاپۆرت"}
              </button>
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
                  //setUser(null);
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
      {reportOpen && (
        <div
          onClick={toggleReportOpen}
          className="absolute inset-0 bg-black/20 z-50 flex justify-center items-center">
          {/* Modal Card */}
          <Card
            dir={lang === "en" ? "ltr" : "rtl"}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-4/5 h-fit p-5 flex flex-col gap-5 relative">
            {/* Close button */}
            <div className="flex justify-end">
              <button onClick={toggleReportOpen} className="text-black text-lg">
                X
              </button>
            </div>

            {/* Header */}
            <h2 className="text-[#004F3D] text-center text-2xl font-semibold">
              {lang === "en"
                ? "Report an issue or request information"
                : lang === "ar"
                ? "الإبلاغ عن مشكلة أو طلب معلومات"
                : "ڕاپۆرتی کێشەیەک بکە یان داوای زانیاری بکە"}
            </h2>

            {/* Report type selector */}
            <div className="flex justify-between items-center w-full">
              <span className="text-gray-500">
                {lang === "en"
                  ? "I would like to"
                  : lang === "ar"
                  ? "أرغب أن"
                  : "حەز دەکەم..."}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="border border-gray-300 rounded px-2 py-1 flex items-center justify-center gap-1">
                    {reportType === "Bug"
                      ? lang === "en"
                        ? "Report a Bug"
                        : lang === "ar"
                        ? "الإبلاغ عن خطأ"
                        : "ڕاپۆرتی هەڵەیەک بکە"
                      : lang === "en"
                      ? "Request Information"
                      : lang === "ar"
                      ? "طلب معلومات"
                      : "داوای زانیاری بکە"}{" "}
                    <ChevronDown className="text-muted" strokeWidth={1} />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReportType("Bug")}>
                    {lang === "en"
                      ? "Report a Bug"
                      : lang === "ar"
                      ? "الإبلاغ عن خطأ"
                      : "ڕاپۆرتی هەڵەیەک بکە"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setReportType("Info")}>
                    {lang === "en"
                      ? "Request Information"
                      : lang === "ar"
                      ? "طلب معلومات"
                      : "داوای زانیاری بکە"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title input */}
            <div className="flex flex-col gap-1">
              <label className="text-[#004F3D] text-lg">
                {lang === "en" ? "Title" : lang === "ar" ? "عنوان" : "ناونیشان"}
              </label>
              <input
                className="border border-gray-300 rounded px-2 py-1 w-full"
                placeholder="Enter title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description textarea */}
            <div className="flex flex-col gap-1">
              <label className="text-[#004F3D] text-lg">
                {lang === "en"
                  ? "Description"
                  : lang === "ar"
                  ? "وصف"
                  : "وەسفی"}
              </label>
              <textarea
                className="border border-gray-300 rounded px-2 py-1 w-full h-24"
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Submit button */}
            <Button
              variant={"secondary"}
              onClick={addReport}
              className="w-full rounded-none mt-10 text-white">
              {lang === "en" ? "Submit" : lang === "ar" ? "إرسال" : "بکەرەوە"}
            </Button>
          </Card>
        </div>
      )}
      <Dialog
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">
            Add Location
          </Dialog.Title>

          <input
            type="text"
            placeholder="Name"
            value={newLocationInfo.name}
            onChange={(e) =>
              setNewLocationInfo({ ...newLocationInfo, name: e.target.value })
            }
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          <input
            type="text"
            placeholder="Address"
            value={newLocationInfo.address}
            onChange={(e) =>
              setNewLocationInfo({
                ...newLocationInfo,
                address: e.target.value,
              })
            }
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          <div>
            <button
              type="button"
              className="w-full border border-gray-300 rounded px-3 py-2 text-left"
              onClick={() => setShowTimePicker(!showTimePicker)}>
              Time: {formatDateTime(newLocationInfo.time)}
            </button>
            {showTimePicker && (
              <DatePicker
                selected={newLocationInfo.time}
                //@ts-expect-error any
                onChange={(date: Date) =>
                  setNewLocationInfo({ ...newLocationInfo, time: date })
                }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="h:mm aa"
                className="mt-2 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            )}
          </div>

          <button
            className="w-full bg-teal-500 text-white rounded px-3 py-2 hover:bg-teal-600"
            onClick={() => saveNewLocation()}>
            Assign
          </button>

          <button
            className="w-full border border-red-500 text-red-500 rounded px-3 py-2 hover:bg-red-50"
            onClick={() => setModalVisible(false)}>
            Cancel
          </button>
        </Dialog.Panel>
      </Dialog>
      {activate && (
        <div
          onClick={() => setActivate(false)}
          className="bg-white shadow-md flex flex-col items-center justify-center gap-5 absolute top-1/5 left-1/2 -translate-x-1/2 w-3/4 p-5 animate__animated animate__fadeIn animate__faster">
          <div className="p-2 aspect-square rounded-full bg-yellow-300">
            <Info />
          </div>
          <p className="text-center">
            {lang === "en"
              ? "Please active your account before. check the pointer above!"
              : lang === "ar"
              ? "يرجى تفعيل حسابك قبل المحاولة. تحقق من المؤشر في الأعلى!"
              : "تکایە بەکارھێنەری پێش بکە. بۆ چوونەژوورەوە بۆ ئەم پێشوورەیەکە ببینیت!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Sales;
