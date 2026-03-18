"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import supabase, { supabaseAdmin } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, RefreshCcw } from "lucide-react";
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

const GOOGLE_MAPS_API_KEY = "AIzaSyCxIXkR86N8Y4iyKsy8UNQpSXQ1_QS0BlA";

const containerStyle = {
  width: "100%",
  height: "70vh",
  position: "relative" as const,
};

export default function Assignments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [assignments, setAssignments] = useState<UserLocation[]>([]);
  const [selected, setSelected] = useState<UserLocation | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState<string>("default");

  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const { ErrorDialogComponent, showError } = useErrorDialog();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const mapCenter =
    mapKey !== "default" && selected
      ? { lat: selected.latitude, lng: selected.longitude }
      : userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude }
        : { lat: 36.191113, lng: 44.009167 };

  const mapZoom = mapKey !== "default" ? 15 : 10;

  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [actualPath, setActualPath] = useState<LocationPoint[]>([]);
  const [showActualPath, setShowActualPath] = useState(false);
  const [calculatedPath, setCalculatedPath] = useState<google.maps.LatLng[]>(
    [],
  );

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

  const fetchRoute = async (
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral,
  ) => {
    if (!mapRef.current) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const path = result.routes[0].overview_path.map(
            (point) => new google.maps.LatLng(point.lat(), point.lng()),
          );
          setCalculatedPath(path);
        } else {
          console.error("Directions request failed:", status);
        }
      },
    );
  };

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

  /*const pathToLatLng = (points: LocationPoint[]): google.maps.LatLng[] => {
    return points.map(
      (point) => new google.maps.LatLng(point.latitude, point.longitude),
    );
  };*/
  const pathToLatLng = (
    points: LocationPoint[],
    maxDistanceMeters = 50,
  ): google.maps.LatLng[] => {
    const newPoints: google.maps.LatLng[] = [];

    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const haversineDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const R = 6371000; // meters
      const φ1 = toRadians(lat1);
      const φ2 = toRadians(lat2);
      const Δφ = toRadians(lat2 - lat1);
      const Δλ = toRadians(lon2 - lon1);
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      newPoints.push(new google.maps.LatLng(p1.latitude, p1.longitude));

      if (i === points.length - 1) break;

      const p2 = points[i + 1];
      const distance = haversineDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude,
      );

      // if distance > maxDistanceMeters, interpolate intermediate points
      if (distance > maxDistanceMeters) {
        const numSteps = Math.ceil(distance / maxDistanceMeters);
        for (let step = 1; step < numSteps; step++) {
          const lat =
            p1.latitude + ((p2.latitude - p1.latitude) / numSteps) * step;
          const lng =
            p1.longitude + ((p2.longitude - p1.longitude) / numSteps) * step;
          newPoints.push(new google.maps.LatLng(lat, lng));
        }
      }
    }

    return newPoints;
  };
  const getPreviousAssignment = (
    selectedId: string | number,
  ): UserLocation | null => {
    const selectedIndex = assignments.findIndex((a) => a.id === selectedId);
    if (selectedIndex === -1 || selectedIndex === assignments.length - 1) {
      return null;
    }
    return assignments[selectedIndex + 1];
  };

  useEffect(() => {
    if (!selected) return;

    const getRoute = async () => {
      const previousAssignment = getPreviousAssignment(selected.id);
      let startLocation: UserLocation | null = null;

      if (previousAssignment) {
        startLocation = previousAssignment;
      } else if (userLocation) {
        startLocation = userLocation;
      } else if (latest) {
        const latestAssignment = assignments.find((a) => a.id === latest);
        if (latestAssignment) {
          startLocation = latestAssignment;
        }
      }

      if (startLocation) {
        try {
          if (user && previousAssignment) {
            const matchingRoute = userRoutes.find(
              (route) =>
                route.assignment_start_id === previousAssignment.id &&
                route.assignment_end_id === selected.id,
            );

            if (matchingRoute) {
              console.log("Found matching route:", matchingRoute);
              await fetchActualPath(matchingRoute.id);
              setShowActualPath(true);
              setCalculatedPath([]);
              return;
            } else {
              console.log("No matching route found");
            }
          }

          setShowActualPath(false);
          setActualPath([]);
          await fetchRoute(
            { lat: startLocation.latitude, lng: startLocation.longitude },
            { lat: selected.latitude, lng: selected.longitude },
          );
        } catch (error) {
          console.error("Error fetching route:", error);
          showError("Failed to fetch route");
        }
      }
    };

    getRoute();
  }, [assignments, selected, latest, userLocation, userRoutes]);

  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleMarkerClick = (a: UserLocation) => {
    if (mapKey !== String(a.id)) {
      setCalculatedPath([]);
      setActualPath([]);
      setShowActualPath(false);
      setMapKey(String(a.id));
    }
    setSelected(a);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center">
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full h-full">
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
              Loc. <ChevronDown />
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
                  <DropdownMenuItem onClick={() => handleMarkerClick(a)}>
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
            }}>
            <RefreshCcw />
          </Button>
        </div>

        <GoogleMap
          key={mapKey}
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onLoad}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
          }}>
          {userLocation && (
            <Marker
              position={{
                lat: userLocation.latitude,
                lng: userLocation.longitude,
              }}
              //animation={google.maps.Animation.BOUNCE}
              icon={{
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <style>
          .pulse {
            animation: pulse 1.5s infinite;
            transform-origin: center;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.5); opacity: 0.2; }
            100% { transform: scale(1); opacity: 0.6; }
          }
        </style>
        <circle cx="12" cy="12" r="6" fill="#00CAA8"/>
        <circle class="pulse" cx="12" cy="12" r="10" fill="#00CAA8"/>
      </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
              }}
            />
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
                position={{ lat: a.latitude, lng: a.longitude }}
                onClick={() => handleMarkerClick(a)}
                icon={{
                  url:
                    a.id === latest
                      ? "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#14B8A6" stroke="#0D9488" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3" fill="#fff"/>
                        </svg>
                      `)
                      : "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(`
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

          {calculatedPath.length > 0 && selected && (
            <Polyline
              key={`calculated-${selected.id}`}
              path={calculatedPath}
              options={{
                strokeColor: "#00CAA8",
                strokeOpacity: 1,
                strokeWeight: 6,
                geodesic: true,
              }}
            />
          )}

          {showActualPath && actualPath.length > 1 && selected && (
            <>
              <Polyline
                key={`actual-${selected.id}`}
                path={pathToLatLng(actualPath, 50)} // fill gaps up to 50 meters
                options={{
                  strokeColor: "#ef4444",
                  strokeOpacity: 0.9,
                  strokeWeight: 5,
                  geodesic: true,
                }}
              />
              {actualPath.slice(0, -1).map((point, index) => {
                const speed = point.speed || 0;
                let color = "#22c55e";
                if (speed < 5) color = "#ef4444";
                else if (speed < 10) color = "#f59e0b";
                else if (speed > 20) color = "#3b82f6";

                return (
                  <Polyline
                    key={`speed-${selected.id}-${index}`}
                    path={[
                      {
                        lat: actualPath[index].latitude,
                        lng: actualPath[index].longitude,
                      },
                      { lat: point.latitude, lng: point.longitude },
                    ]}
                    options={{
                      strokeColor: color,
                      strokeOpacity: 0.7,
                      strokeWeight: 2,
                      geodesic: true,
                    }}
                  />
                );
              })}
            </>
          )}
        </GoogleMap>

        <div className="w-full h-[15vh] bg-primary p-4 px-6 flex items-center justify-center">
          {calculatedPath.length > 0 && selected ? (
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
