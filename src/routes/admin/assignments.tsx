"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import supabase, { supabaseAdmin } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, MapPin } from "lucide-react";
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

type UserRoute = {
  id: string;
  user_id: string;
  assignment_start_id: string;
  assignment_end_id: string;
  start_time: string;
  end_time: string;
  total_distance: number;
  total_duration: number;
  route_status: string;
};

type LocationPoint = {
  id: string;
  user_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  journey_sequence: number;
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

  // Route tracking state
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [actualPath, setActualPath] = useState<LocationPoint[]>([]);
  const [showActualPath, setShowActualPath] = useState(false);

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
        },
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
          await fetchUserRoutes(selectedUser.id);
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

  // Fetch user routes
  const fetchUserRoutes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_routes")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching routes:", error);
        showError("Failed to load user routes");
        return;
      }

      setUserRoutes(data || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
      showError("Failed to load user routes");
    }
  };

  // Fetch actual path for a specific route
  const fetchActualPath = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_location_points")
        .select("*")
        .eq("route_id", routeId)
        .order("journey_sequence", { ascending: true });

      if (error) {
        console.error("Error fetching path:", error);
        showError("Failed to load actual path");
        return;
      }

      setActualPath(data || []);
    } catch (error) {
      console.error("Error fetching path:", error);
      showError("Failed to load actual path");
    }
  };

  // Convert actual path to GeoJSON
  const pathToGeoJSON = (points: LocationPoint[]): GeoJSON.LineString => {
    const coordinates = points.map((point) => [
      point.longitude,
      point.latitude,
    ]);
    return {
      type: "LineString",
      coordinates: coordinates,
    };
  };

  // Calculate path quality
  const assessPathQuality = (points: LocationPoint[]): string => {
    if (points.length === 0) return "No data";

    const avgAccuracy =
      points.reduce((sum, p) => sum + p.accuracy, 0) / points.length;

    if (avgAccuracy < 10 && points.length > 50) return "Excellent";
    if (avgAccuracy < 20 && points.length > 20) return "Good";
    if (avgAccuracy < 50) return "Fair";
    return "Poor";
  };

  // Find the assignment that comes before the selected one
  const getPreviousAssignment = (
    selectedId: string | number,
  ): UserLocation | null => {
    const selectedIndex = assignments.findIndex((a) => a.id === selectedId);
    if (selectedIndex === -1 || selectedIndex === assignments.length - 1) {
      return null;
    }
    return assignments[selectedIndex + 1]; // assignments are sorted by created_at descending
  };

  useEffect(() => {
    if (!selected) return;

    const getRoute = async () => {
      const previousAssignment = getPreviousAssignment(selected.id);
      let startLocation: UserLocation | null = null;

      // Try to use previous assignment as start point
      if (previousAssignment) {
        startLocation = previousAssignment;
      } else if (userLocation) {
        // Fall back to current user location
        startLocation = userLocation;
      } else if (latest) {
        // Fall back to latest assignment
        const latestAssignment = assignments.find((a) => a.id === latest);
        if (latestAssignment) {
          startLocation = latestAssignment;
        }
      }

      if (startLocation) {
        try {
          // First try to find a user route between these locations
          if (user && previousAssignment) {
            const matchingRoute = userRoutes.find(
              (route) =>
                route.assignment_start_id ===
                  previousAssignment.id.toString() &&
                route.assignment_end_id === selected.id.toString(),
            );

            if (matchingRoute) {
              // Fetch the actual path for this route
              await fetchActualPath(matchingRoute.id);
              setShowActualPath(true);
              setRoute(null); // Hide calculated route when showing actual path
              return;
            }
          }

          // If no actual route found, fall back to calculated route
          setShowActualPath(false);
          setActualPath([]);
          const geometry = await fetchRoute(
            [startLocation.longitude, startLocation.latitude],
            [selected.longitude, selected.latitude],
          );
          setRoute(geometry);
        } catch (error) {
          console.error("Error fetching route:", error);
          showError("Failed to fetch route");
        }
      }
    };

    getRoute();
  }, [assignments, selected, latest, userLocation, userRoutes]);

  const isStale =
    userLocation &&
    now - new Date(userLocation.created_at).getTime() > 2 * 60 * 1000;

  const [date, setDate] = useState<Date | undefined>(new Date());

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
            <DropdownMenuTrigger className="text-white font-medium border p-2 rounded-md flex items-center justify-center gap-1 border-white/50">
              {
                assignments.filter((a) =>
                  date
                    ? formatDateTime(a.created_at).split(",")[0] ===
                      formatDateTime(date.toISOString()).split(",")[0]
                    : true,
                ).length
              }{" "}
              Locations <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {assignments
                .filter((a) =>
                  date
                    ? formatDateTime(a.created_at).split(",")[0] ===
                      formatDateTime(date.toISOString()).split(",")[0]
                    : true,
                )
                .map((a) => (
                  <DropdownMenuItem onClick={() => setSelected(a)}>
                    {a.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-white font-medium border p-2 rounded-md flex items-center justify-center gap-1 border-white/50">
              {date
                ? `${date.getFullYear()}/${
                    date.getMonth() + 1
                  }/${date.getDate()}`
                : "Select Date"}{" "}
              <ChevronDown />
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
            onClick={() => {
              if (user) {
                getAssignments(user.id);
                fetchUserRoutes(user.id);
              }
            }}
          >
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
          mapStyle="mapbox://styles/mapbox/streets-v9"
        >
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <>
                <div
                  className={`size-4 rounded-full cursor-pointer ${
                    isStale ? "bg-neutral-500" : "bg-[#00CAA8]"
                  } absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20`}
                />
                <div
                  className={`size-7 rounded-full cursor-pointer aspect-square ${
                    isStale ? "bg-neutral-500" : "bg-[#00CAA8]"
                  } absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping`}
                ></div>
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
                : true,
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
                }}
              >
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
          {/* Line between user and selected assignment (calculated route) */}
          {route && (
            <Source
              id="route-source"
              type="geojson"
              data={{
                type: "Feature",
                geometry: route,
                properties: {},
              }}
            >
              <Layer
                id="route-layer"
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#00CAA8",
                  "line-width": showActualPath ? 3 : 6,
                  "line-opacity": showActualPath ? 0.5 : 1,
                  "line-dasharray": showActualPath ? [2, 2] : [1, 0], // Dashed when showing actual path
                }}
              />
            </Source>
          )}

          {/* Actual road path taken by employee */}
          {showActualPath && actualPath.length > 1 && (
            <Source
              id="actual-path-source"
              type="geojson"
              data={{
                type: "Feature",
                geometry: pathToGeoJSON(actualPath),
                properties: {
                  "path-quality": assessPathQuality(actualPath),
                  "point-count": actualPath.length,
                },
              }}
            >
              <Layer
                id="actual-path-layer"
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#ef4444", // Red for actual path
                  "line-width": 5,
                  "line-opacity": 0.9,
                }}
              />
            </Source>
          )}

          {/* Speed-based coloring for actual path */}
          {showActualPath &&
            actualPath.length > 1 &&
            actualPath.map((point, index) => {
              if (index === 0) return null;
              const speed = point.speed || 0;
              let color = "#22c55e"; // Green for normal speed
              if (speed < 5)
                color = "#ef4444"; // Red for slow/stopped
              else if (speed < 10)
                color = "#f59e0b"; // Orange for slow
              else if (speed > 20) color = "#3b82f6"; // Blue for fast

              return (
                <Source
                  key={`speed-${index}`}
                  id={`speed-source-${index}`}
                  type="geojson"
                  data={{
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: [
                        [
                          actualPath[index - 1].longitude,
                          actualPath[index - 1].latitude,
                        ],
                        [point.longitude, point.latitude],
                      ],
                    },
                    properties: {},
                  }}
                >
                  <Layer
                    id={`speed-layer-${index}`}
                    type="line"
                    layout={{
                      "line-join": "round",
                      "line-cap": "round",
                    }}
                    paint={{
                      "line-color": color,
                      "line-width": 2,
                      "line-opacity": 0.7,
                    }}
                  />
                </Source>
              );
            })}
        </Map>

        {/* Bottom Info Card */}
        <div className="w-full h-[15vh] bg-primary p-4 px-6 flex items-center justify-center">
          {route && selected ? (
            <>
              <div className="h-full w-2/3 flex flex-col items-start justify-start gap-2 text-white">
                <div className="w-full flex items-center justify-start gap-2">
                  <span className="text-sm text-gray-300">
                    From{" "}
                    {getPreviousAssignment(selected.id)?.name ||
                      "Current Location"}{" "}
                    to {selected.name}
                  </span>
                </div>
                <div className="w-full flex items-center justify-start gap-2">
                  <HouseIcon />
                  <span>{selected.name}</span>
                </div>
                <div className="w-full flex items-center justify-start gap-2">
                  <TimeIcon />
                  <span>
                    {selected.created_at
                      ? formatDateTime(selected.created_at)
                      : "No time"}
                  </span>
                </div>
              </div>
              <div className="h-full w-1/3 flex items-center justify-between flex-col text-white text-lg">
                <span>{selected?.number}</span>
              </div>
            </>
          ) : selected ? (
            <>
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
            </>
          ) : (
            <div className="text-white text-lg">
              Select an assignment to view route
            </div>
          )}
        </div>
      </div>
      <ErrorDialogComponent />
    </>
  );
}
