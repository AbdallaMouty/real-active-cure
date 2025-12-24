"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import supabase, { supabaseAdmin } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import HouseIcon from "@/components/icons/HouseIcon";
import TimeIcon from "@/components/icons/TimeIcon";
import AddressIcon from "@/components/AddressIcon";
import { useErrorDialog } from "@/hooks/use-error-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";

type User = {
  id: string;
  email: string;
};
type UserLocation = {
  id: string | number;
  user_id: string;
  latitude: number;
  longitude: number;
  name: string;
  created_at: string;
  address: string;
  number: string;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

export default function Assignments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef<MapRef | null>(null);
  const [assignments, setAssignments] = useState<UserLocation[]>([]);
  const [selected, setSelected] = useState<UserLocation | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [now, setNow] = useState(Date.now());
  const { ErrorDialogComponent, showError } = useErrorDialog();

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10_000); // every 10 seconds (cheap & enough)

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("last_user_location");
    if (cached) {
      try {
        setUserLocation(JSON.parse(cached));
      } catch {
        localStorage.removeItem("last_user_location");
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchInitialLocation = async () => {
      const { data } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const last = data[data.length - 1];
        setUserLocation(last);
        localStorage.setItem("last_user_location", JSON.stringify(last));
      }
    };

    fetchInitialLocation();

    const channel = supabase
      .channel("user-location")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_locations",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLoc = payload.new as UserLocation;
          setUserLocation(newLoc);
          localStorage.setItem("last_user_location", JSON.stringify(newLoc));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatDateTime = (dateInput: string) => {
    const date = new Date(dateInput);
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

  const getAssignments = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showError("Error loading assignments");
        return;
      }

      if (data && data.length > 0) {
        setAssignments(data as UserLocation[]);
        setLatest(data[0].id);
      }
    } catch {
      showError("Error loading assignments");
    }
  };

  useEffect(() => {
    const loadUserAndAssignments = async () => {
      setAssignments([]);
      setSelected(null);
      setLatest(null);

      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error || !data?.users) {
          showError("Please check your internet connection");
          return;
        }

        const selectedUser = data.users.find((u) => u.id === id) as User;
        setUser(selectedUser || null);

        if (selectedUser) {
          await getAssignments(selectedUser.id);
        }
      } catch {
        showError("Please check your internet connection");
      }
    };

    loadUserAndAssignments();
  }, [id]);

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    const res = await fetch(url);
    const data = await res.json();

    console.log("data:", data);
    return data.routes[0].geometry; // GeoJSON line
  };

  const [route, setRoute] = useState<GeoJSON.LineString | null>(null);

  useEffect(() => {
    if (!selected) return;
    const getRoute = async () => {
      if (userLocation) {
        const geometry = await fetchRoute(
          [userLocation.longitude, userLocation.latitude],
          [selected.longitude, selected.latitude]
        );
        setRoute(geometry);
      } else {
        const geometry = await fetchRoute(
          [
            assignments.filter((a) => a.id === latest)[0].longitude,
            assignments.filter((a) => a.id === latest)[0].latitude,
          ],
          [selected.longitude, selected.latitude]
        );
        setRoute(geometry);
      }
    };

    getRoute();
  }, [assignments, selected, latest]);

  const isStale =
    userLocation &&
    now - new Date(userLocation.created_at).getTime() > 2 * 60 * 1000;

  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <>
      <div className="flex flex-col w-full h-full">
        {/* Header */}
        <div className="w-full flex items-center justify-start text-white bg-primary text-xl p-4 h-[8.7vh] font-semibold gap-5 pt-12">
          <ChevronLeft onClick={() => navigate("/admin/tracking")} />
          <span className="capitalize">
            {user && user.email.replace("_", " ").split("@")[0]}
          </span>
        </div>
        <div className="flex justify-between items-center bg-emerald-900 px-6 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-white font-medium">
              {assignments.length} Assignments
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {assignments.map((a) => (
                <DropdownMenuItem onClick={() => setSelected(a)}>
                  {a.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-white font-medium">
              {date
                ? `${date.getFullYear()}/${
                    date.getMonth() + 1
                  }/${date.getDate()}`
                : "Select Date"}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-sm"
                captionLayout="dropdown"
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-teal-500 text-white hover:bg-teal-600"
            onClick={() => user && getAssignments(user.id)}>
            Refresh
          </Button>
        </div>

        {/* Map */}
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 44.009167,
            latitude: 36.191113,
            zoom: 10,
          }}
          style={{ width: "100%", height: "70vh", position: "relative" }}
          mapStyle="mapbox://styles/mapbox/streets-v9">
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center">
              <>
                <div
                  className={`size-4 rounded-full cursor-pointer ${
                    isStale ? "bg-neutral-500" : "bg-[#00CAA8]"
                  } absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20`}
                />
                <div
                  className={`size-7 rounded-full cursor-pointer aspect-square ${
                    isStale ? "bg-neutral-500" : "bg-[#00CAA8]"
                  } absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping`}></div>
                <div className="size-6 rounded-full cursor-pointer aspect-square bg-[#3DD9BE] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
                <div className="size-6 rounded-full cursor-pointer aspect-square bg-[#3DD9BE] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              </>
            </Marker>
          )}
          {assignments
            .filter((a) =>
              date
                ? formatDateTime(a.created_at).split(",")[0] ===
                  formatDateTime(date.toISOString()).split(",")[0]
                : true
            )
            .map((a) => (
              <Marker
                key={a.id}
                longitude={a.longitude}
                latitude={a.latitude}
                className="relative"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected(a);
                  if (mapRef.current) {
                    const map = mapRef.current.getMap();
                    map.flyTo({
                      center: [a.longitude, a.latitude],
                      zoom: 15,
                      essential: true,
                    });
                  }
                }}>
                {a.id !== latest && (
                  <MapPin className="fill-teal-500 text-teal-700 size-8" />
                )}
                {a.id === latest && (
                  <>
                    <MapPin className="fill-teal-500 text-teal-700 size-10 animate-pulse" />
                  </>
                )}
              </Marker>
            ))}
          {/* Line between user and selected assignment */}
          {route && (
            <Source
              id="route-source"
              type="geojson"
              data={{
                type: "Feature",
                geometry: route,
                properties: {},
              }}>
              <Layer
                id="route-layer"
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#00CAA8",
                  "line-width": 6,
                }}
              />
            </Source>
          )}
        </Map>

        {/* Bottom Info Card */}
        <div className="w-full h-[15vh] bg-primary p-4 px-6 flex items-center justify-center">
          <div className="h-full w-2/3 flex flex-col items-start justify-start gap-2 text-white">
            <div className="w-full flex items-center justify-start gap-2">
              <HouseIcon />
              <span>{selected?.name}</span>
            </div>
            <div className="w-full flex items-center justify-start gap-2">
              <TimeIcon />
              <span>
                {selected?.created_at
                  ? formatDateTime(selected.created_at)
                  : "No time"}
              </span>
            </div>
            <div className="w-full flex items-center justify-start gap-2">
              <AddressIcon />
              <span>{selected?.address}</span>
            </div>
          </div>
          <div className="h-full w-1/3 flex items-center justify-between flex-col text-white text-lg">
            <span>{selected?.number}</span>
          </div>
        </div>
      </div>
      <ErrorDialogComponent />
    </>
  );
}
