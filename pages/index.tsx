import type { NextPage } from "next";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Circle, GoogleMap, Marker, withScriptjs } from "react-google-maps";
import withGoogleMap from "react-google-maps/lib/withGoogleMap";
import styles from "../styles/Home.module.css";

function pickAndPop<T>(array: T[]) {
  if (array.length >= 1) {
    const index = (Math.random() * array.length) | 0;
    const valueToReturn = array[index];
    array[index] = array.pop()!;
    return valueToReturn;
  }
}

interface LatLng {
  lat: number;
  lng: number;
}

interface MapProps {
  circle: { radius: number; center: LatLng } | null;
  onChange?: () => void;
}

const Map = withScriptjs(
  withGoogleMap((props: MapProps) => (
    <GoogleMap
      key="1"
      defaultZoom={5}
      ref={props.onMapMounted}
      defaultCenter={{ lat: 59.95, lng: 10.5 }}
      options={{ gestureHandling: "greedy" }}
      onClick={(e) => {
        props.onChange?.(e.latLng);
      }}
    >
      {props.marker && (
        <Marker
          position={props.marker}
          draggable
          onDragEnd={(e) => props.onChange(e.latLng)}
        />
      )}
      {props.circle && (
        <Circle
          center={props.circle.center}
          options={{
            strokeColor: "#1c5dff",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#1c5dff",
            fillOpacity: 0.1,
          }}
          radius={props.circle.radius}
          onClick={(e) => {
            props.onChange?.(e.latLng);
          }}
        />
      )}
    </GoogleMap>
  ))
);

const Home: NextPage = () => {
  const [vehicles, setVehicles] = useState<any[] | null>(null);
  const [level, setLevel] = useState(0);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [circle, setCircle] = useState({
    center: { lat: 59.95, lng: 10.5 },
    radius: 600000,
  });
  const [gameState, setGameState] = useState<"playing" | "win" | "lose">(
    "playing"
  );
  const mapRef = useRef<any>(null);
  useEffect(() => {
    const now = new Date(+new Date() + 1000 * 60 * 60 * 24 * 14);
    fetch(
      `https://api.hyre.no/community_vehicle_stations/?start_time=${now.toISOString()}&end_time=${now.toISOString()}`
    )
      .then((x) => x.json())
      .then((data) => {
        const results = data.results;
        const vehicles = [];
        vehicles[0] = pickAndPop(results);
        setVehicles(vehicles);
      })
      .catch((error) => console.error(error));
  }, []);

  if (!vehicles) {
    return <div>Loading</div>;
  }

  const currentVehicle = vehicles[0];

  const answerPoint = {
    lat: currentVehicle.vehicle_station.parking_spot.point[1],
    lng: currentVehicle.vehicle_station.parking_spot.point[0],
  };

  return (
    <div
      style={{
        background: "#1c5dff",
        minHeight: "100vh",
        color: "white",
        fontSize: "white",
        lineHeight: "1.5",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 640 + 16 * 2,
          width: "100%",
          margin: "0 auto",
          background: "#1c5dff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src="/hyrdle.svg"
          alt=""
          style={{
            display: "block",
            marginTop: 32,
            marginBottom: 32,
          }}
        />
        {gameState === "playing" && (
          <>
            <div style={{ marginBottom: 32 }}>
              Where is today&apos;s car? Find it on the map!
            </div>
            <div
              style={{
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.16)",
                width: 640,
                height: 360,
                borderRadius: 16,
                background: `black url(${currentVehicle.vehicle_station.image.url.replace(
                  "__cover_640x480.jpg",
                  "__cover_1920x1080.jpg"
                )}) no-repeat center / contain`,
              }}
            />

            <div
              style={{
                width: "100%",
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.06)",
                height: 480,
                marginTop: 32,
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                pointerEvents: gameState === "playing" ? "auto" : "none",
              }}
            >
              <Map
                onMapMounted={(map) => {
                  if (map) {
                    mapRef.current = map;
                  }
                }}
                circle={circle}
                marker={marker}
                loadingElement={<div style={{ height: `100%` }} />}
                containerElement={<div style={{ height: `100%` }} />}
                mapElement={<div style={{ height: `100%` }} />}
                googleMapURL="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,drawing,places&key=AIzaSyBrPsXcvS0lOSrlOQQZQQ0x5IywJvv5PQI"
                onChange={setMarker}
              />
            </div>
            {marker && (
              <button
                className={styles.guessButton}
                style={{ marginTop: -64 - 16, marginBottom: 32 }}
                onClick={() => {
                  const newLevel = level + 1;
                  //@ts-expect-error
                  const maps = google.maps;

                  const guessedDistance =
                    maps.geometry.spherical.computeDistanceBetween(
                      answerPoint,
                      marker
                    );
                  if (guessedDistance <= 50) {
                    setGameState("win");
                    return;
                  } else if (newLevel > 3) {
                    setGameState("lose");
                    return;
                  }

                  /* Find random point in circle with radius away from real answer. That point is now the circle's new midpoint. */
                  const newRadius = Math.pow(circle.radius, 0.75);
                  const r = newRadius * Math.sqrt(Math.random());
                  const theta = Math.random() * 360;
                  //@ts-expect-error
                  const latLng = google.maps.geometry.spherical
                    .computeOffset(answerPoint, r, theta)
                    .toJSON();

                  setLevel(newLevel);
                  setMarker(null);
                  setCircle({
                    center: latLng,
                    radius: newRadius,
                  });
                  const bounds = {
                    north: maps.geometry.spherical
                      .computeOffset(latLng, newRadius, 0)
                      .lat(),
                    east: maps.geometry.spherical
                      .computeOffset(latLng, newRadius, 90)
                      .lng(),
                    south: maps.geometry.spherical
                      .computeOffset(latLng, newRadius, 180)
                      .lat(),
                    west: maps.geometry.spherical
                      .computeOffset(latLng, newRadius, 270)
                      .lng(),
                  };
                  mapRef.current.fitBounds(bounds, 16);
                }}
              >
                Make a guess
              </button>
            )}
            <div style={{ marginTop: 32 }}>
              The car is somewhere within the blue circle. This is guess number{" "}
              {level + 1}. You have {4 - level} attempts remaining.
            </div>
          </>
        )}

        <div style={{ height: 128 }} />
        <div>You win!</div>
      </div>
    </div>
  );
};

export default Home;
