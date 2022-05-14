import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import {
  GameMap,
  getBoundsFromCircle,
  LatLngLiteral,
} from "../components/GameMap";
import styles from "../styles/Home.module.css";
import vehicles from "../data.json";
import NextImage from "next/image";
var seedrandom = require("seedrandom");

function useLocalStorage<T>(key: string, defaultValue: T) {
  const storage =
    typeof window === "undefined"
      ? { getItem: () => null, setItem: () => null, removeItem: () => null }
      : localStorage;
  const [state, _setState] = useState<T>(defaultValue);
  const setState = (value: T) => {
    storage.setItem(key, JSON.stringify(value));
    _setState(value);
  };
  return [state, setState] as const;
}

const Home: NextPage = () => {
  const dayOffset = 19125 - 4;
  /* Needs to be a ref so we don't accidentally switch days while playing. */
  const currentDay = useRef((+new Date() / 1000 / 60 / 60 / 24) | 0);
  const todaysIndex = currentDay.current - dayOffset;

  function makeKey(k: string) {
    return `hyrdle.xyz:${todaysIndex}:${k}`;
  }

  const [markers, setMarkers] = useLocalStorage<
    {
      lat: number;
      lng: number;
    }[]
  >(makeKey("markers"), []);
  const [marker, setMarker] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [circle, setCircle] = useLocalStorage(makeKey("circle"), {
    center: { lat: 59.95, lng: 10.5 },
    radius: 600000,
  });
  const [gameState, setGameState] = useLocalStorage<"playing" | "win" | "lose">(
    makeKey("gameState"),
    "playing"
  );

  const [redrawForcer, setRedrawForcer] = useState("not-loaded");
  const forceRedrawAfterMapLoadedOnce = () => {
    setRedrawForcer("loaded");
  };

  useEffect(() => {
    /* Remove old keys. */
    Object.keys(localStorage)
      .filter((key) => +key.split(":")[1] < todaysIndex)
      .forEach((key) => localStorage.removeItem(key));

    for (const [key, setter] of [
      ["markers", setMarkers],
      ["circle", setCircle],
      ["gameState", setGameState],
    ] as const) {
      try {
        const value = JSON.parse(localStorage.getItem(makeKey(key)) || "null");
        if (value !== null) {
          setter(value);
        }
      } catch {}
    }

    /* Show your final guess, if you load the page after you are done playing. */
    const markers = JSON.parse(
      localStorage.getItem(makeKey("markers")) || "[]"
    );
    if (markers.length >= 5) {
      setMarker(markers.pop());
    }
  }, []);

  const [hasShared, setHasShared] = useState(false);
  const mapRef = useRef<any>(null);
  const currentVehicle = vehicles[todaysIndex];
  const level = markers.length;

  const random = useRef(seedrandom(todaysIndex));

  const answerPoint = {
    lat: currentVehicle.point[1],
    lng: currentVehicle.point[0],
  };

  const fitMapToCircleBounds = ({
    center,
    radius,
  }: {
    center: LatLngLiteral;
    radius: number;
  }) => {
    const maps = window.google.maps;
    const bounds = getBoundsFromCircle({ center, radius });
    mapRef.current.fitBounds(bounds, 16);
  };

  const distance =
    (marker && answerPoint
      ? window.google?.maps.geometry.spherical.computeDistanceBetween(
          answerPoint,
          marker
        )
      : -1) | 0;

  const endGame = (state: "win" | "lose") => {
    if (!marker) {
      return;
    }
    setGameState(state);
    const dLng = marker.lng - answerPoint.lng;
    const dLat = marker.lat - answerPoint.lat;
    const bounds = {
      north: Math.max(answerPoint.lat - dLat, answerPoint.lat + dLat),
      south: Math.min(answerPoint.lat - dLat, answerPoint.lat + dLat),
      east: Math.max(answerPoint.lng - dLng, answerPoint.lng + dLng),
      west: Math.min(answerPoint.lng - dLng, answerPoint.lng + dLng),
    };
    if (mapRef.current) {
      mapRef.current?.fitBounds(bounds, 32);
    }
  };

  const isGameDone = gameState === "win" || gameState === "lose";

  const makeGuess = (marker: LatLng) => {
    const newLevel = level + 1;
    //@ts-expect-error
    const maps = google.maps;

    const guessedDistance = maps.geometry.spherical.computeDistanceBetween(
      answerPoint,
      marker
    );
    if (marker !== null && markers.length < 5) {
      setMarkers([...markers, marker]);
    }
    if (guessedDistance <= 50) {
      endGame("win");
      return;
    } else if (newLevel > 4) {
      endGame("lose");
      return;
    }
    setMarker(null);

    /* Find random point in circle with radius away from real answer. That point is now the circle's new midpoint. */
    const newRadius = Math.pow(circle.radius, 0.8);
    const r = newRadius * Math.sqrt(random.current());
    const theta = random.current() * 360;
    //@ts-expect-error
    const latLng = google.maps.geometry.spherical
      .computeOffset(answerPoint, r, theta)
      .toJSON();

    const newCircle = {
      center: latLng,
      radius: newRadius,
    };
    setCircle(newCircle);
    fitMapToCircleBounds(newCircle);
  };

  useEffect(() => {
    try {
      const markers = JSON.parse(
        localStorage.getItem(makeKey("markers")) || "null"
      );
      markers.forEach((marker) => {
        makeGuess(marker);
      });
    } catch {}
  }, []);

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
        <div
          style={{
            display: "block",
            marginTop: 32,
            marginBottom: 32,
          }}
        >
          <NextImage width={168} height={26} src="/hyrdle.svg" alt="Hyrdle" />
        </div>
        {!isGameDone && (
          <div style={{ marginBottom: 32 }}>
            Where is today&apos;s car? Find it on the map!
          </div>
        )}
        {!isGameDone && (
          <div
            style={{
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.16)",
              width: "100%",
              aspectRatio: (16 / 9).toString(),
              borderRadius: 16,
              background: `#888 url(${currentVehicle.image.replace(
                "__cover_640x480.jpg",
                "__cover_1920x1080.jpg"
              )}) no-repeat center / contain`,
            }}
          />
        )}

        {!isGameDone && (
          <div style={{ marginTop: 32 }}>
            The car is somewhere within the blue circle. This is guess number{" "}
            {level + 1}. You have {5 - level} attempts remaining.
          </div>
        )}

        <div
          style={{
            width: "100%",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.06)",
            height: 480,
            marginTop: 32,
            borderRadius: 16,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <GameMap
            onMapMounted={(map: any) => {
              if (map) {
                mapRef.current = map;
                forceRedrawAfterMapLoadedOnce();
                if (map && circle && circle.radius !== 600000) {
                  map.fitBounds(getBoundsFromCircle(circle), 16);
                }
              }
            }}
            circle={isGameDone ? null : circle}
            marker={marker}
            carMarker={isGameDone ? answerPoint : null}
            loadingElement={<div style={{ height: `100%` }} />}
            containerElement={<div style={{ height: `100%` }} />}
            mapElement={<div style={{ height: `100%` }} />}
            googleMapURL="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,drawing,places&key=AIzaSyBrPsXcvS0lOSrlOQQZQQ0x5IywJvv5PQI"
            onChange={(latLng) => {
              if (!isGameDone) {
                setMarker(latLng);
              }
            }}
          />
        </div>
        {!isGameDone && marker && (
          <button
            className={styles.guessButton}
            style={{ marginTop: -64 - 16, marginBottom: 32 }}
            onClick={() => makeGuess(marker)}
          >
            Make a guess
          </button>
        )}
        {isGameDone && (
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: 32 }}>
              You guessed <strong>{distance}m</strong> away from the car.
            </div>
            <button
              className={styles.guessButton}
              onClick={() => {
                navigator.clipboard.writeText(
                  `Hyrdle #${todaysIndex}
                ${[...new Array(5)]
                  .map((_, i) => {
                    if (i === level) {
                      return gameState === "lose" ? "🟥" : "🟩";
                    }
                    if (i <= level) {
                      return "🟥";
                    }
                    return "⬛";
                  })
                  .join("")} ${distance}m
                https://hyrdle.xyz`
                    .split("\n")
                    .map((x) => x.trim())
                    .join("\n")
                );
                setHasShared(true);
              }}
            >
              {hasShared ? "Copied!" : "Share"}
            </button>
            <div
              style={{
                marginTop: 32,
                fontWeight: "bold",
                background: "#ffffff",
                padding: "16px 32px",
                borderRadius: 16,
                color: "#000130",
              }}
            >
              <div>Hyrdle #{todaysIndex}</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {[...new Array(5)].map((_, i) => (
                  <span key={i} style={{ padding: 2 }}>
                    {(() => {
                      if (i === level) {
                        return gameState === "lose" ? "🟥" : "🟩";
                      }
                      if (i <= level) {
                        return "🟥";
                      }
                      return "⬛";
                    })()}
                  </span>
                ))}
                <strong style={{ paddingLeft: 6 }}>{distance}m</strong>
              </div>
              <div>https://hyrdle.xyz</div>
            </div>
          </div>
        )}
        <div style={{ height: 128 }} />
      </div>
    </div>
  );
};

export default Home;
