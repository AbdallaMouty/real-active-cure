import store, { authStore } from "@/lib/store";
import supabase from "@/utils/supabase";
import { ChevronDown, Info, MapPin, Menu } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
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
import { useErrorDialog } from "@/hooks/use-error-dialog";

const GOOGLE_MAPS_API_KEY = "AIzaSyCxIXkR86N8Y4iyKsy8UNQpSXQ1_QS0BlA";

const containerStyle = {
  width: "100vw",
  height: "70vh",
  position: "relative" as const,
};

const center = {
  lat: 36.191113,
  lng: 44.009167,
};

const Sales = () => {
  const { active, setActive, reportOpen, toggleReportOpen, lang, setLang } =
    store();
  const { user, setUser, setPassword } = authStore();
  const { showError, showSuccess, ErrorDialogComponent } = useErrorDialog();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const [currentRoute, setCurrentRoute] = useState<{
    id: string;
    startTime: Date;
  } | null>(null);
  const [locationPointCounter, setLocationPointCounter] = useState(0);

  const langs = [
    { name: "English", flag: en, value: "en" },
    { name: "Arabic", flag: ar, value: "ar" },
    { name: "Kurdish", flag: kr, value: "kr" },
  ];

  const date = new Date();
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLocationInfo, setNewLocationInfo] = useState({
    name: "",
    address: "",
    time: date,
  });
  const [locations, setLocations] = useState<
    {
      id: string;
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

  const currentRouteRef = useRef(currentRoute);
  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  const locationPointCounterRef = useRef(locationPointCounter);
  useEffect(() => {
    locationPointCounterRef.current = locationPointCounter;
  }, [locationPointCounter]);

  useEffect(() => {
    let watchId: string | number | null = null;

    const initLocationTracking = async () => {
      if (!active || !user?.id) return;

      const permission = await Geolocation.requestPermissions();
      if (permission.location === "denied") {
        showError(
          "Location permission denied. Please enable it to continue.",
          "Permission Required",
        );
        return;
      }

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
        showError("Failed to get current location. Please check your GPS settings.", "Location Error");
      }

      watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 5000,
        },
        async (position, err) => {
          if (err) {
            console.error("Location tracking error:", err);
            showError("Location tracking encountered an error. Please check your GPS settings.", "GPS Error");
            return;
          }
          if (position) {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });

            const accuracy = position.coords.accuracy || 0;
            const speed = position.coords.speed || 0;
            const heading = position.coords.heading || 0;
            const timestamp = new Date().toISOString();

            await supabase.from("user_locations").upsert({
              user_id: user.id,
              latitude,
              longitude,
              updated_at: timestamp,
              accuracy,
              speed,
              heading,
            });

            if (currentRouteRef.current) {
              await supabase.from("user_location_points").insert({
                user_id: user.id,
                route_id: currentRouteRef.current.id,
                latitude,
                longitude,
                accuracy,
                speed,
                heading,
                timestamp,
                journey_sequence: locationPointCounterRef.current,
              });
              setLocationPointCounter((prev) => prev + 1);
            }
          }
        },
      );
    };

    initLocationTracking();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch({ id: watchId.toString() });
      }
    };
  }, [active, user?.id]);

  const [side, setSide] = useState(false);
  const [activate, setActivate] = useState(false);

  const getLocations = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        showError("Failed to fetch locations", "Error");
      } else {
        setLocations(data || []);
      }
    } catch (error) {
      console.error("Error getting locations:", error);
      showError("Failed to fetch locations", "Error");
    }
  };

  useEffect(() => {
    getLocations();
  }, [user]);

  const startRoute = async (startLocationId: string) => {
    if (!user) return;

    try {
      const { data: route } = await supabase
        .from("user_routes")
        .insert({
          user_id: user.id,
          assignment_start_id: startLocationId,
          start_time: new Date().toISOString(),
          route_status: "active",
        })
        .select()
        .single();

      if (route) {
        setCurrentRoute({ id: route.id, startTime: new Date() });
        setLocationPointCounter(0);
        showSuccess("Route tracking started");
      }
    } catch (error) {
      console.error("Error starting route:", error);
      showError("Failed to start route tracking", "Error");
    }
  };

  const endRoute = async (endLocationId: string) => {
    if (!currentRoute) return;

    try {
      const { data: points } = await supabase
        .from("user_location_points")
        .select("*")
        .eq("route_id", currentRoute.id)
        .order("journey_sequence");

      if (points && points.length > 1) {
        const distance = calculateTotalDistance(points);
        const duration = Math.floor(
          (new Date().getTime() - currentRoute.startTime.getTime()) / 1000,
        );

        await supabase
          .from("user_routes")
          .update({
            assignment_end_id: endLocationId,
            end_time: new Date().toISOString(),
            total_distance: distance,
            total_duration: duration,
            route_status: "completed",
          })
          .eq("id", currentRoute.id);

        showSuccess(
          `Route completed: ${Math.round(distance)}m in ${Math.round(duration / 60)}min`,
        );
      }

      setCurrentRoute(null);
      setLocationPointCounter(0);
    } catch (error) {
      console.error("Error ending route:", error);
      showError("Failed to end route tracking", "Error");
    }
  };

  type Point = {
    latitude: number;
    longitude: number;
  };

  const calculateTotalDistance = (points: Point[]) => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const distance = haversineDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude,
      );
      totalDistance += distance;
    }
    return totalDistance;
  };

  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const [selected, setSelected] = useState<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    address: string;
    time: Date;
    number: string;
  } | null>(locations[0]);
  const [reportType, setReportType] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  async function getCurrentLocation() {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location === "denied") {
        showError("Location permission denied", "Permission Required");
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      //@ts-expect-error any
      setLocation(position);
    } catch (error) {
      console.error("Error getting location:", error);
      showError("Failed to get current location", "Location Error");
    }
  }

  useEffect(() => {
    getCurrentLocation();
  }, []);

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

  const assign = async () => {
    if (!active) {
      setActivate(true);
      return;
    }
    if (!location) {
      showError("Location not available yet.", "Location Unavailable");
      return;
    }
    if (!location?.coords) {
      showError("Location not ready.", "Location Error");
      return;
    }

    const newLoc = {
      id: "temp_" + Date.now(),
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
        mapRef.current.panTo({ lat: newLoc.latitude, lng: newLoc.longitude });
        mapRef.current.setZoom(15);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveNewLocation = async () => {
    if (!userLocation) {
      showError("No current location available.", "Location Required");
      return;
    }

    try {
      const newLocationData = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        ...newLocationInfo,
        number: user?.phone || "",
      };

      const { data, error } = await supabase
        .from("locations")
        .insert([newLocationData])
        .select("*");
      if (data) {
        const updatedLoc = data[0];
        setLocations([...locations, updatedLoc]);
        setModalVisible(false);
        setNewLocationInfo({ name: "", address: "", time: date });
        setSelected(updatedLoc);
      } else {
        console.error(error);
        showError("an error occured", "Error");
      }
    } catch (error) {
      console.error("Error saving location:", error);
      showError("Failed to save location.", "Error");
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
    try {
      const { data, error } = await supabase
        .from("reports")
        .insert([
          {
            title,
            description,
            user_id: user?.id,
            type: reportType,
            sender: user?.email.split("@")[0],
          },
        ])
        .select("*");

      if (data) {
        toggleReportOpen();
      } else {
        console.log(error);
        showError("an error occured", "Error");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      showError("an error occured", "Error");
    }
  };

  const logAssignment = async () => {
    if (!selected || !user) {
      showError("Missing user or location.", "Validation Error");
      return;
    }

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .eq("location_id", selected.id)
        .limit(1);

      if (fetchError) {
        console.error(fetchError);
        showError("Failed to fetch existing assignments.", "Database Error");
        return;
      }

      if (existing && existing.length > 0) {
        const { data, error } = await supabase
          .from("assignments")
          .update({ assigned_at: new Date().toISOString() })
          .eq("id", existing[0].id)
          .select("*");

        if (error) {
          console.error("Error updating assignment:", error);
          showError("Could not update assignment.", "Database Error");
        } else {
          console.log("Assignment updated:", data);
          showSuccess("Assignment updated successfully.", "Success");
        }
      } else {
        if (currentRoute) {
          await endRoute(selected.id);
        }

        const { data, error } = await supabase
          .from("assignments")
          .insert([
            {
              user_id: user.id,
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
          showError("Could not save assignment.", "Database Error");
        } else {
          console.log("Assignment logged:", data);
          showSuccess("Assigned successfully.", "Success");

          await startRoute(selected.id);
        }
      }
    } catch (err) {
      console.error("Unexpected error logging assignment:", err);
      showError("An unexpected error occurred.", "Error");
    }
  };

  const handleMarkerClick = (location: typeof locations[0]) => {
    setSelected(location);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
      mapRef.current.setZoom(15);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div
        dir={lang === "en" ? "ltr" : "rtl"}
        className="w-full flex items-center justify-start text-white bg-primary text-xl p-4 h-[9vh] font-semibold gap-5 pt-12"
      >
        <Menu onClick={() => setSide(true)} />
        <span className="capitalize">
          {user?.email.split("@")[0].replaceAll("_", " ")}
        </span>
      </div>
      <div
        dir={lang === "en" ? "ltr" : "rtl"}
        className="w-full flex items-center justify-between bg-secondary p-4 h-[6.5vh] relative"
      >
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
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {userLocation && active && (
          <Marker
            position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#FFFF00",
              fillOpacity: 1,
              strokeColor: "#00CAA8",
              strokeWeight: 2,
            }}
          />
        )}
        {locations
          .filter((l) => {
            const locationDate = new Date(l.time);
            const today = new Date();
            return locationDate.toDateString() === today.toDateString();
          })
          .map((location) => (
            <Marker
              key={location.id}
              position={{ lat: location.latitude, lng: location.longitude }}
              onClick={() => handleMarkerClick(location)}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#14B8A6" stroke="#0D9488" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3" fill="#fff"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 32),
              }}
            />
          ))}
        <Button
          onClick={assign}
          className="absolute bottom-4 right-4 rounded-full size-12 z-30 shadow-xl"
        >
          <MapPin className="size-6" />
        </Button>
      </GoogleMap>
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
            className="text-white rounded-none"
          >
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
                className="flex items-center justify-center gap-1"
              >
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
                        className="w-full flex items-center justify-start gap-2"
                      >
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
                  setPassword(null);
                  navigate("/");
                }}
                className="flex items-center justify-center gap-1"
              >
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
          className="absolute inset-0 bg-black/20 z-50 flex justify-center items-center"
        >
          <Card
            dir={lang === "en" ? "ltr" : "rtl"}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-4/5 h-fit p-5 flex flex-col gap-5 relative"
          >
            <div className="flex justify-end">
              <button onClick={toggleReportOpen} className="text-black text-lg">
                X
              </button>
            </div>

            <h2 className="text-[#004F3D] text-center text-2xl font-semibold">
              {lang === "en"
                ? "Report an issue or request information"
                : lang === "ar"
                  ? "الإبلاغ عن مشكلة أو طلب معلومات"
                  : "ڕاپۆرتی کێشەیەک بکە یان داوای زانیاری بکە"}
            </h2>

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

            <Button
              variant={"secondary"}
              onClick={addReport}
              className="w-full rounded-none mt-10 text-white"
            >
              {lang === "en" ? "Submit" : lang === "ar" ? "إرسال" : "بکەرەوە"}
            </Button>
          </Card>
        </div>
      )}
      <Dialog
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
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
              onClick={() => setShowTimePicker(!showTimePicker)}
            >
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
            onClick={() => saveNewLocation()}
          >
            Assign
          </button>

          <button
            className="w-full border border-red-500 text-red-500 rounded px-3 py-2 hover:bg-red-50"
            onClick={() => setModalVisible(false)}
          >
            Cancel
          </button>
        </div>
      </Dialog>
      {activate && (
        <div
          onClick={() => setActivate(false)}
          className="bg-white shadow-md flex flex-col items-center justify-center gap-5 absolute top-1/5 left-1/2 -translate-x-1/2 w-3/4 p-5 animate__animated animate__fadeIn animate__faster"
        >
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
      <ErrorDialogComponent />
    </div>
  );
};

export default Sales;
